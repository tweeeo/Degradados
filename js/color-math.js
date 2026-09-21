"use strict";

/* ==========================================================
   ColorMath — una sola fuente de verdad para cada conversion
   de color. Depende de: nada (modulo puro).
   ========================================================== */
const ColorMath = {
  clamp(v, min, max) {
    return Math.min(max, Math.max(min, v));
  },

  rgbToHsl({ r, g, b }) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;
    const d = max - min;
    if (d !== 0) {
      s = d / (1 - Math.abs(2 * l - 1));
      switch (max) {
        case r: h = 60 * (((g - b) / d) % 6); break;
        case g: h = 60 * ((b - r) / d + 2); break;
        case b: h = 60 * ((r - g) / d + 4); break;
      }
    }
    if (h < 0) h += 360;
    return { h, s: s * 100, l: l * 100 };
  },

  hslToRgb({ h, s, l }) {
    s /= 100; l /= 100;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    let rp = 0, gp = 0, bp = 0;
    if (h < 60)       { rp = c; gp = x; bp = 0; }
    else if (h < 120) { rp = x; gp = c; bp = 0; }
    else if (h < 180) { rp = 0; gp = c; bp = x; }
    else if (h < 240) { rp = 0; gp = x; bp = c; }
    else if (h < 300) { rp = x; gp = 0; bp = c; }
    else              { rp = c; gp = 0; bp = x; }
    return {
      r: Math.round((rp + m) * 255),
      g: Math.round((gp + m) * 255),
      b: Math.round((bp + m) * 255),
    };
  },

  rgbToHex({ r, g, b }) {
    const toHex = (v) => ColorMath.clamp(Math.round(v), 0, 255).toString(16).padStart(2, "0");
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
  },

  relativeLuminance({ r, g, b }) {
    const linear = (c) => {
      const cs = c / 255;
      return cs <= 0.03928 ? cs / 12.92 : Math.pow((cs + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
  },

  contrastRatio(rgbA, rgbB) {
    const lA = ColorMath.relativeLuminance(rgbA) + 0.05;
    const lB = ColorMath.relativeLuminance(rgbB) + 0.05;
    return lA > lB ? lA / lB : lB / lA;
  },
};
