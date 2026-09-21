"use strict";

/* ==========================================================
   Configuracion — cada numero tiene nombre, nada de "magia"
   ========================================================== */
const CONFIG = {
  SAMPLE_MAX_DIMENSION: 240,     // resolucion de analisis: suficiente para el color, rapido para cualquier tamano de imagen

  BAND_FRACTION_EDGES: 0.14,     // seleccion normal: 14% superior / 14% inferior
  BAND_FRACTION_FULL: 0.5,       // "Expandir seleccion": mitad superior / mitad inferior — toda la imagen

  MIN_BAND_PX: 4,
  VERTICAL_WEIGHT_FLOOR: 0.4,    // peso minimo en el limite interno de la zona (el borde exterior siempre pesa 1.0)
  HORIZONTAL_WEIGHT_FLOOR: 0.5,  // peso minimo en el centro horizontal (los costados siempre pesan 1.0)

  HUE_BUCKET_COUNT: 12,          // 30 grados por cubeta — suficiente resolucion para distinguir tonos distintos
  NEUTRAL_SATURATION_THRESHOLD: 10, // por debajo de esto el matiz no es fiable; se agrupa aparte
  NEUTRAL_MAX_SATURATION: 6,        // un tono ya neutro no debe forzarse hasta el S_MIN de color: seguiria siendo gris
  MIN_CANDIDATE_WEIGHT_SHARE: 0.03, // una cubeta necesita al menos 3% del peso total para contar como variante real
  MAX_CANDIDATES_PER_EDGE: 6,

  // Dos candidatos solo cuentan como variantes distintas para "Otro" si difieren
  // en al menos uno de estos ejes — evita ciclar entre tonos casi identicos
  MIN_HUE_DELTA_FOR_VARIANT: 40,
  MIN_LIGHTNESS_DELTA_FOR_VARIANT: 14,
  MIN_SATURATION_DELTA_FOR_VARIANT: 18,

  // Si el color de "arriba" y el de "abajo" quedan demasiado parecidos,
  // se separan dentro del rango de luminosidad permitido por el modo
  MIN_GRADIENT_L_SEPARATION: 16,
  MIN_GRADIENT_RGB_DISTANCE: 30,

  LIGHT_MODE: { L_MAX: 97, L_MIN_FLOOR: 70, S_MIN: 18, S_MAX: 72 },
  DARK_MODE:  { L_MIN: 3,  L_MAX_CEIL: 30,  S_MIN: 18, S_MAX: 60 },

  L_STEP: 1.5,
  MAX_ADJUST_ITERATIONS: 60,
  MIN_CONTRAST_AA: 4.5,
};

const TEXT_MODE = { BLACK: "black", WHITE: "white" };

const BLACK_RGB = { r: 0, g: 0, b: 0 };
const WHITE_RGB = { r: 255, g: 255, b: 255 };
