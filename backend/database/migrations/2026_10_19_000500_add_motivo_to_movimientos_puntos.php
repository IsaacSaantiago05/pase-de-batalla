<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('movimientos_puntos', function (Blueprint $table) {
            $table->string('motivo', 255)->nullable()->after('tipo');
            $table->index(['negocio_id', 'usuario_id']);
        });
    }

    public function down(): void
    {
        Schema::table('movimientos_puntos', function (Blueprint $table) {
            $table->dropIndex(['negocio_id', 'usuario_id']);
            $table->dropColumn('motivo');
        });
    }
};
