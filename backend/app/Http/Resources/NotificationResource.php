<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Una notificacion tal como la muestra el panel: titulo, mensaje, si ya se leyo y cuando llego.
 */
class NotificationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $data = $this->data ?? [];

        return [
            'id' => $this->id,
            'tipo' => $data['tipo'] ?? null,
            'titulo' => $data['titulo'] ?? 'Notificación',
            'mensaje' => $data['mensaje'] ?? '',
            'canje_id' => $data['canje_id'] ?? null,
            'recompensa_nombre' => $data['recompensa_nombre'] ?? null,
            'cliente_nombre' => $data['cliente_nombre'] ?? null,
            'puntos' => $data['puntos'] ?? null,
            'leida' => $this->read_at !== null,
            'fecha' => $this->created_at,
        ];
    }
}
