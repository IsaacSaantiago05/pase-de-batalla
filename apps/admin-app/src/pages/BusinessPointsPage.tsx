import { useEffect, useState } from 'react'
import { Notice, SectionTitle, formatDate } from '@shared/ui'
import { AdminPage, TableCard } from '../components/AdminLayout'
import { apiGet, listData } from '../lib/api'

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

// Solo consulta: los puntos se otorgan con el QR de una venta o con un QR por cantidad de puntos.
export function BusinessPointsPage() {
  const [history, setHistory] = useState<Movement[]>([])
  const [error, setError] = useState('')

  const loadData = async () => {
    try {
      const historyResponse = await apiGet<MovementList>('/points/business-history')
      setHistory(listData(historyResponse.data))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible cargar datos')
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  return (
    <AdminPage background="linear-gradient(180deg, #060c04 0%, #080c18 100%)" title="MOVIMIENTOS DE PUNTOS">
      {error && <Notice tone="error">{error}</Notice>}

      <SectionTitle className="text-white/40">Historial de puntos del negocio</SectionTitle>
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
