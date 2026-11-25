-- =====================================================================
-- Cidade Conectada · Santarém-PA
-- Estrutura inicial: perfis, categorias, denúncias, fotos, apoios,
-- histórico de status, regras de acesso (RLS) e armazenamento de fotos.
-- =====================================================================

create extension if not exists postgis with schema extensions;

-- ---------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------
create type public.papel_usuario as enum ('cidadao', 'gestor', 'admin');

-- Santarém tem duas estações bem marcadas:
--   inverno amazônico (chuvas, cheia dos rios): dezembro a junho
--   verão amazônico (estiagem, seca, queimadas): julho a novembro
create type public.estacao as enum ('inverno', 'verao');
create type public.estacao_tipica as enum ('inverno', 'verao', 'ambas');

create type public.status_denuncia as enum (
  'aberta', 'em_analise', 'em_andamento', 'resolvida', 'rejeitada'
);

-- ---------------------------------------------------------------------
-- Perfis (1:1 com auth.users)
-- ---------------------------------------------------------------------
create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  nome       text not null check (char_length(nome) between 2 and 120),
  telefone   text check (telefone is null or char_length(telefone) <= 20),
  bairro     text check (bairro is null or char_length(bairro) <= 80),
  papel      public.papel_usuario not null default 'cidadao',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Cria o perfil automaticamente quando alguém se cadastra.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, nome, telefone, bairro)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'nome'), ''), split_part(new.email, '@', 1), 'Cidadão'),
    nullif(trim(new.raw_user_meta_data ->> 'telefone'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'bairro'), '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Verdadeiro quando o usuário logado é gestor ou admin.
create function public.is_gestor()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and papel in ('gestor', 'admin')
  );
$$;

-- ---------------------------------------------------------------------
-- Categorias de denúncia
-- ---------------------------------------------------------------------
create table public.categorias (
  id             text primary key,
  nome           text not null,
  descricao      text not null,
  icone          text not null,
  cor            text not null check (cor ~ '^#[0-9a-fA-F]{6}$'),
  estacao_tipica public.estacao_tipica not null default 'ambas',
  ordem          smallint not null default 0
);

insert into public.categorias (id, nome, descricao, icone, cor, estacao_tipica, ordem) values
  ('alagamento',     'Alagamento',               'Ruas ou casas alagadas pela chuva ou cheia do rio',     '🌊', '#2563eb', 'inverno', 1),
  ('buraco',         'Buraco na rua',            'Buracos, crateras e asfalto danificado',                '🕳️', '#b45309', 'inverno', 2),
  ('esgoto',         'Esgoto a céu aberto',      'Esgoto vazando, bueiro entupido ou fossa transbordando', '🚱', '#65a30d', 'inverno', 3),
  ('arvore_caida',   'Árvore caída',             'Árvores ou galhos caídos ou com risco de queda',        '🌳', '#15803d', 'inverno', 4),
  ('falta_agua',     'Falta d''água',            'Bairro ou rua sem abastecimento de água',               '💧', '#0891b2', 'verao',   5),
  ('queimada',       'Queimada',                 'Queima de lixo, mato ou terrenos',                      '🔥', '#ea580c', 'verao',   6),
  ('incendio',       'Incêndio',                 'Incêndio em imóvel, área verde ou terreno',             '🚒', '#dc2626', 'verao',   7),
  ('iluminacao',     'Iluminação pública',       'Poste apagado, piscando ou danificado',                 '💡', '#ca8a04', 'ambas',   8),
  ('lixo',           'Lixo acumulado',           'Coleta não realizada ou descarte irregular',            '🗑️', '#57534e', 'ambas',   9),
  ('mobilidade',     'Mobilidade e transporte',  'Ônibus, sinalização, calçadas e acessibilidade',        '🚌', '#7c3aed', 'ambas',  10),
  ('outros',         'Outros',                   'Outros problemas urbanos',                              '📍', '#475569', 'ambas',  99);

-- ---------------------------------------------------------------------
-- Denúncias
-- ---------------------------------------------------------------------
create table public.denuncias (
  id            uuid primary key default gen_random_uuid(),
  autor_id      uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  categoria_id  text not null references public.categorias (id),
  titulo        text not null check (char_length(titulo) between 5 and 120),
  descricao     text not null default '' check (char_length(descricao) <= 2000),
  status        public.status_denuncia not null default 'aberta',
  -- Coordenadas limitadas ao município de Santarém (com folga).
  lat           double precision not null check (lat between -4.0 and -1.7),
  lng           double precision not null check (lng between -55.6 and -53.9),
  local         extensions.geography(Point, 4326) generated always as (
                  extensions.st_setsrid(extensions.st_makepoint(lng, lat), 4326)::extensions.geography
                ) stored,
  endereco      text check (endereco is null or char_length(endereco) <= 200),
  bairro        text check (bairro is null or char_length(bairro) <= 80),
  estacao       public.estacao not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  resolvida_em  timestamptz
);

