<?php

namespace App\Services;

use App\Models\IslandConfiguration;
use App\Models\IslandElement;
use App\Models\User;
use App\Models\UserIslandElement;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class IslandService
{
    public function getCatalog(User $user): array
    {
        $userLevel = (int) ($user->nivel_id ?? 0);

        $elements = IslandElement::query()
            ->where('estado', true)
            ->orderBy('nivel_requerido')
            ->orderBy('id')
            ->get();

        $unlockedIds = UserIslandElement::query()
            ->where('usuario_id', $user->id)
            ->pluck('elemento_id')
            ->all();

        return $elements->map(function (IslandElement $element) use ($userLevel, $unlockedIds): array {
            $status = 'BLOQUEADO';

            if (in_array($element->id, $unlockedIds, true)) {
                $status = 'DESBLOQUEADO';
            } elseif ($userLevel >= (int) $element->nivel_requerido) {
                $status = 'DISPONIBLE';
            }

            return [
                'id' => $element->id,
                'nombre' => $element->nombre,
                'categoria' => $element->categoria,
                'descripcion' => $element->descripcion,
                'recurso' => $element->recurso,
                'nivel_requerido' => $element->nivel_requerido,
                'estado_usuario' => $status,
            ];
        })->values()->all();
    }

    public function getLayout(User $user): array
    {
        $items = IslandConfiguration::query()
            ->with('element:id,nombre,categoria,recurso')
            ->where('usuario_id', $user->id)
            ->where('estado', true)
            ->orderBy('id')
            ->get();

        return $items->map(static function (IslandConfiguration $item): array {
            return [
                'id' => $item->id,
                'elemento_id' => $item->elemento_id,
                'elemento' => [
                    'id' => $item->element?->id,
                    'nombre' => $item->element?->nombre,
                    'categoria' => $item->element?->categoria,
                    'recurso' => $item->element?->recurso,
                ],
                'posicion_x' => (float) $item->posicion_x,
                'posicion_y' => (float) $item->posicion_y,
                'posicion_z' => $item->posicion_z !== null ? (float) $item->posicion_z : null,
                'estado' => (bool) $item->estado,
            ];
        })->values()->all();
    }

    public function unlockElement(User $user, int $elementId): array
    {
        return DB::transaction(function () use ($user, $elementId) {
            $lockedUser = User::query()->lockForUpdate()->findOrFail($user->id);
            $element = IslandElement::query()->lockForUpdate()->find($elementId);

            if ($element === null || ! $element->estado) {
                throw new ModelNotFoundException('El elemento de isla no existe o está inactivo.');
            }

            $userLevel = (int) ($lockedUser->nivel_id ?? 0);
            if ($userLevel < (int) $element->nivel_requerido) {
                throw new RuntimeException('Tu nivel actual no permite desbloquear este elemento.');
            }

            $unlock = UserIslandElement::query()->firstOrCreate(
                [
                    'usuario_id' => $lockedUser->id,
                    'elemento_id' => $element->id,
                ],
                [
                    'fecha_desbloqueo' => now(),
                ],
            );

            return [
                'created' => $unlock->wasRecentlyCreated,
                'unlock' => $unlock,
                'element' => $element,
            ];
        });
    }

    public function updateLayout(User $user, int $elementId, float $x, float $y, ?float $z): IslandConfiguration
    {
        return DB::transaction(function () use ($user, $elementId, $x, $y, $z) {
            $lockedUser = User::query()->lockForUpdate()->findOrFail($user->id);

            $unlocked = UserIslandElement::query()
                ->lockForUpdate()
                ->where('usuario_id', $lockedUser->id)
                ->where('elemento_id', $elementId)
                ->first();

            if ($unlocked === null) {
                throw new RuntimeException('Debes desbloquear el elemento antes de posicionarlo.');
            }

            $configuration = IslandConfiguration::query()->updateOrCreate(
                [
                    'usuario_id' => $lockedUser->id,
                    'elemento_id' => $elementId,
                ],
                [
                    'posicion_x' => $x,
                    'posicion_y' => $y,
                    'posicion_z' => $z,
                    'estado' => true,
                ],
            );

            return $configuration->fresh()->load('element');
        });
    }
}
