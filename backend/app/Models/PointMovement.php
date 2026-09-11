<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PointMovement extends Model
{
    use HasFactory;

    protected $table = 'movimientos_puntos';

    protected $fillable = [
        'usuario_id',
        'negocio_id',
        'qr_id',
        'cantidad',
        'tipo',
        'fecha',
    ];

    protected $casts = [
        'fecha' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'usuario_id');
    }

    public function business(): BelongsTo
    {
        return $this->belongsTo(Business::class, 'negocio_id');
    }
}
