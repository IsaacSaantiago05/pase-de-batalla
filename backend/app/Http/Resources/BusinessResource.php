<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BusinessResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'nombre' => $this->nombre,
            'descripcion' => $this->descripcion,
            'direccion' => $this->direccion,
            'telefono' => $this->telefono,
            'correo' => $this->correo,
            'logo' => $this->logo,
            'estado' => $this->estado,
            'fecha_registro' => $this->fecha_registro,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
