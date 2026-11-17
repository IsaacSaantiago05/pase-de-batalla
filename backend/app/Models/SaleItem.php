<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SaleItem extends Model
{
    protected $table = 'venta_items';

    protected $fillable = [
        'venta_id',
        'producto_id',
        'nombre',
        'puntos_unitarios',
        'cantidad',
        'puntos_subtotal',
    ];

    protected $casts = [
        'puntos_unitarios' => 'integer',
        'cantidad' => 'integer',
        'puntos_subtotal' => 'integer',
    ];

    public function sale(): BelongsTo
    {
        return $this->belongsTo(Sale::class, 'venta_id');
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'producto_id');
    }
}
