<?php

namespace App\Notifications;

use App\Models\Redemption;
use Illuminate\Notifications\Notification;

/**
 * Aviso para el administrador del negocio: un cliente canjeó una de sus recompensas.
 * Se guarda en la base (tabla `notifications`) y el panel la muestra en la campana.
 */
class RewardRedeemed extends Notification
{
    public const TYPE = 'CANJE_NUEVO';

    public function __construct(private readonly Redemption $redemption)
    {
    }

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /**
     * Contenido que se guarda: lo necesario para mostrar el aviso sin volver a consultar el canje.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        $reward = $this->redemption->reward;
        $client = $this->redemption->user;
        $clientName = $client?->nombre ?? 'Un cliente';
        $rewardName = $reward?->nombre ?? 'una recompensa';
        $points = (int) $this->redemption->puntos_utilizados;

        return [
            'tipo' => self::TYPE,
            'titulo' => 'Nueva recompensa canjeada',
            'mensaje' => sprintf('%s canjeó "%s" por %s puntos.', $clientName, $rewardName, number_format($points)),
            'canje_id' => $this->redemption->id,
            'recompensa_id' => $this->redemption->recompensa_id,
            'recompensa_nombre' => $rewardName,
            'cliente_nombre' => $clientName,
            'puntos' => $points,
            'negocio_id' => $reward?->negocio_id,
        ];
    }
}
