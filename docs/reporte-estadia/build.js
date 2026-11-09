// Genera el reporte de estadía en formato Word siguiendo la guía de la UPRR.
// Uso: node build.js   ->  Reporte_Estadia_Pase_de_Batalla.docx
const fs = require('fs');
const path = require('path');
const L = require('./lib');
const { d, FONT, runs, P, H1, H2, H3, bullets, numbered, declare, F, T, table, figure, figurePlaceholder, reg, tocPlaceholder } = L;
const {
  Document, Packer, Paragraph, TextRun, AlignmentType, Footer, PageNumber, LevelFormat,
  PageBreak, PageOrientation,
} = d;

const FIG = (n) => path.join(__dirname, 'figuras', n + '.png');
// Tamaños reales (px) de los PNG generados a 2x: se usa solo la relación de aspecto.
const SZ = { f1: [2000, 1120], f2: [2200, 1290], f2b: [2200, 810], f3: [2000, 760], f4: [2000, 1040], f5: [2000, 720], f6: [2000, 940] };

declare(
  ['organigrama', 'cronograma', 'arquitectura', 'mer_nucleo', 'mer_gamificacion', 'flujo_venta', 'estados_qr', 'estados_canje'],
  ['entregables', 'gamificacion', 'fases', 'tecnologias', 'roles', 'seguridad', 'decisiones', 'actividades',
    'objetivos', 'metricas', 'pruebas', 'ejecucion', 'repositorio', 'pantallas', 'endpoints'],
);

const TITULO = 'Desarrollo de la plataforma web de fidelización gamificada “Pase de Batalla” con puntos, códigos QR y recompensas para negocios locales en [[empresa]]';
const ALUMNOS = ['José Isaac Santiago Ojeda', 'Erick Iván Ponce Hernández'];

// ---------------------------------------------------------------- Sección 1: portada y carta
const center = (text, size, o = {}) => new Paragraph({
  alignment: AlignmentType.CENTER, spacing: { lineRule: 'auto', line: 240, before: o.before ?? 0, after: o.after ?? 0 },
  children: runs(text, size, o.run ?? {}),
});
const portada = [
  center('[[Logotipo de la Universidad Politécnica de la Región Ribereña, centrado]]', 22, { after: 240 }),
  center('UNIVERSIDAD POLITÉCNICA DE LA REGIÓN RIBEREÑA', 56, { run: { bold: true }, after: 600 }),
  center('INFORME DE ESTADÍA', 48, { run: { bold: true }, after: 600 }),
  center('“' + TITULO + '”', 40, { after: 700 }),
  center('Estudiantes: ' + ALUMNOS[0], 32, { after: 60 }),
  center(ALUMNOS[1], 32, { after: 500 }),
  center('Programa: [[programa educativo]]', 32, { after: 500 }),
  center('Asesor Industrial: [[grado y nombre]]', 32, { after: 60 }),
  center('Asesor Académico: [[grado y nombre]]', 32, { after: 900 }),
  new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { lineRule: 'auto', line: 240 }, children: runs('Ciudad Miguel Alemán, Tamaulipas, [[fecha de entrega]]', 24) }),
];
const carta = [
  new Paragraph({ pageBreakBefore: true, alignment: AlignmentType.CENTER, spacing: { after: 480 },
    children: [new TextRun({ text: 'CARTA DE AUTORIZACIÓN PARA IMPRESIÓN DEL REPORTE', font: FONT, size: 24, bold: true })] }),
  P('[[Insertar aquí la carta de autorización emitida por la dirección de carrera, con nombres, sellos y firmas. Esta hoja se cuenta como página 2, pero no lleva número.]]'),
];

// ---------------------------------------------------------------- Preliminares
const pageBreak = () => new Paragraph({ children: [new PageBreak()] });
const agradecimientos = [
  H1('AGRADECIMIENTOS', { left: true }),
  ...ALUMNOS.flatMap((n, i) => [
    ...(i > 0 ? [pageBreak()] : []),
    new Paragraph({ spacing: { lineRule: 'auto', line: 240, after: 200 }, children: [new TextRun({ text: n, font: FONT, size: 22, bold: true })] }),
    P('[[Texto de agradecimiento de ' + n + ': corto y conciso, a gusto del autor. Una cuartilla por integrante.]]', { single: true }),
  ]),
];
const dedicatoria = [
  H1('DEDICATORIA', { left: true }),
  ...ALUMNOS.flatMap((n, i) => [
    ...(i > 0 ? [pageBreak()] : []),
    new Paragraph({ spacing: { lineRule: 'auto', line: 240, after: 200 }, children: [new TextRun({ text: n, font: FONT, size: 22, bold: true })] }),
    P('[[Dedicatoria de ' + n + ': breve texto dirigido a las personas o instituciones que apoyaron el desarrollo del reporte.]]', { single: true }),
  ]),
];
const resumen = [
  H1('RESUMEN', { left: true }),
  P('[[Versión provisional: el resumen se redacta al final del trabajo. Actualizar con los resultados definitivos.]]', { single: true }),
  P('El presente reporte describe el desarrollo de *Pase de Batalla*, una plataforma web de fidelización gamificada dirigida a negocios locales, realizada como proyecto de estadía en [[empresa]]. La problemática atendida es la falta de mecanismos digitales, seguros y de bajo costo para registrar la recurrencia de los clientes y premiarla. Como solución se construyó una interfaz de programación REST con Laravel y MySQL, una aplicación web progresiva para clientes y un panel administrativo, ambos con React y TypeScript.', { single: true }),
  P('El sistema otorga puntos globales mediante códigos QR de un solo uso con vigencia de 30 segundos, calcula niveles a partir de los puntos acumulados y permite canjear recompensas con control de existencias. Además ofrece un pase de batalla con hitos reclamables, una isla virtual personalizable, un catálogo de productos, el registro de ventas y estadísticas por negocio y por plataforma.', { single: true }),
  P('La metodología fue incremental, por fases, con ramas de funcionalidad, integración mediante *pull requests* y pruebas automatizadas por módulo. Al 6 de noviembre de 2026 el proyecto cuenta con 60 rutas de API, 17 tablas de dominio, dos aplicaciones web y 86 pruebas automatizadas. [[Incluir aquí los resultados de validación y las conclusiones cuando se concluya el proyecto.]]', { single: true }),
  P('**Palabras clave:** fidelización, gamificación, código QR, API REST, aplicación web progresiva.', { single: true }),
];
const abstract = [
  H1('ABSTRACT', { left: true }),
  P('[[Provisional version: translate again once the Spanish summary is final.]]', { single: true }),
  P('This report describes the development of *Pase de Batalla*, a gamified loyalty web platform for local businesses, carried out as an internship project at [[company]]. The problem addressed is the lack of secure, low-cost digital mechanisms to record customer recurrence and reward it. The solution consists of a REST application programming interface built with Laravel and MySQL, a progressive web application for customers and an administrative panel, both built with React and TypeScript.', { single: true }),
  P('The system awards global points through single-use QR codes valid for 30 seconds, calculates levels from accumulated points and allows customers to redeem rewards with stock control. It also provides a battle pass with claimable milestones, a customizable virtual island, a product catalog, sales registration and statistics per business and for the whole platform.', { single: true }),
  P('The methodology was incremental and phase-based, using feature branches, pull-request integration and automated tests per module. As of November 6, 2026, the project includes 60 API routes, 17 domain tables, two web applications and 86 automated tests. [[Add validation results and conclusions when the project is completed.]]', { single: true }),
  P('**Keywords:** loyalty, gamification, QR code, REST API, progressive web app.', { single: true }),
];
const indices = [
  H1('ÍNDICE DE CONTENIDO', { left: true }),
  tocPlaceholder('contenido'),
  H1('ÍNDICE DE FIGURAS', { left: true }),
  tocPlaceholder('figuras'),
  H1('ÍNDICE DE TABLAS', { left: true }),
  tocPlaceholder('tablas'),
];

