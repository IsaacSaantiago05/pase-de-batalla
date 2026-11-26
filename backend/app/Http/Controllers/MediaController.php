<?php

namespace App\Http\Controllers;

use App\Support\BusinessMedia;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class MediaController extends Controller
{
    /**
     * Entrega una imagen publica de un negocio. La ruta solo acepta el formato de BusinessMedia::PATH_PATTERN.
     */
    public function __invoke(string $path): StreamedResponse
    {
        $disk = Storage::disk(BusinessMedia::DISK);

        abort_unless(BusinessMedia::isStoredPath($path) && $disk->exists($path), 404);

        // Cada imagen nueva tiene un nombre distinto, asi que el navegador puede guardarla sin volver a pedirla.
        return $disk->response($path, null, [
            'Cache-Control' => 'public, max-age=31536000, immutable',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }
}
