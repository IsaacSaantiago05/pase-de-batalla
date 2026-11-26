<?php

namespace App\Http\Requests\Admin;

use App\Support\PasswordPolicy;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

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
            // Misma regla que las cuentas de la app: 8 caracteres, mayuscula, minuscula, numero y simbolo.
            'password' => ['required', 'string', Password::defaults(), 'confirmed'],
            'rol' => ['required', Rule::in(['ADMINISTRADOR_NEGOCIO', 'ADMINISTRADOR_GENERAL'])],
            'negocio_id' => ['nullable', 'exists:negocios,id'],
            'estado' => ['sometimes', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'nombre.required' => 'Escribe el nombre del administrador.',
            'correo.required' => 'Escribe el correo del administrador.',
            'correo.email' => 'El correo no es válido.',
            'correo.unique' => 'Ya existe una cuenta con ese correo.',
            ...PasswordPolicy::messages(),
        ];
    }
}