// ---------------------------------------------------------------- Introducción
const introduccion = [
  H1('INTRODUCCIÓN'),
  P('La fidelización de clientes es uno de los factores que más influyen en la permanencia y el crecimiento de un negocio. Conservar a un cliente que ya conoce los productos y confía en el establecimiento suele ser más sencillo que atraer a uno nuevo, por lo que los programas de lealtad, como las tarjetas de sellos, los descuentos por frecuencia o los sistemas de puntos, forman parte de la estrategia comercial de empresas de todos los tamaños (Kumar & Reinartz, 2018). En los últimos años, a estos programas se han sumado técnicas de gamificación, es decir, el uso de elementos propios del diseño de juegos, como niveles, insignias y recompensas progresivas, en contextos que no son juegos (Deterding et al., 2011), con el propósito de aumentar la motivación y el compromiso de los usuarios (Hamari et al., 2014).'),
  P('La digitalización permite además que estos programas dejen de depender de tarjetas físicas o de registros manuales. Una aplicación web accesible desde el teléfono móvil, combinada con códigos QR y con servicios en línea que guardan cada operación de forma verificable, reduce los errores de captura, dificulta el fraude y entrega al negocio información que antes no se registraba, como la frecuencia de visita de sus clientes o los productos que más se venden. Por ello, el tema de la presente estadía es el diseño y la construcción de una plataforma de este tipo, pensada para negocios locales de pequeña escala.'),
  P('El proyecto se desarrolla en [[nombre de la empresa]], ubicada en [[ciudad y estado]], organización dedicada a [[giro de la empresa]]. [[Describir en dos o tres oraciones qué hace la empresa y el área en la que se integran los estudiantes.]] La estadía es realizada por los estudiantes José Isaac Santiago Ojeda y Erick Iván Ponce Hernández, como requisito del décimo cuatrimestre del programa de [[programa educativo]] de la Universidad Politécnica de la Región Ribereña, bajo la asesoría de [[asesor industrial]] y [[asesor académico]].'),
  P('La problemática que se atiende es que los negocios locales, como cafeterías o pastelerías, suelen carecer de herramientas accesibles para reconocer y premiar la recurrencia de sus clientes. Los esquemas tradicionales, como las tarjetas de papel, dependen del control manual, pueden extraviarse o falsificarse, no permiten medir el comportamiento de compra y limitan al cliente a un solo establecimiento. Las soluciones digitales existentes, cuando se encuentran, implican costos o integraciones que están fuera del alcance de estos negocios. [[Ajustar este párrafo con la situación específica que describe la empresa.]]'),
  P('El objetivo general del proyecto es desarrollar y verificar una plataforma web de fidelización gamificada, llamada *Pase de Batalla*, que permita a los negocios otorgar puntos verificables por cada venta y a sus clientes acumular esos puntos de manera global, subir de nivel, canjear recompensas, avanzar en un pase de batalla y personalizar una isla virtual. Como objetivos específicos se plantean construir una API segura con roles y aislamiento por negocio, un motor de puntos, un flujo de códigos QR de un solo uso, el catálogo, las ventas y los canjes, los módulos de gamificación, las aplicaciones web para clientes y administradores, las estadísticas y un conjunto de pruebas automatizadas.'),
  P('La solución propuesta consiste en un servicio *backend* basado en Laravel y MySQL, que concentra las reglas de negocio y expone una API REST, y en dos aplicaciones *frontend* construidas con React y TypeScript: una aplicación web progresiva para los clientes y un panel administrativo para los administradores de negocio y el administrador general. El administrador de un negocio registra una venta, el sistema calcula los puntos y genera un código QR con una vigencia de 30 segundos; el cliente lo escanea con la cámara de su teléfono y recibe los puntos, que alimentan su nivel, su pase de batalla y el desbloqueo de elementos para su isla.'),
  P('Entre las ventajas de la solución destacan que los puntos son globales y no se limitan a un solo establecimiento, que cada código QR solo puede usarse una vez y vence en poco tiempo, que el historial de ventas conserva una copia fija de los precios y puntos vigentes al momento de la operación, y que las operaciones críticas se ejecutan en transacciones con bloqueo de filas para evitar dobles canjes o descuentos de stock inconsistentes. El alcance cubre el desarrollo de la API, de las dos aplicaciones y de la base de datos, así como las pruebas automatizadas del *backend*. Entre las limitaciones se encuentran que el sistema no se integra con puntos de venta físicos ni con pasarelas de pago, que no envía notificaciones, que algunas rutas del panel administrativo cuentan por ahora solo con una vista base y que las aplicaciones web no tienen todavía pruebas automatizadas. [[Confirmar o ajustar las limitaciones al concluir el proyecto.]]'),
  P('El documento se organiza en tres capítulos. El Capítulo 1, Organización productiva, describe la empresa, plantea la problemática, los objetivos, los alcances y limitaciones, la justificación y la propuesta de solución. El Capítulo 2, Marco teórico y metodología, expone los conceptos que fundamentan el proyecto y detalla la metodología, las herramientas, la arquitectura, el modelo de datos, el diseño de los módulos, las medidas de seguridad, la estrategia de pruebas y las situaciones no previstas que se presentaron durante el desarrollo. El Capítulo 3, Análisis e interpretación de resultados, presenta los productos obtenidos, las métricas del sistema, la cobertura de pruebas y la actividad del desarrollo. Al final se incluyen las aportaciones y conclusiones, las referencias y los anexos.'),
];

// ---------------------------------------------------------------- Capítulo 1
const cap1 = [
  H1('CAPÍTULO 1. ORGANIZACIÓN PRODUCTIVA'),
  P('Este capítulo describe la organización donde se realiza la estadía y el contexto en el que se origina el proyecto. Los datos de la empresa deben ser proporcionados por los estudiantes y su asesor industrial; los apartados marcados en amarillo indican la información pendiente. La problemática, los objetivos, los alcances, la justificación y la propuesta de solución sí se redactan a partir del trabajo realizado.'),

  H2('1.1. Nombre de la empresa'),
  P('[[Nombre oficial de la empresa, tal como aparece en su registro (por ejemplo, razón social).]]'),
  H3('Ubicación'),
  P('[[Calle, número, colonia, municipio y estado. Se puede incluir un mapa o croquis.]]'),
  H3('Giro empresarial'),
  P('[[Indicar si la empresa es industrial (extractiva o manufacturera), comercial (mayorista, minorista o comisionista) o de servicio, y describir de forma breve su actividad primordial.]]'),
  H3('Antecedentes de la empresa'),
  P('[[Explicar cuándo, dónde, quién y por qué se fundó la empresa, y cómo ha evolucionado desde su inicio hasta su estado actual.]]'),

  H2('1.2. Misión, visión, valores y objetivos'),
  P('[[Redactar un párrafo introductorio y transcribir la misión, la visión, los valores y los objetivos de la empresa, citando la fuente consultada. Si la empresa no los tiene definidos, se debe precisar por escrito.]]'),
  H3('Organigrama'),
  P('[[Mostrar el organigrama de la empresa. Si no cuenta con uno, diseñarlo a partir de la observación del área donde se realiza la estadía.]]'),
  ...figurePlaceholder('organigrama', 'Organigrama de la empresa', 'Insertar aquí la imagen del organigrama'),

  H2('1.3. Proceso productivo'),
  P('[[Describir en forma general el producto o servicio que ofrece la empresa y los procesos que lleva a cabo, y después enfocarse en el área donde se desarrolla el proyecto y en los antecedentes de la misma. Indicar cómo se integra el equipo de estudiantes a ese proceso.]]'),

  H2('1.4. Problemática'),
  H3('Situación actual'),
  P('Los negocios locales de pequeña escala, como cafeterías, pastelerías o tiendas de barrio, compiten por clientes que tienen muchas opciones cercanas. Para premiar la recurrencia suelen recurrir a tarjetas de sellos en papel, a promociones improvisadas o a la memoria del dueño o del personal. Estos mecanismos funcionan mientras el volumen de clientes es muy bajo, pero presentan limitaciones evidentes: la tarjeta se extravía, el sello puede falsificarse, el cliente no sabe con precisión cuánto le falta para obtener un beneficio y el negocio no conserva datos que le permitan entender quiénes son sus clientes frecuentes ni qué productos generan más ventas. [[Sustentar con la situación observada en la empresa o con datos propios.]]'),
  H3('Efectos y consecuencias'),
  P('La falta de un mecanismo confiable de fidelización tiene consecuencias en los dos lados de la relación comercial. El negocio pierde la oportunidad de incentivar la recompra, asume el riesgo de fraude por tarjetas duplicadas o puntos otorgados por error, y toma decisiones sobre su catálogo sin información medible. El cliente, por su parte, percibe que su recurrencia no se reconoce de manera clara, no tiene visibilidad de su avance y no encuentra una razón para concentrar sus compras en un mismo lugar. Además, cada programa funciona de manera aislada, de modo que el esfuerzo del cliente en un establecimiento no se refleja en ningún otro.'),
  H3('Condiciones, elementos y relevancia del problema'),
  P('Los elementos que intervienen en el problema son el negocio que vende, el cliente que compra, el comprobante de que la compra ocurrió, los puntos o beneficios que se otorgan a cambio y los datos que se generan. Para que la solución sea confiable debe garantizar que cada compra otorgue puntos una sola vez, que solo el negocio correspondiente pueda emitirlos, que el cliente pueda comprobar su saldo y que los premios se entreguen sin exceder las existencias. Estas condiciones hacen relevante el problema desde el punto de vista técnico, porque exigen autenticación, control de acceso, consistencia transaccional y un registro histórico que no pueda alterarse de manera accidental.'),
  H3('Trabajos anteriores'),
  P('Los programas de lealtad tienen una larga trayectoria en el comercio y la literatura los asocia con la construcción de relaciones duraderas con el cliente (Dick & Basu, 1994; Kumar & Reinartz, 2018). En el ámbito digital existen aplicaciones comerciales de lealtad y de monedero de puntos, pero suelen estar orientadas a grandes cadenas, a un solo comercio o a esquemas con costos de suscripción. Por otro lado, la gamificación ha mostrado efectos positivos sobre la motivación y el compromiso en diversos contextos, aunque sus resultados dependen del diseño y del público (Hamari et al., 2014). El presente proyecto retoma ambas líneas y las aplica a un entorno de negocios locales, con puntos que se acumulan de manera global.'),
  H3('Pregunta del problema'),
  P('¿Cómo diseñar e implementar una plataforma web que permita a negocios locales otorgar puntos verificables por cada venta y a sus clientes acumularlos, canjearlos y seguir su progreso de forma segura, sin exceder el control de existencias ni permitir el uso repetido de un mismo comprobante?'),

  H3('Objetivo general'),
  P('Desarrollar y verificar una plataforma web de fidelización gamificada que permita a negocios locales otorgar puntos mediante códigos QR y a sus clientes acumular puntos globales, subir de nivel, canjear recompensas y personalizar una isla virtual, con control de acceso por roles y aislamiento de la información de cada negocio.'),
  H3('Objetivos específicos'),
  ...numbered('obj', [
    'Diseñar e implementar una API REST con autenticación por *tokens*, tres roles de usuario y aislamiento de la información por negocio.',
    'Implementar un motor de puntos globales con reglas por negocio, historial, ajustes manuales auditados y cálculo automático de niveles.',
    'Implementar un flujo de códigos QR de un solo uso, con vigencia automática, cancelación y lectura mediante la cámara del teléfono.',
    'Implementar el catálogo de productos, el registro de ventas y los módulos de recompensas y canjes con control de existencias y consistencia transaccional.',
    'Implementar el pase de batalla y la isla personalizable como elementos de gamificación.',
    'Desarrollar una aplicación web progresiva para clientes y un panel administrativo para administradores de negocio y administrador general.',
    'Proveer estadísticas de ventas, puntos, canjes y códigos QR por negocio y para toda la plataforma.',
    'Verificar el sistema mediante pruebas automatizadas por módulo y documentar su instalación y uso.',
  ]),
  P('[[Los objetivos se redactaron a partir de lo construido en el repositorio. Compararlos con los del anteproyecto autorizado y ajustar la redacción si es necesario.]]', { before: 120 }),

  H3('Alcances y limitaciones'),
  P('**Alcances.** Al concluir el proyecto se cuenta con una API REST documentada en el repositorio, con 60 rutas distribuidas en autenticación, usuarios, negocios, administradores, puntos, reglas de puntos, productos, ventas, códigos QR, recompensas, canjes, pase de batalla, isla, estadísticas, directorio y perfil; con una base de datos relacional de 17 tablas de dominio; con una aplicación web progresiva para clientes y un panel administrativo; y con pruebas automatizadas del *backend* que cubren los flujos principales y las reglas de seguridad.'),
  P('**Limitaciones.** El sistema no se integra con puntos de venta físicos ni con pasarelas de pago, por lo que la venta se captura de forma manual en el panel administrativo. No incluye notificaciones al usuario ni cobertura multilingüe. Las rutas del panel administrativo para el tablero inicial, el negocio, el historial, los usuarios, los negocios, los niveles, los elementos de isla y las reglas de puntos cuentan por ahora con una vista base, aunque sus operaciones ya existen en la API. Las aplicaciones web no tienen pruebas automatizadas y los íconos de la aplicación instalable no están definidos. [[Agregar las limitaciones externas propias de la estadía, como tiempo, personal, equipo o infraestructura, y confirmar el estado del despliegue.]]'),
  H3('Justificación'),
  P('El proyecto es importante porque aborda una necesidad real de los negocios locales: contar con una herramienta de fidelización que sea confiable, accesible desde el teléfono y capaz de generar información útil para la toma de decisiones. Beneficia a los negocios, que obtienen un mecanismo verificable para premiar la recurrencia y estadísticas de sus ventas; a los clientes, que acumulan puntos globales, ven su progreso y disfrutan de elementos de juego; y a la empresa donde se realiza la estadía, que dispone de una base de código estructurada, probada y documentada. Contribuye a resolver problemas prácticos de seguridad, consistencia de datos y control de acceso que son comunes en sistemas transaccionales. Los resultados se registran mediante el historial de commits del repositorio, las pruebas automatizadas y las métricas que se presentan en el Capítulo 3.'),

  H2('1.5. Propuesta de solución'),
  P('La propuesta consiste en una plataforma compuesta por un servicio central y dos aplicaciones de interfaz. El servicio central, construido con Laravel, concentra las reglas de negocio, valida cada operación y guarda la información en una base de datos MySQL. Las aplicaciones consumen ese servicio mediante una API REST y se distinguen por el tipo de usuario: los clientes usan una aplicación web progresiva instalable en el teléfono, y los administradores usan un panel de gestión. La solución se justifica porque separa con claridad las responsabilidades, permite agregar nuevas interfaces sin duplicar la lógica y facilita las pruebas automatizadas de las reglas críticas.'),
  P('El flujo central es el siguiente. El administrador de un negocio mantiene un catálogo de productos con precio y puntos fijos y registra una venta seleccionando productos y cantidades. El sistema suma los puntos de la venta y genera un código QR de un solo uso con una vigencia de 30 segundos. El cliente escanea el código desde su aplicación, el sistema valida el estado y la vigencia dentro de una transacción y, si es válido, acredita los puntos y recalcula el nivel del cliente. Con los puntos acumulados el cliente avanza en el pase de batalla, desbloquea elementos para su isla y puede canjear las recompensas que cada negocio ofrece. La Tabla 1 resume los componentes entregados.'),
  ...table('entregables', 'Componentes de la solución propuesta', [2300, 4822, 2000],
    ['Componente', 'Descripción', 'Usuarios'],
    [
      ['API REST (*backend*)', 'Laravel 13 con Sanctum; reglas de negocio en servicios; validación con *Form Requests*; 60 rutas.', 'Ambas aplicaciones'],
      ['Base de datos', 'MySQL con 17 tablas de dominio, migraciones y datos iniciales (*seeders*).', 'Sistema'],
      ['Aplicación del cliente', 'Aplicación web progresiva con puntos, escaneo de QR, recompensas, canjes, pase de batalla, isla, directorio de negocios y perfil.', 'Cliente'],
      ['Panel administrativo', 'Productos, ventas, códigos QR, puntos, recompensas, canjes, clientes, ajustes, administradores y estadísticas.', 'Administrador de negocio y general'],
      ['Pruebas automatizadas', '86 pruebas de funcionalidad del *backend* con PHPUnit sobre MySQL.', 'Equipo de desarrollo'],
      ['Documentación', 'README con estructura, rutas, configuración y ejecución de pruebas.', 'Equipo de desarrollo'],
    ]),
];

