import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Button, InputField, Notice, SectionTitle, formatDate } from '@shared/ui'
import { AdminPage, TableCard } from '../components/AdminLayout'
import { apiGet, apiPost, listData } from '../lib/api'

type Rule = {
  id: number
  negocio_id: number
  puntos: number
  monto_minimo: number
  monto_maximo: number
  estado: boolean
}

type RuleList = {
  data: Rule[]
}

type Movement = {
  id: number
  usuario_id: number
  negocio_id: number | null
  tipo: string
  cantidad: number
  fecha: string
}

type MovementList = {
  data: Movement[]
}

const money = (value: number) => `$${Number(value).toLocaleString('es-MX')}`

export function BusinessPointsPage() {
  const [rules, setRules] = useState<Rule[]>([])
  const [history, setHistory] = useState<Movement[]>([])
  const [usuarioId, setUsuarioId] = useState('')
  const [reglaId, setReglaId] = useState<number | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const loadData = async () => {
    try {
      const [rulesResponse, historyResponse] = await Promise.all([
        apiGet<RuleList>('/point-rules'),
        apiGet<MovementList>('/points/business-history'),
      ])
      setRules(listData(rulesResponse.data))
      setHistory(listData(historyResponse.data))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible cargar datos')
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setMessage('')
    setError('')

    try {
      await apiPost('/points/award', {
        usuario_id: Number(usuarioId),
        regla_puntos_id: reglaId,
      })
      setMessage('Puntos otorgados correctamente.')
      setUsuarioId('')
      setReglaId(null)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible otorgar puntos')
    }
  }

  const activeRules = rules.filter((rule) => rule.estado)
  const selected = activeRules.find((rule) => rule.id === reglaId)

  return (
    <AdminPage background="linear-gradient(180deg, #060c04 0%, #080c18 100%)" title="OTORGAR PUNTOS">
      <form className="flex flex-col gap-4" onSubmit={onSubmit}>
        <p className="text-sm leading-relaxed text-white/50">Selecciona la opción correspondiente al valor de la operación del cliente.</p>

        <div className="grid gap-3 md:grid-cols-2">
          {activeRules.map((rule) => {
            const active = reglaId === rule.id

            return (
              <button
                className="flex items-center justify-between rounded-2xl px-5 py-4 transition-all active:scale-[0.98]"
                key={rule.id}
                onClick={() => setReglaId(rule.id)}
                style={{
                  background: active ? 'linear-gradient(135deg, rgba(245,158,11,0.18), #1a2235)' : 'linear-gradient(135deg, #1a2235, #111827)',
                  border: `1px solid ${active ? 'rgba(245,158,11,0.45)' : 'rgba(255,255,255,0.06)'}`,
                  boxShadow: active ? '0 4px 20px rgba(245,158,11,0.1)' : 'none',
                }}
                type="button"
              >
                <div className="text-left">
                  <p className="font-display text-xs font-bold uppercase tracking-widest text-white/40">Compra de</p>
                  <p className="font-display text-lg font-bold text-white">
                    {money(rule.monto_minimo)} – {money(rule.monto_maximo)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-mono-game text-2xl font-bold" style={{ color: active ? '#fcd34d' : '#f59e0b' }}>
                    {rule.puntos}
                  </p>
                  <p className="font-display text-xs text-white/40">PUNTOS</p>
                </div>
              </button>
            )
          })}
        </div>
        {activeRules.length === 0 && <p className="text-sm text-white/40">No hay reglas de puntos activas para este negocio.</p>}

        <InputField inputMode="numeric" label="ID del cliente" onChange={(e) => setUsuarioId(e.target.value)} value={usuarioId} />

        <Button className="w-full tracking-widest" disabled={!selected || !usuarioId.trim()} size="lg" type="submit">
          {selected ? `OTORGAR ${selected.puntos} PTS` : 'SELECCIONA UN MONTO'}
        </Button>
      </form>

      {message && <Notice tone="success">{message}</Notice>}
      {error && <Notice tone="error">{error}</Notice>}

      <SectionTitle className="mt-2 text-white/40">Historial de puntos otorgados</SectionTitle>
      <TableCard>
        <table className="pb-table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Tipo</th>
              <th>Cantidad</th>
              <th>Fecha</th>
            </tr>
          </thead>
          <tbody>
            {history.map((row) => (
              <tr key={row.id}>
                <td>#{row.usuario_id}</td>
                <td>{row.tipo}</td>
                <td className="font-mono-game font-bold" style={{ color: row.cantidad < 0 ? '#ef4444' : '#10b981' }}>
                  {row.cantidad > 0 ? `+${row.cantidad}` : row.cantidad}
                </td>
                <td>{formatDate(row.fecha, true)}</td>
              </tr>
            ))}
            {history.length === 0 && (
              <tr>
                <td className="text-white/40" colSpan={4}>
                  Sin movimientos todavía.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </TableCard>
    </AdminPage>
  )
}
