<?php

namespace App\Http\Controllers;

use App\Http\Requests\Auth\ForgotPasswordRequest;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Requests\Auth\ResetPasswordRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\AuthService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;

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

    public function forgotPassword(ForgotPasswordRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $status = Password::sendResetLink(['correo' => $validated['correo']]);

        if ($status !== Password::RESET_LINK_SENT) {
            return $this->error('No fue posible enviar el enlace de recuperación.', null, 422);
        }

        return $this->success('Enlace de recuperación enviado.', null);
    }

    public function resetPassword(ResetPasswordRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $status = Password::reset(
            [
                'correo' => $validated['correo'],
                'password' => $validated['password'],
                'password_confirmation' => $request->input('password_confirmation'),
                'token' => $validated['token'],
            ],
            function (User $user, string $password): void {
                $user->forceFill([
                    'password' => $password,
                    'remember_token' => Str::random(60),
                ])->save();
            }
        );

        if ($status !== Password::PASSWORD_RESET) {
            return $this->error('No fue posible restablecer la contraseña.', null, 422);
        }

        return $this->success('Contraseña restablecida correctamente.', null);
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