// ---------------------------------------------------------------- Capítulo 2
const cap2 = [
  H1('CAPÍTULO 2. MARCO TEÓRICO Y METODOLOGÍA'),

  H2('2.1. Marco teórico'),
  P('Este apartado reúne los fundamentos teóricos y conceptuales que sustentan las decisiones del proyecto. Cada tema se relaciona de manera directa con un componente de la plataforma, de modo que el marco teórico sirva para justificar el diseño y no solo para describir conceptos.'),

  H3('2.1.1. Fidelización de clientes y programas de lealtad'),
  P('La lealtad del cliente se entiende como un compromiso profundo de volver a comprar un producto o servicio de manera consistente en el futuro, a pesar de que existan influencias situacionales y esfuerzos de marketing capaces de provocar un cambio de preferencia (Oliver, 1999). Dick y Basu (1994) proponen que la lealtad no se reduce a la repetición de compra, sino que combina una actitud favorable con la conducta de recompra. Esta distinción es importante para el diseño de un programa, porque un sistema que solo cuenta compras recompensa la conducta, pero no necesariamente construye una actitud favorable hacia el negocio.'),
  P('Kumar y Reinartz (2018) ubican los programas de lealtad dentro de la gestión de la relación con el cliente y señalan que su valor depende de la información que generan, además del beneficio que entregan. Desde esa perspectiva, la plataforma desarrollada no se limita a otorgar puntos: registra cada movimiento con su origen, su negocio y su responsable, y ofrece estadísticas con las que el negocio puede conocer la recurrencia de sus clientes y los productos que más se venden.'),

  H3('2.1.2. Gamificación'),
  P('Deterding et al. (2011) definen la gamificación como el uso de elementos de diseño propios de los juegos en contextos que no son juegos. Esta definición distingue la gamificación de un videojuego completo y de los juguetes: lo que se toma prestado son componentes, como puntos, niveles, insignias, retos o recompensas, que se aplican a una actividad cotidiana, en este caso la compra recurrente. La revisión de Hamari et al. (2014) encontró que la gamificación suele producir efectos positivos, pero que estos dependen del contexto y de los usuarios, por lo que conviene diseñar elementos coherentes con la actividad y no solo agregar insignias de manera indiscriminada.'),
  P('En la plataforma se identifican seis elementos de juego, cada uno con una implementación concreta. Los puntos son la unidad de progreso; los niveles agrupan rangos de puntos acumulados; los hitos del pase de batalla premian umbrales con una insignia; las recompensas convierten los puntos en beneficios reales; la isla permite personalizar un espacio propio con elementos que se desbloquean por nivel; y las pantallas muestran el avance y el siguiente hito. La Tabla 2 relaciona cada elemento con su implementación.'),
  ...table('gamificacion', 'Elementos de gamificación y su implementación en la plataforma', [1700, 2700, 4722],
    ['Elemento', 'Propósito', 'Implementación en Pase de Batalla'],
    [
      ['Puntos', 'Medir el avance y premiar la recurrencia', 'Movimientos de puntos globales por cliente (ganancia, canje y ajuste), con el negocio de origen.'],
      ['Niveles', 'Reconocer la trayectoria acumulada', 'Tabla de niveles con puntos mínimos y máximos; el nivel se recalcula con los puntos acumulados.'],
      ['Hitos o insignias', 'Marcar logros por umbral', 'Pase de batalla con cuatro hitos de ejemplo (50, 150, 300 y 500 puntos) y reclamo único.'],
      ['Recompensas', 'Convertir el esfuerzo en beneficios', 'Recompensas por negocio con puntos requeridos y existencias; el canje descuenta puntos y stock.'],
      ['Personalización', 'Dar identidad y propiedad al jugador', 'Isla con elementos de cuatro categorías que se desbloquean por nivel y se ubican en un mapa.'],
      ['Progreso visible', 'Dar retroalimentación inmediata', 'Porcentaje de avance, puntos faltantes para el siguiente hito y estado de cada hito.'],
    ]),

  H3('2.1.3. Arquitectura cliente-servidor, API REST y aplicaciones de una sola página'),
  P('En una arquitectura cliente-servidor, las responsabilidades se reparten entre un componente que presta servicios y uno o varios clientes que los consumen. Fielding (2000) definió REST como un estilo arquitectónico para sistemas distribuidos basado en recursos identificables, operaciones uniformes sobre ellos y comunicación sin estado, de modo que cada solicitud contiene la información necesaria para procesarse. La ausencia de estado en el servidor facilita el escalamiento y desacopla las interfaces de la lógica de negocio.'),
  P('La plataforma adopta este estilo: el *backend* expone recursos como productos, ventas, códigos QR, recompensas y canjes mediante los métodos HTTP GET, POST, PUT y PATCH, y responde con un formato JSON uniforme que incluye el indicador de éxito, un mensaje y los datos. Las dos aplicaciones de interfaz son aplicaciones de una sola página: cargan una vez el código de la interfaz y después consultan la API, lo que permite una experiencia fluida sin recargar la página completa.'),

  H3('2.1.4. Arquitectura en capas y patrones de diseño'),
  P('La arquitectura en capas organiza el sistema en niveles con responsabilidades diferenciadas, de modo que la presentación, la lógica de negocio y el acceso a datos puedan evolucionar de forma independiente (Fowler, 2002). Fowler describe patrones como la capa de servicio, que concentra las operaciones de la aplicación y coordina las transacciones, y los objetos de transferencia de datos, que dan forma a la información que sale del sistema. Los patrones de diseño, en general, son soluciones reutilizables a problemas recurrentes de diseño orientado a objetos (Gamma et al., 1994).'),
  P('En el proyecto se aplica una arquitectura de tres capas sobre el patrón modelo-vista-controlador propio de Laravel. Los controladores reciben la solicitud y delegan; las clases *Form Request* validan la entrada; los servicios, por ejemplo el de puntos, el de códigos QR o el de canjes, contienen la lógica de negocio y las transacciones; los modelos *Eloquent* representan las tablas y sus relaciones; y las clases *Resource* dan formato a la salida. Esta separación permite probar las reglas críticas sin depender de la interfaz.'),

  H3('2.1.5. Bases de datos relacionales, transacciones y concurrencia'),
  P('Un modelo relacional organiza la información en tablas relacionadas mediante claves primarias y foráneas, y apoya la integridad de los datos mediante restricciones declarativas (Elmasri & Navathe, 2016). Una transacción agrupa varias operaciones en una unidad que debe cumplir las propiedades de atomicidad, consistencia, aislamiento y durabilidad (Gray & Reuter, 1993). Cuando varias solicitudes compiten por el mismo dato, por ejemplo el último artículo de una recompensa o un mismo código QR, el aislamiento se refuerza bloqueando las filas involucradas mientras se valida y se actualiza su estado.'),
  P('El proyecto utiliza MySQL con 17 tablas de dominio y aplica transacciones con bloqueo pesimista de filas, mediante *lockForUpdate*, en el canje de códigos QR, la creación y cancelación de canjes, el reclamo de hitos del pase de batalla, el desbloqueo de elementos de la isla y los ajustes de puntos. Así se evita, por ejemplo, que dos solicitudes simultáneas consuman el mismo QR o que dos clientes obtengan la última unidad de una recompensa.'),

  H3('2.1.6. Seguridad: autenticación, control de acceso y limitación de tasa'),
  P('El control de acceso basado en roles asigna permisos a roles y roles a usuarios, lo que simplifica la administración de privilegios y permite aplicar el principio de mínimo privilegio (Sandhu et al., 1996). En un sistema donde varios negocios comparten la misma plataforma, el control por rol debe complementarse con un aislamiento por negocio, de manera que un administrador solo pueda consultar y modificar la información del establecimiento al que pertenece.'),
  P('La OWASP Foundation (2023) identifica como riesgos frecuentes en las API la autorización rota a nivel de objeto, la autenticación deficiente y el consumo irrestricto de recursos. La plataforma responde a esos riesgos con autenticación mediante *tokens* de acceso personal con vencimiento, con verificación de rol y de pertenencia al negocio en cada operación y con límites de intentos por minuto en las rutas de acceso, recuperación de contraseña, canje de QR y canje de recompensas.'),

  H3('2.1.7. Códigos QR'),
  P('El código QR es un símbolo bidimensional estandarizado, capaz de almacenar información de forma compacta y de leerse con la cámara de un dispositivo móvil (ISO/IEC, 2015). En la plataforma, el código no contiene datos personales ni puntos: solo guarda un identificador aleatorio de 48 caracteres que el servidor asocia con una venta, un negocio, una cantidad de puntos y un estado. Esta decisión hace que el valor del código resida en el servidor, donde puede validarse, expirar o cancelarse, y que un código copiado no sirva una vez utilizado.'),

  H3('2.1.8. Aplicaciones web progresivas'),
  P('Una aplicación web progresiva utiliza tecnologías web estándar para ofrecer una experiencia similar a la de una aplicación instalada, con un manifiesto que describe su nombre, colores y modo de visualización, y con un *service worker* que gestiona recursos en segundo plano (Mozilla Developer Network, s. f.). Para un negocio local resulta atractiva porque el cliente la abre desde el navegador, sin pasar por una tienda de aplicaciones, y la puede agregar a la pantalla de inicio. Las dos aplicaciones del proyecto se configuran como aplicaciones web progresivas con actualización automática.'),

  H3('2.1.9. Calidad del software y pruebas automatizadas'),
  P('La norma ISO/IEC 25010 (2011) define un modelo de calidad del producto de software que incluye, entre otras características, la adecuación funcional, la fiabilidad, la seguridad y la mantenibilidad. Sommerville (2016) explica que las pruebas de software buscan demostrar que el sistema cumple sus requisitos y descubrir defectos antes de su uso, y que automatizarlas permite repetirlas con cada cambio para detectar regresiones. El proyecto se apoya en pruebas de funcionalidad que ejercitan la API completa sobre una base de datos MySQL, de modo que verifican el comportamiento observable de cada módulo y las reglas de seguridad.'),

  H3('2.1.10. Tecnologías utilizadas'),
  P('El *backend* se desarrolla con PHP y el *framework* Laravel, que ofrece enrutamiento, mapeo objeto-relacional, validación, limitación de tasa y herramientas de pruebas (Laravel, s. f.). La autenticación se resuelve con Laravel Sanctum, y la imagen del código QR se genera como SVG con la biblioteca bacon/bacon-qr-code. Las interfaces se construyen con React, una biblioteca para interfaces declarativas basada en componentes (Meta Open Source, s. f.), con TypeScript para tipado estático, Vite como herramienta de construcción y Tailwind CSS para los estilos.'),

  H2('2.2. Metodología'),
  H3('2.2.1. Enfoque de desarrollo'),
  P('El proyecto se desarrolla con un enfoque incremental. Sommerville (2016) describe el desarrollo incremental como aquel en el que el sistema se construye en entregas sucesivas, cada una de las cuales agrega funcionalidad y permite recibir retroalimentación temprana. Este enfoque es coherente con los principios del manifiesto ágil, que priorizan la entrega frecuente de software funcional y la respuesta al cambio sobre el seguimiento rígido de un plan (Beck et al., 2001). La justificación para adoptarlo es que los requisitos de un sistema de fidelización se refinan al probar los flujos reales, como se observa en las correcciones registradas en el apartado 2.2.9.'),
  P('En la práctica, el equipo trabajó por fases funcionales, con una rama de Git por cada funcionalidad (*feature branches*), integración a la rama principal mediante *pull requests* y pruebas automatizadas escritas junto con cada módulo. El repositorio registra 10 *pull requests* fusionados y 52 *commits*. Cada fase terminó con un conjunto de módulos utilizables de extremo a extremo, es decir, con API, interfaz y pruebas. [[Confirmar si se utilizó alguna práctica adicional, como tablero Kanban, reuniones semanales o revisiones con el asesor industrial, y describirla aquí.]]'),

  H3('2.2.2. Fases y cronograma'),
  P('El desarrollo se organizó en las fases que se resumen en la Tabla 3 y se representan en la Figura 2. Las fechas corresponden a los *commits* registrados en el repositorio y, por tanto, reflejan cuándo se integró cada módulo, no necesariamente cuándo se inició su diseño. La numeración de fases coincide con la que utiliza el README del proyecto.'),
  ...table('fases', 'Fases de desarrollo, periodo de integración y entregables', [1900, 1500, 5722],
    ['Fase', 'Periodo', 'Entregables principales'],
    [
      ['Fases 1 a 3. Base del sistema', '10 sep.', 'Estructura del proyecto (API y dos aplicaciones), autenticación con Sanctum, roles, gestión de usuarios y negocios, administradores y aislamiento por negocio.'],
      ['Fase 4. Puntos globales', '10 y 11 sep.', 'Motor de puntos globales con historial, reglas de puntos por negocio y recálculo de nivel.'],
      ['Fase 5. Códigos QR', '28 sep. y 5 oct.', 'Flujo QR transaccional de un solo uso con pruebas, integración en ambas aplicaciones, imagen SVG, escaneo por cámara, límite de intentos y recuperación de contraseña.'],
      ['Fase 6. Recompensas y canjes', '5 oct.', 'Recompensas y canjes transaccionales con control de stock y reposición por cancelación.'],
      ['Fase 7. Pase de batalla', '5 oct.', 'Hitos con progreso por puntos y reclamo único por hito.'],
      ['Fase 8. Isla y evolución', '5 al 8 oct.', 'Isla con catálogo por nivel, editor visual con autoguardado e historial de cambios, carga diferida de rutas y expiración automática del QR a 30 segundos.'],
      ['Ampliación comercial', '19 oct.', 'Catálogo de productos, ventas con QR, cancelación de QR, vencimiento de sesiones a 30 días, directorio de negocios, perfil, clientes del negocio, ajustes manuales, estadísticas y pruebas sobre MySQL.'],
      ['Estabilización', '3 al 6 nov.', 'Corrección del progreso, niveles, isla y permisos; navegación compartida en la aplicación del cliente; 7 pruebas nuevas.'],
    ]),
  ...figure('cronograma', 'Cronograma de fases según la fecha de integración de los commits', FIG('f6')),

  H3('2.2.3. Herramientas y entorno de desarrollo'),
  P('La Tabla 4 enumera las tecnologías empleadas con las versiones declaradas en los archivos de dependencias del proyecto. El desarrollo se realizó en equipos con Windows, con Node.js 24 o superior, PHP 8.4 o superior y MySQL 8 o superior, según los requisitos del README. El código se versiona con Git y se aloja en GitHub, donde se integran los *pull requests*.'),
  ...table('tecnologias', 'Tecnologías y versiones declaradas en el proyecto', [1700, 2800, 1700, 2922],
    ['Capa', 'Tecnología', 'Versión', 'Uso en el proyecto'],
    [
      ['Backend', 'PHP', '^8.4.1', 'Lenguaje del servidor'],
      ['Backend', 'Laravel', '^13.17', '*Framework* de la API, ORM, validación y limitación de tasa'],
      ['Backend', 'Laravel Sanctum', '^4.3', 'Autenticación con *tokens* de acceso personal'],
      ['Backend', 'bacon/bacon-qr-code', '^3.1', 'Generación de la imagen SVG del QR'],
      ['Backend', 'PHPUnit', '^12.5.12', 'Pruebas automatizadas'],
      ['Backend', 'Laravel Pint', '^1.27', 'Formato del código PHP'],
      ['Datos', 'MySQL', '8 o superior', 'Base de datos relacional y base de pruebas'],
      ['Frontend', 'React', '^19.2.8', 'Interfaces de ambas aplicaciones'],
      ['Frontend', 'TypeScript', '~6.0.2', 'Tipado estático'],
      ['Frontend', 'Vite', '^8.3.0', 'Servidor de desarrollo y construcción'],
      ['Frontend', 'Tailwind CSS', '^4.3.3', 'Estilos'],
      ['Frontend', 'React Router', '^7.18.3', 'Navegación y rutas protegidas'],
      ['Frontend', 'html5-qrcode', '^2.3.8', 'Lectura del QR con la cámara (aplicación del cliente)'],
      ['Frontend', 'vite-plugin-pwa', '^1.3.0', 'Aplicación web progresiva'],
      ['Frontend', 'oxlint', '^1.81.0', 'Análisis estático del código'],
    ], { center: [2] }),

  H3('2.2.4. Arquitectura del sistema'),
  P('La Figura 3 muestra la arquitectura general. Las dos aplicaciones de interfaz se comunican con la API mediante solicitudes HTTPS con cuerpo JSON y un *token* de tipo *Bearer* en el encabezado de autorización. Cada solicitud atraviesa una cadena de *middleware* que verifica la sesión, el rol y el límite de intentos; después llega a un controlador que valida la entrada con una clase *Form Request*; el controlador invoca a un servicio que contiene la regla de negocio; y el servicio opera sobre los modelos y la base de datos. La respuesta se entrega con el formato uniforme de éxito, mensaje y datos.'),
  ...figure('arquitectura', 'Arquitectura general del sistema', FIG('f1')),
  P('El proyecto se organiza como un repositorio único con tres partes: la carpeta de la API, la carpeta de la aplicación del cliente y la carpeta del panel administrativo. Los nueve servicios del *backend* (administradores, autenticación, pase de batalla, isla, puntos, QR, canjes, ventas y estadísticas) concentran la lógica y son los que se prueban de manera más directa. Los controladores se limitan a recibir la solicitud, invocar al servicio y devolver la respuesta, lo cual mantiene el código de la capa HTTP breve y uniforme.'),

  H3('2.2.5. Modelo de datos'),
  P('El modelo de datos se compone de 17 tablas de dominio. Se presenta en dos figuras para facilitar su lectura. La Figura 4 muestra el núcleo comercial: usuarios con su rol, nivel y negocio; negocios; productos; ventas y sus renglones; códigos QR; movimientos de puntos; recompensas y canjes; y reglas de puntos. La Figura 5 muestra las tablas de gamificación: el avance del usuario en el pase de batalla y los elementos de la isla que desbloquea y ubica.'),
];
// Página horizontal: el modelo de datos del núcleo comercial necesita el ancho de la hoja para ser legible.
const cap2land = [
  ...figure('mer_nucleo', 'Modelo de datos del núcleo comercial (tablas principales y relaciones)', FIG('f2'), { maxW: 840 }),
];
const cap2b = [
  ...figure('mer_gamificacion', 'Modelo de datos de los módulos de gamificación', FIG('f2b')),
  P('Algunas decisiones de diseño merecen mención. Los saldos no se guardan en una columna del usuario, sino que se calculan como la suma de los movimientos de puntos, lo que deja un historial completo y evita inconsistencias. Los renglones de venta almacenan una copia fija del nombre, el precio y los puntos del producto al momento de la operación, de modo que el historial no cambia si el catálogo se modifica después. Los códigos QR guardan su estado y sus fechas de creación, expiración y uso. Las tablas de relación del pase de batalla y de la isla utilizan restricciones únicas para impedir duplicados, como reclamar dos veces el mismo hito o desbloquear dos veces el mismo elemento.'),

  H3('2.2.6. Diseño de los módulos'),
  H3('Autenticación, roles y aislamiento por negocio'),
  P('El sistema distingue tres roles. El cliente consume el programa de lealtad; el administrador de negocio gestiona su propio establecimiento; y el administrador general supervisa toda la plataforma. La Tabla 5 resume sus alcances. Un middleware valida que el usuario esté activo y que tenga uno de los roles permitidos por la ruta; adicionalmente, los servicios verifican que el administrador de un negocio solo opere sobre registros de su propio negocio, por ejemplo al consultar o cancelar un código QR, al editar un producto o al gestionar un canje.'),
  ...table('roles', 'Roles del sistema y sus alcances', [2500, 2900, 3722],
    ['Rol', 'Alcance', 'Operaciones principales'],
    [
      ['CLIENTE', 'Su propia cuenta y los datos públicos de los negocios activos', 'Registro e inicio de sesión, canje de QR, saldo e historial, recompensas y canjes, pase de batalla, isla, directorio y perfil.'],
      ['ADMINISTRADOR_NEGOCIO', 'Solo su negocio', 'Productos, ventas y QR, otorgamiento de puntos por regla, recompensas, gestión de canjes, clientes del negocio y estadísticas.'],
      ['ADMINISTRADOR_GENERAL', 'Toda la plataforma', 'Altas de negocios y administradores, reglas de puntos, ajustes manuales con motivo, supervisión de ventas y estadísticas de la plataforma.'],
    ]),

  H3('Puntos globales y niveles'),
  P('Los puntos son globales: un movimiento pertenece al cliente y registra el negocio de origen, pero el saldo y el nivel se calculan sobre todos los movimientos. Existen tres tipos de movimiento: ganancia, canje y ajuste. Se distinguen dos medidas. El saldo, suma de todos los movimientos, indica cuántos puntos puede gastar el cliente. Los puntos acumulados, suma de las ganancias y de los ajustes manuales positivos, determinan el nivel y el progreso del pase de batalla; así, gastar puntos en una recompensa no hace retroceder al cliente. El nivel que se asigna es el más alto cuyo mínimo de puntos se alcanzó, y el último nivel queda abierto, de modo que superar su máximo no deja al usuario sin nivel.'),
  P('Los administradores pueden otorgar puntos a un cliente aplicando una regla de puntos del propio negocio, que asocia un rango de monto con una cantidad de puntos. El administrador general puede realizar ajustes manuales, que exigen un motivo de al menos cinco caracteres, solo se aplican a clientes, nunca dejan el saldo en negativo y guardan quién los realizó.'),

  H3('Ventas y códigos QR'),
  P('La Figura 6 muestra el flujo principal del sistema. Al registrar una venta, el servicio valida que todos los productos pertenezcan al negocio del administrador y estén activos, calcula el total y los puntos, guarda la venta con una copia fija de cada renglón y genera el código QR dentro de la misma transacción. El token del QR tiene 48 caracteres aleatorios en mayúsculas y se verifica que sea único. La imagen se entrega como SVG de 512 píxeles con una zona de silencio ampliada para facilitar la lectura en pantalla.'),
  ...figure('flujo_venta', 'Flujo de una venta con generación y canje del código QR', FIG('f4')),
  P('Cada código QR vive 30 segundos desde su creación y transita por los estados que muestra la Figura 7. El canje se realiza dentro de una transacción que bloquea la fila del código, rechaza los estados utilizado, cancelado o expirado, marca como expirado un código vencido y, si es válido, lo marca como utilizado, registra el movimiento de ganancia con el responsable de la venta y recalcula el nivel. El administrador puede cancelar un código activo, y la ruta de canje tiene un límite de diez intentos por minuto.'),
  ...figure('estados_qr', 'Estados de un código QR y transiciones permitidas', FIG('f3')),

  H3('Recompensas y canjes'),
  P('Cada negocio define recompensas con una cantidad de puntos requerida y un número de unidades disponibles. Cuando un cliente solicita un canje, el servicio bloquea al cliente y a la recompensa, comprueba que esté activa, que tenga existencias y que el saldo alcance, descuenta una unidad y los puntos de inmediato, y crea el canje en estado pendiente. El administrador del negocio avanza el canje según la Figura 8; si lo cancela, el sistema repone la unidad y devuelve los puntos mediante un movimiento de ajuste. Las transiciones inválidas se rechazan y los estados completado y cancelado son finales.'),
  ...figure('estados_canje', 'Estados de un canje de recompensa y efectos de cada transición', FIG('f5')),

  H3('Pase de batalla'),
  P('El pase de batalla es una lista de hitos ordenados por puntos requeridos, cada uno con una insignia como recompensa. El progreso del cliente se mide con los puntos acumulados. Un hito puede estar bloqueado, desbloqueado o reclamado; el reclamo exige tener los puntos suficientes, se realiza dentro de una transacción y solo puede ocurrir una vez por cliente. Un hito reclamado conserva su estado aunque los puntos cambien. La respuesta incluye el porcentaje de avance, el siguiente hito y los puntos que faltan para alcanzarlo.'),

  H3('Isla personalizable'),
  P('La isla es un espacio propio de cada cliente. El catálogo contiene elementos de cuatro categorías (estructura, decoración, mascota y terreno), cada uno con un nivel requerido; el cliente solo puede desbloquear los elementos de su nivel y solo puede ubicar los que ya desbloqueó. Para comparar el nivel se usa la posición del nivel ordenado por puntos mínimos y no su identificador. La aplicación incluye un editor visual con arrastrar y soltar, desplazamiento, acercamiento, ajuste a cuadrícula y control de colisiones, además de guardado manual por lote, autoguardado configurable, historial para deshacer y rehacer, y persistencia local de las preferencias y de la posición de la cámara.'),

  H3('Estadísticas, directorio, clientes y ajustes'),
  P('El módulo de estadísticas resume un periodo de 7 a 90 días para un negocio o para toda la plataforma: ventas, ingresos, puntos otorgados y canjeados, canjes, clientes activos y estado de los códigos QR, además de una serie diaria con ceros en los días sin actividad, los cinco productos más vendidos y, para el administrador general, un desglose por negocio. Los códigos activos ya vencidos se cuentan como expirados. El directorio muestra a los clientes los negocios activos con sus datos públicos y su número de productos, el perfil permite cambiar nombre, correo y contraseña, y la vista de clientes del negocio resume los puntos ganados, las visitas y la última visita.'),

  H3('Interfaces de usuario'),
  P('La aplicación del cliente expone 15 rutas, entre ellas inicio de sesión, registro y recuperación de contraseña, inicio, isla, pase de batalla, puntos, escaneo de QR, recompensas, canjes, historial, negocios y perfil. Las rutas con contenido de sesión están protegidas y cargan de forma diferida las pantallas pesadas. El panel administrativo muestra las rutas según el rol del usuario y expone las pantallas de productos, ventas, clientes, ajustes, códigos QR, puntos, recompensas, canjes, administradores y estadísticas. Ambas aplicaciones guardan la sesión en el almacenamiento local del navegador y consumen la API mediante un cliente común que agrega el *token* a cada solicitud.'),

  H2('2.2.7. Medidas de seguridad'),
  P('La seguridad se trató como un requisito transversal desde las primeras fases. La Tabla 6 resume los controles implementados y las pruebas automatizadas que los verifican. El aislamiento por negocio y el control de roles se probaron en casi todos los módulos, porque un error de autorización en un sistema multinegocio expone información de terceros.'),
  ...table('seguridad', 'Controles de seguridad implementados y su verificación', [2300, 3900, 2922],
    ['Control', 'Mecanismo', 'Verificación automatizada'],
    [
      ['Autenticación', '*Tokens* de acceso personal con Sanctum que vencen a los 30 días; los vencidos se eliminan con una tarea programada.', 'Pruebas de *token* vigente y vencido; registro e inicio de sesión.'],
      ['Autorización por rol', '*Middleware* de rol; rechaza usuarios inactivos (401) y roles no permitidos (403).', 'Pruebas de acceso por rol en usuarios, negocios, administradores, isla y pase de batalla.'],
      ['Aislamiento por negocio', 'Filtros por negocio en servicios y validación de pertenencia en cada operación.', 'Pruebas de QR, productos, ventas, canjes y clientes de otro negocio.'],
      ['Limitación de intentos', 'Registro 3/min, inicio de sesión 5/min por IP y correo, recuperación 3/min, restablecimiento 5/min, canje de QR y de recompensa 10/min.', 'Pruebas de límite en inicio de sesión, canje de QR y canje de recompensa.'],
      ['Contraseñas', 'Almacenamiento con *hash*; el cambio de contraseña exige la actual y cierra las demás sesiones; recuperación por correo.', 'Pruebas de restablecimiento y de cambio de contraseña.'],
      ['Validación de entrada', 'Clases *Form Request* con reglas por operación; montos, cantidades y motivos con límites.', 'Pruebas de validación en productos, ventas, ajustes y estadísticas.'],
      ['Comprobantes de un solo uso', 'Token aleatorio único, vigencia de 30 s, estados finales y bloqueo de fila.', 'Pruebas de doble canje, QR vencido, cancelado y competencia por el último *stock*.'],
      ['Integridad del nivel', 'El nivel solo se calcula por puntos; no puede editarse manualmente por ningún rol.', 'Pruebas de edición de nivel y de perfil.'],
    ]),

  H2('2.2.8. Estrategia de pruebas'),
  P('Las pruebas se escriben con PHPUnit como pruebas de funcionalidad: cada una realiza solicitudes HTTP reales contra la API, con usuarios y datos de ejemplo, y verifica el código de respuesta, el contenido y el efecto en la base de datos. Se organizan por módulo y cubren el camino correcto, las reglas de negocio, la seguridad y los casos de borde, como la competencia por la última unidad de una recompensa. Inicialmente se ejecutaban sobre SQLite en memoria; el 19 de octubre se cambió la base de pruebas a MySQL (*pase_de_batalla_test*) porque SQLite ocultaba errores que solo aparecían en MySQL, como el de la comparación de niveles de la isla. La base de pruebas se reinicia en cada ejecución. Por ello las pruebas no deben apuntar a la base de datos de desarrollo.'),

  H2('2.2.9. Situaciones no previstas y decisiones'),
  P('Durante el desarrollo se presentaron situaciones que obligaron a modificar el diseño original. La Tabla 7 las registra con su causa y la decisión adoptada, tal como quedaron documentadas en los mensajes de *commit*. Su registro tiene valor metodológico porque muestra cómo el enfoque incremental permitió detectar y corregir los problemas a partir de las pruebas y del uso real del sistema.'),
  ...table('decisiones', 'Situaciones no previstas, causa y decisión adoptada', [2150, 2500, 3472, 1000],
    ['Situación', 'Causa', 'Decisión o solución', 'Fecha'],
    [
      ['Usuario sin nivel al superar el máximo de rangos', 'El último nivel tenía un tope de puntos', 'Se asigna el nivel más alto alcanzado y el último nivel queda abierto', '6 oct. y 3 nov.'],
      ['Expiración del QR controlada manualmente', 'La aplicación pedía una fecha de expiración al generar el QR', 'El servidor asigna una vida automática de 30 segundos y se agrega una prueba de regresión', '8 oct.'],
      ['Elementos de isla desbloqueados sin cumplir el nivel', 'Se comparaba el identificador autoincremental del nivel, que no siempre inicia en 1 en MySQL', 'Se calcula la posición del nivel por puntos mínimos', '19 oct.'],
      ['Errores ocultos en las pruebas', 'SQLite en memoria no reproducía el comportamiento de MySQL', 'Las pruebas se ejecutan contra MySQL', '19 oct.'],
      ['Tablas vacías en las pantallas', 'La interfaz leía un nivel de anidación que la API no entrega', 'Se agrega una función de lectura de listados en ambas aplicaciones', '19 oct.'],
      ['Historial de ventas dependiente del catálogo', 'Los renglones solo referenciaban al producto', 'Se guarda una copia fija de nombre, precio y puntos en cada renglón', '19 oct.'],
      ['QR vencidos contados como activos', 'El estado expirado solo se registraba al intentar usar el código', 'Las estadísticas cuentan como expirados los activos ya vencidos', '19 oct.'],
      ['Progreso que retrocedía al canjear', 'El nivel y el pase se calculaban con el saldo', 'Se usan los puntos acumulados; los hitos reclamados se conservan', '3 nov.'],
      ['Estado expirado que no se guardaba', 'La excepción revertía la transacción que lo marcaba', 'La transacción devuelve un valor nulo y la excepción se lanza después de confirmarla', '3 nov.'],
      ['Edición manual de nivel y de contraseña', 'Los formularios de administración permitían cambiar esos campos', 'Se impide editar el nivel; el administrador de negocio no cambia contraseñas', '19 oct. y 3 nov.'],
    ]),

  H2('2.2.10. Distribución de actividades'),
  P('La Tabla 8 resume las actividades de cada integrante según los autores de los *commits* del repositorio. Se presenta como referencia, porque ambos integrantes participaron en la revisión e integración del código. [[Confirmar la distribución con el equipo y agregar actividades que no se reflejan en el repositorio, como pruebas manuales, reuniones, documentación o gestiones con la empresa.]]'),
  ...table('actividades', 'Distribución de actividades por integrante según el historial del repositorio', [2500, 5122, 1500],
    ['Integrante', 'Módulos principales', 'Periodo'],
    [
      ['José Isaac Santiago Ojeda', 'Estructura inicial, autenticación, roles y aislamiento por negocio, motor de puntos, QR con imagen y cámara, límite de intentos, recuperación de contraseña, recompensas y canjes, pase de batalla, isla y editor visual, correcciones de progreso y permisos, integración de *pull requests*.', '10 sep. al 6 nov.'],
      ['Erick Iván Ponce Hernández', 'Catálogo de productos, ventas con QR, cancelación de QR, vencimiento de sesiones, directorio, perfil, clientes del negocio, ajustes manuales, estadísticas, base de pruebas sobre MySQL y restricción de edición de nivel.', '19 oct.'],
    ]),
];

