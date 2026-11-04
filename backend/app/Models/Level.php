<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Level extends Model
{
    use HasFactory;

    protected $table = 'niveles';

    protected $fillable = [
        'nombre',
        'puntos_minimos',
        'puntos_maximos',
        'estado',
    ];

    protected $casts = [
        'estado' => 'boolean',
    ];

    /**
     * Número de nivel (1, 2, 3...) según su posición por puntos mínimos entre los niveles activos.
     * Evita depender del ID autoincremental de la tabla.
     */
    public function numero(): int
    {
        return self::query()
            ->where('estado', true)
            ->where('puntos_minimos', '<=', $this->puntos_minimos)
            ->count();
    }
}
