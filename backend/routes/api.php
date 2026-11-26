<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\AdministratorController;
use App\Http\Controllers\BattlePassController;
use App\Http\Controllers\BusinessClientController;
use App\Http\Controllers\BusinessController;
use App\Http\Controllers\BusinessProfileController;
use App\Http\Controllers\DirectoryController;
use App\Http\Controllers\IslandController;
use App\Http\Controllers\MediaController;
use App\Http\Controllers\PointsController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\QrController;
use App\Http\Controllers\RedemptionController;
use App\Http\Controllers\RewardController;
use App\Http\Controllers\SaleController;
use App\Http\Controllers\StatisticsController;
use App\Http\Controllers\UserController;
use App\Support\MediaStorage;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function (): void {
    Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:auth-register');
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:auth-login');
    Route::post('/forgot-password', [AuthController::class, 'forgotPassword'])->middleware('throttle:auth-forgot-password');
    Route::post('/reset-password', [AuthController::class, 'resetPassword'])->middleware('throttle:auth-reset-password');
});

// Imagenes de los negocios (portada y foto de perfil) y fotos de perfil de los usuarios.
// Sin sesion: una etiqueta <img> no envia el token. El nombre de cada archivo es aleatorio.
Route::get('/media/{path}', MediaController::class)->where('path', MediaStorage::PATH_PATTERN);

Route::middleware('auth:sanctum')->group(function (): void {
    Route::prefix('auth')->group(function (): void {
        Route::get('/me', [AuthController::class, 'me']);
        Route::post('/logout', [AuthController::class, 'logout']);
    });

    Route::middleware('role:CLIENTE,ADMINISTRADOR_NEGOCIO,ADMINISTRADOR_GENERAL')->group(function (): void {
        Route::put('/profile', [ProfileController::class, 'update']);
        Route::post('/profile/photo', [ProfileController::class, 'updatePhoto']);
        Route::delete('/profile/photo', [ProfileController::class, 'deletePhoto']);
        Route::get('/directory/businesses', [DirectoryController::class, 'businesses']);
        Route::get('/directory/businesses/{business}', [DirectoryController::class, 'business']);
    });

    Route::get('/business-clients', [BusinessClientController::class, 'index'])->middleware('role:ADMINISTRADOR_NEGOCIO,ADMINISTRADOR_GENERAL');
    Route::get('/statistics', [StatisticsController::class, 'index'])->middleware('role:ADMINISTRADOR_NEGOCIO,ADMINISTRADOR_GENERAL');

    Route::prefix('points/adjustments')->middleware('role:ADMINISTRADOR_GENERAL')->group(function (): void {
        Route::get('/', [PointsController::class, 'adjustments']);
        Route::post('/', [PointsController::class, 'adjust']);
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
        Route::patch('/{business}/status', [BusinessController::class, 'updateStatus'])->middleware('role:ADMINISTRADOR_GENERAL');

        // Perfil publico: el negocio edita el suyo y el administrador general el de cualquiera.
        Route::post('/{business}/cover', [BusinessProfileController::class, 'updateCover']);
        Route::delete('/{business}/cover', [BusinessProfileController::class, 'deleteCover']);
        Route::post('/{business}/logo', [BusinessProfileController::class, 'updateLogo']);
        Route::delete('/{business}/logo', [BusinessProfileController::class, 'deleteLogo']);
        Route::put('/{business}/links', [BusinessProfileController::class, 'updateLinks']);
    });

    Route::prefix('points')->middleware('role:CLIENTE,ADMINISTRADOR_NEGOCIO,ADMINISTRADOR_GENERAL')->group(function (): void {
        Route::get('/balance', [PointsController::class, 'balance']);
        Route::get('/history', [PointsController::class, 'history']);
        Route::get('/business-history', [PointsController::class, 'businessHistory'])->middleware('role:ADMINISTRADOR_NEGOCIO,ADMINISTRADOR_GENERAL');
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
        Route::patch('/{qrCode}/cancel', [QrController::class, 'cancel'])->middleware('role:ADMINISTRADOR_NEGOCIO,ADMINISTRADOR_GENERAL');
        // QR por cantidad libre de puntos: solo el administrador general. El negocio genera QR desde sus productos (POST /sales).
        Route::post('/generate', [QrController::class, 'generate'])->middleware('role:ADMINISTRADOR_GENERAL');
        Route::post('/redeem', [QrController::class, 'redeem'])->middleware(['role:CLIENTE', 'throttle:qr-redeem']);
    });

    Route::prefix('rewards')->middleware('role:CLIENTE,ADMINISTRADOR_NEGOCIO,ADMINISTRADOR_GENERAL')->group(function (): void {
        Route::get('/', [RewardController::class, 'index']);
        Route::post('/', [RewardController::class, 'store'])->middleware('role:ADMINISTRADOR_NEGOCIO,ADMINISTRADOR_GENERAL');
        Route::put('/{reward}', [RewardController::class, 'update'])->middleware('role:ADMINISTRADOR_NEGOCIO,ADMINISTRADOR_GENERAL');
        Route::patch('/{reward}/status', [RewardController::class, 'updateStatus'])->middleware('role:ADMINISTRADOR_NEGOCIO,ADMINISTRADOR_GENERAL');
        // Foto del articulo: el negocio la pone en sus recompensas y el administrador general en cualquiera.
        Route::post('/{reward}/photo', [RewardController::class, 'updatePhoto'])->middleware('role:ADMINISTRADOR_NEGOCIO,ADMINISTRADOR_GENERAL');
        Route::delete('/{reward}/photo', [RewardController::class, 'deletePhoto'])->middleware('role:ADMINISTRADOR_NEGOCIO,ADMINISTRADOR_GENERAL');
    });

    Route::prefix('products')->middleware('role:CLIENTE,ADMINISTRADOR_NEGOCIO,ADMINISTRADOR_GENERAL')->group(function (): void {
        Route::get('/', [ProductController::class, 'index']);
        Route::post('/', [ProductController::class, 'store'])->middleware('role:ADMINISTRADOR_NEGOCIO');
        Route::put('/{product}', [ProductController::class, 'update'])->middleware('role:ADMINISTRADOR_GENERAL');
        Route::patch('/{product}/status', [ProductController::class, 'updateStatus'])->middleware('role:ADMINISTRADOR_NEGOCIO,ADMINISTRADOR_GENERAL');
    });

    Route::prefix('sales')->middleware('role:ADMINISTRADOR_NEGOCIO,ADMINISTRADOR_GENERAL')->group(function (): void {
        Route::get('/', [SaleController::class, 'index']);
        Route::post('/', [SaleController::class, 'store'])->middleware('role:ADMINISTRADOR_NEGOCIO');
    });

    Route::prefix('redemptions')->middleware('role:CLIENTE,ADMINISTRADOR_NEGOCIO,ADMINISTRADOR_GENERAL')->group(function (): void {
        Route::get('/my', [RedemptionController::class, 'myHistory'])->middleware('role:CLIENTE');
        Route::post('/', [RedemptionController::class, 'store'])->middleware(['role:CLIENTE', 'throttle:redemption-create']);
        Route::get('/business', [RedemptionController::class, 'businessHistory'])->middleware('role:ADMINISTRADOR_NEGOCIO,ADMINISTRADOR_GENERAL');
        Route::patch('/{redemption}/status', [RedemptionController::class, 'updateStatus'])->middleware('role:ADMINISTRADOR_NEGOCIO,ADMINISTRADOR_GENERAL');
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
