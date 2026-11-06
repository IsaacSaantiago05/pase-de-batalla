import { Link } from 'react-router-dom'

const NAV_LINKS = [
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
]

export function AppNav({ routes }: { routes?: string[] }) {
  const links = routes ? NAV_LINKS.filter((link) => routes.includes(link.route)) : NAV_LINKS

  return (
    <nav className="flex flex-wrap gap-2 text-sm">
      {links.map((link) => (
        <Link
          className="rounded-full border border-slate-300 bg-white px-3 py-1 text-slate-700 hover:border-slate-500"
          key={link.route}
          to={link.route}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  )
}
