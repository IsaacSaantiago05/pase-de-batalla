// Perfil publico de un negocio: portada, foto de perfil y enlaces.
// Lo usan la app de usuario (vista del cliente) y el panel (vista previa en "Mi negocio"), asi se ven igual.
import type { ReactNode } from 'react'
import { Icon } from './icons'

export type BusinessLink = {
  nombre: string
  url: string
}

export type BusinessProfile = {
  id: number
  nombre: string
  descripcion: string | null
  direccion: string | null
  telefono: string | null
  logo_url: string | null
  portada_url: string | null
  enlaces: BusinessLink[]
}

export const MAX_BUSINESS_LINKS = 8

// Colores de acento del diseño, asignados por negocio para distinguir a los que aun no tienen fotos.
const ACCENTS = ['#f59e0b', '#6366f1', '#10b981', '#a855f7', '#60a5fa', '#f472b6']

export const businessAccent = (id: number) => ACCENTS[id % ACCENTS.length]

// Solo se enlazan direcciones web; cualquier otra cosa (por ejemplo "javascript:") no se vuelve un enlace.
function parseWebUrl(url: string): URL | null {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed : null
  } catch {
    return null
  }
}

// Sitio al que lleva el enlace, para que el cliente lo vea antes de abrirlo.
export function linkHost(url: string): string {
  return parseWebUrl(url)?.hostname.replace(/^www\./, '') ?? ''
}

type LinkKind = 'location' | 'phone' | 'web'

function linkKind(url: string): LinkKind {
  const parsed = parseWebUrl(url)
  if (!parsed) return 'web'

  const host = parsed.hostname.replace(/^www\./, '')
  const isGoogleMaps = /(^|\.)google\.[a-z.]+$/.test(host) && parsed.pathname.startsWith('/maps')

  if (isGoogleMaps || /^(maps\.app\.goo\.gl|goo\.gl|maps\.google\.[a-z.]+|maps\.apple\.com|waze\.com|ul\.waze\.com|openstreetmap\.org)$/.test(host)) return 'location'
  if (/^(wa\.me|api\.whatsapp\.com|whatsapp\.com)$/.test(host)) return 'phone'

  return 'web'
}

function LinkGlyph() {
  return (
    <svg aria-hidden="true" fill="none" height="1em" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="1em">
      <path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.5 1.5" />
      <path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.5-1.5" />
    </svg>
  )
}

function ExternalGlyph() {
  return (
    <svg aria-hidden="true" fill="none" height="16" stroke="rgba(255,255,255,0.35)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="16">
      <path d="M14 5h5v5M19 5l-8 8M11 7H6a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-5" />
    </svg>
  )
}

// Foto de perfil redonda; sin foto muestra el icono del negocio con su color de acento.
export function BusinessAvatar({ logoUrl, accent, size = 56, ring = false }: { logoUrl: string | null; accent: string; size?: number; ring?: boolean }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-full"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.5,
        background: logoUrl ? '#111827' : `linear-gradient(135deg, ${accent}40, #111827)`,
        border: ring ? '4px solid #080c18' : `1px solid ${accent}40`,
      }}
    >
      {logoUrl ? <img alt="" className="h-full w-full object-cover" loading="lazy" src={logoUrl} /> : <Icon color={accent} name="business" />}
    </div>
  )
}

type BusinessCoverProps = {
  nombre: string
  descripcion: string | null
  logoUrl: string | null
  portadaUrl: string | null
  accent: string
  // Sobre la esquina superior izquierda de la portada (boton de volver).
  topLeft?: ReactNode
  // Sobre la esquina superior derecha de la portada (cambiar o quitar la foto).
  coverActions?: ReactNode
  // Junto a la foto de perfil (cambiarla).
  avatarAction?: ReactNode
}

// Encabezado del perfil: foto de portada y, encima de su borde inferior, la foto de perfil con el nombre.
export function BusinessCover({ nombre, descripcion, logoUrl, portadaUrl, accent, topLeft, coverActions, avatarAction }: BusinessCoverProps) {
  return (
    <div>
      <div className="relative aspect-[16/9] max-h-64 w-full overflow-hidden" style={{ background: `linear-gradient(135deg, ${accent}55 0%, #111827 75%)` }}>
        {portadaUrl ? (
          <img alt={`Portada de ${nombre}`} className="absolute inset-0 h-full w-full object-cover" src={portadaUrl} />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-7xl opacity-20">
            <Icon color="#fff" name="business" />
          </div>
        )}
        {/* Sombra arriba y abajo para que los botones y la foto de perfil se lean sobre cualquier imagen. */}
        <div className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(8,12,24,0.55) 0%, transparent 35%, transparent 60%, rgba(8,12,24,0.9) 100%)' }} />
        {topLeft && <div className="absolute left-4 top-4">{topLeft}</div>}
        {coverActions && <div className="absolute right-3 top-3 flex flex-wrap justify-end gap-2">{coverActions}</div>}
      </div>

      <div className="relative px-5">
        <div className="-mt-12 flex items-end gap-3">
          <div className="relative">
            <BusinessAvatar accent={accent} logoUrl={logoUrl} ring size={96} />
            {avatarAction && <div className="absolute -bottom-1 -right-1">{avatarAction}</div>}
          </div>
        </div>
        <h2 className="mt-3 font-display text-2xl font-bold tracking-wide text-white">{nombre}</h2>
        <p className="mt-1 text-sm text-white/60">{descripcion ?? 'Negocio participante'}</p>
      </div>
    </div>
  )
}

// Dirección y teléfono del negocio; el teléfono se puede tocar para llamar. Sin ninguno de los dos no muestra nada.
export function BusinessContact({ direccion, telefono, accent }: { direccion: string | null; telefono: string | null; accent: string }) {
  if (!direccion && !telefono) return null

  return (
    <div className="pb-card flex flex-col gap-3 rounded-2xl p-4">
      {direccion && (
        <p className="flex items-start gap-3 text-sm text-white/70">
          <Icon className="mt-0.5 text-lg" color={accent} name="location" />
          {direccion}
        </p>
      )}
      {telefono && (
        <a className="flex items-center gap-3 text-sm font-semibold" href={`tel:${telefono.replace(/[^\d+]/g, '')}`} style={{ color: accent }}>
          <Icon className="text-lg" color={accent} name="phone" />
          {telefono}
        </a>
      )}
    </div>
  )
}

// Enlaces del negocio con el nombre que les puso (Ubicación, Instagram...). Se abren en otra pestaña.
export function BusinessLinks({ links }: { links: BusinessLink[] }) {
  const valid = links.filter((link) => parseWebUrl(link.url) !== null)

  return (
    <div className="grid gap-2 md:grid-cols-2">
      {valid.map((link, index) => {
        const kind = linkKind(link.url)

        return (
          <a
            className="pb-card flex items-center gap-3 rounded-xl px-4 py-3 transition-all active:scale-[0.98]"
            href={link.url}
            key={`${index}-${link.url}`}
            rel="noopener noreferrer"
            target="_blank"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl" style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)', color: '#fcd34d' }}>
              {kind === 'location' ? <Icon color="currentColor" name="location" /> : kind === 'phone' ? <Icon color="currentColor" name="phone" /> : <LinkGlyph />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-white">{link.nombre}</span>
              <span className="block truncate text-xs text-white/40">{linkHost(link.url)}</span>
            </span>
            <ExternalGlyph />
          </a>
        )
      })}
    </div>
  )
}
