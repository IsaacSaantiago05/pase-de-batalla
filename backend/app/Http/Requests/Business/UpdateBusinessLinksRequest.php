<?php

namespace App\Http\Requests\Business;

use Illuminate\Foundation\Http\FormRequest;

class UpdateBusinessLinksRequest extends FormRequest
{
    public const MAX_LINKS = 8;

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            // Se envia la lista completa; una lista vacia borra todos los enlaces.
            'enlaces' => ['present', 'array', 'max:'.self::MAX_LINKS],
            'enlaces.*.nombre' => ['required', 'string', 'max:40'],
            // Solo http y https: asi no se cuelan enlaces como "javascript:" que ejecutarian codigo en la app.
            'enlaces.*.url' => ['required', 'string', 'max:500', 'url:http,https'],
        ];
    }

    public function messages(): array
    {
        return [
            'enlaces.present' => 'Envía la lista de enlaces.',
            'enlaces.array' => 'La lista de enlaces no es válida.',
            'enlaces.max' => 'Puedes agregar hasta '.self::MAX_LINKS.' enlaces.',
            'enlaces.*.nombre.required' => 'Escribe un nombre para el enlace.',
            'enlaces.*.nombre.max' => 'El nombre no puede tener más de 40 caracteres.',
            'enlaces.*.url.required' => 'Escribe la dirección del enlace.',
            'enlaces.*.url.max' => 'El enlace no puede tener más de 500 caracteres.',
            'enlaces.*.url.url' => 'El enlace debe ser una dirección web que empiece con http:// o https://.',
        ];
    }
}
