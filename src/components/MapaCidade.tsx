import { useEffect, useRef } from 'react'
import * as maplibregl from 'maplibre-gl'
import type { Map as MapaML, Marker } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import { CENTRO_SANTAREM, STATUS } from '../lib/cidade'
import type { Denuncia, Estacao } from '../types/db'

// Com bundler, o MapLibre precisa saber onde está o arquivo do worker.
maplibregl.setWorkerUrl(workerUrl)

// Mapa vetorial gratuito (OpenStreetMap via OpenFreeMap), com prédios em 3D.
const ESTILO = 'https://tiles.openfreemap.org/styles/liberty'

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
      zoom: 15,
      pitch: 55,
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
      // Garante prédios em 3D mesmo que o estilo não traga a camada.
      if (!m.getLayer('building-3d') && m.getSource('openmaptiles')) {
        m.addLayer({
          id: 'building-3d',
          type: 'fill-extrusion',
          source: 'openmaptiles',
          'source-layer': 'building',
          minzoom: 14,
          paint: {
            'fill-extrusion-color': '#e7dfd3',
            'fill-extrusion-height': ['coalesce', ['get', 'render_height'], 6],
            'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
            'fill-extrusion-opacity': 0.85,
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