// ---------------------------------------------------------------- Capítulo 3
const modulos = [
  ['Autenticación y acceso', 11, 'Registro, inicio de sesión correcto e incorrecto, acceso sin autenticación, restablecimiento de contraseña, límite de intentos, vigencia del *token* y acceso por rol'],
  ['Administración', 8, 'Altas de administradores, restricciones del administrador de negocio, edición de usuarios sin cambio de rol, nivel ni contraseña'],
  ['Puntos y niveles', 6, 'Otorgamiento por regla, saldo global, cambio de nivel por umbral, reglas de otro negocio y solo clientes'],
  ['Códigos QR', 15, 'Generación, vigencia de 30 s, canje único, QR vencido y cancelado, cancelación, aislamiento por negocio, imagen SVG y límite de intentos'],
  ['Recompensas y canjes', 8, 'Canje correcto, puntos insuficientes, stock agotado, reposición al cancelar, competencia por el último *stock*, aislamiento y límite de intentos'],
  ['Pase de batalla', 5, 'Progreso, reclamo único, reclamo bloqueado, roles no permitidos y progreso que no baja al gastar puntos'],
  ['Isla', 6, 'Catálogo por nivel, desbloqueo, ubicación, requisitos y nivel por posición'],
  ['Catálogo de productos', 7, 'Alta en el propio negocio, validación de precio y puntos, aislamiento y visibilidad por rol'],
  ['Ventas', 7, 'Venta con QR, copia fija de productos, productos de otro negocio o inactivos, validación y roles'],
  ['Clientes, perfil y ajustes', 8, 'Directorio, perfil, cambio de contraseña, clientes del negocio y ajustes con motivo y auditoría'],
  ['Estadísticas', 5, 'Totales por negocio y de la plataforma, serie diaria completa, QR vencidos y validación de acceso'],
];

