// Tipos y calculos del progreso del pase que usan varias pantallas (inicio, puntos, perfil, pase).

export type TierStatus = 'BLOQUEADO' | 'DESBLOQUEADO' | 'RECLAMADO'

export type BadgeKey = 'BRONCE' | 'PLATA' | 'ORO' | 'DIAMANTE'

// Un nivel del pase (del 2 al 150). El nivel 1 es el de inicio y no tiene fila.
export type BattlePassTier = {
  id: number
  nivel: number
  // Puntos ganados en total con los que se alcanza el nivel.
  puntos_requeridos: number
  // Puntos que entrega al reclamarlo (incluye el bono de la insignia, si tiene).
  puntos_bono: number
  insignia: BadgeKey | null
  estado_usuario: TierStatus
  fecha_reclamo: string | null
}

export type NextBadge = {
  nivel: number
  insignia: BadgeKey
  puntos_requeridos: number
  faltante: number
  puntos_bono: number
}

export type BattlePassProgress = {
  // Saldo para canjear (baja al canjear).
  puntos_actuales: number
  // Puntos ganados en total: con estos se sube de nivel y no bajan al canjear.
  puntos_acumulados: number
  nivel_actual: number
  nivel_maximo: number
  // Puntos ganados con los que empezo el nivel actual y con los que se alcanza el siguiente.
  puntos_nivel_actual: number
  puntos_siguiente_nivel: number | null
  faltante: number
  insignia_actual: BadgeKey | null
  siguiente_insignia: NextBadge | null
  niveles_por_reclamar: number
  puntos_por_reclamar: number
  tiers_totales: number
  tiers: BattlePassTier[]
}

export type Movement = {
  id: number
  cantidad: number
  tipo: string
  motivo?: string | null
  negocio_id: number | null
  negocio_nombre?: string | null
  fecha: string
}

// Resumen del nivel para las pantallas. La barra de progreso va de donde empezo el nivel actual
// a donde empieza el siguiente, para que se vea avanzar tambien en los niveles altos.
export function levelInfo(progress: BattlePassProgress | null) {
  const earned = progress?.puntos_acumulados ?? 0
  const level = progress?.nivel_actual ?? 1
  const levelStart = progress?.puntos_nivel_actual ?? 0
  const goal = progress?.puntos_siguiente_nivel ?? earned
  const maxed = progress !== null && progress.tiers_totales > 0 && progress.puntos_siguiente_nivel === null

  return {
    earned,
    level,
    nextLevel: level + 1,
    maxLevel: progress?.nivel_maximo ?? level,
    goal,
    remaining: progress?.faltante ?? 0,
    // En el nivel maximo la barra queda llena.
    barCurrent: maxed ? 1 : earned - levelStart,
    barMax: maxed ? 1 : goal - levelStart,
    badge: progress?.insignia_actual ?? null,
    nextBadge: progress?.siguiente_insignia ?? null,
    pendingLevels: progress?.niveles_por_reclamar ?? 0,
    pendingPoints: progress?.puntos_por_reclamar ?? 0,
    // Sin niveles cargados en el servidor no hay progreso que mostrar.
    noTiers: progress !== null && progress.tiers_totales === 0,
    maxed,
  }
}

const MOVEMENT_LABEL: Record<string, string> = {
  GANANCIA: 'Puntos ganados',
  CANJE: 'Canje de recompensa',
  AJUSTE: 'Ajuste de puntos',
  BONO_NIVEL: 'Bono de nivel',
}

export function movementLabel(movement: Movement) {
  const label = MOVEMENT_LABEL[movement.tipo] ?? movement.tipo
  if (!movement.negocio_id) return label

  return `${label} · ${movement.negocio_nombre ?? `Negocio #${movement.negocio_id}`}`
}

// El bono del pase no es de ningun negocio: en su lugar se muestra de que nivel viene
// ("Nivel 10 · Insignia Bronce"). Va en el renglon de la fecha para no cortar el titulo.
export function movementDetail(movement: Movement) {
  return movement.tipo === 'BONO_NIVEL' ? (movement.motivo ?? null) : null
}
