<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PointRule extends Model
{
    use HasFactory;

    protected $table = 'reglas_puntos';

    protected $fillable = [
        'negocio_id',
        'monto_minimo',
        'monto_maximo',
        'puntos',
        'estado',
    ];

    protected $casts = [
        'estado' => 'boolean',
    ];

    public function business(): BelongsTo
    {
        return $this->belongsTo(Business::class, 'negocio_id');
    }
}
