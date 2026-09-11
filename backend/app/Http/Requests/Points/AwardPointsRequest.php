<?php

namespace App\Http\Requests\Points;

use Illuminate\Foundation\Http\FormRequest;

class AwardPointsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'usuario_id' => ['required', 'exists:usuarios,id'],
            'regla_puntos_id' => ['required', 'exists:reglas_puntos,id'],
        ];
    }
}