const cap3 = [
  H1('CAPÍTULO 3. ANÁLISIS E INTERPRETACIÓN DE RESULTADOS'),
  P('Este capítulo presenta los resultados obtenidos hasta el 6 de noviembre de 2026, fecha del último cambio registrado en el repositorio. Los datos provienen del código fuente, de los archivos de migración y de las pruebas, y se presentan sin conclusiones, las cuales se reservan para el apartado correspondiente. Los resultados que dependen de la ejecución de las pruebas, de la validación con usuarios o de las capturas de pantalla se señalan en amarillo, porque deben ser aportados por el equipo una vez que se realicen.'),

  H2('3.1. Cumplimiento de los objetivos específicos'),
  P('La Tabla 9 relaciona cada objetivo específico con el producto o la evidencia que lo respalda. Un objetivo se marca como cumplido cuando existe el producto y tiene pruebas automatizadas o uso verificable, y como parcial cuando existe, pero tiene elementos pendientes.'),
  ...table('objetivos', 'Cumplimiento de los objetivos específicos', [600, 3000, 4222, 1300],
    ['N.º', 'Objetivo específico', 'Producto y evidencia', 'Estado'],
    [
      ['1', 'API REST con *tokens*, roles y aislamiento', '60 rutas, *middleware* de rol, vencimiento de sesión a 30 días y 19 pruebas de acceso, administración y aislamiento.', 'Cumplido'],
      ['2', 'Motor de puntos y niveles', 'Servicio de puntos, reglas por negocio, ajustes auditados, recálculo de nivel y 6 pruebas propias.', 'Cumplido'],
      ['3', 'Códigos QR de un solo uso', 'Token único de 48 caracteres, vigencia de 30 s, estados finales, cancelación, imagen SVG, lectura por cámara y 15 pruebas.', 'Cumplido'],
      ['4', 'Catálogo, ventas y canjes', 'Productos, ventas con copia fija, canjes transaccionales con control de stock y 22 pruebas.', 'Cumplido'],
      ['5', 'Pase de batalla e isla', 'Hitos reclamables, catálogo de isla por nivel, editor visual y 11 pruebas.', 'Cumplido'],
      ['6', 'Aplicaciones web', 'Aplicación del cliente con 15 rutas y panel con 10 pantallas funcionales; 8 rutas del panel con vista base.', 'Parcial'],
      ['7', 'Estadísticas', 'Servicio y pantalla de estadísticas por negocio y plataforma, con 5 pruebas.', 'Cumplido'],
      ['8', 'Pruebas y documentación', '86 pruebas del *backend* y README; sin pruebas automatizadas de las aplicaciones web. [[Agregar el manual de usuario si se entrega.]]', 'Parcial'],
    ], { center: [0, 3] }),

  H2('3.2. Métricas del producto'),
  P('La Tabla 10 resume las dimensiones del sistema al momento del corte. Las líneas de código se contaron sobre los archivos versionados, sin incluir dependencias ni archivos de bloqueo. Se incluyen como referencia de tamaño y no como medida de calidad.'),
  ...table('metricas', 'Métricas del sistema al 6 de noviembre de 2026', [4600, 2200, 2322],
    ['Métrica', 'Valor', 'Observación'],
    [
      ['Rutas de la API', '60', 'En 17 controladores'],
      ['Servicios de negocio', '9', 'Capa de lógica del *backend*'],
      ['Modelos', '17', 'Uno por tabla principal'],
      ['Tablas de dominio', '17', 'Más tablas del *framework*'],
      ['Líneas de PHP (aplicación, rutas y base de datos)', '4,953', 'Sin pruebas'],
      ['Líneas de PHP de pruebas', '2,746', '16 archivos de prueba funcionales'],
      ['Líneas de TypeScript (aplicación del cliente)', '2,838', 'Incluye el editor de isla de 1,441 líneas'],
      ['Líneas de TypeScript (panel administrativo)', '1,949', '11 páginas'],
      ['Pruebas automatizadas funcionales', '86', 'Más 2 pruebas de ejemplo del *framework*'],
    ], { center: [1] }),

  H2('3.3. Pruebas automatizadas'),
  H3('Cobertura por módulo'),
  P('La Tabla 11 presenta el número de pruebas de cada módulo y los escenarios que verifican. El módulo de códigos QR concentra el mayor número de pruebas, con 15 de las 86, es decir, el 17.4 %. A continuación se ubican la autenticación y el acceso, con 11 pruebas (12.8 %), y los módulos de administración, recompensas y canjes, y clientes, perfil y ajustes, con 8 pruebas cada uno (9.3 %). La distribución coincide con las operaciones donde un error tendría mayor consecuencia: el uso de comprobantes, el acceso y el descuento de puntos y existencias.'),
  ...table('pruebas', 'Pruebas automatizadas por módulo y escenarios verificados', [2300, 800, 6022],
    ['Módulo', 'Casos', 'Escenarios verificados'],
    [...modulos, ['**Total**', '**86**', '']], { center: [1] }),
  H3('Resultado de la ejecución'),
  P('Las pruebas se ejecutan con el comando *php artisan test* desde la carpeta de la API, con la base *pase_de_batalla_test* creada previamente. [[Ejecutar las pruebas en el equipo de desarrollo y registrar en la Tabla 12 el resultado real. No se debe escribir un resultado sin haberlo obtenido.]]'),
  ...table('ejecucion', 'Resultado de la ejecución de las pruebas automatizadas', [2600, 3400, 3122],
    ['Dato', 'Valor', 'Observaciones'],
    [
      ['Fecha de ejecución', '[[dd/mm/aaaa]]', '[[ ]]'],
      ['Entorno', '[[PHP, MySQL y sistema operativo]]', '[[ ]]'],
      ['Pruebas ejecutadas', '[[ ]]', '[[ ]]'],
      ['Pruebas aprobadas', '[[ ]]', '[[ ]]'],
      ['Pruebas fallidas', '[[ ]]', '[[Describir y justificar cada falla]]'],
    ]),

  H2('3.4. Actividad del repositorio'),
  P('La Tabla 13 resume la actividad del repositorio por semana. Se registran 52 *commits* de dos autores, 38 de ellos sin contar las fusiones, y 10 *pull requests* fusionados. La mayor concentración ocurre en la semana del 5 de octubre, con 15 *commits*, cuando se integraron los módulos de QR avanzado, recompensas, pase de batalla e isla, y en la semana del 19 de octubre, con 28 *commits*, cuando se integraron las ampliaciones comerciales.'),
  ...table('repositorio', 'Actividad semanal del repositorio por autor', [2800, 2100, 2100, 2122],
    ['Semana (inicio)', 'José Isaac Santiago', 'Erick Iván Ponce', 'Total'],
    [
      ['7 de septiembre', '4', '0', '4'],
      ['28 de septiembre', '2', '0', '2'],
      ['5 de octubre', '15', '0', '15'],
      ['19 de octubre', '6', '22', '28'],
      ['2 de noviembre', '3', '0', '3'],
      ['**Total**', '**30**', '**22**', '**52**'],
    ], { center: [1, 2, 3] }),

  H2('3.5. Estado de las interfaces'),
  P('La Tabla 14 resume el estado de las interfaces según el contenido de los archivos de rutas de cada aplicación. Las rutas con vista base muestran el título, el rol activo y la navegación, y sus operaciones correspondientes ya existen en la API; queda pendiente construir su pantalla.'),
  ...table('pantallas', 'Estado de las pantallas de las aplicaciones web', [2500, 3622, 3000],
    ['Aplicación', 'Pantallas funcionales', 'Rutas con vista base'],
    [
      ['Cliente (15 rutas)', 'Inicio de sesión, registro, recuperación y restablecimiento de contraseña, inicio, isla, pase de batalla, puntos, historial, escaneo de QR, recompensas, canjes, negocios y perfil', 'Ninguna'],
      ['Panel administrativo (19 rutas)', 'Inicio de sesión, productos, ventas, clientes, ajustes, QR, puntos, recompensas, canjes, administradores y estadísticas', 'Tablero, negocio, historial, usuarios, negocios, niveles, elementos de isla y reglas de puntos'],
    ]),

  H2('3.6. Evidencias visuales'),
  P('[[Insertar aquí capturas de pantalla de las pantallas principales, con su título de figura numerado: inicio de sesión, escaneo de QR, saldo y puntos, pase de batalla, isla con elementos colocados, recompensas, productos, registro de venta con QR, canjes y estadísticas. Se recomienda tomar las capturas con datos de ejemplo y sin información personal real.]]'),
  H2('3.7. Validación con usuarios'),
  P('[[Si se realizó una prueba piloto con el negocio o con clientes de ejemplo, describir el procedimiento, el número de participantes y los resultados obtenidos (tiempos de venta, errores, comentarios). Si no se realizó, indicarlo y retirar este apartado.]]'),

  H2('3.8. Análisis de los resultados'),
  P('Los resultados muestran que el sistema cubre los flujos transaccionales para los que fue diseñado. El flujo de venta, generación de QR, canje, acreditación de puntos, recálculo de nivel y canje de recompensas se resuelve de principio a fin en el *backend*, con transacciones y bloqueo de filas en las operaciones que compiten por un mismo dato. La verificación automatizada de esos flujos incluye escenarios de doble uso y de competencia por el último artículo, lo que indica que las reglas de consistencia fueron objeto de pruebas específicas y no solo de revisión manual.'),
  P('Las situaciones no previstas registradas en la Tabla 7 muestran un patrón: la mayoría se detectó al cambiar el entorno de pruebas a MySQL, al conectar la interfaz con la API o al revisar el comportamiento del progreso frente a los canjes, es decir, en puntos de integración. Esto sugiere que las pruebas por módulo son útiles, pero que los errores más costosos aparecieron en las fronteras entre componentes. En ese sentido, la ausencia de pruebas automatizadas en las aplicaciones web es un riesgo que se refleja en el estado parcial de los objetivos 6 y 8.'),
  P('En cuanto a la distribución del trabajo, el historial muestra que la base del sistema se construyó entre septiembre y principios de octubre y que la ampliación comercial se integró el 19 de octubre con 22 *commits* en un solo día. Esa concentración debe interpretarse con cautela, porque las fechas de los *commits* reflejan el momento de la integración y no el tiempo de diseño y pruebas previos. [[Complementar con el cronograma real de actividades de la estadía, las horas dedicadas y la retroalimentación del asesor industrial.]]'),
];

