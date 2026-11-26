<?php

use App\Models\Product;
use App\Models\QrCode;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schedule;

// Borra de la base los tokens vencidos hace mas de 24 h (requiere `php artisan schedule:work` o cron).
Schedule::command('sanctum:prune-expired --hours=24')->daily();

// Elimina los productos que llevan 7 dias inactivos y los QR que nadie canjeo en 30 dias
// (mismo requisito: `php artisan schedule:work` o cron).
Schedule::command('model:prune', ['--model' => [Product::class, QrCode::class]])->daily();

// Borra las notificaciones con mas de 60 dias para que la tabla no crezca sin limite (mismo requisito).
Schedule::call(fn () => DB::table('notifications')->where('created_at', '<', now()->subDays(60))->delete())
    ->daily()
    ->name('notificaciones:limpiar');

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');
