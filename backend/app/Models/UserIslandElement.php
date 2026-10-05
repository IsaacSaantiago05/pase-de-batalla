<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserIslandElement extends Model
{
    use HasFactory;

    protected $table = 'usuario_elementos';

    protected $fillable = [
        'usuario_id',
        'elemento_id',
        'fecha_desbloqueo',
    ];

    protected $casts = [
        'fecha_desbloqueo' => 'datetime',
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
