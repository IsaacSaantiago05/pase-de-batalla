<?php

namespace App\Http\Requests\Business;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreBusinessRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'nombre' => ['required', 'string', 'max:150', Rule::unique('negocios', 'nombre')],
            'descripcion' => ['nullable', 'string'],
            'direccion' => ['nullable', 'string', 'max:255'],
            'telefono' => ['nullable', 'string', 'max:40'],
            'correo' => ['nullable', 'email', 'max:150'],
            'logo' => ['nullable', 'string', 'max:255'],
            'estado' => ['nullable', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'nombre.required' => 'El nombre del negocio es obligatorio.',
            'nombre.unique' => 'Ya existe un negocio con ese nombre.',
            'nombre.max' => 'El nombre no puede tener más de 150 caracteres.',
            'correo.email' => 'El correo de contacto no es válido.',
        ];
    }
}
