// js/recetas_seed.js
// Recetas oficiales Las Piconas (SYSTEM). Solo ADMIN puede editarlas.

const RECETAS_SEED = [
  {
    id: "REC-ACEITE-AJO",
    nombre: "Aceite de Ajo",
    productoFinal: "Aceite de Ajo",
    rendimientoEsperado: 1,
    unidadRend: "lote",
    ingredientes: [
      { mpNombre: "AJO", cant: 1.5, unidad: "LIBRA" },
      { mpNombre: "ACEITE", cant: 1, unidad: "GALON" },
      { mpNombre: "SAL", cant: 5, unidad: "ONZA" },
    ],
    semaforo: { greenMin: 1, greenMax: 1, yellowMin: 1, yellowMax: 1 },
    notas: "Se envasa en los mismos galones de aceite que se desocuparon.",
  },

  {
    id: "REC-ACEITE-ROJO",
    nombre: "Aceite Rojo",
    productoFinal: "Aceite Rojo",
    rendimientoEsperado: 1,
    unidadRend: "lote",
    ingredientes: [
      { mpNombre: "CHILE GUAQUE", cant: 7, unidad: "ONZA" },
      { mpNombre: "ACEITE", cant: 1, unidad: "GALON" },
    ],
    semaforo: { greenMin: 1, greenMax: 1, yellowMin: 1, yellowMax: 1 },
  },

  {
    id: "REC-ACEITE-VERDE",
    nombre: "Aceite Verde",
    productoFinal: "Aceite Verde",
    rendimientoEsperado: 1,
    unidadRend: "lote",
    ingredientes: [
      { mpNombre: "CILANTRO PICADO", cant: 3, unidad: "LIBRA" },
      { mpNombre: "AJO", cant: 24, unidad: "ONZA" },
      { mpNombre: "SAL", cant: 24, unidad: "ONZA" },
      { mpNombre: "ACEITE", cant: 4, unidad: "GALON" },
    ],
    semaforo: { greenMin: 1, greenMax: 1, yellowMin: 1, yellowMax: 1 },
  },

  {
    id: "REC-JAMAICA-CONCENTRADO",
    nombre: "Concentrado de Rosa de Jamaica",
    productoFinal: "Concentrado de Rosa de Jamaica",
    rendimientoEsperado: 1,
    unidadRend: "lote",
    ingredientes: [
      { mpNombre: "JAMAICA (BOLSA 1.5 LB)", cant: 6, unidad: "BOLSA" },
      { mpNombre: "CANELA EN RAJA", cant: 9, unidad: "ONZA" },
      { mpNombre: "AGUA", cant: 22, unidad: "GALON" },
    ],
    semaforo: { greenMin: 1, greenMax: 1, yellowMin: 1, yellowMax: 1 },
    notas: "Se empaca en bolsa de 1 galón.",
  },

  {
    id: "REC-SOPA-BIRRIA-CONCENTRADO",
    nombre: "Concentrado de Sopa de Birria",
    productoFinal: "Concentrado de Sopa de Birria",
    rendimientoEsperado: 1,
    unidadRend: "lote",
    ingredientes: [
      { mpNombre: "TOMATE", cant: 100, unidad: "LIBRA" },
      { mpNombre: "CHILE GUAQUE", cant: 2.5, unidad: "LIBRA" },
      { mpNombre: "CHILE PASA", cant: 2, unidad: "LIBRA" },
      { mpNombre: "CEBOLLA", cant: 30, unidad: "LIBRA" },
      { mpNombre: "VINAGRE BLANCO", cant: 5, unidad: "VASO" },
      { mpNombre: "ACEITE", cant: 20, unidad: "VASO" },
      { mpNombre: "SAL", cant: 2, unidad: "LIBRA" },
      { mpNombre: "AJO", cant: 2.5, unidad: "LIBRA" },
      { mpNombre: "PIMIENTA GORDA", cant: 1, unidad: "LIBRA" },
      { mpNombre: "PIMIENTA CASTILLA", cant: 1, unidad: "LIBRA" },
      { mpNombre: "CLAVO", cant: 2, unidad: "ONZA" },
      { mpNombre: "COMINO", cant: 6, unidad: "ONZA" },
      { mpNombre: "LAUREL", cant: 1, unidad: "ONZA" },
      { mpNombre: "OREGANO", cant: 21, unidad: "ONZA" },
      { mpNombre: "TOMILLO", cant: 1, unidad: "ONZA" },
      { mpNombre: "AGUA", cant: 9, unidad: "GALON" },
    ],
    semaforo: { greenMin: 1, greenMax: 1, yellowMin: 1, yellowMax: 1 },
    notas: "El documento dice 'AGUA PENDIENTE' (ajustable por ADMIN).",
  },

  {
    id: "REC-BIRRIA-CARNE-SOPA",
    nombre: "Carne de Birria y Sopa",
    productoFinal: "Carne de Birria y Sopa",
    rendimientoEsperado: 1,
    unidadRend: "lote",
    ingredientes: [
      { mpNombre: "CARNE DE RES", cant: 100, unidad: "LIBRA" },
      { mpNombre: "CONCENTRADO DE SOPA DE BIRRIA", cant: 6, unidad: "GALON" },
      { mpNombre: "AGUA", cant: 7, unidad: "GALON" },
      { mpNombre: "SAL", cant: 7, unidad: "ONZA" },
      { mpNombre: "CONSOME DE RES", cant: 5, unidad: "ONZA" },
    ],
    semaforo: { greenMin: 1, greenMax: 1, yellowMin: 1, yellowMax: 1 },
    notas: "Porciona bolsas de 3 lb carne + 0.5 L sopa. Sopa restante 1.5 L.",
  },

  {
    id: "REC-TORTILLA-BIRRI-TACO",
    nombre: "Tortilla de Birri Taco",
    productoFinal: "Tortilla de Birri Taco",
    rendimientoEsperado: 1,
    unidadRend: "lote",
    ingredientes: [
      { mpNombre: "MAIZ", cant: 15, unidad: "LIBRA" },
      { mpNombre: "ORO MAYA", cant: 25, unidad: "LIBRA" },
      { mpNombre: "CHILE GUAQUE", cant: 12, unidad: "ONZA" },
      { mpNombre: "CAL", cant: 3, unidad: "ONZA" },
      // OJO: en la foto no se ve el número de galones de agua. Admin puede editarlo.
      { mpNombre: "AGUA", cant: 0, unidad: "GALON", pendiente: true },
    ],
    semaforo: { greenMin: 1, greenMax: 1, yellowMin: 1, yellowMax: 1 },
    notas: "Falta cantidad exacta de agua en el documento (pendiente).",
  },

  {
    id: "REC-SALSA-VERDE-CILANTRO",
    nombre: "Salsa Verde De Cilantro",
    productoFinal: "Salsa Verde De Cilantro",
    rendimientoEsperado: 1,
    unidadRend: "lote",
    ingredientes: [
      { mpNombre: "CILANTRO PICADO", cant: 10, unidad: "LIBRA" },
      { mpNombre: "AJO", cant: 22, unidad: "ONZA" },
      { mpNombre: "MAYONESA", cant: 2, unidad: "GALON", notas: "3000g por galón" },
      { mpNombre: "SAL", cant: 8, unidad: "ONZA" },
      { mpNombre: "AGUA", cant: 2.5, unidad: "GALON" },
    ],
    semaforo: { greenMin: 1, greenMax: 1, yellowMin: 1, yellowMax: 1 },
    notas: "Se porciona en bolsas de 1.5 galones, doble bolsa, congela.",
  },
];