<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'negocio_id' => $this->negocio_id,
            'negocio_nombre' => $this->whenLoaded('business', fn () => $this->business?->nombre),
            'nombre' => $this->nombre,
            'descripcion' => $this->descripcion,
            'puntos' => $this->puntos,
            'estado' => $this->estado,
            'desactivado_en' => $this->desactivado_en,
            // Fecha en que se eliminara por llevar 7 dias inactivo; null si esta activo.
            'se_elimina_en' => $this->deletionDate(),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
