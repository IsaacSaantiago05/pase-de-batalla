<?php

namespace App\Http\Requests\Points;

use Illuminate\Foundation\Http\FormRequest;

class UpdatePointRuleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'monto_minimo' => ['sometimes', 'numeric', 'min:0'],
            'monto_maximo' => ['sometimes', 'numeric', 'gte:monto_minimo'],
            'puntos' => ['sometimes', 'integer', 'min:1'],
            'estado' => ['sometimes', 'boolean'],
        ];
    }
}
