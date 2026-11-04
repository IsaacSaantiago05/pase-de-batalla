import { Link } from 'react-router-dom'

const APP_ROUTES = [
  '/home',
  '/island',
  '/battle-pass',
  '/points',
  '/scan-qr',
  '/rewards',
  '/redemptions',
  '/history',
  '/businesses',
  '/profile',
]

export function AppNav({ routes = APP_ROUTES }: { routes?: string[] }) {
  return (
    <nav className="flex flex-wrap gap-2 text-sm">
      {routes.map((route) => (
        <Link className="rounded-md border px-2 py-1" key={route} to={route}>
          {route}
        </Link>
      ))}
    </nav>
  )
}
