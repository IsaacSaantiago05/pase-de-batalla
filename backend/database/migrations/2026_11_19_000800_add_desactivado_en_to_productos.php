<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Fecha en que se desactivo el producto: a los 7 dias inactivo se elimina solo.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('productos', function (Blueprint $table) {
            $table->timestamp('desactivado_en')->nullable()->after('estado');
        });

        // Los que ya estaban inactivos empiezan su plazo hoy, para que no se eliminen de golpe.
        DB::table('productos')->where('estado', false)->update(['desactivado_en' => now()]);
    }

    public function down(): void
    {
        Schema::table('productos', function (Blueprint $table) {
            $table->dropColumn('desactivado_en');
        });
    }
};
