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
            'precio' => ['required', 'numeric', 'min:0', 'max:99999999.99'],
            'puntos' => ['required', 'integer', 'min:1', 'max:100000'],
            'estado' => ['nullable', 'boolean'],
        ];
    }
}
