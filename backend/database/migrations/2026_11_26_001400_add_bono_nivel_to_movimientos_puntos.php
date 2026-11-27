<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// BONO_NIVEL: puntos que entrega el pase al reclamar un nivel. Suman al saldo, pero no cuentan
// como puntos ganados (no hacen subir de nivel) ni pertenecen a ningun negocio.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('movimientos_puntos', function (Blueprint $table) {
            $table->enum('tipo', ['GANANCIA', 'CANJE', 'AJUSTE', 'BONO_NIVEL'])->change();
        });
    }

    public function down(): void
    {
        // Los bonos ya entregados se conservan como ajustes sin autor: siguen en el saldo y no cuentan como ganados.
        DB::table('movimientos_puntos')->where('tipo', 'BONO_NIVEL')->update(['tipo' => 'AJUSTE']);

        Schema::table('movimientos_puntos', function (Blueprint $table) {
            $table->enum('tipo', ['GANANCIA', 'CANJE', 'AJUSTE'])->change();
        });
    }
};
