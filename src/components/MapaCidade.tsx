import { useEffect, useRef } from 'react'
import * as maplibregl from 'maplibre-gl'
import type { Map as MapaML, Marker } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import { CENTRO_SANTAREM, STATUS } from '../lib/cidade'
import type { Denuncia, Estacao } from '../types/db'

// Com bundler, o MapLibre precisa saber onde está o arquivo do worker.
maplibregl.setWorkerUrl(workerUrl)

// Mapa vetorial gratuito (OpenStreetMap via OpenFreeMap), base clara e limpa.
const ESTILO = 'https://tiles.openfreemap.org/styles/positron'

// Paleta clara, estilo app de entrega: ruas brancas, rio azul-claro, verde suave.
const CORES: Record<string, Record<string, string>> = {
  background: { 'background-color': '#f3f4f6' },
  landuse_residential: { 'fill-color': '#eef0f2' },
  park: { 'fill-color': '#dcefd6' },
  landcover_wood: { 'fill-color': '#e1efda' },
  water: { 'fill-color': '#b9dcf2' },
  waterway: { 'line-color': '#b9dcf2' },
  building: { 'fill-color': '#e6e7eb', 'fill-outline-color': '#dcdde2' },
  highway_path: { 'line-color': '#ffffff' },
  highway_minor: { 'line-color': '#ffffff' },
  highway_major_casing: { 'line-color': '#e1e3e8' },
  highway_major_inner: { 'line-color': '#ffffff' },
  highway_motorway_casing: { 'line-color': '#f5d77a' },
  highway_motorway_inner: { 'line-color': '#fff3c4' },
  'highway-name-minor': { 'text-color': '#8a8f98' },
  'highway-name-major': { 'text-color': '#6b7079' },
  water_name_point_label: { 'text-color': '#3b82b6' },
  water_name_line_label: { 'text-color': '#3b82b6' },
}

function aplicarPaleta(m: MapaML) {
  for (const [camada, props] of Object.entries(CORES)) {
    if (!m.getLayer(camada)) continue
    for (const [prop, valor] of Object.entries(props)) {
      try {
        m.setPaintProperty(camada, prop as never, valor as never)
      } catch {
        /* propriedade inexistente nesta versão do estilo */
      }
    }
  }
  // Ruas secundárias um pouco mais largas, para destacar sobre o fundo claro.
  if (m.getLayer('highway_minor')) {
    m.setPaintProperty('highway_minor', 'line-width', ['interpolate', ['exponential', 1.5], ['zoom'], 13, 1.5, 16, 6, 18, 16])
  }
}

interface Props {
  denuncias?: Denuncia[]
  estacao: Estacao
  /** Ponto escolhido pelo usuário (modo "marcar local"). */
  ponto?: { lat: number; lng: number } | null
  onClicarMapa?: (lat: number, lng: number) => void
  onSelecionar?: (d: Denuncia) => void
  /** Centro inicial [lng, lat]; padrão: centro de Santarém. */
  centro?: [number, number]
  className?: string
}

export function MapaCidade({ denuncias = [], estacao, ponto, onClicarMapa, onSelecionar, centro, className }: Props) {
  const container = useRef<HTMLDivElement>(null)
  const mapa = useRef<MapaML | null>(null)
  const marcadores = useRef<Marker[]>([])
  const marcadorPonto = useRef<Marker | null>(null)
  const clique = useRef(onClicarMapa)
  const selecionar = useRef(onSelecionar)
  clique.current = onClicarMapa
  selecionar.current = onSelecionar

  const centroInicial = useRef(centro ?? CENTRO_SANTAREM)

  // Cria o mapa uma vez.
  useEffect(() => {
    if (!container.current) return
    const m = new maplibregl.Map({
      container: container.current,
      style: ESTILO,
      center: centroInicial.current,
      zoom: centro ? 16 : window.innerWidth < 800 ? 13.3 : 14.2,
      pitch: 45,
      bearing: -20,
      maxPitch: 75,
      attributionControl: { compact: true },
    })
    m.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right')
    m.addControl(
      new maplibregl.GeolocateControl({ positionOptions: { enableHighAccuracy: true } }),
      'top-right',
    )

    m.on('load', () => {
      aplicarPaleta(m)
      // Com os prédios em 3D, a versão plana só atrapalha.
      if (m.getLayer('building')) m.setLayoutProperty('building', 'visibility', 'none')
      // Garante prédios em 3D mesmo que o estilo não traga a camada.
      if (!m.getLayer('building-3d') && m.getSource('openmaptiles')) {
        m.addLayer({
          id: 'building-3d',
          type: 'fill-extrusion',
          source: 'openmaptiles',
          'source-layer': 'building',
          minzoom: 14,
          paint: {
            'fill-extrusion-color': '#e9eaee',
            'fill-extrusion-height': ['coalesce', ['get', 'render_height'], 6],
            'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
            'fill-extrusion-opacity': 1,
          },
        })
      }
    })

    m.on('click', (e) => clique.current?.(e.lngLat.lat, e.lngLat.lng))
    mapa.current = m
    return () => {
      m.remove()
      mapa.current = null
    }
  }, [])

  // Cursor de mira quando o mapa aceita cliques.
  useEffect(() => {
    const canvas = mapa.current?.getCanvas()
    if (canvas) canvas.style.cursor = onClicarMapa ? 'crosshair' : ''
  }, [onClicarMapa])

  // Marcadores das denúncias.
  useEffect(() => {
    const m = mapa.current
    if (!m) return
    marcadores.current.forEach((mk) => mk.remove())
    marcadores.current = denuncias.map((d) => {
      const el = document.createElement('button')
      el.className = 'pino'
      el.type = 'button'
      el.style.setProperty('--cor', d.categoria_cor)
      el.style.setProperty('--status', STATUS[d.status].cor)
      el.title = `${d.categoria_nome}: ${d.titulo}`
      el.setAttribute('aria-label', el.title)
      const icone = document.createElement('span')
      icone.textContent = d.categoria_icone
      el.appendChild(icone)
      el.addEventListener('click', (ev) => {
        ev.stopPropagation()
        selecionar.current?.(d)
      })
      return new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat([d.lng, d.lat]).addTo(m)
    })
  }, [denuncias])

  // Marcador do ponto escolhido.
  useEffect(() => {
    const m = mapa.current
    if (!m) return
    if (!ponto) {
      marcadorPonto.current?.remove()
      marcadorPonto.current = null
      return
    }
    const mk = (marcadorPonto.current ??= new maplibregl.Marker({ color: '#0f766e' }))
    mk.setLngLat([ponto.lng, ponto.lat]).addTo(m)
  }, [ponto])

  return <div ref={container} className={`mapa mapa-${estacao} ${className ?? ''}`} />
}
