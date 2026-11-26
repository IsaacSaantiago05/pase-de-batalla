<?php

namespace App\Http\Requests\User;

use App\Support\PasswordPolicy;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class UpdateProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'nombre' => ['sometimes', 'string', 'max:150'],
            'correo' => ['sometimes', 'email', 'max:150', Rule::unique('usuarios', 'correo')->ignore($this->user()->id)],
            // Cambiar la contrasena exige la actual para que un token robado no baste.
            'password' => ['sometimes', 'string', Password::defaults(), 'confirmed'],
            'password_actual' => ['required_with:password', 'current_password:sanctum'],
        ];
    }

    public function messages(): array
    {
        return [
            'password_actual.required_with' => 'Escribe tu contraseña actual.',
            'password_actual.current_password' => 'La contraseña actual no es correcta.',
            ...PasswordPolicy::messages(),
        ];
    }
}
