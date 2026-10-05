<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pase_batalla_tiers', function (Blueprint $table) {
            $table->id();
            $table->string('nombre', 120);
            $table->text('descripcion')->nullable();
            $table->unsignedInteger('puntos_requeridos');
            $table->string('recompensa_nombre', 150);
            $table->text('recompensa_descripcion')->nullable();
            $table->boolean('estado')->default(true);
            $table->timestamps();
            $table->unique('puntos_requeridos');
        });

        Schema::create('usuario_pase_batalla', function (Blueprint $table) {
            $table->id();
            $table->foreignId('usuario_id')->constrained('usuarios');
            $table->foreignId('tier_id')->constrained('pase_batalla_tiers');
            $table->enum('estado', ['DESBLOQUEADO', 'RECLAMADO'])->default('DESBLOQUEADO');
            $table->timestamp('fecha_desbloqueo')->useCurrent();
            $table->timestamp('fecha_reclamo')->nullable();
            $table->timestamps();
            $table->unique(['usuario_id', 'tier_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('usuario_pase_batalla');
        Schema::dropIfExists('pase_batalla_tiers');
    }
};
