<?php

namespace App\Http\Requests\Points;

use Illuminate\Foundation\Http\FormRequest;

class StorePointRuleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'negocio_id' => ['required', 'exists:negocios,id'],
            'monto_minimo' => ['required', 'numeric', 'min:0'],
            'monto_maximo' => ['required', 'numeric', 'gte:monto_minimo'],
            'puntos' => ['required', 'integer', 'min:1'],
            'estado' => ['sometimes', 'boolean'],
        ];
    }
}
