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
            // El negocio repone o corrige sus existencias: 0 la deja agotada.
            'cantidad_disponible' => ['sometimes', 'integer', 'min:0', 'max:100000'],
            'estado' => ['sometimes', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'nombre.max' => 'El nombre no puede tener más de 150 caracteres.',
            'puntos_requeridos.integer' => 'Los puntos requeridos deben ser un número entero.',
            'puntos_requeridos.min' => 'Los puntos requeridos deben ser al menos 1.',
            'cantidad_disponible.integer' => 'La cantidad disponible debe ser un número entero.',
            'cantidad_disponible.min' => 'La cantidad disponible no puede ser negativa.',
            'cantidad_disponible.max' => 'La cantidad disponible no puede pasar de 100,000.',
        ];
    }
}
