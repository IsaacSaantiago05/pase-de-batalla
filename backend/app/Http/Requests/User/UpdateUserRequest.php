<?php

namespace App\Http\Requests\User;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $userId = $this->route('user')?->id;

        return [
            'nombre' => ['sometimes', 'string', 'max:150'],
            'correo' => ['sometimes', 'email', 'max:150', Rule::unique('usuarios', 'correo')->ignore($userId)],
            'rol_id' => ['sometimes', 'exists:roles,id'],
            'negocio_id' => ['nullable', 'exists:negocios,id'],
            'nivel_id' => ['nullable', 'exists:niveles,id'],
            'estado' => ['sometimes', 'boolean'],
            'password' => ['nullable', 'string', 'min:8', 'confirmed'],
        ];
    }
}
