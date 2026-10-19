<?php

namespace App\Http\Requests\User;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

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
            'password' => ['sometimes', 'string', 'min:8', 'confirmed'],
            'password_actual' => ['required_with:password', 'current_password:sanctum'],
        ];
    }

    public function messages(): array
    {
        return [
            'password_actual.current_password' => 'La contraseña actual no es correcta.',
        ];
    }
}
