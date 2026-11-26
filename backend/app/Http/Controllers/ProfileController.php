<?php

namespace App\Http\Controllers;

use App\Http\Requests\UploadImageRequest;
use App\Http\Requests\User\UpdateProfileRequest;
use App\Http\Resources\UserResource;
use App\Support\ApiResponse;
use App\Support\MediaStorage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProfileController extends Controller
{
    use ApiResponse;

    public function update(UpdateProfileRequest $request): JsonResponse
    {
        $user = $request->user();
        $data = collect($request->validated())->only(['nombre', 'correo', 'password'])->all();

        $user->update($data);

        if (array_key_exists('password', $data)) {
            // Cierra las demas sesiones abiertas al cambiar la contrasena.
            $current = $user->currentAccessToken();
            $user->tokens()->when($current?->id, fn ($query, $id) => $query->where('id', '!=', $id))->delete();
        }

        return $this->success('Perfil actualizado correctamente.', new UserResource($user->fresh()->load('role')));
    }

    /**
     * Sube o cambia la foto de perfil de quien inicio sesion.
     */
    public function updatePhoto(UploadImageRequest $request): JsonResponse
    {
        $user = $request->user();
        $previous = $user->foto;

        // `foto` no es asignable en masa: solo cambia por aqui, con una imagen ya validada.
        $user->forceFill(['foto' => MediaStorage::store($request->file('imagen'), MediaStorage::USERS)])->save();

        // La foto anterior ya no se usa: se borra para no acumular archivos.
        MediaStorage::delete($previous);

        return $this->success('Foto de perfil actualizada correctamente.', new UserResource($user->fresh()->load('role')));
    }

    public function deletePhoto(Request $request): JsonResponse
    {
        $user = $request->user();
        $previous = $user->foto;

        $user->forceFill(['foto' => null])->save();
        MediaStorage::delete($previous);

        return $this->success('Foto de perfil eliminada correctamente.', new UserResource($user->fresh()->load('role')));
    }
}
