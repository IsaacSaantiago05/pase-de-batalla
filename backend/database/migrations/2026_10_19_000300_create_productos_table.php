<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('productos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('negocio_id')->constrained('negocios');
            $table->string('nombre', 150);
            $table->text('descripcion')->nullable();
            $table->decimal('precio', 10, 2);
            $table->unsignedInteger('puntos');
            $table->boolean('estado')->default(true);
            $table->timestamps();
            $table->index(['negocio_id', 'estado']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('productos');
    }
};
