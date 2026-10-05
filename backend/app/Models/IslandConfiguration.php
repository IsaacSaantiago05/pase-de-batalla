<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class IslandConfiguration extends Model
{
    use HasFactory;

    protected $table = 'configuracion_isla';

    protected $fillable = [
        'usuario_id',
        'elemento_id',
        'posicion_x',
        'posicion_y',
        'posicion_z',
        'estado',
    ];

    protected $casts = [
        'posicion_x' => 'decimal:2',
        'posicion_y' => 'decimal:2',
        'posicion_z' => 'decimal:2',
        'estado' => 'boolean',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'usuario_id');
    }

    public function element(): BelongsTo
    {
        return $this->belongsTo(IslandElement::class, 'elemento_id');
    }
}
