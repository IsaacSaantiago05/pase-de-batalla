<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\AdministratorController;
use App\Http\Controllers\BusinessController;
use App\Http\Controllers\PointRuleController;
use App\Http\Controllers\PointsController;
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

    Route::prefix('points')->middleware('role:CLIENTE,ADMINISTRADOR_NEGOCIO,ADMINISTRADOR_GENERAL')->group(function (): void {
        Route::get('/balance', [PointsController::class, 'balance']);
        Route::get('/history', [PointsController::class, 'history']);
        Route::get('/business-history', [PointsController::class, 'businessHistory'])->middleware('role:ADMINISTRADOR_NEGOCIO,ADMINISTRADOR_GENERAL');
        Route::post('/award', [PointsController::class, 'award'])->middleware('role:ADMINISTRADOR_NEGOCIO,ADMINISTRADOR_GENERAL');
    });

    Route::prefix('point-rules')->middleware('role:ADMINISTRADOR_NEGOCIO,ADMINISTRADOR_GENERAL')->group(function (): void {
        Route::get('/', [PointRuleController::class, 'index']);
        Route::post('/', [PointRuleController::class, 'store'])->middleware('role:ADMINISTRADOR_GENERAL');
        Route::put('/{pointRule}', [PointRuleController::class, 'update']);
        Route::patch('/{pointRule}/status', [PointRuleController::class, 'updateStatus']);
    });

    Route::prefix('admin')->middleware('role:ADMINISTRADOR_GENERAL')->group(function (): void {
        Route::prefix('administrators')->group(function (): void {
            Route::get('/', [AdministratorController::class, 'index']);
            Route::post('/', [AdministratorController::class, 'store']);
            Route::get('/{administrator}', [AdministratorController::class, 'show']);
            Route::put('/{administrator}', [AdministratorController::class, 'update']);
            Route::patch('/{administrator}/status', [AdministratorController::class, 'updateStatus']);
        });
    });
});