// ---------------------------------------------------------------- Conclusiones, referencias
const conclusiones = [
  H1('APORTACIONES Y CONCLUSIONES'),
  P('[[Redactar al concluir el proyecto (1 a 2 cuartillas, en tercera persona). Debe explicar de forma general las soluciones implementadas, si se cumplieron los objetivos, los resultados cuantitativos e interpretados, las ventajas y desventajas de la implementación, las sugerencias y limitaciones, y los aprendizajes personales. Se sugiere partir de la estructura de la guía: “A partir de la información analizada a lo largo de la investigación se concluye que…”, “De los objetivos enunciados al inicio se pudieron lograr… mientras que… debido a…, sin embargo…” y “Es importante mencionar que… Por otro lado… Finalmente…”.]]'),
];
const refs = [
  'Beck, K., Beedle, M., van Bennekum, A., Cockburn, A., Cunningham, W., Fowler, M., Grenning, J., Highsmith, J., Hunt, A., Jeffries, R., Kern, J., Marick, B., Martin, R. C., Mellor, S., Schwaber, K., Sutherland, J., & Thomas, D. (2001). *Manifiesto por el desarrollo ágil de software*. https://agilemanifesto.org/iso/es/manifesto.html',
  'Deterding, S., Dixon, D., Khaled, R., & Nacke, L. (2011). From game design elements to gamefulness: Defining “gamification”. En *Proceedings of the 15th International Academic MindTrek Conference* (pp. 9–15). ACM. https://doi.org/10.1145/2181037.2181040',
  'Dick, A. S., & Basu, K. (1994). Customer loyalty: Toward an integrated conceptual framework. *Journal of the Academy of Marketing Science, 22*(2), 99–113. https://doi.org/10.1177/0092070394222001',
  'Elmasri, R., & Navathe, S. B. (2016). *Fundamentals of database systems* (7.ª ed.). Pearson.',
  'Fielding, R. T. (2000). *Architectural styles and the design of network-based software architectures* [Tesis doctoral, University of California, Irvine]. https://www.ics.uci.edu/~fielding/pubs/dissertation/top.htm',
  'Fowler, M. (2002). *Patterns of enterprise application architecture*. Addison-Wesley.',
  'Gamma, E., Helm, R., Johnson, R., & Vlissides, J. (1994). *Design patterns: Elements of reusable object-oriented software*. Addison-Wesley.',
  'Gray, J., & Reuter, A. (1993). *Transaction processing: Concepts and techniques*. Morgan Kaufmann.',
  'Hamari, J., Koivisto, J., & Sarsa, H. (2014). Does gamification work? A literature review of empirical studies on gamification. En *2014 47th Hawaii International Conference on System Sciences* (pp. 3025–3034). IEEE. https://doi.org/10.1109/HICSS.2014.377',
  'International Organization for Standardization & International Electrotechnical Commission. (2011). *ISO/IEC 25010:2011. Systems and software engineering — Systems and software Quality Requirements and Evaluation (SQuaRE) — System and software quality models*. ISO/IEC.',
  'International Organization for Standardization & International Electrotechnical Commission. (2015). *ISO/IEC 18004:2015. Information technology — Automatic identification and data capture techniques — QR Code bar code symbology specification*. ISO/IEC.',
  'Kumar, V., & Reinartz, W. (2018). *Customer relationship management: Concept, strategy, and tools* (3.ª ed.). Springer.',
  'Laravel. (s. f.). *Laravel documentation*. https://laravel.com/docs',
  'Meta Open Source. (s. f.). *React*. https://react.dev',
  'Mozilla Developer Network. (s. f.). *Progressive web apps*. MDN Web Docs. https://developer.mozilla.org/es/docs/Web/Progressive_web_apps',
  'Oliver, R. L. (1999). Whence consumer loyalty? *Journal of Marketing, 63*(4_suppl1), 33–44. https://doi.org/10.1177/00222429990634s105',
  'OWASP Foundation. (2023). *OWASP API security top 10 – 2023*. https://owasp.org/API-Security/editions/2023/en/0x11-t10/',
  'Sandhu, R. S., Coyne, E. J., Feinstein, H. L., & Youman, C. E. (1996). Role-based access control models. *Computer, 29*(2), 38–47. https://doi.org/10.1109/2.485845',
  'Sommerville, I. (2016). *Software engineering* (10.ª ed.). Pearson.',
];
const referencias = [
  H1('REFERENCIAS'),
  ...refs.map((r) => new Paragraph({
    alignment: AlignmentType.LEFT, spacing: { lineRule: 'auto', line: L.LINE15, after: 120 },
    indent: { left: 720, hanging: 720 }, children: runs(r),
  })),
  P('[[Verificar cada referencia contra la fuente original antes de entregar (año, páginas, DOI y edición disponible en la biblioteca) y agregar las fuentes propias de la empresa. Todas las citas del texto deben aparecer aquí.]]', { single: true }),
];

