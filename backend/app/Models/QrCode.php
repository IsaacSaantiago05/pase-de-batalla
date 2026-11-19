<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Prunable;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class QrCode extends Model
{
    use HasFactory;
    use Prunable;

    public const STATUSES = ['ACTIVO', 'UTILIZADO', 'EXPIRADO', 'CANCELADO'];

    // Dias que se conserva un QR que nadie canjeo (expirado o cancelado) antes de eliminarse solo.
    // Son 30 para que las estadisticas del mes sigan contando todos los QR generados.
    public const UNUSED_DAYS_BEFORE_DELETION = 30;

    protected $table = 'codigos_qr';

    protected $fillable = [
        'negocio_id',
        'venta_id',
        'token',
        'puntos',
        'estado',
        'fecha_creacion',
        'fecha_expiracion',
        'fecha_uso',
        'usuario_id',
    ];

    protected $casts = [
        'fecha_creacion' => 'datetime',
        'fecha_expiracion' => 'datetime',
        'fecha_uso' => 'datetime',
    ];

    public function business(): BelongsTo
    {
        return $this->belongsTo(Business::class, 'negocio_id');
    }

    public function sale(): BelongsTo
    {
        return $this->belongsTo(Sale::class, 'venta_id');
    }

    public function usedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'usuario_id');
    }

    public function movements(): HasMany
    {
        return $this->hasMany(PointMovement::class, 'qr_id');
    }

    /**
     * Filtra por el estado real. Un QR solo se guarda como EXPIRADO cuando alguien intenta usarlo,
     * asi que un ACTIVO cuya vigencia ya paso cuenta como EXPIRADO.
     *
     * @param  array<int, string>  $statuses
     */
    public function scopeWithRealStatus(Builder $query, array $statuses): Builder
    {
        return $query->where(function (Builder $any) use ($statuses): void {
            foreach ($statuses as $status) {
                match ($status) {
                    'ACTIVO' => $any->orWhere(fn (Builder $active) => $active
                        ->where('estado', 'ACTIVO')
                        ->where(fn (Builder $valid) => $valid->whereNull('fecha_expiracion')->orWhere('fecha_expiracion', '>', now()))),
                    'EXPIRADO' => $any->orWhere(fn (Builder $expired) => $expired
                        ->where('estado', 'EXPIRADO')
                        ->orWhere(fn (Builder $stale) => $stale->where('estado', 'ACTIVO')->where('fecha_expiracion', '<=', now()))),
                    default => $any->orWhere('estado', $status),
                };
            }
        });
    }

    /**
     * QR que borra `php artisan model:prune` (programado a diario en routes/console.php):
     * los que nadie canjeo y ya cumplieron el plazo. Los canjeados se conservan como historial.
     */
    public function prunable(): Builder
    {
        return static::query()
            ->withRealStatus(['EXPIRADO', 'CANCELADO'])
            ->where('fecha_creacion', '<=', now()->subDays(self::UNUSED_DAYS_BEFORE_DELETION));
    }

    /**
     * La venta que origino un QR nunca canjeado no otorgo puntos: se borra junto con el.
     */
    protected function pruning(): void
    {
        if ($this->venta_id !== null) {
            Sale::query()->whereKey($this->venta_id)->delete();
        }
    }
}
