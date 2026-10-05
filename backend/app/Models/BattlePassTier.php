<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BattlePassTier extends Model
{
    use HasFactory;

    protected $table = 'pase_batalla_tiers';

    protected $fillable = [
        'nombre',
        'descripcion',
        'puntos_requeridos',
        'recompensa_nombre',
        'recompensa_descripcion',
        'estado',
    ];

    protected $casts = [
        'estado' => 'boolean',
    ];

    public function userTiers(): HasMany
    {
        return $this->hasMany(UserBattlePassTier::class, 'tier_id');
    }
}
