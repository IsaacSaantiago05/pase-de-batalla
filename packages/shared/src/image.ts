// Prepara una imagen en el navegador antes de subirla: la recorta o reduce y la comprime.
// Las fotos de celular pesan varios MB y el servidor acepta como maximo 2 MB.

export type ImagePreset = {
  maxWidth: number
  maxHeight: number
  // Recorte cuadrado al centro (foto de perfil).
  square?: boolean
  // 'jpeg' para fotos; 'auto' conserva la transparencia de un PNG o WebP (logotipos).
  format: 'jpeg' | 'auto'
}

export const COVER_PRESET: ImagePreset = { maxWidth: 1600, maxHeight: 1200, format: 'jpeg' }
export const AVATAR_PRESET: ImagePreset = { maxWidth: 512, maxHeight: 512, square: true, format: 'auto' }
// Foto del articulo de una recompensa: conserva su proporcion; se ve en miniatura y en grande.
export const REWARD_PRESET: ImagePreset = { maxWidth: 1200, maxHeight: 1200, format: 'auto' }

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
export const IMAGE_ACCEPT = ACCEPTED_TYPES.join(',')

// Margen bajo el limite de 2 MB del servidor.
const MAX_BYTES = 1.9 * 1024 * 1024
const JPEG_QUALITY = 0.86
// Fondo para las zonas transparentes cuando la imagen termina en JPEG (el color base de la app).
const FLAT_BACKGROUND = '#0b1120'

type Source = { image: CanvasImageSource; width: number; height: number; release: () => void }

async function loadSource(file: File): Promise<Source> {
  if ('createImageBitmap' in window) {
    try {
      // Respeta la orientacion con la que se tomo la foto.
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
      return { image: bitmap, width: bitmap.width, height: bitmap.height, release: () => bitmap.close() }
    } catch {
      // Sigue con el metodo clasico.
    }
  }

  const url = URL.createObjectURL(file)

  try {
    const element = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error('No se pudo leer la imagen.'))
      img.src = url
    })

    return { image: element, width: element.naturalWidth, height: element.naturalHeight, release: () => URL.revokeObjectURL(url) }
  } catch (error) {
    URL.revokeObjectURL(url)
    throw error
  }
}

function toBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, JPEG_QUALITY))
}

// Una foto guardada como PNG no tiene zonas transparentes: en JPEG pesa unas diez veces menos.
function hasTransparency(context: CanvasRenderingContext2D, width: number, height: number): boolean {
  const { data } = context.getImageData(0, 0, width, height)

  for (let index = 3; index < data.length; index += 4) {
    if (data[index] < 250) return true
  }

  return false
}

export async function prepareImage(file: File, preset: ImagePreset): Promise<File> {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    throw new Error('Elige una imagen JPG, PNG o WebP.')
  }

  const source = await loadSource(file)

  try {
    let { width: sourceWidth, height: sourceHeight } = source
    let offsetX = 0
    let offsetY = 0

    if (preset.square) {
      const side = Math.min(sourceWidth, sourceHeight)
      offsetX = (sourceWidth - side) / 2
      offsetY = (sourceHeight - side) / 2
      sourceWidth = side
      sourceHeight = side
    }

    if (sourceWidth < 1 || sourceHeight < 1) {
      throw new Error('No se pudo leer la imagen.')
    }

    // Nunca se agranda: solo se reduce si pasa del tamaño maximo.
    const scale = Math.min(1, preset.maxWidth / sourceWidth, preset.maxHeight / sourceHeight)
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(sourceWidth * scale))
    canvas.height = Math.max(1, Math.round(sourceHeight * scale))

    const context = canvas.getContext('2d')
    if (!context) throw new Error('Tu navegador no pudo procesar la imagen.')

    const draw = (background?: string) => {
      context.clearRect(0, 0, canvas.width, canvas.height)
      if (background) {
        context.fillStyle = background
        context.fillRect(0, 0, canvas.width, canvas.height)
      }
      context.drawImage(source.image, offsetX, offsetY, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height)
    }

    // Solo se conserva como PNG lo que de verdad trae transparencia (un logotipo recortado, por ejemplo).
    if (preset.format === 'auto' && file.type !== 'image/jpeg') {
      draw()

      if (hasTransparency(context, canvas.width, canvas.height)) {
        const png = await toBlob(canvas, 'image/png')
        if (png && png.size <= MAX_BYTES) return new File([png], 'imagen.png', { type: 'image/png' })
      }
    }

    draw(FLAT_BACKGROUND)
    const jpeg = await toBlob(canvas, 'image/jpeg')

    if (!jpeg) throw new Error('Tu navegador no pudo procesar la imagen.')
    if (jpeg.size > MAX_BYTES) throw new Error('La imagen sigue pesando demasiado. Prueba con otra.')

    return new File([jpeg], 'imagen.jpg', { type: 'image/jpeg' })
  } finally {
    source.release()
  }
}
