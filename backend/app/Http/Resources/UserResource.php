<?php

namespace App\Http\Resources;

use App\Support\MediaStorage;
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
            // La foto de perfil solo se entrega a su dueño: no sale en los listados que ven los administradores.
            'foto_url' => $this->when((bool) $request->user()?->is($this->resource), fn () => MediaStorage::url($this->foto)),
            'estado' => $this->estado,
            'fecha_registro' => $this->fecha_registro,
            'rol' => $this->role?->nombre,
            'rol_id' => $this->rol_id,
            'negocio_id' => $this->negocio_id,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
