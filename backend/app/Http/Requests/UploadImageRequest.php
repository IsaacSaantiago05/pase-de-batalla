<?php

namespace App\Http\Requests;

use App\Support\MediaStorage;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Subida de una imagen en el campo `imagen`: fotos de los negocios y foto de perfil de los usuarios.
 */
class UploadImageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            // Solo fotos comunes: nada de SVG ni otros formatos que puedan traer codigo.
            'imagen' => [
                'required',
                'file',
                'mimes:jpg,jpeg,png,webp',
                'max:'.MediaStorage::MAX_KILOBYTES,
                'dimensions:max_width=4096,max_height=4096',
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'imagen.required' => 'Elige una imagen.',
            'imagen.uploaded' => 'La imagen no se pudo subir; puede que pese demasiado. El máximo es 2 MB.',
            'imagen.file' => 'Elige una imagen.',
            'imagen.mimes' => 'La imagen debe ser JPG, PNG o WebP.',
            'imagen.max' => 'La imagen no puede pesar más de 2 MB.',
            'imagen.dimensions' => 'No se pudo leer la imagen o mide más de 4096 píxeles por lado.',
        ];
    }
}
