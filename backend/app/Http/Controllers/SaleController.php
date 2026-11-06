<?php

namespace App\Http\Controllers;

use App\Http\Requests\Sales\StoreSaleRequest;
use App\Http\Resources\SaleResource;
use App\Services\SaleService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;

class SaleController extends Controller
{
    use ApiResponse;

    public function __construct(private readonly SaleService $saleService)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $businessId = $request->filled('negocio_id') ? $request->integer('negocio_id') : null;

        $sales = $this->saleService->listForActor($request->user(), $businessId);

        return $this->success('Ventas obtenidas correctamente.', SaleResource::collection($sales));
    }

    public function store(StoreSaleRequest $request): JsonResponse
    {
        try {
            $sale = $this->saleService->create($request->user(), $request->validated()['items']);
        } catch (RuntimeException $exception) {
            return $this->error($exception->getMessage(), null, 422);
        }

        return $this->success('Venta registrada y QR generado correctamente.', new SaleResource($sale), 201);
    }
}
