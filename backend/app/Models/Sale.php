<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Sale extends Model
{
    protected $table = 'ventas';

    protected $fillable = [
        'negocio_id',
        'creado_por',
        'total',
        'puntos_total',
    ];

    protected $casts = [
        'total' => 'decimal:2',
        'puntos_total' => 'integer',
    ];

    public function business(): BelongsTo
    {
        return $this->belongsTo(Business::class, 'negocio_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'creado_por');
    }

    public function items(): HasMany
    {
        return $this->hasMany(SaleItem::class, 'venta_id');
    }

    public function qrCode(): HasOne
    {
        return $this->hasOne(QrCode::class, 'venta_id');
    }
}
