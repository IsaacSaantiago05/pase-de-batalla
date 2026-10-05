<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\AdministratorController;
use App\Http\Controllers\BattlePassController;
use App\Http\Controllers\BusinessController;
use App\Http\Controllers\IslandController;
use App\Http\Controllers\PointRuleController;
use App\Http\Controllers\PointsController;
use App\Http\Controllers\QrController;
use App\Http\Controllers\RedemptionController;
use App\Http\Controllers\RewardController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function (): void {
    Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:auth-register');
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:auth-login');
    Route::post('/forgot-password', [AuthController::class, 'forgotPassword'])->middleware('throttle:auth-forgot-password');
    Route::post('/reset-password', [AuthController::class, 'resetPassword'])->middleware('throttle:auth-reset-password');
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

    Route::prefix('battle-pass')->middleware('role:CLIENTE')->group(function (): void {
        Route::get('/progress', [BattlePassController::class, 'progress']);
        Route::post('/tiers/{tier}/claim', [BattlePassController::class, 'claim']);
    });

    Route::prefix('island')->middleware('role:CLIENTE')->group(function (): void {
        Route::get('/catalog', [IslandController::class, 'catalog']);
        Route::get('/layout', [IslandController::class, 'layout']);
        Route::post('/unlock', [IslandController::class, 'unlock']);
        Route::post('/layout', [IslandController::class, 'updateLayout']);
    });

    Route::prefix('qr')->middleware('role:CLIENTE,ADMINISTRADOR_NEGOCIO,ADMINISTRADOR_GENERAL')->group(function (): void {
        Route::get('/', [QrController::class, 'index'])->middleware('role:ADMINISTRADOR_NEGOCIO,ADMINISTRADOR_GENERAL');
        Route::get('/{qrCode}', [QrController::class, 'show'])->middleware('role:ADMINISTRADOR_NEGOCIO,ADMINISTRADOR_GENERAL');
        Route::get('/{qrCode}/image', [QrController::class, 'image'])->middleware('role:ADMINISTRADOR_NEGOCIO,ADMINISTRADOR_GENERAL');
        Route::post('/generate', [QrController::class, 'generate'])->middleware('role:ADMINISTRADOR_NEGOCIO,ADMINISTRADOR_GENERAL');
        Route::post('/redeem', [QrController::class, 'redeem'])->middleware(['role:CLIENTE', 'throttle:qr-redeem']);
    });

    Route::prefix('rewards')->middleware('role:CLIENTE,ADMINISTRADOR_NEGOCIO,ADMINISTRADOR_GENERAL')->group(function (): void {
        Route::get('/', [RewardController::class, 'index']);
        Route::post('/', [RewardController::class, 'store'])->middleware('role:ADMINISTRADOR_NEGOCIO,ADMINISTRADOR_GENERAL');
        Route::put('/{reward}', [RewardController::class, 'update'])->middleware('role:ADMINISTRADOR_NEGOCIO,ADMINISTRADOR_GENERAL');
        Route::patch('/{reward}/status', [RewardController::class, 'updateStatus'])->middleware('role:ADMINISTRADOR_NEGOCIO,ADMINISTRADOR_GENERAL');
    });

    Route::prefix('redemptions')->middleware('role:CLIENTE,ADMINISTRADOR_NEGOCIO,ADMINISTRADOR_GENERAL')->group(function (): void {
        Route::get('/my', [RedemptionController::class, 'myHistory'])->middleware('role:CLIENTE');
        Route::post('/', [RedemptionController::class, 'store'])->middleware(['role:CLIENTE', 'throttle:redemption-create']);
        Route::get('/business', [RedemptionController::class, 'businessHistory'])->middleware('role:ADMINISTRADOR_NEGOCIO,ADMINISTRADOR_GENERAL');
        Route::patch('/{redemption}/status', [RedemptionController::class, 'updateStatus'])->middleware('role:ADMINISTRADOR_NEGOCIO,ADMINISTRADOR_GENERAL');
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
