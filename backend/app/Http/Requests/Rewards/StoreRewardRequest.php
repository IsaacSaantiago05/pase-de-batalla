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
            'cantidad_disponible' => ['required', 'integer', 'min:0', 'max:100000'],
            'estado' => ['nullable', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'nombre.required' => 'Escribe el nombre de la recompensa.',
            'nombre.max' => 'El nombre no puede tener más de 150 caracteres.',
            'puntos_requeridos.required' => 'Indica los puntos requeridos.',
            'puntos_requeridos.integer' => 'Los puntos requeridos deben ser un número entero.',
            'puntos_requeridos.min' => 'Los puntos requeridos deben ser al menos 1.',
            'cantidad_disponible.required' => 'Indica la cantidad disponible.',
            'cantidad_disponible.integer' => 'La cantidad disponible debe ser un número entero.',
            'cantidad_disponible.min' => 'La cantidad disponible no puede ser negativa.',
            'cantidad_disponible.max' => 'La cantidad disponible no puede pasar de 100,000.',
        ];
    }
}
