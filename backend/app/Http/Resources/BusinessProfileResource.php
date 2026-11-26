<?php

namespace App\Http\Resources;

use App\Support\BusinessMedia;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Datos publicos de un negocio, los que ve cualquier usuario en la app (sin correo ni datos internos).
 */
class BusinessProfileResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'nombre' => $this->nombre,
            'descripcion' => $this->descripcion,
            'direccion' => $this->direccion,
            'telefono' => $this->telefono,
            'logo_url' => BusinessMedia::url($this->logo),
            'portada_url' => BusinessMedia::url($this->portada),
            'enlaces' => $this->enlaces ?? [],
            // Solo cuando la consulta lo conto (withCount / loadCount con ese alias).
            'productos_activos' => $this->whenHas('productos_activos'),
        ];
    }
}
