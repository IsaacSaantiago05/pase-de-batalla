<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RoleMiddleware
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if ($user === null || ! $user->isActive()) {
            return response()->json([
                'success' => false,
                'message' => 'No autenticado o usuario inactivo.',
                'data' => null,
            ], 401);
        }

        if (! $user->hasRole(...$roles)) {
            return response()->json([
                'success' => false,
                'message' => 'No tienes permisos para realizar esta acción.',
                'data' => null,
            ], 403);
        }

        return $next($request);
    }
}
