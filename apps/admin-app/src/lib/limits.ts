// Topes de puntos que muestra el panel. La API es la que los hace cumplir
// (backend/app/Support/PointLimits.php): si cambias un numero alla, cambialo tambien aqui.

// Maximo que el administrador de negocio puede poner a un producto.
export const BUSINESS_PRODUCT_MAX = 150

// Maximo absoluto de un producto: el que aplica al administrador general.
export const PRODUCT_MAX = 100000

// Maximo de puntos que puede dar una sola venta (un QR).
export const SALE_MAX = 500

// Regla para decidir cuantos puntos da un producto.
export const POINTS_RULE = '1 punto por cada $10 del precio'
