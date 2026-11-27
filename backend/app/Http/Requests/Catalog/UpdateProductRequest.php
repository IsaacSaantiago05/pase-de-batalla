<?php

namespace App\Http\Requests\Catalog;

use App\Models\Product;
use App\Support\PointLimits;
use Closure;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;

class UpdateProductRequest extends FormRequest
{
    /**
     * El negocio solo edita sus productos. Se revisa aqui, antes de validar, para que un producto
     * ajeno responda siempre 403 y no un error de validacion que dependa de sus puntos.
     */
    public function authorize(): bool
    {
        $user = $this->user();
        $product = $this->route('product');

        return ! ($user?->hasRole('ADMINISTRADOR_NEGOCIO') && $product instanceof Product && $user->negocio_id !== $product->negocio_id);
    }

    protected function failedAuthorization(): never
    {
        throw new HttpResponseException(response()->json([
            'success' => false,
            'message' => 'No puedes modificar productos de otro negocio.',
            'data' => null,
        ], 403));
    }

    public function rules(): array
    {
        return [
            'nombre' => ['sometimes', 'required', 'string', 'max:150'],
            'descripcion' => ['nullable', 'string'],
            'puntos' => ['sometimes', 'required', 'integer', 'min:1', $this->maxPointsRule()],
            'estado' => ['sometimes', 'boolean'],
        ];
    }

    /**
     * Tope segun quien edita. Si el administrador general ya le habia puesto al producto mas puntos que el
     * tope del negocio, el negocio puede seguir editando lo demas mientras no cambie esos puntos.
     */
    private function maxPointsRule(): Closure
    {
        return function (string $attribute, mixed $value, Closure $fail): void {
            $product = $this->route('product');
            $unchanged = $product instanceof Product && (int) $value === (int) $product->puntos;

            if (! $unchanged && (int) $value > PointLimits::productMaxFor($this->user())) {
                $fail(PointLimits::productMaxMessage($this->user()));
            }
        };
    }

    public function messages(): array
    {
        return [
            'nombre.required' => 'El nombre del producto es obligatorio.',
            'nombre.max' => 'El nombre no puede tener más de 150 caracteres.',
            'puntos.required' => 'Indica cuántos puntos otorga el producto.',
            'puntos.integer' => 'Los puntos deben ser un número entero.',
            'puntos.min' => 'El producto debe otorgar al menos 1 punto.',
        ];
    }
}
