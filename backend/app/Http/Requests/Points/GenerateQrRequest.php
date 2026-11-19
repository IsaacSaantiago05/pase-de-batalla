<?php

namespace App\Http\Requests\Points;

use Illuminate\Foundation\Http\FormRequest;

// QR por cantidad libre de puntos: exclusivo del administrador general (la ruta restringe el rol).
class GenerateQrRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'negocio_id' => ['required', 'integer', 'exists:negocios,id'],
            'puntos' => ['required', 'integer', 'min:1', 'max:100000'],
        ];
    }

    public function messages(): array
    {
        return [
            'negocio_id.required' => 'Debes indicar un negocio para generar el código QR.',
            'negocio_id.exists' => 'El negocio indicado no existe.',
            'puntos.required' => 'Indica cuántos puntos dará el código QR.',
            'puntos.integer' => 'Los puntos deben ser un número entero.',
            'puntos.min' => 'El código QR debe dar al menos 1 punto.',
            'puntos.max' => 'El código QR no puede dar más de 100,000 puntos.',
        ];
    }
}
