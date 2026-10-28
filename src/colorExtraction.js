/* ===== ColorCard - Image Color Extraction ===== */
/* Fixed-grid histogram quantization + weighted palette selection.
   Pure functions: no DOM dependency (works in browser and Node). */

(function (global, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    global.ColorCardExtraction = factory();
  }
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  function clampByte(value) {
    return Math.max(0, Math.min(255, Math.round(value)));
  }

  function rgbToHex(r, g, b) {
    return '#' + [r, g, b]
      .map((value) => clampByte(value).toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase();
  }

  function luminance(r, g, b) {
    return 0.299 * r + 0.587 * g + 0.114 * b;
  }

  function colorDistance(a, b) {
    const dr = a.r - b.r;
    const dg = a.g - b.g;
    const db = a.b - b.b;
    return Math.sqrt(dr * dr + dg * dg + db * db);
  }

  function rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
    }
    return { h, s, l };
  }

  function colorFamily(hsl) {
    const h = hsl.h;
    const s = hsl.s;
    const l = hsl.l;
    if (s < 0.12) {
      if (l < 0.18) return 'black';
      if (l > 0.86) return 'white';
      return 'neutral';
    }
    if (h < 18 || h >= 345) return 'red';
    if (h < 45) return 'orange';
    if (h < 70) return 'yellow';
    if (h < 165) return 'green';
    if (h < 200) return 'cyan';
    if (h < 255) return 'blue';
    if (h < 295) return 'purple';
    if (h < 345) return 'pink';
    return 'neutral';
  }

  function hueDistance(a, b) {
    const diff = Math.abs(a - b);
    return Math.min(diff, 360 - diff);
  }

  function enrichCandidate(candidate) {
    const hsl = rgbToHsl(candidate.r, candidate.g, candidate.b);
    return Object.assign(candidate, {
      hsl,
      family: colorFamily(hsl),
      saturation: hsl.s,
      lightness: hsl.l,
    });
  }

  function visualScore(candidate, dominant) {
    const contrast = dominant ? Math.min(1, colorDistance(candidate, dominant) / 260) : 0;
    const midLightness = 1 - Math.min(1, Math.abs(candidate.lightness - 0.55) / 0.55);
    const lowPresenceBoost =
      candidate.weight < 0.08
        ? Math.min(1, Math.sqrt(candidate.weight / 0.018))
        : Math.max(0.15, 1 - candidate.weight * 1.8);
    const chroma = candidate.saturation * midLightness;
    const tinyPenalty = candidate.weight < 0.0015 ? candidate.weight / 0.0015 : 1;

    return (
      tinyPenalty *
      (Math.sqrt(candidate.weight) * 0.75 +
        chroma * 1.2 +
        contrast * 0.9 +
        lowPresenceBoost * chroma * 0.85)
    );
  }

  function minWeight(settings) {
    return typeof settings.minWeight === 'number' ? settings.minWeight : 0.006;
  }

  function isVisibleCandidate(candidate, settings) {
    if (candidate.weight < minWeight(settings)) return false;
    if (candidate.lightness > 0.96 && candidate.saturation < 0.28) return false;
    if (candidate.lightness < 0.04 && candidate.saturation < 0.28) return false;
    return true;
  }

  function isUsefulAccent(candidate, settings) {
    if (!isVisibleCandidate(candidate, settings)) return false;
    if (candidate.saturation < 0.18) return false;
    if (candidate.lightness > 0.94 && candidate.saturation < 0.35) return false;
    if (candidate.lightness < 0.06) return false;
    return true;
  }

  function sameFamilyShade(a, b) {
    if (a.family !== b.family) return false;
    const lightnessDiff = Math.abs(a.lightness - b.lightness);
    const saturationDiff = Math.abs(a.saturation - b.saturation);
    if (a.family === 'neutral' || a.family === 'black' || a.family === 'white') {
      return lightnessDiff < 0.18 && saturationDiff < 0.18;
    }
    return hueDistance(a.hsl.h, b.hsl.h) < 30 && lightnessDiff < 0.18 && saturationDiff < 0.32;
  }

  function pushUnique(selected, candidate, count, threshold, familyAware) {
    if (selected.length >= count) return false;
    const adjustedThreshold =
      familyAware && selected.some((color) => color.family === candidate.family)
        ? threshold * 1.15
        : threshold;
    const tooSimilar = selected.some(
      (color) => colorDistance(color, candidate) < adjustedThreshold || sameFamilyShade(color, candidate)
    );
    if (tooSimilar) return false;
    selected.push(candidate);
    return true;
  }

  function histogramCandidates(pixels, options) {
    const bucketSize = options.bucketSize || 24;
    const buckets = new Map();

    for (let i = 0; i < pixels.length; i += 1) {
      const pixel = pixels[i];
      const key = [
        Math.floor(pixel[0] / bucketSize),
        Math.floor(pixel[1] / bucketSize),
        Math.floor(pixel[2] / bucketSize),
      ].join(':');

      if (!buckets.has(key)) {
        buckets.set(key, { r: 0, g: 0, b: 0, count: 0 });
      }
      const bucket = buckets.get(key);
      bucket.r += pixel[0];
      bucket.g += pixel[1];
      bucket.b += pixel[2];
      bucket.count += 1;
    }

    return Array.from(buckets.values())
      .map((bucket) => {
        const r = Math.round(bucket.r / bucket.count);
        const g = Math.round(bucket.g / bucket.count);
        const b = Math.round(bucket.b / bucket.count);
        return {
          r,
          g,
          b,
          hex: rgbToHex(r, g, b),
          count: bucket.count,
          weight: bucket.count / pixels.length,
          luminance: luminance(r, g, b),
        };
      })
      .map(enrichCandidate);
  }

  function uniqueBySimilarity(candidates, count, threshold) {
    const selected = [];
    for (let i = 0; i < candidates.length; i += 1) {
      pushUnique(selected, candidates[i], count, threshold, true);
      if (selected.length >= count) break;
    }
    return selected;
  }

  function mergeSimilarCandidates(candidates, threshold, total) {
    const groups = [];
    candidates.forEach((candidate) => {
      const group = groups.find((item) => colorDistance(item, candidate) < threshold);
      if (!group) {
        groups.push(Object.assign({}, candidate));
        return;
      }
      const nextCount = group.count + candidate.count;
      group.r = Math.round((group.r * group.count + candidate.r * candidate.count) / nextCount);
      group.g = Math.round((group.g * group.count + candidate.g * candidate.count) / nextCount);
      group.b = Math.round((group.b * group.count + candidate.b * candidate.count) / nextCount);
      group.count = nextCount;
      group.weight = nextCount / total;
      group.hex = rgbToHex(group.r, group.g, group.b);
      group.luminance = luminance(group.r, group.g, group.b);
      enrichCandidate(group);
    });
    return groups;
  }

  function bestByFamily(candidates, dominant) {
    const families = new Map();
    candidates.forEach((candidate) => {
      if (candidate.family === 'neutral' || candidate.family === 'black' || candidate.family === 'white') return;
      const score = visualScore(candidate, dominant) + Math.min(0.5, candidate.saturation);
      const current = families.get(candidate.family);
      if (!current || score > current.familyScore) {
        families.set(candidate.family, Object.assign(candidate, { familyScore: score }));
      }
    });
    return Array.from(families.values()).sort((a, b) => b.familyScore - a.familyScore);
  }

  function filterVisibleCandidates(candidates, settings) {
    const visible = candidates.filter((candidate, index) => {
      if (index === 0) return true;
      return isVisibleCandidate(candidate, settings);
    });
    return visible.length ? visible : candidates.slice(0, 1);
  }

  function sortFamilyPalette(colors) {
    const familyOrder = {
      red: 0, orange: 1, yellow: 2, green: 3, cyan: 4, blue: 5,
      purple: 6, pink: 7, neutral: 8, white: 9, black: 10,
    };
    const dominant = colors.slice(0, 1);
    const rest = colors.slice(1).sort((a, b) => {
      const familyDiff = (familyOrder[a.family] ?? 99) - (familyOrder[b.family] ?? 99);
      if (familyDiff !== 0) return familyDiff;
      return b.lightness - a.lightness;
    });
    return dominant.concat(rest);
  }

  function selectBalancedColors(candidates, count, threshold, settings) {
    const selected = [];
    const dominant = candidates[0];
    const dominantTarget = Math.min(
      count,
      typeof settings.dominantCount === 'number'
        ? settings.dominantCount
        : Math.max(2, Math.round(count * 0.42))
    );

    candidates.forEach((candidate) => {
      if (selected.length >= dominantTarget) return;
      pushUnique(selected, candidate, count, threshold, false);
    });

    const accents = candidates
      .filter((candidate) => isUsefulAccent(candidate, settings))
      .map((candidate) => Object.assign(candidate, { accentScore: visualScore(candidate, dominant) }))
      .sort((a, b) => b.accentScore - a.accentScore);

    const familyPicks = bestByFamily(accents, dominant);
    familyPicks.forEach((candidate) => {
      pushUnique(selected, candidate, count, threshold, true);
    });
    accents.forEach((candidate) => {
      pushUnique(selected, candidate, count, threshold, true);
    });

    return selected.slice(0, count);
  }

  /**
   * Downsample a flat RGBA pixel array into an array of [r,g,b] triples,
   * skipping transparent pixels.
   * @param {Uint8Array|Uint8ClampedArray} data RGBA data
   * @param {number} width
   * @param {number} height
   * @param {object} options { maxPixels }
   */
  function samplePixels(data, width, height, options) {
    const opts = options || {};
    const maxPixels = opts.maxPixels || 60000;
    const pixelCount = width * height;
    const step = Math.max(1, Math.floor(pixelCount / maxPixels));
    const pixels = [];
    for (let i = 0; i < data.length; i += 4 * step) {
      const alpha = data[i + 3];
      if (alpha < 128) continue;
      pixels.push([data[i], data[i + 1], data[i + 2]]);
    }
    return pixels;
  }

  /**
   * Extract a representative palette from sampled pixels.
   * @param {Array<[number,number,number]>} pixels
   * @param {object} options { count, similarThreshold, bucketSize, strategy, sort, minWeight, dominantCount }
   */
  function extractColors(pixels, options) {
    const settings = options || {};
    const count = settings.count || 6;
    const threshold = typeof settings.similarThreshold === 'number' ? settings.similarThreshold : 32;

    if (!pixels || !pixels.length) {
      return [{ r: 128, g: 128, b: 128, hex: '#808080', count: 1, weight: 1, luminance: 128 }];
    }

    const histogram = histogramCandidates(pixels, settings).sort((a, b) => b.count - a.count);
    const candidates = filterVisibleCandidates(
      mergeSimilarCandidates(histogram, threshold, pixels.length).sort((a, b) => b.count - a.count),
      settings
    ).sort((a, b) => b.count - a.count);

    let colors;
    if (settings.strategy === 'dominance') {
      colors = uniqueBySimilarity(candidates, count, threshold);
    } else {
      colors = selectBalancedColors(candidates, count, threshold, settings);
    }

    if (settings.sort === 'luminance') {
      colors.sort((a, b) => b.luminance - a.luminance);
    } else if (settings.sort === 'hue') {
      colors.sort((a, b) => (a.hsl ? a.hsl.h : 0) - (b.hsl ? b.hsl.h : 0));
    } else if (settings.sort === 'family') {
      return sortFamilyPalette(colors);
    }

    return colors;
  }

  return {
    rgbToHex,
    samplePixels,
    extractColors,
  };
});
