<?php

namespace App\Http\Requests\Rewards;

use Illuminate\Foundation\Http\FormRequest;

class StoreRedemptionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'recompensa_id' => ['required', 'integer', 'exists:recompensas,id'],
        ];
    }
}
