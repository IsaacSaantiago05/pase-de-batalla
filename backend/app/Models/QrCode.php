<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class QrCode extends Model
{
    use HasFactory;

    protected $table = 'codigos_qr';

    protected $fillable = [
        'negocio_id',
        'token',
        'puntos',
        'estado',
        'fecha_creacion',
        'fecha_expiracion',
        'fecha_uso',
        'usuario_id',
    ];

    protected $casts = [
        'fecha_creacion' => 'datetime',
        'fecha_expiracion' => 'datetime',
        'fecha_uso' => 'datetime',
    ];

    public function business(): BelongsTo
    {
        return $this->belongsTo(Business::class, 'negocio_id');
    }

    public function usedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'usuario_id');
    }

    public function movements(): HasMany
    {
        return $this->hasMany(PointMovement::class, 'qr_id');
    }
}