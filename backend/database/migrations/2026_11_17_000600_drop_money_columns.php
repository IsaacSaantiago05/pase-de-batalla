<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// La plataforma solo maneja puntos: se eliminan precios y totales en dinero.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('productos', function (Blueprint $table) {
            $table->dropColumn('precio');
        });

        Schema::table('ventas', function (Blueprint $table) {
            $table->dropColumn('total');
        });

        Schema::table('venta_items', function (Blueprint $table) {
            $table->dropColumn(['precio_unitario', 'subtotal']);
        });
    }

    public function down(): void
    {
        // Los importes originales no se pueden recuperar: las columnas vuelven en cero.
        Schema::table('productos', function (Blueprint $table) {
            $table->decimal('precio', 10, 2)->default(0);
        });

        Schema::table('ventas', function (Blueprint $table) {
            $table->decimal('total', 12, 2)->default(0);
        });

        Schema::table('venta_items', function (Blueprint $table) {
            $table->decimal('precio_unitario', 10, 2)->default(0);
            $table->decimal('subtotal', 12, 2)->default(0);
        });
    }
};
