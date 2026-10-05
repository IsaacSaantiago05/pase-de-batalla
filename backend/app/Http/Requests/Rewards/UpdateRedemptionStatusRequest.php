<?php

namespace App\Http\Requests\Rewards;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateRedemptionStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'estado' => ['required', 'string', Rule::in(['CONFIRMADO', 'COMPLETADO', 'CANCELADO'])],
        ];
    }
}
