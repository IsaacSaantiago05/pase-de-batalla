import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { clearSession } from '../lib/auth'
import { apiGet, apiPost } from '../lib/api'

type IslandElementStatus = 'BLOQUEADO' | 'DISPONIBLE' | 'DESBLOQUEADO'

type IslandCatalogItem = {
  id: number
  nombre: string
  categoria: string
  descripcion: string | null
  recurso: string | null
  nivel_requerido: number
  estado_usuario: IslandElementStatus
}

type IslandLayoutItem = {
  id: number
  elemento_id: number
  posicion_x: number
  posicion_y: number
  posicion_z: number | null
}

type CatalogResponse = {
  elementos: IslandCatalogItem[]
}

type LayoutResponse = {
  items: IslandLayoutItem[]
}

type PositionForm = {
  x: string
  y: string
  z: string
}

type MapPosition = {
  x: number
  y: number
  z: number | null
}

type MapCenter = {
  x: number
  y: number
}

type MapSnapshot = Record<number, MapPosition>

type StatusFilter = IslandElementStatus | 'TODOS'
type PositionPreset = 'CENTER' | 'NORTH' | 'SOUTH' | 'EAST' | 'WEST' | 'RANDOM'

type IslandEditorPreferences = {
  snapToGrid: boolean
  avoidOverlap: boolean
  autoSaveEnabled: boolean
  autoSaveSeconds: number
  gridStep: number
  mapZoom: number
  mapCenterX: number | null
  mapCenterY: number | null
}

const GRID_STEP_OPTIONS = [5, 10, 20, 40] as const
const AUTOSAVE_INTERVAL_OPTIONS = [10, 20, 30, 45, 60] as const
const ISLAND_EDITOR_PREFERENCES_KEY = 'island-editor-preferences-v1'
const MAX_MAP_HISTORY_STEPS = 60

const defaultEditorPreferences: IslandEditorPreferences = {
  snapToGrid: true,
  avoidOverlap: true,
  autoSaveEnabled: false,
  autoSaveSeconds: 20,
  gridStep: 10,
  mapZoom: 1,
  mapCenterX: null,
  mapCenterY: null,
}

