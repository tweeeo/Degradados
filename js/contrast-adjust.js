"use strict";

/* ==========================================================
   ContrastAdjust — misma logica para ambos modos,
   solo cambia la direccion y los limites de luminosidad.
   Garantiza que cada color cumpla WCAG AA (4.5:1).
   Depende de: config.js, color-math.js
   ========================================================== */
const ContrastAdjust = {
  rangeFor(textMode) {
    const isBlackText = textMode === TEXT_MODE.BLACK;
    const cfg = isBlackText ? CONFIG.LIGHT_MODE : CONFIG.DARK_MODE;
    return isBlackText
      ? { floor: cfg.L_MIN_FLOOR, ceil: cfg.L_MAX }
      : { floor: cfg.L_MIN, ceil: cfg.L_MAX_CEIL };
  },

  resolve(sampledHsl, textMode, startLightnessOverride) {
    const isBlackText = textMode === TEXT_MODE.BLACK;
    const cfg = isBlackText ? CONFIG.LIGHT_MODE : CONFIG.DARK_MODE;
    const referenceTextRgb = isBlackText ? BLACK_RGB : WHITE_RGB;
    const direction = isBlackText ? 1 : -1;
    const { floor, ceil } = ContrastAdjust.rangeFor(textMode);

    const saturation = sampledHsl.isNeutral
      ? ColorMath.clamp(sampledHsl.s, 0, CONFIG.NEUTRAL_MAX_SATURATION)
      : ColorMath.clamp(sampledHsl.s, cfg.S_MIN, cfg.S_MAX);

    // Parte del brillo real de la muestra (no de un valor fijo) para que dos
    // muestras distintas de la imagen conserven su diferencia de luminosidad
    const startLightness = startLightnessOverride !== undefined ? startLightnessOverride : sampledHsl.l;
    let lightness = ColorMath.clamp(startLightness, floor, ceil);
    let rgb = ColorMath.hslToRgb({ h: sampledHsl.h, s: saturation, l: lightness });
    let contrast = ColorMath.contrastRatio(rgb, referenceTextRgb);

    let iterations = 0;
    while (contrast < CONFIG.MIN_CONTRAST_AA && iterations < CONFIG.MAX_ADJUST_ITERATIONS) {
      lightness += CONFIG.L_STEP * direction;
      if (lightness > ceil || lightness < floor) break;
      rgb = ColorMath.hslToRgb({ h: sampledHsl.h, s: saturation, l: lightness });
      contrast = ColorMath.contrastRatio(rgb, referenceTextRgb);
      iterations++;
    }

    return {
      h: sampledHsl.h, s: saturation, l: lightness,
      rgb, hex: ColorMath.rgbToHex(rgb), contrast,
    };
  },
};
