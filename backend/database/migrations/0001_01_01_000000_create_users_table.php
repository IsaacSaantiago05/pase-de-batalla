<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('roles', function (Blueprint $table) {
            $table->id();
            $table->string('nombre', 60)->unique();
            $table->boolean('estado')->default(true);
            $table->timestamps();
        });

        Schema::create('niveles', function (Blueprint $table) {
            $table->id();
            $table->string('nombre', 120);
            $table->unsignedInteger('puntos_minimos');
            $table->unsignedInteger('puntos_maximos');
            $table->boolean('estado')->default(true);
            $table->timestamps();
        });

        Schema::create('negocios', function (Blueprint $table) {
            $table->id();
            $table->string('nombre', 150);
            $table->text('descripcion')->nullable();
            $table->string('direccion', 255)->nullable();
            $table->string('telefono', 40)->nullable();
            $table->string('correo', 150)->nullable();
            $table->string('logo', 255)->nullable();
            $table->boolean('estado')->default(true);
            $table->timestamp('fecha_registro')->useCurrent();
            $table->timestamps();
        });

        Schema::create('usuarios', function (Blueprint $table) {
            $table->id();
            $table->string('nombre', 150);
            $table->string('correo', 150)->unique();
            $table->string('password');
            $table->foreignId('rol_id')->constrained('roles');
            $table->foreignId('nivel_id')->nullable()->constrained('niveles');
            $table->foreignId('negocio_id')->nullable()->constrained('negocios');
            $table->timestamp('fecha_registro')->useCurrent();
            $table->boolean('estado')->default(true);
            $table->rememberToken();
            $table->timestamps();
        });

        Schema::create('password_reset_tokens', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });

        Schema::create('sessions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->foreignId('user_id')->nullable()->index();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->longText('payload');
            $table->integer('last_activity')->index();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('usuarios');
        Schema::dropIfExists('negocios');
        Schema::dropIfExists('niveles');
        Schema::dropIfExists('roles');
        Schema::dropIfExists('password_reset_tokens');
        Schema::dropIfExists('sessions');
    }
};
