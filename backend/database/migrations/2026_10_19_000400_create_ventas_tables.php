<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ventas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('negocio_id')->constrained('negocios');
            $table->foreignId('creado_por')->constrained('usuarios');
            $table->decimal('total', 12, 2);
            $table->unsignedInteger('puntos_total');
            $table->timestamps();
            $table->index(['negocio_id', 'created_at']);
        });

        // Copia fija del producto al momento de la venta: el historial no cambia si el catalogo cambia.
        Schema::create('venta_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('venta_id')->constrained('ventas')->cascadeOnDelete();
            $table->foreignId('producto_id')->nullable()->constrained('productos')->nullOnDelete();
            $table->string('nombre', 150);
            $table->decimal('precio_unitario', 10, 2);
            $table->unsignedInteger('puntos_unitarios');
            $table->unsignedInteger('cantidad');
            $table->decimal('subtotal', 12, 2);
            $table->unsignedInteger('puntos_subtotal');
            $table->timestamps();
        });

        Schema::table('codigos_qr', function (Blueprint $table) {
            $table->foreignId('venta_id')->nullable()->after('negocio_id')->constrained('ventas')->nullOnDelete();
        });

        Schema::table('movimientos_puntos', function (Blueprint $table) {
            $table->foreignId('venta_id')->nullable()->after('qr_id')->constrained('ventas')->nullOnDelete();
            $table->foreignId('otorgado_por')->nullable()->after('venta_id')->constrained('usuarios')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('movimientos_puntos', function (Blueprint $table) {
            $table->dropConstrainedForeignId('otorgado_por');
            $table->dropConstrainedForeignId('venta_id');
        });

        Schema::table('codigos_qr', function (Blueprint $table) {
            $table->dropConstrainedForeignId('venta_id');
        });

        Schema::dropIfExists('venta_items');
        Schema::dropIfExists('ventas');
    }
};
