<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Foto del articulo de la recompensa: ruta de la imagen dentro del disco publico.
     */
    public function up(): void
    {
        Schema::table('recompensas', function (Blueprint $table) {
            $table->string('foto', 255)->nullable()->after('descripcion');
        });
    }

    public function down(): void
    {
        Schema::table('recompensas', function (Blueprint $table) {
            $table->dropColumn('foto');
        });
    }
};
