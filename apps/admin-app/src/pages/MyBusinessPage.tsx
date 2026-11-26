import { useEffect, useRef, useState } from 'react'
import type { ButtonHTMLAttributes, ChangeEvent, FormEvent } from 'react'
import { ApiError } from '@shared/api'
import { BusinessContact, BusinessCover, BusinessLinks, MAX_BUSINESS_LINKS, businessAccent } from '@shared/business-profile'
import type { BusinessProfile } from '@shared/business-profile'
import { Button, ChipButton, EmptyState, FieldLabel, Icon, InputField, LoadingState, Notice, SectionTitle } from '@shared/ui'
import { AdminPage } from '../components/AdminLayout'
import { apiDelete, apiGet, apiPut, apiUpload, listData } from '../lib/api'
import { getAdminSession } from '../lib/auth'
import { AVATAR_PRESET, COVER_PRESET, IMAGE_ACCEPT, prepareImage } from '@shared/image'

// Las dos fotos del perfil: a donde se suben y como se preparan antes de enviarlas.
const IMAGES = {
  cover: { path: 'cover', preset: COVER_PRESET, name: 'foto de portada' },
  logo: { path: 'logo', preset: AVATAR_PRESET, name: 'foto de perfil' },
} as const

type ImageKind = keyof typeof IMAGES

// Fila del editor de enlaces; `key` solo sirve para que React distinga las filas al quitar una.
type LinkDraft = { key: number; nombre: string; url: string }

const LINK_SUGGESTIONS = ['Ubicación', 'Facebook', 'Instagram', 'WhatsApp', 'TikTok', 'Sitio web']

// Datos de texto del perfil. Vacio significa "sin dato": no se muestra a los clientes.
type Details = { descripcion: string; direccion: string; telefono: string }

const MAX_DESCRIPTION = 500
// Lo mismo que acepta la API: numeros, espacios y los signos + - ( ) .
const PHONE_PATTERN = /^[0-9+()\-.\s]{7,40}$/

const toDetails = (profile: BusinessProfile | null): Details => ({
  descripcion: profile?.descripcion ?? '',
  direccion: profile?.direccion ?? '',
  telefono: profile?.telefono ?? '',
})

