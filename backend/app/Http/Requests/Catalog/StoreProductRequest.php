<?php

namespace App\Http\Requests\Catalog;

use Illuminate\Foundation\Http\FormRequest;

class StoreProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'nombre' => ['required', 'string', 'max:150'],
            'descripcion' => ['nullable', 'string'],
            'puntos' => ['required', 'integer', 'min:1', 'max:100000'],
            'estado' => ['nullable', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'nombre.required' => 'El nombre del producto es obligatorio.',
            'nombre.max' => 'El nombre no puede tener más de 150 caracteres.',
            'puntos.required' => 'Indica cuántos puntos otorga el producto.',
            'puntos.integer' => 'Los puntos deben ser un número entero.',
            'puntos.min' => 'El producto debe otorgar al menos 1 punto.',
            'puntos.max' => 'El producto no puede otorgar más de 100,000 puntos.',
        ];
    }
}
