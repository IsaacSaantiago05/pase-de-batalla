<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

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
            'password' => ['nullable', 'string', 'min:8', 'confirmed'],
            'negocio_id' => ['nullable', 'exists:negocios,id'],
            'estado' => ['sometimes', 'boolean'],
        ];
    }
}
