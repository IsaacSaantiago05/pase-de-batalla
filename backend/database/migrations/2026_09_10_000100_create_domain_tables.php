<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reglas_puntos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('negocio_id')->constrained('negocios');
            $table->decimal('monto_minimo', 10, 2);
            $table->decimal('monto_maximo', 10, 2);
            $table->unsignedInteger('puntos');
            $table->boolean('estado')->default(true);
            $table->timestamps();
        });

        Schema::create('codigos_qr', function (Blueprint $table) {
            $table->id();
            $table->foreignId('negocio_id')->constrained('negocios');
            $table->string('token', 120)->unique();
            $table->unsignedInteger('puntos');
            $table->enum('estado', ['ACTIVO', 'UTILIZADO', 'EXPIRADO', 'CANCELADO'])->default('ACTIVO');
            $table->timestamp('fecha_creacion')->useCurrent();
            $table->timestamp('fecha_expiracion')->nullable();
            $table->timestamp('fecha_uso')->nullable();
            $table->foreignId('usuario_id')->nullable()->constrained('usuarios');
            $table->timestamps();
        });

        Schema::create('movimientos_puntos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('usuario_id')->constrained('usuarios');
            $table->foreignId('negocio_id')->nullable()->constrained('negocios');
            $table->foreignId('qr_id')->nullable()->constrained('codigos_qr')->nullOnDelete();
            $table->integer('cantidad');
            $table->enum('tipo', ['GANANCIA', 'CANJE', 'AJUSTE']);
            $table->timestamp('fecha')->useCurrent();
            $table->timestamps();
        });

        Schema::create('recompensas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('negocio_id')->constrained('negocios');
            $table->string('nombre', 150);
            $table->text('descripcion')->nullable();
            $table->unsignedInteger('puntos_requeridos');
            $table->unsignedInteger('cantidad_disponible')->default(0);
            $table->boolean('estado')->default(true);
            $table->timestamps();
        });

        Schema::create('canjes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('usuario_id')->constrained('usuarios');
            $table->foreignId('recompensa_id')->constrained('recompensas');
            $table->unsignedInteger('puntos_utilizados');
            $table->enum('estado', ['PENDIENTE', 'CONFIRMADO', 'COMPLETADO', 'CANCELADO'])->default('PENDIENTE');
            $table->timestamp('fecha')->useCurrent();
            $table->timestamps();
        });

        Schema::create('elementos_isla', function (Blueprint $table) {
            $table->id();
            $table->string('nombre', 150);
            $table->enum('categoria', ['ESTRUCTURA', 'DECORACION', 'MASCOTA', 'TERRENO']);
            $table->text('descripcion')->nullable();
            $table->string('recurso', 255)->nullable();
            $table->unsignedBigInteger('nivel_requerido')->default(1);
            $table->boolean('estado')->default(true);
            $table->timestamps();
        });

        Schema::create('usuario_elementos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('usuario_id')->constrained('usuarios');
            $table->foreignId('elemento_id')->constrained('elementos_isla');
            $table->timestamp('fecha_desbloqueo')->useCurrent();
            $table->timestamps();
            $table->unique(['usuario_id', 'elemento_id']);
        });

        Schema::create('configuracion_isla', function (Blueprint $table) {
            $table->id();
            $table->foreignId('usuario_id')->constrained('usuarios');
            $table->foreignId('elemento_id')->constrained('elementos_isla');
            $table->decimal('posicion_x', 10, 2)->default(0);
            $table->decimal('posicion_y', 10, 2)->default(0);
            $table->decimal('posicion_z', 10, 2)->nullable();
            $table->boolean('estado')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('configuracion_isla');
        Schema::dropIfExists('usuario_elementos');
        Schema::dropIfExists('elementos_isla');
        Schema::dropIfExists('canjes');
        Schema::dropIfExists('recompensas');
        Schema::dropIfExists('movimientos_puntos');
        Schema::dropIfExists('codigos_qr');
        Schema::dropIfExists('reglas_puntos');
    }
};
