<?php

namespace App\Support;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use RuntimeException;

/**
 * Imagenes que suben los negocios (portada y foto de perfil) y los usuarios (foto de perfil).
 * Se guardan en el disco publico y se sirven por GET /api/media/..., asi no hace falta `storage:link`.
 */
class MediaStorage
{
    public const DISK = 'public';

    // Carpetas permitidas, una por tipo de dueño.
    public const BUSINESSES = 'negocios';

    public const USERS = 'usuarios';

    // Unico formato de ruta que se guarda, se sirve y se borra: <carpeta>/<nombre aleatorio>.<extension>.
    public const PATH_PATTERN = '(?:negocios|usuarios)/[A-Za-z0-9]+\.(?:jpg|jpeg|png|webp)';

    public const MAX_KILOBYTES = 2048;

    public static function store(UploadedFile $file, string $directory): string
    {
        // El nombre lo genera Laravel al azar; el que trae el archivo nunca se usa.
        $path = $file->store($directory, self::DISK);

        if ($path === false || ! self::isStoredPath($path)) {
            throw new RuntimeException('No fue posible guardar la imagen.');
        }

        return $path;
    }

    public static function delete(?string $path): void
    {
        if ($path !== null && self::isStoredPath($path)) {
            Storage::disk(self::DISK)->delete($path);
        }
    }

    public static function url(?string $path): ?string
    {
        if ($path === null || ! self::isStoredPath($path)) {
            return null;
        }

        return url('api/media/'.$path);
    }

    public static function isStoredPath(string $path): bool
    {
        return preg_match('#^'.self::PATH_PATTERN.'$#', $path) === 1;
    }
}