// "instagram.com/minegocio" se guarda como "https://instagram.com/minegocio".
function normalizeUrl(value: string) {
  const url = value.trim()
  if (url === '' || /^https?:\/\//i.test(url)) return url
  return `https://${url}`
}

function isWebUrl(value: string) {
  try {
    const url = new URL(value)
    return (url.protocol === 'http:' || url.protocol === 'https:') && url.hostname.includes('.')
  } catch {
    return false
  }
}

// Fondo oscuro para lo que va encima de la foto de portada: se lee sobre cualquier imagen.
const OVERLAY_STYLE = { background: 'rgba(8,12,24,0.78)', border: '1px solid rgba(255,255,255,0.2)', backdropFilter: 'blur(6px)' }

// Boton de texto sobre la foto de portada.
function OverlayButton({ className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 font-display text-xs font-bold tracking-wide text-white transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      style={OVERLAY_STYLE}
      type="button"
      {...props}
    />
  )
}

// Boton redondo de camara: el unico control para agregar o cambiar una foto (no hay boton de texto aparte).
function CameraButton({ label, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      aria-label={label}
      className="flex h-9 w-9 items-center justify-center rounded-full text-lg transition-all active:scale-90 disabled:cursor-not-allowed disabled:opacity-60"
      style={{ background: '#f59e0b', border: '3px solid #080c18', color: '#0d0a00' }}
      title={label}
      type="button"
      {...props}
    >
      <Icon color="currentColor" name="camera" />
    </button>
  )
}

// "Mi negocio": el negocio arma el perfil que ven sus clientes en la app (portada, foto de perfil, datos y enlaces).
// El administrador general usa la misma pantalla eligiendo un negocio, para ayudar o retirar contenido indebido.
export function MyBusinessPage() {
  const isGeneral = getAdminSession()?.role === 'ADMINISTRADOR_GENERAL'
  const [businesses, setBusinesses] = useState<BusinessProfile[]>([])
  const [business, setBusiness] = useState<BusinessProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [links, setLinks] = useState<LinkDraft[]>([])
  const [linkErrors, setLinkErrors] = useState<Record<string, string>>({})
  const [linksDirty, setLinksDirty] = useState(false)
  const [savingLinks, setSavingLinks] = useState(false)
  const [details, setDetails] = useState<Details>(toDetails(null))
  const [detailErrors, setDetailErrors] = useState<Partial<Details>>({})
  const [detailsDirty, setDetailsDirty] = useState(false)
  const [savingDetails, setSavingDetails] = useState(false)
  const [busyImage, setBusyImage] = useState<ImageKind | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const nextKey = useRef(1)
  const coverInput = useRef<HTMLInputElement>(null)
  const logoInput = useRef<HTMLInputElement>(null)

  const toDrafts = (profile: BusinessProfile): LinkDraft[] => profile.enlaces.map((link) => ({ key: nextKey.current++, nombre: link.nombre, url: link.url }))

  // Deja en pantalla el negocio elegido con sus datos y enlaces guardados.
  function open(profile: BusinessProfile | null) {
    setBusiness(profile)
    setLinks(profile ? toDrafts(profile) : [])
    setLinkErrors({})
    setLinksDirty(false)
    setDetails(toDetails(profile))
    setDetailErrors({})
    setDetailsDirty(false)
  }

  useEffect(() => {
    apiGet<BusinessProfile[]>('/businesses')
      .then((response) => {
        const list = listData(response.data)
        setBusinesses(list)
        // El negocio solo recibe el suyo; el administrador general elige de la lista.
        if (!isGeneral) open(list[0] ?? null)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'No fue posible cargar el negocio'))
      .finally(() => setLoading(false))
  }, [isGeneral])

  // Tras guardar, la API devuelve el negocio actualizado: se refleja en la vista previa y en la lista.
  function applySaved(saved: BusinessProfile) {
    setBusiness(saved)
    setBusinesses((current) => current.map((item) => (item.id === saved.id ? saved : item)))
  }

  async function onPickImage(kind: ImageKind, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    // Se limpia para poder elegir otra vez el mismo archivo.
    event.target.value = ''
    if (!file || !business) return

    setError('')
    setMessage('')
    setBusyImage(kind)

    try {
      const form = new FormData()
      form.append('imagen', await prepareImage(file, IMAGES[kind].preset))
      const response = await apiUpload<BusinessProfile>(`/businesses/${business.id}/${IMAGES[kind].path}`, form)
      applySaved(response.data)
      setMessage(response.message)
    } catch (err) {
      if (err instanceof ApiError && err.fields.imagen) setError(err.fields.imagen)
      else setError(err instanceof Error ? err.message : `No fue posible subir la ${IMAGES[kind].name}`)
    } finally {
      setBusyImage(null)
    }
  }

  async function removeImage(kind: ImageKind) {
    if (!business) return

    setError('')
    setMessage('')
    setBusyImage(kind)

    try {
      const response = await apiDelete<BusinessProfile>(`/businesses/${business.id}/${IMAGES[kind].path}`)
      applySaved(response.data)
      setMessage(response.message)
    } catch (err) {
      setError(err instanceof Error ? err.message : `No fue posible quitar la ${IMAGES[kind].name}`)
    } finally {
      setBusyImage(null)
    }
  }

  function changeDetail(field: keyof Details, value: string) {
    setDetails((current) => ({ ...current, [field]: value }))
    setDetailsDirty(true)
  }

  async function saveDetails(event: FormEvent) {
    event.preventDefault()
    if (!business) return

    setError('')
    setMessage('')

    const cleaned: Details = { descripcion: details.descripcion.trim(), direccion: details.direccion.trim(), telefono: details.telefono.trim() }
    const errors: Partial<Details> = {}
    if (cleaned.telefono !== '' && !PHONE_PATTERN.test(cleaned.telefono)) {
      errors.telefono = 'Escribe solo el número (al menos 7 caracteres); puede llevar espacios y los signos + - ( ).'
    }
    setDetailErrors(errors)
    if (Object.keys(errors).length > 0) return

    setSavingDetails(true)

    try {
      // Un campo vacio se guarda sin dato y deja de mostrarse a los clientes.
      const response = await apiPut<BusinessProfile>(`/businesses/${business.id}`, {
        descripcion: cleaned.descripcion || null,
        direccion: cleaned.direccion || null,
        telefono: cleaned.telefono || null,
      })
      applySaved(response.data)
      setDetails(toDetails(response.data))
      setDetailsDirty(false)
      setMessage('Datos del negocio actualizados correctamente.')
    } catch (err) {
      const fields = err instanceof ApiError ? err.fields : {}

      if (fields.descripcion || fields.direccion || fields.telefono) {
        setDetailErrors({ descripcion: fields.descripcion, direccion: fields.direccion, telefono: fields.telefono })
      } else {
        setError(err instanceof Error ? err.message : 'No fue posible guardar los datos')
      }
    } finally {
      setSavingDetails(false)
    }
  }

  function addLink(nombre = '') {
    if (links.length >= MAX_BUSINESS_LINKS) return
    setLinks((current) => [...current, { key: nextKey.current++, nombre, url: '' }])
    setLinksDirty(true)
  }

  function changeLink(key: number, field: 'nombre' | 'url', value: string) {
    setLinks((current) => current.map((link) => (link.key === key ? { ...link, [field]: value } : link)))
    setLinksDirty(true)
  }

  function removeLink(key: number) {
    setLinks((current) => current.filter((link) => link.key !== key))
    setLinkErrors({})
    setLinksDirty(true)
  }

  async function saveLinks(event: FormEvent) {
    event.preventDefault()
    if (!business) return

    setError('')
    setMessage('')

    // Las filas vacias se descartan; al resto se le completa el https:// si falta.
    const cleaned = links
      .map((link) => ({ ...link, nombre: link.nombre.trim(), url: normalizeUrl(link.url) }))
      .filter((link) => link.nombre !== '' || link.url !== '')
    setLinks(cleaned)

    const errors: Record<string, string> = {}
    cleaned.forEach((link, index) => {
      if (link.nombre === '') errors[`${index}.nombre`] = 'Escribe un nombre para el enlace.'
      if (link.url === '') errors[`${index}.url`] = 'Pega la dirección del enlace.'
      else if (!isWebUrl(link.url)) errors[`${index}.url`] = 'No parece una dirección web válida.'
    })
    setLinkErrors(errors)
    if (Object.keys(errors).length > 0) return

    setSavingLinks(true)

    try {
      const response = await apiPut<BusinessProfile>(`/businesses/${business.id}/links`, {
        enlaces: cleaned.map(({ nombre, url }) => ({ nombre, url })),
      })
      applySaved(response.data)
      setLinks(toDrafts(response.data))
      setLinksDirty(false)
      setMessage(response.message)
    } catch (err) {
      // La API señala cada campo como "enlaces.0.url"; aqui se muestran bajo su fila.
      const fields = err instanceof ApiError ? err.fields : {}
      const rowErrors = Object.fromEntries(
        Object.entries(fields)
          .filter(([field]) => /^enlaces\.\d+\./.test(field))
          .map(([field, text]) => [field.replace(/^enlaces\./, ''), text]),
      )

      if (Object.keys(rowErrors).length > 0) setLinkErrors(rowErrors)
      else setError(fields.enlaces ?? (err instanceof Error ? err.message : 'No fue posible guardar los enlaces'))
    } finally {
      setSavingLinks(false)
    }
  }

  const busy = busyImage !== null

  return (
    <AdminPage title={isGeneral ? 'PERFIL DE NEGOCIO' : 'MI NEGOCIO'}>
      {isGeneral && (
        <div>
          <FieldLabel htmlFor="profile-business">Negocio</FieldLabel>
          <select
            className="pb-input"
            id="profile-business"
            onChange={(e) => {
              setError('')
              setMessage('')
              open(businesses.find((item) => String(item.id) === e.target.value) ?? null)
            }}
            value={business?.id ?? ''}
          >
            <option value="">Elige un negocio</option>
            {businesses.map((item) => (
              <option key={item.id} value={item.id}>
                {item.nombre}
              </option>
            ))}
          </select>
        </div>
      )}

      {loading && <LoadingState text="Cargando negocio..." />}
      {error && <Notice tone="error">{error}</Notice>}
      {message && <Notice tone="success">{message}</Notice>}

      {!loading && !business && !error && (
        <EmptyState
          icon="business"
          text={isGeneral ? 'Podrás ver y corregir su portada, su foto de perfil y sus enlaces.' : 'Pide al administrador general que vincule tu cuenta a un negocio.'}
          title={isGeneral ? 'Elige un negocio' : 'Tu cuenta no tiene un negocio asignado'}
        />
      )}

      {business && (
        <>
          <SectionTitle className="text-white/40">Así ven tu negocio los clientes</SectionTitle>
          <div className="pb-card overflow-hidden rounded-2xl pb-5">
            <BusinessCover
              accent={businessAccent(business.id)}
              avatarAction={
                <CameraButton
                  disabled={busy}
                  label={business.logo_url ? 'Cambiar foto de perfil' : 'Agregar foto de perfil'}
                  onClick={() => logoInput.current?.click()}
                />
              }
              coverActions={
                busyImage === 'cover' ? (
                  <span className="rounded-xl px-3 py-1.5 font-display text-xs font-bold tracking-wide text-white" role="status" style={OVERLAY_STYLE}>
                    Guardando portada...
                  </span>
                ) : (
                  <>
                    {business.portada_url && (
                      <OverlayButton disabled={busy} onClick={() => void removeImage('cover')}>
                        Quitar portada
                      </OverlayButton>
                    )}
                    <CameraButton
                      disabled={busy}
                      label={business.portada_url ? 'Cambiar foto de portada' : 'Agregar foto de portada'}
                      onClick={() => coverInput.current?.click()}
                    />
                  </>
                )
              }
              descripcion={business.descripcion}
              logoUrl={business.logo_url}
              nombre={business.nombre}
              portadaUrl={business.portada_url}
            />

            {/* Las fotos se agregan o cambian con su boton de camara; aqui solo va quitar la de perfil y el aviso mientras se guarda. */}
            {(business.logo_url || busyImage === 'logo') && (
              <div className="mt-4 flex flex-wrap items-center gap-2 px-5">
                {busyImage === 'logo' ? (
                  <p className="text-xs font-semibold text-white/50" role="status">
                    Guardando foto de perfil...
                  </p>
                ) : (
                  <ChipButton disabled={busy} onClick={() => void removeImage('logo')} tone="red">
                    Quitar foto de perfil
                  </ChipButton>
                )}
              </div>
            )}

            {(business.direccion || business.telefono) && (
              <div className="mt-4 px-5">
                <BusinessContact accent={businessAccent(business.id)} direccion={business.direccion} telefono={business.telefono} />
              </div>
            )}

            {business.enlaces.length > 0 && (
              <div className="mt-4 px-5">
                <BusinessLinks links={business.enlaces} />
              </div>
            )}

            <p className="mt-4 px-5 text-xs text-white/40">
              Cada foto se agrega o cambia con su botón de cámara. Acepta JPG, PNG o WebP; la portada se muestra a lo ancho y la foto de perfil se recorta en
              círculo, y se ajustan solas antes de subirse.
            </p>

            <input accept={IMAGE_ACCEPT} className="hidden" onChange={(e) => void onPickImage('cover', e)} ref={coverInput} type="file" />
            <input accept={IMAGE_ACCEPT} className="hidden" onChange={(e) => void onPickImage('logo', e)} ref={logoInput} type="file" />
          </div>

          <SectionTitle className="text-white/40">Datos del negocio</SectionTitle>
          <form className="pb-card flex flex-col gap-4 rounded-2xl p-5" noValidate onSubmit={saveDetails}>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-3">
                <FieldLabel htmlFor="business-description">Descripción</FieldLabel>
                <span className="text-xs text-white/40">
                  {details.descripcion.length}/{MAX_DESCRIPTION}
                </span>
              </div>
              <textarea
                aria-describedby={detailErrors.descripcion ? 'business-description-error' : undefined}
                aria-invalid={detailErrors.descripcion ? true : undefined}
                className={`pb-input ${detailErrors.descripcion ? 'pb-input-error' : ''}`}
                id="business-description"
                maxLength={MAX_DESCRIPTION}
                onChange={(e) => changeDetail('descripcion', e.target.value)}
                placeholder="Cuéntales a tus clientes qué ofreces"
                rows={3}
                value={details.descripcion}
              />
              {detailErrors.descripcion && (
                <p className="flex items-center gap-1.5 text-xs font-semibold text-red-400" id="business-description-error">
                  <Icon color="currentColor" name="warning" />
                  {detailErrors.descripcion}
                </p>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <InputField
                error={detailErrors.direccion}
                id="business-address"
                label="Dirección"
                maxLength={255}
                onChange={(e) => changeDetail('direccion', e.target.value)}
                placeholder="Calle, número y colonia"
                value={details.direccion}
              />
              <InputField
                autoComplete="tel"
                error={detailErrors.telefono}
                id="business-phone"
                inputMode="tel"
                label="Teléfono"
                maxLength={40}
                onChange={(e) => changeDetail('telefono', e.target.value)}
                placeholder="899 123 4567"
                type="tel"
                value={details.telefono}
              />
            </div>

            <p className="text-xs text-white/40">
              Lo que dejes vacío no se muestra a los clientes.{!isGeneral && ' El nombre del negocio lo cambia el administrador general.'}
            </p>

            <Button className="w-full tracking-widest" disabled={savingDetails || !detailsDirty} type="submit">
              {savingDetails ? 'GUARDANDO...' : 'GUARDAR DATOS'}
            </Button>
          </form>

          <SectionTitle className="text-white/40">
            Enlaces ({links.length}/{MAX_BUSINESS_LINKS})
          </SectionTitle>
          <form className="pb-card flex flex-col gap-4 rounded-2xl p-5" noValidate onSubmit={saveLinks}>
            <p className="text-sm text-white/50">
              Agrega la ubicación de tu negocio, tus redes sociales o tu sitio web. Tú eliges el nombre con el que aparece cada enlace.
            </p>

            {links.map((link, index) => (
              <div className="pb-soft flex flex-col gap-3 rounded-xl p-3 md:flex-row md:items-start" key={link.key}>
                <InputField
                  className="md:w-56"
                  error={linkErrors[`${index}.nombre`]}
                  id={`link-name-${link.key}`}
                  label="Nombre"
                  maxLength={40}
                  onChange={(e) => changeLink(link.key, 'nombre', e.target.value)}
                  placeholder="Ubicación, Instagram..."
                  value={link.nombre}
                />
                <InputField
                  autoCapitalize="none"
                  autoCorrect="off"
                  className="md:flex-1"
                  error={linkErrors[`${index}.url`]}
                  id={`link-url-${link.key}`}
                  inputMode="url"
                  label="Enlace"
                  maxLength={500}
                  onChange={(e) => changeLink(link.key, 'url', e.target.value)}
                  placeholder="https://..."
                  spellCheck={false}
                  value={link.url}
                />
                <ChipButton className="self-start md:mt-7" onClick={() => removeLink(link.key)} tone="red">
                  Quitar
                </ChipButton>
              </div>
            ))}

            {links.length === 0 && <p className="text-sm text-white/40">Aún no hay enlaces. Agrega el primero con los botones de abajo.</p>}

            {links.length < MAX_BUSINESS_LINKS && (
              <div className="flex flex-col gap-2">
                <p className="font-display text-xs font-semibold uppercase tracking-widest text-white/50">Agregar enlace</p>
                <div className="flex flex-wrap gap-2">
                  {LINK_SUGGESTIONS.map((name) => (
                    <ChipButton key={name} onClick={() => addLink(name)} tone="purple">
                      + {name}
                    </ChipButton>
                  ))}
                  <ChipButton onClick={() => addLink()}>+ Otro</ChipButton>
                </div>
              </div>
            )}

            <Button className="w-full tracking-widest" disabled={savingLinks || !linksDirty} type="submit">
              {savingLinks ? 'GUARDANDO...' : 'GUARDAR ENLACES'}
            </Button>
          </form>
        </>
      )}
    </AdminPage>
  )
}
