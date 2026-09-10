<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\BusinessController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function (): void {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
});

Route::middleware('auth:sanctum')->group(function (): void {
    Route::prefix('auth')->group(function (): void {
        Route::get('/me', [AuthController::class, 'me']);
        Route::post('/logout', [AuthController::class, 'logout']);
    });

    Route::prefix('users')->middleware('role:ADMINISTRADOR_GENERAL,ADMINISTRADOR_NEGOCIO')->group(function (): void {
        Route::get('/', [UserController::class, 'index']);
        Route::get('/{user}', [UserController::class, 'show']);
        Route::put('/{user}', [UserController::class, 'update']);
        Route::patch('/{user}/status', [UserController::class, 'updateStatus']);
    });

    Route::prefix('businesses')->middleware('role:ADMINISTRADOR_GENERAL,ADMINISTRADOR_NEGOCIO')->group(function (): void {
        Route::get('/', [BusinessController::class, 'index']);
        Route::get('/{business}', [BusinessController::class, 'show']);
        Route::post('/', [BusinessController::class, 'store'])->middleware('role:ADMINISTRADOR_GENERAL');
        Route::put('/{business}', [BusinessController::class, 'update']);
        Route::patch('/{business}/status', [BusinessController::class, 'updateStatus']);
    });
});
