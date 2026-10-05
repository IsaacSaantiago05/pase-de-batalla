<?php

namespace App\Http\Requests\Island;

use Illuminate\Foundation\Http\FormRequest;

class UpdateIslandLayoutRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'elemento_id' => ['required', 'integer', 'exists:elementos_isla,id'],
            'posicion_x' => ['required', 'numeric', 'between:-10000,10000'],
            'posicion_y' => ['required', 'numeric', 'between:-10000,10000'],
            'posicion_z' => ['nullable', 'numeric', 'between:-10000,10000'],
        ];
    }
}
