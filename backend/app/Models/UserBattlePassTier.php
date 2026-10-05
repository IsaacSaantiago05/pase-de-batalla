<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserBattlePassTier extends Model
{
    use HasFactory;

    protected $table = 'usuario_pase_batalla';

    protected $fillable = [
        'usuario_id',
        'tier_id',
        'estado',
        'fecha_desbloqueo',
        'fecha_reclamo',
    ];

    protected $casts = [
        'fecha_desbloqueo' => 'datetime',
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
