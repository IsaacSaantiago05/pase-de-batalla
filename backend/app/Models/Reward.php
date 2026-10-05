<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Reward extends Model
{
    use HasFactory;

    protected $table = 'recompensas';

    protected $fillable = [
        'negocio_id',
        'nombre',
        'descripcion',
        'puntos_requeridos',
        'cantidad_disponible',
        'estado',
    ];

    protected $casts = [
        'estado' => 'boolean',
    ];

    public function business(): BelongsTo
    {
        return $this->belongsTo(Business::class, 'negocio_id');
    }

    public function redemptions(): HasMany
    {
        return $this->hasMany(Redemption::class, 'recompensa_id');
    }
}
