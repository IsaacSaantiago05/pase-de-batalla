<?php

namespace App\Http\Requests\Rewards;

use Illuminate\Foundation\Http\FormRequest;

class UpdateRewardRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'negocio_id' => ['sometimes', 'integer', 'exists:negocios,id'],
            'nombre' => ['sometimes', 'string', 'max:150'],
            'descripcion' => ['nullable', 'string'],
            'puntos_requeridos' => ['sometimes', 'integer', 'min:1'],
            'cantidad_disponible' => ['sometimes', 'integer', 'min:0'],
            'estado' => ['sometimes', 'boolean'],
        ];
    }
}
