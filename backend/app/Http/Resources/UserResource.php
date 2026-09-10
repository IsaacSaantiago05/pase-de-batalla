<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'nombre' => $this->nombre,
            'correo' => $this->correo,
            'estado' => $this->estado,
            'fecha_registro' => $this->fecha_registro,
            'rol' => $this->role?->nombre,
            'rol_id' => $this->rol_id,
            'nivel_id' => $this->nivel_id,
            'negocio_id' => $this->negocio_id,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
