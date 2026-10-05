<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

#[Fillable(['nombre', 'correo', 'password', 'rol_id', 'nivel_id', 'negocio_id', 'fecha_registro', 'estado'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    protected $table = 'usuarios';

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'fecha_registro' => 'datetime',
            'estado' => 'boolean',
            'password' => 'hashed',
        ];
    }

    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class, 'rol_id');
    }

    public function level(): BelongsTo
    {
        return $this->belongsTo(Level::class, 'nivel_id');
    }

    public function business(): BelongsTo
    {
        return $this->belongsTo(Business::class, 'negocio_id');
    }

    public function battlePassTiers(): HasMany
    {
        return $this->hasMany(UserBattlePassTier::class, 'usuario_id');
    }

    public function islandElements(): HasMany
    {
        return $this->hasMany(UserIslandElement::class, 'usuario_id');
    }

    public function islandConfigurations(): HasMany
    {
        return $this->hasMany(IslandConfiguration::class, 'usuario_id');
    }

    public function isActive(): bool
    {
        return (bool) $this->estado;
    }

    public function hasRole(string ...$roles): bool
    {
        return $this->role !== null && in_array($this->role->nombre, $roles, true);
    }

    public function getEmailForPasswordReset(): string
    {
        return $this->correo;
    }
}
