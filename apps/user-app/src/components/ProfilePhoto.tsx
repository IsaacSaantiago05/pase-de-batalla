import { useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { AVATAR_PRESET, IMAGE_ACCEPT, prepareImage } from '@shared/image'
import { ChipButton, Icon } from '@shared/ui'
import { ApiError, apiDelete, apiUpload } from '../lib/api'

type Saved = { foto_url: string | null }

// Foto de perfil del usuario con sus acciones: el boton de camara la agrega o cambia, y "Quitar foto" la borra.
// Avisa al perfil con la direccion nueva (o null) cuando el servidor ya la guardo.
export function ProfilePhoto({ fotoUrl, onChange }: { fotoUrl: string | null; onChange: (fotoUrl: string | null) => void }) {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function onPick(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    // Se limpia para poder elegir otra vez el mismo archivo.
    event.target.value = ''
    if (!file) return

    setError('')
    setBusy(true)

    try {
      // La foto se recorta en cuadro y se reduce en el telefono antes de enviarse.
      const form = new FormData()
      form.append('imagen', await prepareImage(file, AVATAR_PRESET))
      const response = await apiUpload<Saved>('/profile/photo', form)
      onChange(response.data.foto_url)
    } catch (err) {
      if (err instanceof ApiError && err.fields.imagen) setError(err.fields.imagen)
      else setError(err instanceof Error ? err.message : 'No fue posible subir la foto')
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    setError('')
    setBusy(true)

    try {
      const response = await apiDelete<Saved>('/profile/photo')
      onChange(response.data.foto_url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible quitar la foto')
    } finally {
      setBusy(false)
    }
  }

  const pick = () => input.current?.click()

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <div
          className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full text-4xl"
          style={{ background: 'linear-gradient(135deg, #1e3a5f, #0d1424)', border: '3px solid rgba(245,158,11,0.4)', boxShadow: '0 0 24px rgba(245,158,11,0.15)' }}
        >
          {fotoUrl ? <img alt="Tu foto de perfil" className="h-full w-full object-cover" src={fotoUrl} /> : <Icon name="avatar" />}
        </div>
        <button
          aria-label={fotoUrl ? 'Cambiar foto de perfil' : 'Agregar foto de perfil'}
          className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full text-base transition-all active:scale-90 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={busy}
          onClick={pick}
          style={{ background: '#f59e0b', border: '3px solid #111827', color: '#0d0a00' }}
          title={fotoUrl ? 'Cambiar foto de perfil' : 'Agregar foto de perfil'}
          type="button"
        >
          <Icon color="currentColor" name="camera" />
        </button>
      </div>

      {/* La foto se agrega o cambia con el boton de camara; aqui solo va quitarla y el aviso mientras se guarda. */}
      {busy ? (
        <p className="text-xs font-semibold text-white/50" role="status">
          Guardando foto...
        </p>
      ) : (
        fotoUrl && (
          <ChipButton onClick={() => void remove()} tone="red">
            Quitar foto
          </ChipButton>
        )
      )}

      {error && (
        <p className="text-center text-xs font-semibold text-red-400" role="alert">
          {error}
        </p>
      )}

      <input accept={IMAGE_ACCEPT} className="hidden" onChange={(e) => void onPick(e)} ref={input} type="file" />
    </div>
  )
}
