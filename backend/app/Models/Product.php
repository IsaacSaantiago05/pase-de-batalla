<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Product extends Model
{
    protected $table = 'productos';

    protected $fillable = [
        'negocio_id',
        'nombre',
        'descripcion',
        'precio',
        'puntos',
        'estado',
    ];

    protected $casts = [
        'precio' => 'decimal:2',
        'puntos' => 'integer',
        'estado' => 'boolean',
    ];

    public function business(): BelongsTo
    {
        return $this->belongsTo(Business::class, 'negocio_id');
    }
}
