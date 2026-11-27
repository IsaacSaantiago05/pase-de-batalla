<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Un nivel del pase de batalla (del 2 al 150). Los valores salen de App\Support\LevelCurve.
 */
class BattlePassTier extends Model
{
    use HasFactory;

    protected $table = 'pase_batalla_tiers';

    protected $fillable = [
        'nivel',
        'puntos_requeridos',
        'puntos_bono',
        'insignia',
    ];

    protected $casts = [
        'nivel' => 'integer',
        'puntos_requeridos' => 'integer',
        'puntos_bono' => 'integer',
    ];

    public function userTiers(): HasMany
    {
        return $this->hasMany(UserBattlePassTier::class, 'tier_id');
    }
}
