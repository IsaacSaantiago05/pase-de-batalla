<?php

namespace App\Http\Requests\Business;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateBusinessRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'nombre' => ['sometimes', 'string', 'max:150', Rule::unique('negocios', 'nombre')->ignore($this->route('business')?->id)],
            // Se muestra en el perfil publico del negocio: texto corto.
            'descripcion' => ['nullable', 'string', 'max:500'],
            'direccion' => ['nullable', 'string', 'max:255'],
            // La app lo convierte en un enlace para llamar: solo caracteres de telefono.
            'telefono' => ['nullable', 'string', 'max:40', 'regex:/^[0-9+()\-.\s]{7,40}$/'],
            'correo' => ['nullable', 'email', 'max:150'],
            'estado' => ['sometimes', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'nombre.required' => 'El nombre del negocio es obligatorio.',
            'nombre.unique' => 'Ya existe un negocio con ese nombre.',
            'nombre.max' => 'El nombre no puede tener más de 150 caracteres.',
            'correo.email' => 'El correo de contacto no es válido.',
            'descripcion.max' => 'La descripción no puede tener más de 500 caracteres.',
            'direccion.max' => 'La dirección no puede tener más de 255 caracteres.',
            'telefono.max' => 'El teléfono no puede tener más de 40 caracteres.',
            'telefono.regex' => 'El teléfono solo puede llevar números, espacios y los signos + - ( ), y al menos 7 caracteres.',
        ];
    }
}