function clampBetween(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function loadIslandEditorPreferences(): IslandEditorPreferences {
  if (typeof window === 'undefined') {
    return defaultEditorPreferences
  }

  try {
    const raw = window.localStorage.getItem(ISLAND_EDITOR_PREFERENCES_KEY)
    if (!raw) {
      return defaultEditorPreferences
    }

    const parsed = JSON.parse(raw) as Partial<IslandEditorPreferences>

    const gridStepCandidate = Number(parsed.gridStep)
    const autoSaveSecondsCandidate = Number(parsed.autoSaveSeconds)
    const mapZoomCandidate = Number(parsed.mapZoom)
    const mapCenterXCandidate = Number(parsed.mapCenterX)
    const mapCenterYCandidate = Number(parsed.mapCenterY)

    const gridStep = GRID_STEP_OPTIONS.includes(gridStepCandidate as (typeof GRID_STEP_OPTIONS)[number])
      ? gridStepCandidate
      : defaultEditorPreferences.gridStep

    const autoSaveSeconds = AUTOSAVE_INTERVAL_OPTIONS.includes(autoSaveSecondsCandidate as (typeof AUTOSAVE_INTERVAL_OPTIONS)[number])
      ? autoSaveSecondsCandidate
      : defaultEditorPreferences.autoSaveSeconds

    const mapZoom = Number.isFinite(mapZoomCandidate) ? Number(clampBetween(mapZoomCandidate, 0.8, 3).toFixed(2)) : defaultEditorPreferences.mapZoom
    const hasStoredCenter = Number.isFinite(mapCenterXCandidate) && Number.isFinite(mapCenterYCandidate)

    return {
      snapToGrid: typeof parsed.snapToGrid === 'boolean' ? parsed.snapToGrid : defaultEditorPreferences.snapToGrid,
      avoidOverlap: typeof parsed.avoidOverlap === 'boolean' ? parsed.avoidOverlap : defaultEditorPreferences.avoidOverlap,
      autoSaveEnabled: typeof parsed.autoSaveEnabled === 'boolean' ? parsed.autoSaveEnabled : defaultEditorPreferences.autoSaveEnabled,
      autoSaveSeconds,
      gridStep,
      mapZoom,
      mapCenterX: hasStoredCenter ? mapCenterXCandidate : defaultEditorPreferences.mapCenterX,
      mapCenterY: hasStoredCenter ? mapCenterYCandidate : defaultEditorPreferences.mapCenterY,
    }
  } catch {
    return defaultEditorPreferences
  }
}

function cloneMapSnapshot(source: MapSnapshot): MapSnapshot {
  const next: MapSnapshot = {}

  for (const [rawId, position] of Object.entries(source)) {
    next[Number(rawId)] = {
      x: position.x,
      y: position.y,
      z: position.z,
    }
  }

  return next
}

function areMapSnapshotsEqual(a: MapSnapshot, b: MapSnapshot): boolean {
  const aKeys = Object.keys(a)
  const bKeys = Object.keys(b)

  if (aKeys.length !== bKeys.length) {
    return false
  }

  for (const rawId of aKeys) {
    const id = Number(rawId)
    const left = a[id]
    const right = b[id]

    if (!right) {
      return false
    }

    if (left.x !== right.x || left.y !== right.y || left.z !== right.z) {
      return false
    }
  }

  return true
}

const navLinks = [
  { route: '/home', label: 'Inicio' },
  { route: '/island', label: 'Isla' },
  { route: '/battle-pass', label: 'Battle Pass' },
  { route: '/points', label: 'Puntos' },
  { route: '/scan-qr', label: 'Escanear QR' },
  { route: '/rewards', label: 'Recompensas' },
  { route: '/redemptions', label: 'Canjes' },
  { route: '/history', label: 'Historial' },
  { route: '/businesses', label: 'Negocios' },
  { route: '/profile', label: 'Perfil' },
] as const

const statusLabel: Record<IslandElementStatus, string> = {
  BLOQUEADO: 'Bloqueado',
  DISPONIBLE: 'Disponible',
  DESBLOQUEADO: 'Desbloqueado',
}

const statusClass: Record<IslandElementStatus, string> = {
  BLOQUEADO: 'border-slate-200 bg-white/80',
  DISPONIBLE: 'border-amber-200 bg-amber-50/90',
  DESBLOQUEADO: 'border-emerald-200 bg-emerald-50/90',
}

const presetLabel: Record<PositionPreset, string> = {
  CENTER: 'Centro',
  NORTH: 'Norte',
  SOUTH: 'Sur',
  EAST: 'Este',
  WEST: 'Oeste',
  RANDOM: 'Aleatorio',
}

export function IslandPage() {
  const initialPreferences = useMemo(() => loadIslandEditorPreferences(), [])
  const [catalog, setCatalog] = useState<IslandCatalogItem[]>([])
  const [layout, setLayout] = useState<Record<number, IslandLayoutItem>>({})
  const [positionForms, setPositionForms] = useState<Record<number, PositionForm>>({})
  const [mapPositions, setMapPositions] = useState<Record<number, MapPosition>>({})
  const [dirtyMapIds, setDirtyMapIds] = useState<Record<number, true>>({})
  const [mapHistoryPast, setMapHistoryPast] = useState<MapSnapshot[]>([])
  const [mapHistoryFuture, setMapHistoryFuture] = useState<MapSnapshot[]>([])
  const [draggingElementId, setDraggingElementId] = useState<number | null>(null)
  const [panningMap, setPanningMap] = useState(false)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('TODOS')
  const [categoryFilter, setCategoryFilter] = useState('TODAS')
  const [snapToGrid, setSnapToGrid] = useState(initialPreferences.snapToGrid)
  const [avoidOverlap, setAvoidOverlap] = useState(initialPreferences.avoidOverlap)
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(initialPreferences.autoSaveEnabled)
  const [autoSaveSeconds, setAutoSaveSeconds] = useState(initialPreferences.autoSaveSeconds)
  const [autoSaveStatus, setAutoSaveStatus] = useState<string | null>(null)
  const [gridStep, setGridStep] = useState(initialPreferences.gridStep)
  const [panMode, setPanMode] = useState(false)
  const [mapZoom, setMapZoom] = useState(initialPreferences.mapZoom)
  const [mapCenter, setMapCenter] = useState<MapCenter>({
    x: initialPreferences.mapCenterX ?? 0,
    y: initialPreferences.mapCenterY ?? 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [unlockingId, setUnlockingId] = useState<number | null>(null)
  const [savingId, setSavingId] = useState<number | null>(null)
  const [savingMap, setSavingMap] = useState(false)
  const mapRef = useRef<HTMLDivElement | null>(null)
  const panStartRef = useRef<{ pointerX: number; pointerY: number; centerX: number; centerY: number } | null>(null)
  const dragStartSnapshotRef = useRef<MapSnapshot | null>(null)
  const dirtyMapIdsRef = useRef<Record<number, true>>({})
  const mapPositionsRef = useRef<Record<number, MapPosition>>({})
  const savingMapRef = useRef(false)
  const shouldAutoCenterFromDataRef = useRef(initialPreferences.mapCenterX === null || initialPreferences.mapCenterY === null)

  const hydratePositionForms = useCallback((items: IslandCatalogItem[], layoutMap: Record<number, IslandLayoutItem>) => {
    const nextForms: Record<number, PositionForm> = {}

    for (const item of items) {
      const placed = layoutMap[item.id]
      nextForms[item.id] = {
        x: placed ? String(placed.posicion_x) : '0',
        y: placed ? String(placed.posicion_y) : '0',
        z: placed?.posicion_z !== null && placed?.posicion_z !== undefined ? String(placed.posicion_z) : '',
      }
    }

    setPositionForms(nextForms)
  }, [])

  const fetchIslandData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const [catalogResponse, layoutResponse] = await Promise.all([
        apiGet<CatalogResponse>('/island/catalog'),
        apiGet<LayoutResponse>('/island/layout'),
      ])

      const nextCatalog = catalogResponse.data.elementos
      const layoutMap = Object.fromEntries(layoutResponse.data.items.map((item) => [item.elemento_id, item]))
      const nextMapPositions: Record<number, MapPosition> = {}
      const centerSamples: Array<{ x: number; y: number }> = []

      for (const item of nextCatalog) {
        if (item.estado_usuario !== 'DESBLOQUEADO') {
          continue
        }

        const placed = layoutMap[item.id]
        nextMapPositions[item.id] = {
          x: placed?.posicion_x ?? 0,
          y: placed?.posicion_y ?? 0,
          z: placed?.posicion_z ?? null,
        }

        centerSamples.push({ x: nextMapPositions[item.id].x, y: nextMapPositions[item.id].y })
      }

      const nextCenter =
        centerSamples.length > 0
          ? {
              x: Math.round(centerSamples.reduce((sum, sample) => sum + sample.x, 0) / centerSamples.length),
              y: Math.round(centerSamples.reduce((sum, sample) => sum + sample.y, 0) / centerSamples.length),
            }
          : { x: 0, y: 0 }

      setCatalog(nextCatalog)
      setLayout(layoutMap)
      setMapPositions(nextMapPositions)
      mapPositionsRef.current = nextMapPositions
      setDirtyMapIds({})
      setDraggingElementId(null)
      setPanningMap(false)
      panStartRef.current = null
      dragStartSnapshotRef.current = null
      setMapHistoryPast([])
      setMapHistoryFuture([])
      if (shouldAutoCenterFromDataRef.current) {
        setMapCenter(nextCenter)
        shouldAutoCenterFromDataRef.current = false
      }
      hydratePositionForms(nextCatalog, layoutMap)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No se pudo cargar la isla.')
    } finally {
      setLoading(false)
    }
  }, [hydratePositionForms])

  useEffect(() => {
    void fetchIslandData()
  }, [fetchIslandData])

  useEffect(() => {
    dirtyMapIdsRef.current = dirtyMapIds
  }, [dirtyMapIds])

  useEffect(() => {
    mapPositionsRef.current = mapPositions
  }, [mapPositions])

  useEffect(() => {
    savingMapRef.current = savingMap
  }, [savingMap])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const preferences: IslandEditorPreferences = {
      snapToGrid,
      avoidOverlap,
      autoSaveEnabled,
      autoSaveSeconds,
      gridStep,
      mapZoom: Number(mapZoom.toFixed(2)),
      mapCenterX: Number(mapCenter.x.toFixed(2)),
      mapCenterY: Number(mapCenter.y.toFixed(2)),
    }

    window.localStorage.setItem(ISLAND_EDITOR_PREFERENCES_KEY, JSON.stringify(preferences))
  }, [autoSaveEnabled, autoSaveSeconds, avoidOverlap, gridStep, mapCenter.x, mapCenter.y, mapZoom, snapToGrid])

  const { unlockedCount, availableCount, blockedCount } = useMemo(() => {
    const counts = {
      unlockedCount: 0,
      availableCount: 0,
      blockedCount: 0,
    }

    for (const item of catalog) {
      if (item.estado_usuario === 'DESBLOQUEADO') {
        counts.unlockedCount += 1
      } else if (item.estado_usuario === 'DISPONIBLE') {
        counts.availableCount += 1
      } else {
        counts.blockedCount += 1
      }
    }

    return counts
  }, [catalog])

  const categoryOptions = useMemo(() => {
    const values = new Set(catalog.map((item) => item.categoria))
    return ['TODAS', ...Array.from(values).sort((a, b) => a.localeCompare(b))]
  }, [catalog])

  const filteredCatalog = useMemo(() => {
    return [...catalog]
      .sort((a, b) => {
        if (a.nivel_requerido !== b.nivel_requerido) {
          return a.nivel_requerido - b.nivel_requerido
        }

        return a.nombre.localeCompare(b.nombre)
      })
      .filter((item) => {
        const statusMatch = statusFilter === 'TODOS' || item.estado_usuario === statusFilter
        const categoryMatch = categoryFilter === 'TODAS' || item.categoria === categoryFilter
        return statusMatch && categoryMatch
      })
  }, [catalog, categoryFilter, statusFilter])

  const draggableItems = useMemo(() => {
    return catalog
      .map((item) => {
        if (item.estado_usuario !== 'DESBLOQUEADO') {
          return null
        }

        const position = mapPositions[item.id] ?? {
          x: Number(positionForms[item.id]?.x ?? '0') || 0,
          y: Number(positionForms[item.id]?.y ?? '0') || 0,
          z: (() => {
            const zText = positionForms[item.id]?.z ?? ''
            if (zText.trim() === '') {
              return null
            }

            const parsedZ = Number(zText)
            return Number.isNaN(parsedZ) ? null : parsedZ
          })(),
        }

        return { item, position }
      })
      .filter((value): value is { item: IslandCatalogItem; position: MapPosition } => value !== null)
  }, [catalog, mapPositions, positionForms])

  const dirtyMapCount = useMemo(() => Object.keys(dirtyMapIds).length, [dirtyMapIds])
  const serverPlacedCount = useMemo(() => Object.keys(layout).length, [layout])

  const mapDataBounds = useMemo(() => {
    if (draggableItems.length === 0) {
      return { minX: -100, maxX: 100, minY: -100, maxY: 100 }
    }

    let minX = Number.POSITIVE_INFINITY
    let maxX = Number.NEGATIVE_INFINITY
    let minY = Number.POSITIVE_INFINITY
    let maxY = Number.NEGATIVE_INFINITY

    for (const { position } of draggableItems) {
      minX = Math.min(minX, position.x)
      maxX = Math.max(maxX, position.x)
      minY = Math.min(minY, position.y)
      maxY = Math.max(maxY, position.y)
    }

    const padding = 20

    return {
      minX: minX - padding,
      maxX: maxX + padding,
      minY: minY - padding,
      maxY: maxY + padding,
    }
  }, [draggableItems])

  const clampNumber = (value: number, min: number, max: number) => {
    return Math.min(max, Math.max(min, value))
  }

  const clampPercent = (value: number) => {
    return Math.min(100, Math.max(0, value))
  }

  const snapCoordinate = useCallback(
    (value: number) => {
      if (!snapToGrid || gridStep <= 0) {
        return Math.round(value)
      }

      return Math.round(value / gridStep) * gridStep
    },
    [gridStep, snapToGrid],
  )

  const clampCenterToBounds = useCallback(
    (center: MapCenter, zoomValue: number): MapCenter => {
      const totalWidth = Math.max(1, mapDataBounds.maxX - mapDataBounds.minX)
      const totalHeight = Math.max(1, mapDataBounds.maxY - mapDataBounds.minY)
      const visibleWidth = totalWidth / zoomValue
      const visibleHeight = totalHeight / zoomValue

      const minCenterX = mapDataBounds.minX + visibleWidth / 2
      const maxCenterX = mapDataBounds.maxX - visibleWidth / 2
      const minCenterY = mapDataBounds.minY + visibleHeight / 2
      const maxCenterY = mapDataBounds.maxY - visibleHeight / 2

      return {
        x: minCenterX > maxCenterX ? (mapDataBounds.minX + mapDataBounds.maxX) / 2 : clampNumber(center.x, minCenterX, maxCenterX),
        y: minCenterY > maxCenterY ? (mapDataBounds.minY + mapDataBounds.maxY) / 2 : clampNumber(center.y, minCenterY, maxCenterY),
      }
    },
    [mapDataBounds.maxX, mapDataBounds.maxY, mapDataBounds.minX, mapDataBounds.minY],
  )

  const visibleBounds = useMemo(() => {
    const totalWidth = Math.max(1, mapDataBounds.maxX - mapDataBounds.minX)
    const totalHeight = Math.max(1, mapDataBounds.maxY - mapDataBounds.minY)
    const visibleWidth = totalWidth / mapZoom
    const visibleHeight = totalHeight / mapZoom

    const normalizedCenter = clampCenterToBounds(mapCenter, mapZoom)

    return {
      minX: normalizedCenter.x - visibleWidth / 2,
      maxX: normalizedCenter.x + visibleWidth / 2,
      minY: normalizedCenter.y - visibleHeight / 2,
      maxY: normalizedCenter.y + visibleHeight / 2,
      width: visibleWidth,
      height: visibleHeight,
    }
  }, [clampCenterToBounds, mapCenter, mapDataBounds.maxX, mapDataBounds.maxY, mapDataBounds.minX, mapDataBounds.minY, mapZoom])

  const gridBackgroundSizePercent = useMemo(() => {
    const percentX = clampNumber((gridStep / Math.max(1, visibleBounds.width)) * 100, 2, 50)
    const percentY = clampNumber((gridStep / Math.max(1, visibleBounds.height)) * 100, 2, 50)

    return {
      backgroundSize: `${percentX}% ${percentY}%`,
    }
  }, [gridStep, visibleBounds.height, visibleBounds.width])

  const toPercent = (value: number, min: number, max: number) => {
    if (max === min) {
      return 50
    }

    return ((value - min) / (max - min)) * 100
  }

  const fromPercent = (percent: number, min: number, max: number) => {
    return min + ((max - min) * percent) / 100
  }

  const collisionMinDistance = useMemo(() => {
    return Math.max(8, snapToGrid ? gridStep : 10)
  }, [gridStep, snapToGrid])

  const hasCollision = useCallback(
    (movingElementId: number, x: number, y: number, positions: Record<number, MapPosition>) => {
      for (const [rawId, position] of Object.entries(positions)) {
        const elementId = Number(rawId)
        if (elementId === movingElementId) {
          continue
        }

        const distance = Math.hypot(position.x - x, position.y - y)
        if (distance < collisionMinDistance) {
          return true
        }
      }

      return false
    },
    [collisionMinDistance],
  )

  const resolveCollision = useCallback(
    (movingElementId: number, x: number, y: number, positions: Record<number, MapPosition>) => {
      if (!avoidOverlap || !hasCollision(movingElementId, x, y, positions)) {
        return { x, y }
      }

      const directions: Array<{ x: number; y: number }> = [
        { x: 1, y: 0 },
        { x: -1, y: 0 },
        { x: 0, y: 1 },
        { x: 0, y: -1 },
        { x: 1, y: 1 },
        { x: 1, y: -1 },
        { x: -1, y: 1 },
        { x: -1, y: -1 },
      ]

      for (let radius = 1; radius <= 8; radius++) {
        for (const direction of directions) {
          const candidateX = snapCoordinate(x + direction.x * collisionMinDistance * radius)
          const candidateY = snapCoordinate(y + direction.y * collisionMinDistance * radius)

          if (!hasCollision(movingElementId, candidateX, candidateY, positions)) {
            return { x: candidateX, y: candidateY }
          }
        }
      }

      return { x, y }
    },
    [avoidOverlap, collisionMinDistance, hasCollision, snapCoordinate],
  )

  const markDirtyForSnapshotChange = useCallback((before: MapSnapshot, after: MapSnapshot) => {
    const ids = new Set<number>([
      ...Object.keys(before).map(Number),
      ...Object.keys(after).map(Number),
    ])

    setDirtyMapIds((current) => {
      const next = { ...current }
      for (const id of ids) {
        next[id] = true
      }
      return next
    })
  }, [])

  const syncFormsWithSnapshot = useCallback((snapshot: MapSnapshot) => {
    setPositionForms((current) => {
      const next = { ...current }

      for (const [rawId, position] of Object.entries(snapshot)) {
        const id = Number(rawId)
        next[id] = {
          ...(next[id] ?? { x: '0', y: '0', z: '' }),
          x: String(position.x),
          y: String(position.y),
          z: position.z === null ? '' : String(position.z),
        }
      }

      return next
    })
  }, [])

  const recordHistorySnapshot = useCallback((snapshot: MapSnapshot) => {
    setMapHistoryPast((current) => {
      if (current.length > 0 && areMapSnapshotsEqual(current[current.length - 1], snapshot)) {
        return current
      }

      if (current.length >= MAX_MAP_HISTORY_STEPS) {
        return [...current.slice(1), snapshot]
      }

      return [...current, snapshot]
    })

    setMapHistoryFuture([])
  }, [])

  const handleUndoMapChange = useCallback(() => {
    if (mapHistoryPast.length === 0 || savingMapRef.current) {
      return
    }

    const currentSnapshot = cloneMapSnapshot(mapPositionsRef.current)
    const previousSnapshot = mapHistoryPast[mapHistoryPast.length - 1]

    setMapHistoryPast((current) => current.slice(0, -1))
    setMapHistoryFuture((current) => [currentSnapshot, ...current].slice(0, MAX_MAP_HISTORY_STEPS))

    mapPositionsRef.current = cloneMapSnapshot(previousSnapshot)
    setMapPositions(previousSnapshot)
    syncFormsWithSnapshot(previousSnapshot)
    markDirtyForSnapshotChange(currentSnapshot, previousSnapshot)

    setAutoSaveStatus(null)
    setFeedback('Se deshizo el ultimo movimiento del mapa.')
  }, [mapHistoryPast, markDirtyForSnapshotChange, syncFormsWithSnapshot])

  const handleRedoMapChange = useCallback(() => {
    if (mapHistoryFuture.length === 0 || savingMapRef.current) {
      return
    }

    const currentSnapshot = cloneMapSnapshot(mapPositionsRef.current)
    const nextSnapshot = mapHistoryFuture[0]

    setMapHistoryFuture((current) => current.slice(1))
    setMapHistoryPast((current) => [...current, currentSnapshot].slice(-MAX_MAP_HISTORY_STEPS))

    mapPositionsRef.current = cloneMapSnapshot(nextSnapshot)
    setMapPositions(nextSnapshot)
    syncFormsWithSnapshot(nextSnapshot)
    markDirtyForSnapshotChange(currentSnapshot, nextSnapshot)

    setAutoSaveStatus(null)
    setFeedback('Se rehizo el movimiento del mapa.')
  }, [mapHistoryFuture, markDirtyForSnapshotChange, syncFormsWithSnapshot])

  const applyMapPosition = useCallback(
    (elementId: number, rawX: number, rawY: number, recordHistory = true) => {
      const x = snapCoordinate(rawX)
      const y = snapCoordinate(rawY)

      if (recordHistory) {
        recordHistorySnapshot(cloneMapSnapshot(mapPositionsRef.current))
      }

      setMapPositions((current) => {
        const resolved = resolveCollision(elementId, x, y, current)

        setPositionForms((forms) => ({
          ...forms,
          [elementId]: {
            ...(forms[elementId] ?? { x: '0', y: '0', z: '' }),
            x: String(resolved.x),
            y: String(resolved.y),
          },
        }))

        const next = {
          ...current,
          [elementId]: {
            ...(current[elementId] ?? { x: 0, y: 0, z: null }),
            x: resolved.x,
            y: resolved.y,
          },
        }

        mapPositionsRef.current = next

        return next
      })

      setDirtyMapIds((current) => ({
        ...current,
        [elementId]: true,
      }))
    },
    [recordHistorySnapshot, resolveCollision, snapCoordinate],
  )

  const updateMapPositionFromPointer = useCallback(
    (elementId: number, clientX: number, clientY: number) => {
      const mapNode = mapRef.current
      if (!mapNode) {
        return
      }

      const rect = mapNode.getBoundingClientRect()
      const relativeX = clampPercent(((clientX - rect.left) / rect.width) * 100)
      const relativeY = clampPercent(((clientY - rect.top) / rect.height) * 100)

      const nextX = fromPercent(relativeX, visibleBounds.minX, visibleBounds.maxX)
      const nextY = fromPercent(relativeY, visibleBounds.minY, visibleBounds.maxY)

      applyMapPosition(elementId, nextX, nextY, false)
    },
    [applyMapPosition, visibleBounds.maxX, visibleBounds.maxY, visibleBounds.minX, visibleBounds.minY],
  )

  const handleUnlock = async (elementId: number) => {
    setUnlockingId(elementId)
    setError(null)
    setFeedback(null)

    try {
      await apiPost('/island/unlock', { elemento_id: elementId })
      setFeedback('Elemento desbloqueado correctamente.')
      await fetchIslandData()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No se pudo desbloquear el elemento.')
    } finally {
      setUnlockingId(null)
    }
  }

  const handlePositionChange = (elementId: number, field: keyof PositionForm, value: string) => {
    if (field === 'x' || field === 'y') {
      const parsed = Number(value)
      if (!Number.isNaN(parsed)) {
        const fallback = mapPositions[elementId] ?? { x: 0, y: 0, z: null }
        if (field === 'x') {
          applyMapPosition(elementId, parsed, fallback.y)
        } else {
          applyMapPosition(elementId, fallback.x, parsed)
        }
      } else {
        setPositionForms((current) => ({
          ...current,
          [elementId]: {
            ...(current[elementId] ?? { x: '0', y: '0', z: '' }),
            [field]: value,
          },
        }))
      }

      return
    }

    if (field === 'z') {
      setPositionForms((current) => ({
        ...current,
        [elementId]: {
          ...(current[elementId] ?? { x: '0', y: '0', z: '' }),
          [field]: value,
        },
      }))

      const trimmed = value.trim()
      const parsed = trimmed === '' ? null : Number(trimmed)

      if (parsed === null || !Number.isNaN(parsed)) {
        const currentZ = mapPositionsRef.current[elementId]?.z ?? null

        if (currentZ !== parsed) {
          recordHistorySnapshot(cloneMapSnapshot(mapPositionsRef.current))
        }

        setMapPositions((current) => {
          const next = {
            ...current,
            [elementId]: {
              ...(current[elementId] ?? { x: 0, y: 0, z: null }),
              z: parsed,
            },
          }

          mapPositionsRef.current = next

          return next
        })

        setDirtyMapIds((current) => ({
          ...current,
          [elementId]: true,
        }))
      }

      return
    }

    setPositionForms((current) => ({
      ...current,
      [elementId]: {
        ...(current[elementId] ?? { x: '0', y: '0', z: '' }),
        [field]: value,
      },
    }))
  }

  const handleApplyPreset = (elementId: number, preset: PositionPreset) => {
    let x = 0
    let y = 0

    switch (preset) {
      case 'NORTH':
        y = -80
        break
      case 'SOUTH':
        y = 80
        break
      case 'EAST':
        x = 80
        break
      case 'WEST':
        x = -80
        break
      case 'RANDOM':
        x = Math.floor(Math.random() * 201) - 100
        y = Math.floor(Math.random() * 201) - 100
        break
      case 'CENTER':
      default:
        break
    }

    applyMapPosition(elementId, x, y)
  }

  const handleMapPointerDown = (elementId: number, event: React.PointerEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    if (panMode) {
      return
    }

    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    dragStartSnapshotRef.current = cloneMapSnapshot(mapPositionsRef.current)
    setDraggingElementId(elementId)
    setError(null)
    setFeedback(null)
    updateMapPositionFromPointer(elementId, event.clientX, event.clientY)
  }

  const handleMapBackgroundPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!panMode) {
      return
    }

    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    setPanningMap(true)
    panStartRef.current = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      centerX: mapCenter.x,
      centerY: mapCenter.y,
    }
  }

  const handleMapPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (panningMap && panStartRef.current && mapRef.current) {
      const rect = mapRef.current.getBoundingClientRect()
      const deltaX = event.clientX - panStartRef.current.pointerX
      const deltaY = event.clientY - panStartRef.current.pointerY

      const worldDeltaX = (deltaX / rect.width) * visibleBounds.width
      const worldDeltaY = (deltaY / rect.height) * visibleBounds.height

      setMapCenter(
        clampCenterToBounds(
          {
            x: panStartRef.current.centerX - worldDeltaX,
            y: panStartRef.current.centerY - worldDeltaY,
          },
          mapZoom,
        ),
      )

      return
    }

    if (draggingElementId === null) {
      return
    }

    updateMapPositionFromPointer(draggingElementId, event.clientX, event.clientY)
  }

  const handleMapPointerEnd = () => {
    if (draggingElementId !== null && dragStartSnapshotRef.current) {
      const before = dragStartSnapshotRef.current
      const after = cloneMapSnapshot(mapPositionsRef.current)

      if (!areMapSnapshotsEqual(before, after)) {
        recordHistorySnapshot(before)
      }
    }

    setDraggingElementId(null)
    setPanningMap(false)
    panStartRef.current = null
    dragStartSnapshotRef.current = null
  }

  const handleMapWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault()

    const delta = event.deltaY < 0 ? 0.2 : -0.2

    setMapZoom((current) => {
      const next = clampNumber(current + delta, 0.8, 3)
      setMapCenter((center) => clampCenterToBounds(center, next))
      return Number(next.toFixed(2))
    })
  }

  const handleZoomButtons = (delta: number) => {
    setMapZoom((current) => {
      const next = clampNumber(current + delta, 0.8, 3)
      setMapCenter((center) => clampCenterToBounds(center, next))
      return Number(next.toFixed(2))
    })
  }

  const handleResetView = () => {
    setMapZoom(1)
    setMapCenter({
      x: Math.round((mapDataBounds.minX + mapDataBounds.maxX) / 2),
      y: Math.round((mapDataBounds.minY + mapDataBounds.maxY) / 2),
    })
  }

  const handleSaveMapChanges = useCallback(
    async (mode: 'manual' | 'auto' = 'manual', customElementIds?: number[]) => {
      const elementIds = customElementIds ?? Object.keys(dirtyMapIdsRef.current).map(Number)

      if (elementIds.length === 0) {
        if (mode === 'manual') {
          setFeedback('No hay cambios en el mapa por guardar.')
        }

        return
      }

      if (savingMapRef.current) {
        if (mode === 'manual') {
          setFeedback('Ya hay un guardado de mapa en curso.')
        }

        return
      }

      setSavingMap(true)
      savingMapRef.current = true

      if (mode === 'manual') {
        setError(null)
        setFeedback(null)
      }

      try {
        for (const elementId of elementIds) {
          const position = mapPositionsRef.current[elementId]
          if (!position) {
            continue
          }

          await apiPost('/island/layout', {
            elemento_id: elementId,
            posicion_x: position.x,
            posicion_y: position.y,
            posicion_z: position.z,
          })
        }

        if (mode === 'manual') {
          setFeedback(`${elementIds.length} posicion(es) del mapa guardadas.`)
        } else {
          setAutoSaveStatus(`Autoguardado: ${elementIds.length} cambio(s) a las ${new Date().toLocaleTimeString()}.`)
        }

        await fetchIslandData()
      } catch (requestError) {
        const message = requestError instanceof Error ? requestError.message : 'No se pudieron guardar los cambios del mapa.'

        if (mode === 'manual') {
          setError(message)
        } else {
          setAutoSaveStatus(`Autoguardado con error: ${message}`)
        }
      } finally {
        setSavingMap(false)
        savingMapRef.current = false
      }
    },
    [fetchIslandData],
  )

  useEffect(() => {
    if (!autoSaveEnabled) {
      return
    }

    const intervalMs = Math.max(5, autoSaveSeconds) * 1000

    const intervalId = window.setInterval(() => {
      if (savingMapRef.current) {
        return
      }

      const pendingIds = Object.keys(dirtyMapIdsRef.current).map(Number)
      if (pendingIds.length === 0) {
        return
      }

      void handleSaveMapChanges('auto', pendingIds)
    }, intervalMs)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [autoSaveEnabled, autoSaveSeconds, handleSaveMapChanges])

  const handleSavePosition = async (elementId: number) => {
    const form = positionForms[elementId] ?? { x: '0', y: '0', z: '' }
    const x = Number(form.x)
    const y = Number(form.y)
    const z = form.z.trim() === '' ? null : Number(form.z)

    if (Number.isNaN(x) || Number.isNaN(y) || (z !== null && Number.isNaN(z))) {
      setError('Las posiciones deben ser numericas.')
      return
    }

    setSavingId(elementId)
    setError(null)
    setFeedback(null)

    try {
      await apiPost('/island/layout', {
        elemento_id: elementId,
        posicion_x: x,
        posicion_y: y,
        posicion_z: z,
      })

      setMapPositions((current) => ({
        ...current,
        [elementId]: {
          ...(current[elementId] ?? { x: 0, y: 0, z: null }),
          x,
          y,
          z,
        },
      }))

      setDirtyMapIds((current) => {
        const next = { ...current }
        delete next[elementId]
        return next
      })

      setFeedback('Posicion guardada correctamente.')
      await fetchIslandData()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No se pudo guardar la posicion.')
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5 rounded-3xl border border-amber-100 bg-gradient-to-br from-amber-50 via-sky-50 to-emerald-50 p-6 shadow-lg">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Mi Isla</h1>
          <p className="text-sm text-slate-600">Gestiona tus elementos, desbloquea recompensas y define su ubicacion.</p>
        </div>
        <button
          className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white"
          onClick={() => {
            clearSession()
            location.href = '/login'
          }}
          type="button"
        >
          Cerrar sesión
        </button>
      </header>

      <nav className="flex flex-wrap gap-2 text-sm">
        {navLinks.map((link) => (
          <Link className="rounded-full border border-slate-300 bg-white px-3 py-1 text-slate-700 hover:border-slate-500" key={link.route} to={link.route}>
            {link.label}
          </Link>
        ))}
      </nav>

      {loading && <p className="text-sm text-slate-600">Cargando isla...</p>}
      {!loading && error && <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {!loading && feedback && <p className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{feedback}</p>}

      {!loading && (
        <>
          <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white/80 p-4 md:grid-cols-3">
            <article className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
              <p className="text-xs uppercase tracking-wide text-emerald-700">Desbloqueados</p>
              <p className="text-2xl font-semibold text-emerald-900">{unlockedCount}</p>
            </article>
            <article className="rounded-xl border border-amber-200 bg-amber-50 p-3">
              <p className="text-xs uppercase tracking-wide text-amber-700">Disponibles</p>
              <p className="text-2xl font-semibold text-amber-900">{availableCount}</p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-700">Bloqueados</p>
              <p className="text-2xl font-semibold text-slate-900">{blockedCount}</p>
            </article>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white/80 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-900">Vista rapida del terreno</h2>
              <p className="text-sm text-slate-600">Editables: {draggableItems.length} | Guardados: {serverPlacedCount}</p>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50"
                disabled={savingMap || dirtyMapCount === 0}
                onClick={() => void handleSaveMapChanges('manual', Object.keys(dirtyMapIds).map(Number))}
                type="button"
              >
                {savingMap ? 'Guardando mapa...' : `Guardar cambios del mapa (${dirtyMapCount})`}
              </button>

              <button
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                disabled={savingMap || mapHistoryPast.length === 0}
                onClick={handleUndoMapChange}
                type="button"
              >
                Deshacer ({mapHistoryPast.length})
              </button>

              <button
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                disabled={savingMap || mapHistoryFuture.length === 0}
                onClick={handleRedoMapChange}
                type="button"
              >
                Rehacer ({mapHistoryFuture.length})
              </button>

              <button
                className={`rounded-md px-3 py-2 text-sm ${autoSaveEnabled ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700 border border-slate-300'}`}
                onClick={() => {
                  setAutoSaveEnabled((current) => !current)
                  setAutoSaveStatus(null)
                }}
                type="button"
              >
                {autoSaveEnabled ? 'Autoguardado: ON' : 'Autoguardado: OFF'}
              </button>

              <label className="text-xs text-slate-600">
                Intervalo
                <select
                  className="ml-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs"
                  onChange={(event) => setAutoSaveSeconds(Number(event.target.value))}
                  value={autoSaveSeconds}
                >
                  {AUTOSAVE_INTERVAL_OPTIONS.map((seconds) => (
                    <option key={seconds} value={seconds}>
                      {seconds}s
                    </option>
                  ))}
                </select>
              </label>

              <button
                className={`rounded-md px-3 py-2 text-sm ${panMode ? 'bg-sky-600 text-white' : 'bg-white text-slate-700 border border-slate-300'}`}
                onClick={() => setPanMode((current) => !current)}
                type="button"
              >
                {panMode ? 'Modo pan: Activo' : 'Modo pan'}
              </button>

              <button
                className={`rounded-md px-3 py-2 text-sm ${snapToGrid ? 'bg-emerald-600 text-white' : 'bg-white text-slate-700 border border-slate-300'}`}
                onClick={() => setSnapToGrid((current) => !current)}
                type="button"
              >
                {snapToGrid ? 'Snap: ON' : 'Snap: OFF'}
              </button>

              <button
                className={`rounded-md px-3 py-2 text-sm ${avoidOverlap ? 'bg-fuchsia-600 text-white' : 'bg-white text-slate-700 border border-slate-300'}`}
                onClick={() => setAvoidOverlap((current) => !current)}
                type="button"
              >
                {avoidOverlap ? 'Colisiones: ON' : 'Colisiones: OFF'}
              </button>

              <label className="text-xs text-slate-600">
                Grilla
                <select
                  className="ml-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs"
                  onChange={(event) => setGridStep(Number(event.target.value))}
                  value={gridStep}
                >
                  {GRID_STEP_OPTIONS.map((step) => (
                    <option key={step} value={step}>
                      {step}
                    </option>
                  ))}
                </select>
              </label>

              <div className="ml-auto flex items-center gap-1">
                <button className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm" onClick={() => handleZoomButtons(-0.2)} type="button">
                  -
                </button>
                <span className="min-w-16 text-center text-xs text-slate-600">Zoom {mapZoom.toFixed(1)}x</span>
                <button className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm" onClick={() => handleZoomButtons(0.2)} type="button">
                  +
                </button>
                <button className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs" onClick={handleResetView} type="button">
                  Reset vista
                </button>
              </div>
            </div>

            <p className="mt-2 text-xs text-slate-500">
              {panMode
                ? 'Arrastra el fondo para mover la camara. Usa rueda para zoom.'
                : `Arrastra nodos para moverlos. ${avoidOverlap ? 'Si detecta choque, buscara una posicion cercana libre.' : 'Se permite superposicion entre nodos.'}`}
            </p>

            {autoSaveEnabled && <p className="mt-1 text-xs text-indigo-700">Autoguardado activo cada {autoSaveSeconds} segundos.</p>}
            {autoSaveStatus && <p className="mt-1 text-xs text-slate-600">{autoSaveStatus}</p>}

            {draggableItems.length === 0 ? (
              <p className="mt-3 text-sm text-slate-600">Desbloquea elementos para editarlos en el mapa.</p>
            ) : (
              <div
                className="relative mt-3 h-72 overflow-hidden rounded-2xl border border-slate-200 bg-[radial-gradient(circle_at_20%_20%,rgba(251,191,36,0.22),transparent_35%),radial-gradient(circle_at_80%_20%,rgba(14,165,233,0.2),transparent_35%),radial-gradient(circle_at_50%_100%,rgba(16,185,129,0.2),transparent_45%),#f8fafc)]"
                onPointerDown={handleMapBackgroundPointerDown}
                onPointerCancel={handleMapPointerEnd}
                onPointerMove={handleMapPointerMove}
                onPointerUp={handleMapPointerEnd}
                onWheel={handleMapWheel}
                ref={mapRef}
              >
                <div className="absolute inset-x-0 top-1/2 border-t border-slate-300/60" />
                <div className="absolute inset-y-0 left-1/2 border-l border-slate-300/60" />
                {snapToGrid && (
                  <div
                    className="pointer-events-none absolute inset-0 opacity-35"
                    style={{
                      ...gridBackgroundSizePercent,
                      backgroundImage:
                        'linear-gradient(to right, rgba(51,65,85,0.18) 1px, transparent 1px), linear-gradient(to bottom, rgba(51,65,85,0.18) 1px, transparent 1px)',
                    }}
                  />
                )}

                {draggableItems.map(({ item, position }) => {
                  const left = toPercent(position.x, visibleBounds.minX, visibleBounds.maxX)
                  const top = toPercent(position.y, visibleBounds.minY, visibleBounds.maxY)
                  const isDirty = Boolean(dirtyMapIds[item.id])
                  const isDragging = draggingElementId === item.id

                  return (
                    <button
                      className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border px-2 py-1 text-xs font-semibold shadow transition ${isDragging ? 'cursor-grabbing border-slate-800 bg-slate-900 text-white' : 'cursor-grab border-slate-300 bg-white text-slate-700'} ${isDirty ? 'ring-2 ring-amber-400' : ''} ${panMode ? 'opacity-70' : ''}`}
                      key={item.id}
                      onPointerDown={(event) => handleMapPointerDown(item.id, event)}
                      style={{ left: `${left}%`, top: `${top}%` }}
                      title={`${item.nombre} (${position.x}, ${position.y})`}
                      type="button"
                    >
                      {item.nombre.slice(0, 2).toUpperCase()}
                    </button>
                  )
                })}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white/80 p-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex flex-wrap gap-2">
                {(['TODOS', 'DESBLOQUEADO', 'DISPONIBLE', 'BLOQUEADO'] as const).map((status) => (
                  <button
                    className={`rounded-full border px-3 py-1 text-sm transition ${statusFilter === status ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 bg-white text-slate-700'}`}
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    type="button"
                  >
                    {status === 'TODOS' ? 'Todos' : statusLabel[status]}
                  </button>
                ))}
              </div>

              <label className="text-sm text-slate-700">
                Categoria
                <select
                  className="ml-2 rounded-md border border-slate-300 bg-white px-2 py-1"
                  onChange={(event) => setCategoryFilter(event.target.value)}
                  value={categoryFilter}
                >
                  {categoryOptions.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-slate-900">Catalogo de elementos</h2>
              <p className="text-sm text-slate-600">
                Mostrando <strong>{filteredCatalog.length}</strong> de <strong>{catalog.length}</strong>
              </p>
            </div>

            {filteredCatalog.map((item) => {
              const form = positionForms[item.id] ?? { x: '0', y: '0', z: '' }
              const placed = layout[item.id]

              return (
                <article className={`rounded-lg border p-4 ${statusClass[item.estado_usuario]}`} key={item.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">{item.nombre}</h2>
                      <p className="text-sm text-slate-600">{item.descripcion ?? 'Sin descripcion adicional.'}</p>
                      <p className="text-sm text-slate-700">Categoria: {item.categoria}</p>
                      <p className="text-sm text-slate-700">Nivel requerido: {item.nivel_requerido}</p>
                      {item.recurso && <p className="text-sm text-slate-700">Recurso: {item.recurso}</p>}
                    </div>
                    <span className="rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700">
                      {statusLabel[item.estado_usuario]}
                    </span>
                  </div>

                  {item.estado_usuario === 'DISPONIBLE' && (
                    <button
                      className="mt-3 rounded-md bg-slate-900 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={unlockingId !== null}
                      onClick={() => void handleUnlock(item.id)}
                      type="button"
                    >
                      {unlockingId === item.id ? 'Desbloqueando...' : 'Desbloquear'}
                    </button>
                  )}

                  {item.estado_usuario === 'DESBLOQUEADO' && (
                    <div className="mt-4 grid gap-2 md:grid-cols-4">
                      <div className="md:col-span-4 flex flex-wrap gap-2">
                        {(['CENTER', 'NORTH', 'SOUTH', 'EAST', 'WEST', 'RANDOM'] as PositionPreset[]).map((preset) => (
                          <button
                            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 hover:border-slate-500"
                            key={preset}
                            onClick={() => handleApplyPreset(item.id, preset)}
                            type="button"
                          >
                            {presetLabel[preset]}
                          </button>
                        ))}
                      </div>

                      <label className="text-sm text-slate-700">
                        X
                        <input
                          className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1"
                          onChange={(event) => handlePositionChange(item.id, 'x', event.target.value)}
                          type="number"
                          value={form.x}
                        />
                      </label>
                      <label className="text-sm text-slate-700">
                        Y
                        <input
                          className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1"
                          onChange={(event) => handlePositionChange(item.id, 'y', event.target.value)}
                          type="number"
                          value={form.y}
                        />
                      </label>
                      <label className="text-sm text-slate-700">
                        Z
                        <input
                          className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1"
                          onChange={(event) => handlePositionChange(item.id, 'z', event.target.value)}
                          placeholder="Opcional"
                          type="number"
                          value={form.z}
                        />
                      </label>
                      <div className="flex items-end">
                        <button
                          className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={savingId !== null}
                          onClick={() => void handleSavePosition(item.id)}
                          type="button"
                        >
                          {savingId === item.id ? 'Guardando...' : 'Guardar posicion'}
                        </button>
                      </div>

                      <p className="md:col-span-4 text-xs text-slate-500">
                        {placed
                          ? `Posicion actual: X ${placed.posicion_x}, Y ${placed.posicion_y}${placed.posicion_z !== null ? `, Z ${placed.posicion_z}` : ''}`
                          : 'Aun no tiene posicion guardada.'}
                      </p>
                    </div>
                  )}
                </article>
              )
            })}

            {filteredCatalog.length === 0 && (
              <p className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">No hay elementos para los filtros seleccionados.</p>
            )}
          </section>
        </>
      )}
    </div>
  )
}
