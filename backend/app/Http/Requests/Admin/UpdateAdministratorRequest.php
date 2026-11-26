<?php

namespace App\Http\Requests\Admin;

use App\Support\PasswordPolicy;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

class UpdateAdministratorRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $userId = $this->route('administrator')?->id;

        return [
            'nombre' => ['sometimes', 'string', 'max:150'],
            'correo' => ['sometimes', 'email', 'max:150', 'unique:usuarios,correo,'.$userId],
            // Al restablecerla aplica la misma regla que las demas contrasenas del proyecto.
            'password' => ['nullable', 'string', Password::defaults(), 'confirmed'],
            'negocio_id' => ['nullable', 'exists:negocios,id'],
            'estado' => ['sometimes', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'correo.email' => 'El correo no es válido.',
            'correo.unique' => 'Ya existe una cuenta con ese correo.',
            ...PasswordPolicy::messages(),
        ];
    }
}
