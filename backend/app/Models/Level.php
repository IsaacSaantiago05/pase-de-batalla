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
}
