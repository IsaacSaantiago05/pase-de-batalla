<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// El nivel ya no se guarda en el usuario: se calcula con sus puntos ganados y los niveles del pase.
// Desaparecen la tabla niveles y usuarios.nivel_id, y elementos_isla.nivel_requerido pasa a ser
// el numero de nivel del pase.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('usuarios', function (Blueprint $table) {
            $table->dropForeign(['nivel_id']);
        });

        Schema::table('usuarios', function (Blueprint $table) {
            $table->dropColumn('nivel_id');
        });

        Schema::dropIfExists('niveles');

        // El Perro pedia el segundo de los 3 niveles anteriores (500 puntos); ahora pide el nivel 5 del pase.
        DB::table('elementos_isla')
            ->where('nombre', 'Perro')
            ->where('nivel_requerido', 2)
            ->update(['nivel_requerido' => 5]);
    }

    public function down(): void
    {
        DB::table('elementos_isla')
            ->where('nombre', 'Perro')
            ->where('nivel_requerido', 5)
            ->update(['nivel_requerido' => 2]);

        Schema::create('niveles', function (Blueprint $table) {
            $table->id();
            $table->string('nombre', 120);
            $table->unsignedInteger('puntos_minimos');
            $table->unsignedInteger('puntos_maximos');
            $table->boolean('estado')->default(true);
            $table->timestamps();
        });

        // Los niveles anteriores no se pueden recuperar: la columna vuelve vacia.
        Schema::table('usuarios', function (Blueprint $table) {
            $table->foreignId('nivel_id')->nullable()->constrained('niveles');
        });
    }
};
