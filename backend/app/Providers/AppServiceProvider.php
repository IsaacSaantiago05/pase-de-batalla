<?php

namespace App\Providers;

use App\Models\User;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Gate;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Gate::define('admin-general', fn (User $user) => $user->hasRole('ADMINISTRADOR_GENERAL'));
        Gate::define('admin-business', fn (User $user) => $user->hasRole('ADMINISTRADOR_NEGOCIO'));
        Gate::define('admin-any', fn (User $user) => $user->hasRole('ADMINISTRADOR_GENERAL', 'ADMINISTRADOR_NEGOCIO'));
    }
}