// ---------------------------------------------------------------- Anexos
const E = (m, r, rol, desc) => [m, r, rol, desc];
const A = 'Admin. negocio y general';
const endpoints = [
  E('POST', '/api/auth/register', 'Público', 'Registro de cliente (3 por minuto por IP)'),
  E('POST', '/api/auth/login', 'Público', 'Inicio de sesión (5 por minuto por IP y correo)'),
  E('POST', '/api/auth/forgot-password', 'Público', 'Solicitud de recuperación (3 por minuto)'),
  E('POST', '/api/auth/reset-password', 'Público', 'Restablecimiento de contraseña (5 por minuto)'),
  E('GET', '/api/auth/me', 'Autenticado', 'Usuario autenticado'),
  E('POST', '/api/auth/logout', 'Autenticado', 'Cierre de sesión'),
  E('PUT', '/api/profile', 'Todos los roles', 'Actualiza nombre, correo y contraseña'),
  E('GET', '/api/directory/businesses', 'Todos los roles', 'Negocios activos con datos públicos'),
  E('GET', '/api/business-clients', A, 'Clientes con movimientos en el negocio'),
  E('GET', '/api/statistics', A, 'Estadísticas del periodo'),
  E('GET', '/api/points/adjustments', 'Admin. general', 'Lista de ajustes manuales'),
  E('POST', '/api/points/adjustments', 'Admin. general', 'Ajuste manual con motivo'),
  E('GET', '/api/users', A, 'Lista de usuarios'),
  E('GET', '/api/users/{user}', A, 'Detalle de usuario'),
  E('PUT', '/api/users/{user}', A, 'Actualiza usuario'),
  E('PATCH', '/api/users/{user}/status', A, 'Activa o desactiva usuario'),
  E('GET', '/api/businesses', A, 'Lista de negocios'),
  E('GET', '/api/businesses/{business}', A, 'Detalle de negocio'),
  E('POST', '/api/businesses', 'Admin. general', 'Alta de negocio'),
  E('PUT', '/api/businesses/{business}', A, 'Actualiza negocio'),
  E('PATCH', '/api/businesses/{business}/status', A, 'Activa o desactiva negocio'),
  E('GET', '/api/points/balance', 'Todos los roles', 'Saldo de puntos'),
  E('GET', '/api/points/history', 'Todos los roles', 'Historial de movimientos'),
  E('GET', '/api/points/business-history', A, 'Historial del negocio'),
  E('POST', '/api/points/award', A, 'Otorga puntos por regla'),
  E('GET', '/api/battle-pass/progress', 'Cliente', 'Progreso del pase de batalla'),
  E('POST', '/api/battle-pass/tiers/{tier}/claim', 'Cliente', 'Reclama un hito'),
  E('GET', '/api/island/catalog', 'Cliente', 'Catálogo de elementos de isla'),
  E('GET', '/api/island/layout', 'Cliente', 'Distribución de la isla'),
  E('POST', '/api/island/unlock', 'Cliente', 'Desbloquea un elemento'),
  E('POST', '/api/island/layout', 'Cliente', 'Guarda la posición de un elemento'),
  E('GET', '/api/qr', A, 'Lista de códigos QR'),
  E('GET', '/api/qr/{qrCode}', A, 'Detalle de un código QR'),
  E('GET', '/api/qr/{qrCode}/image', A, 'Imagen SVG del código'),
  E('PATCH', '/api/qr/{qrCode}/cancel', A, 'Cancela un QR activo'),
  E('POST', '/api/qr/generate', A, 'Genera un código QR'),
  E('POST', '/api/qr/redeem', 'Cliente', 'Canjea un QR (10 por minuto)'),
  E('GET', '/api/rewards', 'Todos los roles', 'Lista de recompensas'),
  E('POST', '/api/rewards', A, 'Crea recompensa'),
  E('PUT', '/api/rewards/{reward}', A, 'Actualiza recompensa'),
  E('PATCH', '/api/rewards/{reward}/status', A, 'Activa o desactiva recompensa'),
  E('GET', '/api/products', 'Todos los roles', 'Lista de productos'),
  E('POST', '/api/products', 'Admin. negocio', 'Crea producto'),
  E('PUT', '/api/products/{product}', 'Admin. negocio', 'Actualiza producto'),
  E('PATCH', '/api/products/{product}/status', A, 'Activa o desactiva producto'),
  E('GET', '/api/sales', A, 'Lista de ventas'),
  E('POST', '/api/sales', 'Admin. negocio', 'Registra venta y genera QR'),
  E('GET', '/api/redemptions/my', 'Cliente', 'Canjes del cliente'),
  E('POST', '/api/redemptions', 'Cliente', 'Crea canje (10 por minuto)'),
  E('GET', '/api/redemptions/business', A, 'Canjes del negocio'),
  E('PATCH', '/api/redemptions/{redemption}/status', A, 'Cambia el estado de un canje'),
  E('GET', '/api/point-rules', A, 'Lista de reglas de puntos'),
  E('POST', '/api/point-rules', 'Admin. general', 'Crea regla de puntos'),
  E('PUT', '/api/point-rules/{pointRule}', A, 'Actualiza regla'),
  E('PATCH', '/api/point-rules/{pointRule}/status', A, 'Activa o desactiva regla'),
  E('GET', '/api/admin/administrators', 'Admin. general', 'Lista de administradores'),
  E('POST', '/api/admin/administrators', 'Admin. general', 'Crea administrador de negocio'),
  E('GET', '/api/admin/administrators/{administrator}', 'Admin. general', 'Detalle de administrador'),
  E('PUT', '/api/admin/administrators/{administrator}', 'Admin. general', 'Actualiza administrador'),
  E('PATCH', '/api/admin/administrators/{administrator}/status', 'Admin. general', 'Activa o desactiva administrador'),
];
if (endpoints.length !== 60) throw new Error('el anexo debe listar 60 rutas, hay ' + endpoints.length);

