# Cidade Conectada · Santarém-PA

Plataforma onde o cidadão de Santarém se cadastra, **denuncia problemas urbanos num mapa 3D da cidade** e acompanha a solução.

Santarém tem duas estações bem marcadas, e cada uma traz problemas diferentes. Por isso o mapa tem um **modo Inverno / Verão**:

| Estação | Meses | Problemas típicos |
|---|---|---|
| 🌧️ Inverno amazônico | dezembro a junho | alagamentos, buracos, esgoto a céu aberto, árvores caídas |
| ☀️ Verão amazônico | julho a novembro | queimadas, incêndios, falta d'água |
| O ano todo | — | iluminação pública, lixo, mobilidade e transporte |

## O que já funciona

- **Cadastro e login** (e-mail e senha) com nome, telefone e bairro.
- **Mapa 3D** de Santarém (OpenStreetMap, com prédios em 3D e câmera inclinada) e visual diferente para cada estação.
- **Nova denúncia:** categoria, ponto no mapa (ou "usar minha localização"), título, descrição, endereço, bairro e até 3 fotos.
- **Antiduplicação:** ao marcar o ponto, o sistema mostra denúncias parecidas num raio de 150 m e sugere apoiar a que já existe.
- **Apoios:** "eu também tenho esse problema".
- **Andamento:** status (aberta → em análise → em andamento → resolvida/rejeitada) com histórico público.
- **Perfil de gestor:** pode atualizar o status e deixar um comentário para o cidadão.
- **Minhas denúncias:** lista e números pessoais.
- **Segurança no banco (RLS):** o cidadão só edita ou apaga a própria denúncia enquanto ela está aberta, e não consegue alterar status, autor nem estação. Só gestores mudam o status.

## Tecnologias

- React 19 + TypeScript + Vite
- MapLibre GL (mapa vetorial com prédios 3D; tiles gratuitos do OpenFreeMap)
- Supabase: autenticação, Postgres + PostGIS, armazenamento de fotos

## Como rodar

1. Crie um projeto em [supabase.com](https://supabase.com) (o plano gratuito serve).
2. Aplique a migração `supabase/migrations/20261125000000_estrutura_inicial.sql`:
   - pelo painel: **SQL Editor** → cole o arquivo → **Run**; ou
   - pela CLI: `supabase link --project-ref SEU_REF && supabase db push`
3. Configure as variáveis:
   ```bash
   cp .env.example .env
   # preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY (Project Settings → API)
   ```
4. Instale e rode:
   ```bash
   npm install
   npm run dev
   ```
5. Em **Authentication → URL Configuration**, coloque a URL do site (ex.: `http://localhost:5173`) para o link de confirmação de e-mail funcionar.

### Tornar alguém gestor

No SQL Editor do Supabase:

```sql
update public.profiles set papel = 'gestor'
where id = (select id from auth.users where email = 'email@da.pessoa');
```

## Estrutura

```
src/
  components/   MapaCidade (mapa 3D), Layout, SeletorEstacao, RotaProtegida
  contexts/     AuthContext (sessão e perfil)
  lib/          cliente Supabase, consultas, regras da cidade (estações, limites, status)
  pages/        Mapa, Entrar, Cadastro, NovaDenuncia, DenunciaDetalhe, MinhasDenuncias
  types/        tipos das tabelas
supabase/
  migrations/   tabelas, PostGIS, RLS, funções e bucket de fotos
```

## Banco de dados

- `profiles`: dados do cidadão e papel (`cidadao`, `gestor`, `admin`), criado automaticamente no cadastro
- `categorias`: tipos de problema, com cor, ícone e estação típica
- `denuncias`: localização (lat/lng + coluna PostGIS), status, estação (calculada pela data, no fuso de Santarém)
- `denuncia_fotos`, `apoios`, `historico_status`
- Visão `denuncias_mapa` e funções `denuncias_proximas()` e `atualizar_status()`

## Próximos passos

- Painel de indicadores por bairro (mapa de calor, tempo médio de resolução)
- Histórico por estação ("todo inverno o bairro X alaga")
- Notificações quando o status mudar
- Camadas oficiais: limites dos bairros, rede de água e esgoto, áreas de risco de alagamento
- PWA para instalar no celular e funcionar com sinal fraco
