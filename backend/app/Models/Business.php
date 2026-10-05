<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Business extends Model
{
    use HasFactory;

    protected $table = 'negocios';

    protected $fillable = [
        'nombre',
        'descripcion',
        'direccion',
        'telefono',
        'correo',
        'logo',
        'estado',
        'fecha_registro',
    ];

    protected $casts = [
        'estado' => 'boolean',
        'fecha_registro' => 'datetime',
    ];

    public function administrators(): HasMany
    {
        return $this->hasMany(User::class, 'negocio_id');
    }

    public function rewards(): HasMany
    {
        return $this->hasMany(Reward::class, 'negocio_id');
    }
}
