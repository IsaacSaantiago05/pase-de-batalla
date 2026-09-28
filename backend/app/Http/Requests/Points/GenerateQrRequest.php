<?php

namespace App\Http\Requests\Points;

use Illuminate\Foundation\Http\FormRequest;

class GenerateQrRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'negocio_id' => ['nullable', 'integer', 'exists:negocios,id'],
            'puntos' => ['required', 'integer', 'min:1'],
            'fecha_expiracion' => ['nullable', 'date', 'after:now'],
        ];
    }
}
