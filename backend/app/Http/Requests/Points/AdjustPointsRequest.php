<?php

namespace App\Http\Requests\Points;

use Illuminate\Foundation\Http\FormRequest;

class AdjustPointsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'correo' => ['required', 'email', 'exists:usuarios,correo'],
            'negocio_id' => ['nullable', 'integer', 'exists:negocios,id'],
            'cantidad' => ['required', 'integer', 'not_in:0', 'min:-100000', 'max:100000'],
            'motivo' => ['required', 'string', 'min:5', 'max:255'],
        ];
    }
}
