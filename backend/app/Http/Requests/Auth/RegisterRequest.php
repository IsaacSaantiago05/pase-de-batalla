<?php

namespace App\Http\Requests\Auth;

use App\Support\PasswordPolicy;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

class RegisterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'nombre' => ['required', 'string', 'max:150'],
            'correo' => ['required', 'string', 'email', 'max:150', 'unique:usuarios,correo'],
            'password' => ['required', 'string', Password::defaults(), 'confirmed'],
        ];
    }

    public function messages(): array
    {
        return [
            'nombre.required' => 'Escribe tu nombre.',
            'correo.required' => 'Escribe tu correo.',
            'correo.email' => 'El correo no es válido.',
            'correo.unique' => 'Ya existe una cuenta con ese correo.',
            ...PasswordPolicy::messages(),
        ];
    }
}
