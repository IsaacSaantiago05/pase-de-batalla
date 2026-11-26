<?php

namespace App\Http\Controllers;

use App\Http\Requests\Business\UpdateBusinessLinksRequest;
use App\Http\Requests\Business\UploadBusinessImageRequest;
use App\Http\Resources\BusinessResource;
use App\Models\Business;
use App\Support\ApiResponse;
use App\Support\BusinessMedia;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Perfil publico de un negocio: foto de portada, foto de perfil y enlaces.
 * El administrador de negocio edita solo el suyo; el administrador general, el de cualquiera.
 */
class BusinessProfileController extends Controller
{
    use ApiResponse;

    public function updateCover(UploadBusinessImageRequest $request, Business $business): JsonResponse
    {
        return $this->replaceImage($request, $business, 'portada', 'Foto de portada actualizada correctamente.');
    }

    public function deleteCover(Request $request, Business $business): JsonResponse
    {
        return $this->removeImage($request, $business, 'portada', 'Foto de portada eliminada correctamente.');
    }

    public function updateLogo(UploadBusinessImageRequest $request, Business $business): JsonResponse
    {
        return $this->replaceImage($request, $business, 'logo', 'Foto de perfil actualizada correctamente.');
    }

    public function deleteLogo(Request $request, Business $business): JsonResponse
    {
        return $this->removeImage($request, $business, 'logo', 'Foto de perfil eliminada correctamente.');
    }

    public function updateLinks(UpdateBusinessLinksRequest $request, Business $business): JsonResponse
    {
        if ($denied = $this->denyIfForeign($request, $business)) {
            return $denied;
        }

        // Solo se guardan el nombre y la direccion de cada enlace, en el orden en que llegaron.
        $links = collect($request->validated('enlaces'))
            ->map(fn (array $link): array => ['nombre' => $link['nombre'], 'url' => $link['url']])
            ->values()
            ->all();

        $business->update(['enlaces' => $links]);

        return $this->success('Enlaces actualizados correctamente.', new BusinessResource($business->fresh()));
    }

    private function replaceImage(UploadBusinessImageRequest $request, Business $business, string $column, string $message): JsonResponse
    {
        if ($denied = $this->denyIfForeign($request, $business)) {
            return $denied;
        }

        $previous = $business->{$column};
        $business->update([$column => BusinessMedia::store($request->file('imagen'))]);

        // La imagen anterior ya no se usa: se borra para no acumular archivos.
        BusinessMedia::delete($previous);

        return $this->success($message, new BusinessResource($business->fresh()));
    }

    private function removeImage(Request $request, Business $business, string $column, string $message): JsonResponse
    {
        if ($denied = $this->denyIfForeign($request, $business)) {
            return $denied;
        }

        $previous = $business->{$column};
        $business->update([$column => null]);
        BusinessMedia::delete($previous);

        return $this->success($message, new BusinessResource($business->fresh()));
    }

    private function denyIfForeign(Request $request, Business $business): ?JsonResponse
    {
        if ($request->user()->hasRole('ADMINISTRADOR_NEGOCIO') && $request->user()->negocio_id !== $business->id) {
            return $this->error('No tienes permiso para modificar este negocio.', null, 403);
        }

        return null;
    }
}
