<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class IslandElement extends Model
{
    use HasFactory;

    protected $table = 'elementos_isla';

    protected $fillable = [
        'nombre',
        'categoria',
        'descripcion',
        'recurso',
        'nivel_requerido',
        'estado',
    ];

    protected $casts = [
        'estado' => 'boolean',
    ];

    public function userElements(): HasMany
    {
        return $this->hasMany(UserIslandElement::class, 'elemento_id');
    }

    public function configurations(): HasMany
    {
        return $this->hasMany(IslandConfiguration::class, 'elemento_id');
    }
}
