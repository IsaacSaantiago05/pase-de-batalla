<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Perfil publico del negocio: foto de portada y enlaces con nombre (ubicacion, redes sociales...).
     * La foto de perfil usa la columna `logo`, que ya existia.
     */
    public function up(): void
    {
        Schema::table('negocios', function (Blueprint $table) {
            $table->string('portada', 255)->nullable()->after('logo');
            $table->json('enlaces')->nullable()->after('portada');
        });
    }

    public function down(): void
    {
        Schema::table('negocios', function (Blueprint $table) {
            $table->dropColumn(['portada', 'enlaces']);
        });
    }
};