const anexos = [
  H1('ANEXOS'),
  H2('Anexo A. Catálogo de rutas de la API'),
  P('La Tabla 15 lista las 60 rutas definidas en el archivo de rutas de la API. Todas las rutas, salvo las de autenticación pública, requieren *token* de acceso.', { single: true }),
  ...table('endpoints', 'Catálogo de rutas de la API, rol autorizado y descripción', [800, 3500, 1700, 3122],
    ['Método', 'Ruta', 'Rol', 'Descripción'], endpoints, { size: 17, center: [0] }),
  H2('Anexo B. Capturas de pantalla y manuales'),
  P('[[Incluir aquí las capturas complementarias, el manual de usuario o de procedimientos si se genera, y cualquier evidencia adicional (fotografías, entrevistas, cartas de la empresa). Las hojas de anexos no llevan número de página.]]', { single: true }),
];

// ---------------------------------------------------------------- Documento
const pageProps = (extra = {}) => ({
  size: { width: 12240, height: 15840, ...(extra.orientation ? { orientation: extra.orientation } : {}) },
  margin: { top: 1417, bottom: 1417, left: 1701, right: 1417 },
  ...(extra.pageNumbers ? { pageNumbers: extra.pageNumbers } : {}),
});
const footerNumerado = new Footer({
  children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 20 })] })],
});
const footerVacio = new Footer({ children: [new Paragraph({ children: [] })] });

const doc = new Document({
  creator: 'José Isaac Santiago Ojeda y Erick Iván Ponce Hernández',
  title: 'Informe de estadía – Pase de Batalla',
  description: 'Reporte de estadía, Universidad Politécnica de la Región Ribereña',
  features: { updateFields: true },
  styles: {
    default: {
      document: { run: { font: FONT, size: 22 } },
      heading1: { run: { font: FONT, size: 24, bold: true, color: '000000' }, paragraph: { spacing: { before: 0, after: 240 }, keepNext: true } },
      heading2: { run: { font: FONT, size: 24, bold: true, color: '000000' }, paragraph: { spacing: { before: 240, after: 120 }, keepNext: true } },
      heading3: { run: { font: FONT, size: 22, bold: true, italics: true, color: '000000' }, paragraph: { spacing: { before: 200, after: 100 }, keepNext: true } },
    },
  },
  numbering: {
    config: [
      { reference: 'bullets', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: 'obj', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
    ],
  },
  sections: [
    { properties: { page: pageProps() }, footers: { default: footerVacio }, children: [...portada, ...carta] },
    {
      properties: { page: pageProps({ pageNumbers: { start: 3 } }) },
      footers: { default: footerNumerado },
      children: [...agradecimientos, ...dedicatoria, ...resumen, ...abstract, ...indices, ...introduccion, ...cap1, ...cap2],
    },
    { properties: { page: pageProps({ orientation: PageOrientation.LANDSCAPE }) }, footers: { default: footerNumerado }, children: cap2land },
    { properties: { page: pageProps() }, footers: { default: footerNumerado }, children: [...cap2b, ...cap3, ...conclusiones, ...referencias] },
    { properties: { page: pageProps() }, footers: { default: footerVacio }, children: anexos },
  ],
});

Packer.toBuffer(doc).then((buf) => {
  const out = path.join(__dirname, 'build', 'base.docx');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, buf);
  fs.writeFileSync(path.join(__dirname, 'build', 'outline.json'), JSON.stringify(reg.outline, null, 1));
  console.log('OK', out, buf.length, 'bytes;', reg.outline.length, 'entradas de índice');
});
