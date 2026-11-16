// Tipos y calculos del progreso del pase que usan varias pantallas (inicio, puntos, perfil, pase).

export type TierStatus = 'BLOQUEADO' | 'DESBLOQUEADO' | 'RECLAMADO'

export type BattlePassTier = {
  id: number
  nombre: string
  descripcion: string | null
  puntos_requeridos: number
  recompensa_nombre: string
  recompensa_descripcion: string | null
  estado_usuario: TierStatus
  fecha_reclamo: string | null
}

export type BattlePassProgress = {
  // Saldo para canjear (baja al canjear).
  puntos_actuales: number
  // Puntos ganados en total: con estos avanza el pase y no bajan al canjear.
  puntos_acumulados?: number
  tiers_desbloqueados: number
  tiers_totales: number
  progreso_porcentaje: number
  siguiente_hito_puntos: number | null
  siguiente_hito_faltante: number
  tiers: BattlePassTier[]
}

export type Movement = {
  id: number
  cantidad: number
  tipo: string
  negocio_id: number | null
  fecha: string
}

// El "nivel" que muestra el diseño es el numero de rangos del pase alcanzados con los puntos ganados.
export function levelInfo(progress: BattlePassProgress | null) {
  const earned = progress?.puntos_acumulados ?? progress?.puntos_actuales ?? 0
  const level = progress?.tiers_desbloqueados ?? 0
  const nextIndex = progress ? progress.tiers.findIndex((tier) => tier.estado_usuario === 'BLOQUEADO') : -1
  const nextTier = nextIndex >= 0 && progress ? progress.tiers[nextIndex] : null
  const goal = progress?.siguiente_hito_puntos ?? earned

  return {
    earned,
    level,
    goal,
    remaining: progress?.siguiente_hito_faltante ?? 0,
    nextTier,
    nextLevel: nextIndex + 1,
    // Sin rangos configurados no hay "nivel maximo" que mostrar.
    noTiers: progress !== null && progress.tiers_totales === 0,
    maxed: progress !== null && progress.tiers_totales > 0 && progress.siguiente_hito_puntos === null,
  }
}

const MOVEMENT_LABEL: Record<string, string> = {
  GANANCIA: 'Puntos ganados',
  CANJE: 'Canje de recompensa',
  AJUSTE: 'Ajuste de puntos',
}

export function movementLabel(movement: Movement) {
  const label = MOVEMENT_LABEL[movement.tipo] ?? movement.tipo
  return movement.negocio_id ? `${label} · Negocio #${movement.negocio_id}` : label
}
