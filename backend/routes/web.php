<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/reset-password/{token}', function (Request $request, string $token) {
    $frontendUrl = rtrim((string) env('FRONTEND_USER_URL', 'http://localhost:5173'), '/');
    $correo = (string) $request->query('email', '');

    return redirect()->away($frontendUrl.'/reset-password?token='.urlencode($token).'&correo='.urlencode($correo));
})->name('password.reset');
