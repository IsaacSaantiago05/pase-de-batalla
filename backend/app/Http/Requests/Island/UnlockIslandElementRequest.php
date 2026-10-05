<?php

namespace App\Http\Requests\Island;

use Illuminate\Foundation\Http\FormRequest;

class UnlockIslandElementRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'elemento_id' => ['required', 'integer', 'exists:elementos_isla,id'],
        ];
    }
}
