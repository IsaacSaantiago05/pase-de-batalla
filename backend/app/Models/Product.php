<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Prunable;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

class Product extends Model
{
    use Prunable;

    // Dias que un producto puede estar inactivo antes de eliminarse solo.
    public const INACTIVE_DAYS_BEFORE_DELETION = 7;

    protected $table = 'productos';

    protected $fillable = [
        'negocio_id',
        'nombre',
        'descripcion',
        'puntos',
        'estado',
    ];

    protected $casts = [
        'puntos' => 'integer',
        'estado' => 'boolean',
        'desactivado_en' => 'datetime',
    ];

    protected static function booted(): void
    {
        // El plazo de eliminacion empieza al desactivar y se cancela al reactivar.
        static::saving(function (Product $product): void {
            if ($product->estado ?? true) {
                $product->desactivado_en = null;
            } elseif ($product->desactivado_en === null) {
                $product->desactivado_en = now();
            }
        });
    }

    public function business(): BelongsTo
    {
        return $this->belongsTo(Business::class, 'negocio_id');
    }

    /**
     * Excluye los productos que ya cumplieron el plazo inactivos: se tratan como eliminados
     * aunque la limpieza programada todavia no los haya borrado.
     */
    public function scopeWithoutExpired(Builder $query): Builder
    {
        return $query->where(fn (Builder $inner) => $inner
            ->where('estado', true)
            ->orWhereNull('desactivado_en')
            ->orWhere('desactivado_en', '>', static::expirationThreshold()));
    }

    /**
     * Productos que borra `php artisan model:prune` (programado a diario en routes/console.php).
     * Las ventas conservan su copia del nombre y los puntos.
     */
    public function prunable(): Builder
    {
        return static::query()
            ->where('estado', false)
            ->where('desactivado_en', '<=', static::expirationThreshold());
    }

    public static function expirationThreshold(): Carbon
    {
        return now()->subDays(self::INACTIVE_DAYS_BEFORE_DELETION);
    }

    /**
     * Fecha en que se eliminara, o null si esta activo.
     */
    public function deletionDate(): ?Carbon
    {
        if ($this->estado || $this->desactivado_en === null) {
            return null;
        }

        return $this->desactivado_en->copy()->addDays(self::INACTIVE_DAYS_BEFORE_DELETION);
    }

    /**
     * Un producto vencido ya no se puede consultar ni reactivar por la API (responde 404).
     */
    public function resolveRouteBinding($value, $field = null)
    {
        return $this->newQuery()
            ->withoutExpired()
            ->where($field ?? $this->getRouteKeyName(), $value)
            ->first();
    }
}