create index denuncias_local_idx     on public.denuncias using gist (local);
create index denuncias_categoria_idx on public.denuncias (categoria_id);
create index denuncias_status_idx    on public.denuncias (status);
create index denuncias_autor_idx     on public.denuncias (autor_id);
create index denuncias_created_idx   on public.denuncias (created_at desc);

-- Define a estação a partir da data, no fuso de Santarém.
create function public.estacao_da_data(data timestamptz)
returns public.estacao
language sql
stable
set search_path = ''
as $$
  select case
    when extract(month from data at time zone 'America/Santarem') between 7 and 11
      then 'verao'::public.estacao
    else 'inverno'::public.estacao
  end;
$$;

create function public.denuncias_before_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.estacao := public.estacao_da_data(coalesce(new.created_at, now()));
  return new;
end;
$$;

create trigger denuncias_before_insert
  before insert on public.denuncias
  for each row execute function public.denuncias_before_insert();

create function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger denuncias_touch before update on public.denuncias
  for each row execute function public.touch_updated_at();
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
-- Fotos, apoios ("eu também tenho esse problema") e histórico de status
-- ---------------------------------------------------------------------
create table public.denuncia_fotos (
  id           uuid primary key default gen_random_uuid(),
  denuncia_id  uuid not null references public.denuncias (id) on delete cascade,
  caminho      text not null unique,
  created_at   timestamptz not null default now()
);
create index denuncia_fotos_denuncia_idx on public.denuncia_fotos (denuncia_id);

create table public.apoios (
  denuncia_id  uuid not null references public.denuncias (id) on delete cascade,
  usuario_id   uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (denuncia_id, usuario_id)
);
create index apoios_usuario_idx on public.apoios (usuario_id);

create table public.historico_status (
  id               bigint generated always as identity primary key,
  denuncia_id      uuid not null references public.denuncias (id) on delete cascade,
  status_anterior  public.status_denuncia,
  status_novo      public.status_denuncia not null,
  comentario       text check (comentario is null or char_length(comentario) <= 1000),
  autor_id         uuid references public.profiles (id) on delete set null,
  created_at       timestamptz not null default now()
);
create index historico_denuncia_idx on public.historico_status (denuncia_id, created_at);

-- Registra a abertura no histórico.
create function public.denuncias_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.historico_status (denuncia_id, status_anterior, status_novo, autor_id)
  values (new.id, null, new.status, new.autor_id);
  return new;
end;
$$;

create trigger denuncias_after_insert
  after insert on public.denuncias
  for each row execute function public.denuncias_after_insert();

