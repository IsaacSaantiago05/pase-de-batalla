<?php

namespace App\Http\Requests\Catalog;

use Illuminate\Foundation\Http\FormRequest;

class UpdateProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'nombre' => ['sometimes', 'string', 'max:150'],
            'descripcion' => ['nullable', 'string'],
            'precio' => ['sometimes', 'numeric', 'min:0', 'max:99999999.99'],
            'puntos' => ['sometimes', 'integer', 'min:1', 'max:100000'],
            'estado' => ['sometimes', 'boolean'],
        ];
    }
}
