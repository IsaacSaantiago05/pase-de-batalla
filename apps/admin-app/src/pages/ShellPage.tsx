import { EmptyState } from '@shared/ui'
import { AdminPage } from '../components/AdminLayout'

// Pantallas del panel que aun no estan construidas.
export function ShellPage({ title }: { title: string }) {
  return (
    <AdminPage title={title.toUpperCase()}>
      <EmptyState icon="construction" text="Esta sección todavía está en construcción." title={title} />
    </AdminPage>
  )
}
