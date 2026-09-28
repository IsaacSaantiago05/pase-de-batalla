<?php

namespace App\Http\Resources\Points;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class QrCodeResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'negocio_id' => $this->negocio_id,
            'token' => $this->token,
            'puntos' => $this->puntos,
            'estado' => $this->estado,
            'fecha_creacion' => $this->fecha_creacion,
            'fecha_expiracion' => $this->fecha_expiracion,
            'fecha_uso' => $this->fecha_uso,
            'usuario_id' => $this->usuario_id,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
