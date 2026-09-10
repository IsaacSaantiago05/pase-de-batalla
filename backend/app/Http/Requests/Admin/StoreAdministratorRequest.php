<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreAdministratorRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'nombre' => ['required', 'string', 'max:150'],
            'correo' => ['required', 'email', 'max:150', 'unique:usuarios,correo'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            'rol' => ['required', Rule::in(['ADMINISTRADOR_NEGOCIO', 'ADMINISTRADOR_GENERAL'])],
            'negocio_id' => ['nullable', 'exists:negocios,id'],
            'estado' => ['sometimes', 'boolean'],
        ];
    }
}
