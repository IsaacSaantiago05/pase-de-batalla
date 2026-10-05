<?php

namespace App\Http\Requests\Rewards;

use Illuminate\Foundation\Http\FormRequest;

class StoreRewardRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'negocio_id' => ['nullable', 'integer', 'exists:negocios,id'],
            'nombre' => ['required', 'string', 'max:150'],
            'descripcion' => ['nullable', 'string'],
            'puntos_requeridos' => ['required', 'integer', 'min:1'],
            'cantidad_disponible' => ['required', 'integer', 'min:0'],
            'estado' => ['nullable', 'boolean'],
        ];
    }
}
