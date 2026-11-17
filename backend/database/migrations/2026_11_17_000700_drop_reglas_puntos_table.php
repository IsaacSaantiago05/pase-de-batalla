<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Las reglas de puntos dependian del monto de la compra; la plataforma ya no maneja dinero.
return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('reglas_puntos');
    }

    public function down(): void
    {
        // Solo se recupera la estructura: las reglas borradas no vuelven.
        Schema::create('reglas_puntos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('negocio_id')->constrained('negocios');
            $table->decimal('monto_minimo', 10, 2);
            $table->decimal('monto_maximo', 10, 2);
            $table->unsignedInteger('puntos');
            $table->boolean('estado')->default(true);
            $table->timestamps();
        });
    }
};
