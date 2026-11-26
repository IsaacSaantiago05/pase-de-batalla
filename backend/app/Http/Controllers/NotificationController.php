<?php

namespace App\Http\Controllers;

use App\Http\Resources\NotificationResource;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Notificaciones de quien inicio sesion. Cada usuario solo ve y marca las suyas.
 */
class NotificationController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $notifications = $request->user()->notifications()->paginate(20);

        return $this->success('Notificaciones obtenidas correctamente.', NotificationResource::collection($notifications));
    }

    /**
     * Consulta ligera para la campana: cuantas hay sin leer y cual es la mas reciente de ellas.
     */
    public function summary(Request $request): JsonResponse
    {
        $unread = $request->user()->unreadNotifications();
        $latest = (clone $unread)->first();

        return $this->success('Resumen de notificaciones obtenido correctamente.', [
            'no_leidas' => $unread->count(),
            'ultima' => $latest ? new NotificationResource($latest) : null,
        ]);
    }

    public function markRead(Request $request, string $notification): JsonResponse
    {
        $found = $request->user()->notifications()->whereKey($notification)->first();

        if ($found === null) {
            return $this->error('La notificación no existe.', null, 404);
        }

        $found->markAsRead();

        return $this->success('Notificación marcada como leída.', new NotificationResource($found));
    }

    public function markAllRead(Request $request): JsonResponse
    {
        $request->user()->unreadNotifications()->update(['read_at' => now()]);

        return $this->success('Notificaciones marcadas como leídas.', ['no_leidas' => 0]);
    }
}
