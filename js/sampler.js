"use strict";

/* ==========================================================
   Sampler — misma funcion para la zona superior e inferior,
   parametrizada por borde y por que tan grande es la zona
   analizada (bandFraction). Agrupa los pixeles en "cubetas"
   de matiz para poder ofrecer variantes reales ("Otro")
   extraidas de zonas de color distintas de la imagen.
   Depende de: config.js, color-math.js
   ========================================================== */
const Sampler = {
  drawScaled(img) {
    const scale = Math.min(1, CONFIG.SAMPLE_MAX_DIMENSION / Math.max(img.naturalWidth, img.naturalHeight));
    const width = Math.max(1, Math.round(img.naturalWidth * scale));
    const height = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, width, height);
    return { ctx, width, height };
  },

  // Peso vertical: 1.0 en el borde exterior de la imagen, decreciendo hacia el limite interno de la zona
  verticalWeight(rowInBand, bandHeightPx) {
    const t = bandHeightPx <= 1 ? 0 : rowInBand / (bandHeightPx - 1);
    return 1 - (1 - CONFIG.VERTICAL_WEIGHT_FLOOR) * t;
  },

  // Peso horizontal: 1.0 cerca de los costados, minimo en el centro — evita que el sujeto central domine el color
  horizontalWeight(x, width) {
    const normalized = width <= 1 ? 0 : x / (width - 1);
    const distFromCenter = Math.abs(normalized - 0.5) * 2;
    return CONFIG.HORIZONTAL_WEIGHT_FLOOR + (1 - CONFIG.HORIZONTAL_WEIGHT_FLOOR) * distFromCenter;
  },

  newBucket() {
    return { sumWeight: 0, sumSin: 0, sumCos: 0, sumS: 0, sumL: 0 };
  },

  addToBucket(bucket, weight, h, s, l) {
    const rad = (h * Math.PI) / 180;
    bucket.sumSin += Math.sin(rad) * weight;
    bucket.sumCos += Math.cos(rad) * weight;
    bucket.sumS += s * weight;
    bucket.sumL += l * weight;
    bucket.sumWeight += weight;
  },

  bucketToCandidate(bucket, forcedHue, isNeutral) {
    let hue = forcedHue;
    if (hue === undefined) {
      hue = (Math.atan2(bucket.sumSin, bucket.sumCos) * 180) / Math.PI;
      if (hue < 0) hue += 360;
    }
    return {
      h: hue,
      s: bucket.sumS / bucket.sumWeight,
      l: bucket.sumL / bucket.sumWeight,
      weight: bucket.sumWeight,
      isNeutral: Boolean(isNeutral),
    };
  },

  // Devuelve varios candidatos de color para una zona, ordenados del mas al menos representado
  sampleEdgeCandidates(ctx, width, height, edge, bandFraction) {
    const bandHeightPx = Math.max(CONFIG.MIN_BAND_PX, Math.round(height * bandFraction));
    const rowsInBand = Math.min(bandHeightPx, height);
    const startRow = edge === "top" ? 0 : Math.max(0, height - bandHeightPx);
    const { data } = ctx.getImageData(0, startRow, width, rowsInBand);

    const hueBuckets = Array.from({ length: CONFIG.HUE_BUCKET_COUNT }, () => Sampler.newBucket());
    const neutralBucket = Sampler.newBucket();
    const bucketSpan = 360 / CONFIG.HUE_BUCKET_COUNT;

    for (let row = 0; row < rowsInBand; row++) {
      const rowInBand = edge === "top" ? row : (rowsInBand - 1 - row);
      const vWeight = Sampler.verticalWeight(rowInBand, bandHeightPx);

      for (let x = 0; x < width; x++) {
        const idx = (row * width + x) * 4;
        const r = data[idx], g = data[idx + 1], b = data[idx + 2], a = data[idx + 3];
        if (a < 8) continue;

        const weight = vWeight * Sampler.horizontalWeight(x, width);
        const { h, s, l } = ColorMath.rgbToHsl({ r, g, b });

        if (s < CONFIG.NEUTRAL_SATURATION_THRESHOLD) {
          Sampler.addToBucket(neutralBucket, weight, 0, s, l);
        } else {
          const bucketIndex = Math.min(CONFIG.HUE_BUCKET_COUNT - 1, Math.floor(h / bucketSpan));
          Sampler.addToBucket(hueBuckets[bucketIndex], weight, h, s, l);
        }
      }
    }

    const totalWeight = hueBuckets.reduce((sum, bkt) => sum + bkt.sumWeight, 0) + neutralBucket.sumWeight;
    if (totalWeight === 0) return [{ h: 0, s: 0, l: 50, weight: 1, isNeutral: true }];

    const candidates = hueBuckets
      .filter((bkt) => bkt.sumWeight > 0)
      .map((bkt) => Sampler.bucketToCandidate(bkt));
    if (neutralBucket.sumWeight > 0) candidates.push(Sampler.bucketToCandidate(neutralBucket, 0, true));

    const minWeight = totalWeight * CONFIG.MIN_CANDIDATE_WEIGHT_SHARE;
    let ranked = candidates
      .filter((c) => c.weight >= minWeight)
      .sort((a, b) => b.weight - a.weight);

    if (ranked.length === 0) ranked = candidates.sort((a, b) => b.weight - a.weight).slice(0, 1);

    const distinct = Sampler.filterDistinct(ranked);
    return distinct.slice(0, CONFIG.MAX_CANDIDATES_PER_EDGE);
  },

  // Se queda solo con candidatos que se vean realmente diferentes entre si —
  // dos tonos casi iguales en matiz, saturacion y luminosidad no cuentan como
  // variantes distintas, o "Otro" ciclaria entre colores indistinguibles
  filterDistinct(rankedCandidates) {
    const isDistinctEnough = (a, b) => {
      const hueDelta = Math.min(Math.abs(a.h - b.h), 360 - Math.abs(a.h - b.h));
      return hueDelta >= CONFIG.MIN_HUE_DELTA_FOR_VARIANT
        || Math.abs(a.l - b.l) >= CONFIG.MIN_LIGHTNESS_DELTA_FOR_VARIANT
        || Math.abs(a.s - b.s) >= CONFIG.MIN_SATURATION_DELTA_FOR_VARIANT;
    };

    const kept = [];
    for (const candidate of rankedCandidates) {
      if (kept.every((existing) => isDistinctEnough(candidate, existing))) kept.push(candidate);
    }
    return kept.length > 0 ? kept : [rankedCandidates[0]];
  },

  analyze(img, bandFraction) {
    const { ctx, width, height } = Sampler.drawScaled(img);
    return {
      top: Sampler.sampleEdgeCandidates(ctx, width, height, "top", bandFraction),
      bottom: Sampler.sampleEdgeCandidates(ctx, width, height, "bottom", bandFraction),
    };
  },
};
