<?php

namespace App\Http\Resources\Points;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PointMovementResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'usuario_id' => $this->usuario_id,
            'negocio_id' => $this->negocio_id,
            'qr_id' => $this->qr_id,
            'cantidad' => $this->cantidad,
            'tipo' => $this->tipo,
            'fecha' => $this->fecha,
            'created_at' => $this->created_at,
        ];
    }
}
