<?php

namespace App\Http\Controllers;

use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Resources\UserResource;
use App\Services\AuthService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Password;

class AuthController extends Controller
{
    use ApiResponse;

    public function __construct(private readonly AuthService $authService)
    {
    }

    public function register(RegisterRequest $request): JsonResponse
    {
        [$user, $token] = $this->authService->register($request->validated());

        return $this->success('Registro completado correctamente.', [
            'user' => new UserResource($user),
            'token' => $token,
        ], 201);
    }

    public function login(LoginRequest $request): JsonResponse
    {
        [$user, $token] = $this->authService->login($request->validated());

        return $this->success('Inicio de sesión correcto.', [
            'user' => new UserResource($user),
            'token' => $token,
        ]);
    }

    public function forgotPassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'correo' => ['required', 'email'],
        ]);

        $status = Password::sendResetLink(['email' => $validated['correo']]);

        if ($status !== Password::RESET_LINK_SENT) {
            return $this->error('No fue posible enviar el enlace de recuperación.', null, 422);
        }

        return $this->success('Enlace de recuperación enviado.', null);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()?->currentAccessToken()?->delete();

        return $this->success('Sesión cerrada correctamente.');
    }

    public function me(Request $request): JsonResponse
    {
        return $this->success('Perfil obtenido correctamente.', new UserResource($request->user()->load('role')));
    }
}
