<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use App\Http\Middleware\RoleMiddleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'role' => RoleMiddleware::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );

        // 403 de las Policies y 404 (incluido el de route model binding) con el formato success/message/data.
        $exceptions->render(function (HttpExceptionInterface $exception, Request $request) {
            if (! $request->is('api/*') || ! in_array($exception->getStatusCode(), [403, 404], true)) {
                return null;
            }

            $message = $exception->getMessage();
            if ($exception->getStatusCode() === 404 && ($message === '' || str_starts_with($message, 'No query results'))) {
                $message = 'Recurso no encontrado.';
            }
            if ($exception->getStatusCode() === 403 && ($message === '' || $message === 'This action is unauthorized.')) {
                $message = 'No tienes permisos para realizar esta acción.';
            }

            return response()->json([
                'success' => false,
                'message' => $message,
                'data' => null,
            ], $exception->getStatusCode());
        });
    })->create();
