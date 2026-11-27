<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Nivel del pase que un cliente ya reclamó, con los puntos de bono que recibió.
 */
class UserBattlePassTier extends Model
{
    use HasFactory;

    protected $table = 'usuario_pase_batalla';

    protected $fillable = [
        'usuario_id',
        'tier_id',
        'puntos_bono',
        'fecha_reclamo',
    ];

    protected $casts = [
        'puntos_bono' => 'integer',
        'fecha_reclamo' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'usuario_id');
    }

    public function tier(): BelongsTo
    {
        return $this->belongsTo(BattlePassTier::class, 'tier_id');
    }
}