-- Gestores mudam o status por aqui (o cidadão não consegue alterar o status direto).
create function public.atualizar_status(
  p_denuncia_id uuid,
  p_status      public.status_denuncia,
  p_comentario  text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_anterior public.status_denuncia;
begin
  if not public.is_gestor() then
    raise exception 'Apenas gestores podem alterar o status de uma denúncia'
      using errcode = '42501';
  end if;

  select status into v_anterior
  from public.denuncias where id = p_denuncia_id for update;

  if not found then
    raise exception 'Denúncia não encontrada' using errcode = 'P0002';
  end if;

  if v_anterior = p_status and p_comentario is null then
    return;
  end if;

  update public.denuncias
     set status = p_status,
         resolvida_em = case when p_status = 'resolvida' then now() else null end
   where id = p_denuncia_id;

  insert into public.historico_status (denuncia_id, status_anterior, status_novo, comentario, autor_id)
  values (p_denuncia_id, v_anterior, p_status, nullif(trim(p_comentario), ''), (select auth.uid()));
end;
$$;

-- ---------------------------------------------------------------------
-- Visão usada pelo mapa (respeita o RLS de quem consulta)
-- ---------------------------------------------------------------------
create view public.denuncias_mapa
with (security_invoker = true)
as
select
  d.id, d.autor_id, d.categoria_id, d.titulo, d.descricao, d.status,
  d.lat, d.lng, d.endereco, d.bairro, d.estacao,
  d.created_at, d.updated_at, d.resolvida_em,
  c.nome  as categoria_nome,
  c.icone as categoria_icone,
  c.cor   as categoria_cor,
  (select count(*) from public.apoios a where a.denuncia_id = d.id)::int as apoios,
  (select f.caminho from public.denuncia_fotos f
    where f.denuncia_id = d.id order by f.created_at limit 1) as foto
from public.denuncias d
join public.categorias c on c.id = d.categoria_id;

-- Denúncias ainda abertas perto de um ponto: usado para sugerir
-- "apoiar" uma denúncia existente em vez de criar uma duplicada.
create function public.denuncias_proximas(
  p_lat double precision,
  p_lng double precision,
  p_categoria text default null,
  p_raio_m double precision default 150
)
returns table (
  id uuid, titulo text, categoria_id text, status public.status_denuncia,
  distancia_m double precision, apoios int, created_at timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$
  select d.id, d.titulo, d.categoria_id, d.status,
         extensions.st_distance(
           d.local,
           extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography
         ) as distancia_m,
         (select count(*) from public.apoios a where a.denuncia_id = d.id)::int as apoios,
         d.created_at
  from public.denuncias d
  where d.status not in ('resolvida', 'rejeitada')
    and (p_categoria is null or d.categoria_id = p_categoria)
    and extensions.st_dwithin(
          d.local,
          extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography,
          least(greatest(p_raio_m, 10), 2000)
        )
  order by distancia_m
  limit 10;
$$;

-- ---------------------------------------------------------------------
-- Permissões por coluna: o cliente só escreve o que lhe cabe.
-- (status, estacao, autor e datas são controlados pelo banco)
-- ---------------------------------------------------------------------
revoke insert, update on public.profiles from anon, authenticated;
grant update (nome, telefone, bairro) on public.profiles to authenticated;

revoke insert, update, delete on public.categorias from anon, authenticated;

revoke insert, update on public.denuncias from anon, authenticated;
grant insert (categoria_id, titulo, descricao, lat, lng, endereco, bairro) on public.denuncias to authenticated;
grant update (categoria_id, titulo, descricao, lat, lng, endereco, bairro) on public.denuncias to authenticated;

revoke insert, update on public.denuncia_fotos from anon, authenticated;
grant insert (denuncia_id, caminho) on public.denuncia_fotos to authenticated;

revoke update on public.apoios from anon, authenticated;
revoke insert, update, delete on public.historico_status from anon, authenticated;

revoke execute on function public.atualizar_status(uuid, public.status_denuncia, text) from public, anon;
grant execute on function public.atualizar_status(uuid, public.status_denuncia, text) to authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table public.profiles         enable row level security;
alter table public.categorias       enable row level security;
alter table public.denuncias        enable row level security;
alter table public.denuncia_fotos   enable row level security;
alter table public.apoios           enable row level security;
alter table public.historico_status enable row level security;

-- Perfis: cada um vê e edita o seu; gestores veem todos.
create policy "perfil: ver o próprio" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select public.is_gestor()));
create policy "perfil: editar o próprio" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Categorias: leitura pública.
create policy "categorias: leitura pública" on public.categorias
  for select to anon, authenticated using (true);

-- Denúncias: o mapa é público; só o autor edita/apaga enquanto está "aberta".
create policy "denúncias: leitura pública" on public.denuncias
  for select to anon, authenticated using (true);
create policy "denúncias: cidadão cria" on public.denuncias
  for insert to authenticated
  with check (autor_id = (select auth.uid()));
create policy "denúncias: autor edita enquanto aberta" on public.denuncias
  for update to authenticated
  using (autor_id = (select auth.uid()) and status = 'aberta')
  with check (autor_id = (select auth.uid()) and status = 'aberta');
create policy "denúncias: autor apaga enquanto aberta" on public.denuncias
  for delete to authenticated
  using (autor_id = (select auth.uid()) and status = 'aberta');

-- Fotos: leitura pública; só o autor da denúncia adiciona/remove.
create policy "fotos: leitura pública" on public.denuncia_fotos
  for select to anon, authenticated using (true);
create policy "fotos: autor adiciona" on public.denuncia_fotos
  for insert to authenticated
  with check (
    exists (select 1 from public.denuncias d
            where d.id = denuncia_id and d.autor_id = (select auth.uid()))
    and caminho like (select auth.uid())::text || '/%'
  );
create policy "fotos: autor remove" on public.denuncia_fotos
  for delete to authenticated
  using (exists (select 1 from public.denuncias d
                 where d.id = denuncia_id and d.autor_id = (select auth.uid())));

-- Apoios: leitura pública; cada um apoia/desapoia por si.
create policy "apoios: leitura pública" on public.apoios
  for select to anon, authenticated using (true);
create policy "apoios: apoiar" on public.apoios
  for insert to authenticated
  with check (usuario_id = (select auth.uid()));
create policy "apoios: retirar apoio" on public.apoios
  for delete to authenticated
  using (usuario_id = (select auth.uid()));

-- Histórico: leitura pública (transparência); escrita só pelo banco.
create policy "histórico: leitura pública" on public.historico_status
  for select to anon, authenticated using (true);

-- ---------------------------------------------------------------------
-- Armazenamento das fotos (bucket público para leitura)
-- Caminho: <id do usuário>/<id da denúncia>/<arquivo>
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('denuncias', 'denuncias', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "fotos storage: usuário envia na própria pasta" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'denuncias'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
create policy "fotos storage: usuário apaga da própria pasta" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'denuncias'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
