<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Redemption extends Model
{
    use HasFactory;

    protected $table = 'canjes';

    protected $fillable = [
        'usuario_id',
        'recompensa_id',
        'puntos_utilizados',
        'estado',
        'fecha',
    ];

    protected $casts = [
        'fecha' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'usuario_id');
    }

    public function reward(): BelongsTo
    {
        return $this->belongsTo(Reward::class, 'recompensa_id');
    }
}
