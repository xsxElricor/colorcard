/* ===== ColorCard - Card Renderer =====
   Renders an aesthetic color card onto any Canvas2D context.
   Shared between browser and Node (@napi-rs/canvas). No DOM access.

   Layout model:
     - ratio + orientation  -> card dimensions (short side fixed at 1080)
     - blockPos             -> where the color block sits (depends on orientation)
     - textPos              -> text anchor inside the color block (bands only)
*/

(function (global, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    global.ColorCardRenderer = factory();
  }
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const BASE = 1080; // fixed short side
  const CORNER_R = 48;
  const DIAG_CUT = 0.75; // square: cut passes this fraction along the two adjacent edges

  // Ratios expressed in portrait terms (w <= h).
  const RATIOS = [
    { id: '1:1', w: 1, h: 1 },
    { id: '2:3', w: 2, h: 3 },
    { id: '3:4', w: 3, h: 4 },
    { id: '4:5', w: 4, h: 5 },
    { id: '9:16', w: 9, h: 16 },
  ];

  const TEXT_POSITIONS = ['bottom-left', 'top-left', 'top-right', 'bottom-right', 'center'];

  const FONT_FAMILY = '"Segoe UI", "Helvetica Neue", Arial, sans-serif';
  const HEX_FONT_FAMILY = 'Consolas'; // fixed monospace for the hex code

  // Available typefaces. `family` is used directly in ctx.font (works in
  // browser and Node, where the matching font files are registered).
  const FONTS = [
    { id: 'segoe', label: '现代无衬线', labelEn: 'Modern Sans', family: '"Segoe UI"' },
    { id: 'arial', label: '经典无衬线', labelEn: 'Classic Sans', family: 'Arial' },
    { id: 'georgia', label: '优雅衬线', labelEn: 'Elegant Serif', family: 'Georgia' },
    { id: 'times', label: '经典衬线', labelEn: 'Classic Serif', family: '"Times New Roman"' },
    { id: 'consolas', label: '等宽', labelEn: 'Monospace', family: 'Consolas' },
    { id: 'lucida-type', label: '打字机', labelEn: 'Typewriter', family: '"Lucida Sans Typewriter"' },
    { id: 'comic', label: '童趣手写', labelEn: 'Playful', family: '"Comic Sans MS"' },
    { id: 'lucida-hand', label: '连笔手写', labelEn: 'Handwriting', family: '"Lucida Handwriting"' },
    { id: 'lucida-call', label: '花体书法', labelEn: 'Calligraphy', family: '"Lucida Calligraphy"' },
  ];

  // Chinese typefaces (used as the CJK fallback in the font stack).
  const CJK_FONTS = [
    { id: 'yahei', label: '微软雅黑', labelEn: 'Microsoft YaHei', family: '"Microsoft YaHei"' },
    { id: 'dengxian', label: '等线', labelEn: 'DengXian', family: 'DengXian' },
    { id: 'simhei', label: '黑体', labelEn: 'SimHei', family: 'SimHei' },
    { id: 'simsun', label: '宋体', labelEn: 'SimSun', family: 'SimSun' },
    { id: 'stsong', label: '华文宋体', labelEn: 'STSong', family: 'STSong' },
    { id: 'kaiti', label: '楷体', labelEn: 'KaiTi', family: 'KaiTi' },
    { id: 'stkaiti', label: '华文楷体', labelEn: 'STKaiti', family: 'STKaiti' },
    { id: 'fangsong', label: '仿宋', labelEn: 'FangSong', family: 'FangSong' },
    { id: 'youyuan', label: '幼圆', labelEn: 'YouYuan', family: 'YouYuan' },
    { id: 'lisu', label: '隶书', labelEn: 'LiSu', family: 'LiSu' },
    { id: 'stxingkai', label: '华文行楷', labelEn: 'STXingkai', family: 'STXingkai' },
    { id: 'stliti', label: '华文隶书', labelEn: 'STLiti', family: 'STLiti' },
  ];

  // Font metrics per layout family.
  const BAND_METRICS = { pad: 64, nameFS: 80, nameLH: 88, moodFS: 48, hexFS: 36, gap1: 28, gap2: 22 };
  const DIAG_METRICS = { pad: 56, nameFS: 48, nameLH: 58, moodFS: 28, hexFS: 22, gap1: 20, gap2: 16 };

  // ---- Dimensions ----

  function computeDims(ratio, orientation) {
    const w = ratio.w;
    const h = ratio.h;
    if (w === h) return { W: BASE, H: BASE, orientation: 'square' };
    if (orientation === 'landscape') {
      return { W: Math.round((BASE * h) / w), H: BASE, orientation: 'landscape' };
    }
    return { W: BASE, H: Math.round((BASE * h) / w), orientation: 'portrait' };
  }

  function blockPositionsFor(orientation) {
    if (orientation === 'square') return ['tl', 'tr', 'bl', 'br'];
    if (orientation === 'landscape') return ['left', 'right'];
    return ['top', 'bottom'];
  }

  // ---- Path helpers ----

  function roundRectPath(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function regionPath(ctx, region) {
    ctx.beginPath();
    if (region.type === 'poly') {
      const pts = region.pts;
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.closePath();
    } else {
      ctx.rect(region.x, region.y, region.w, region.h);
    }
  }

  function regionPoints(region) {
    if (region.pts) return region.pts;
    return [
      [region.x, region.y],
      [region.x + region.w, region.y],
      [region.x + region.w, region.y + region.h],
      [region.x, region.y + region.h],
    ];
  }

  function isCardCorner(p, W, H) {
    return (p[0] === 0 || p[0] === W) && (p[1] === 0 || p[1] === H);
  }

  // Build a region path whose card-corner vertices are rounded (radius r),
  // so a border stroke follows the rounded card edge instead of a sharp corner.
  function roundedRegionPath(ctx, region, W, H, r) {
    const pts = regionPoints(region);
    const n = pts.length;
    const last = pts[n - 1];
    const first = pts[0];
    ctx.beginPath();
    ctx.moveTo((last[0] + first[0]) / 2, (last[1] + first[1]) / 2);
    for (let i = 0; i < n; i++) {
      const cur = pts[i];
      const next = pts[(i + 1) % n];
      if (isCardCorner(cur, W, H)) {
        ctx.arcTo(cur[0], cur[1], next[0], next[1], r);
      } else {
        ctx.lineTo(cur[0], cur[1]);
      }
    }
    ctx.closePath();
  }

  function cornerToTextPos(blockPos) {
    return { tl: 'top-left', tr: 'top-right', bl: 'bottom-left', br: 'bottom-right' }[blockPos] || 'bottom-left';
  }

  // ---- Regions ----

  function buildRegions(W, H, orientation, blockPos) {
    if (orientation === 'square') {
      // Corner triangle: the cut passes through DIAG_CUT (0.75) of the two
      // adjacent edges, giving the color block more room than a midpoint cut.
      const c = DIAG_CUT;
      const map = {
        tl: {
          color: [[0, 0], [W * c, 0], [0, H * c]],
          photo: [[W * c, 0], [W, 0], [W, H], [0, H], [0, H * c]],
          rect: { x: 0, y: 0, w: W * c, h: H * c },
          wm: { edge: 'top', y: 0, left: 0, right: W * c },
        },
        tr: {
          color: [[W, 0], [W * (1 - c), 0], [W, H * c]],
          photo: [[0, 0], [W * (1 - c), 0], [W, H * c], [W, H], [0, H]],
          rect: { x: W * (1 - c), y: 0, w: W * c, h: H * c },
          wm: { edge: 'top', y: 0, left: W * (1 - c), right: W },
        },
        bl: {
          color: [[0, H], [0, H * (1 - c)], [W * c, H]],
          photo: [[0, 0], [W, 0], [W, H], [W * c, H], [0, H * (1 - c)]],
          rect: { x: 0, y: H * (1 - c), w: W * c, h: H * c },
          wm: { edge: 'bottom', y: H, left: 0, right: W * c },
        },
        br: {
          color: [[W, H], [W, H * (1 - c)], [W * (1 - c), H]],
          photo: [[0, 0], [W, 0], [W, H * (1 - c)], [W * (1 - c), H], [0, H]],
          rect: { x: W * (1 - c), y: H * (1 - c), w: W * c, h: H * c },
          wm: { edge: 'bottom', y: H, left: W * (1 - c), right: W },
        },
      };
      const m = map[blockPos] || map.br;
      const full = { x: 0, y: 0, w: W, h: H };
      return {
        colorRegion: { type: 'poly', pts: m.color, bounds: full },
        photoRegion: { type: 'poly', pts: m.photo, bounds: full },
        textRect: m.rect,
        textPos: cornerToTextPos(blockPos),
        isDiagonal: true,
        wm: m.wm,
      };
    }

    if (orientation === 'landscape') {
      const left = blockPos === 'left';
      const cw = W / 2;
      const colorRect = left ? { x: 0, y: 0, w: cw, h: H } : { x: cw, y: 0, w: cw, h: H };
      const photoRect = left ? { x: cw, y: 0, w: cw, h: H } : { x: 0, y: 0, w: cw, h: H };
      return {
        colorRegion: { type: 'rect', x: colorRect.x, y: colorRect.y, w: colorRect.w, h: colorRect.h, bounds: colorRect },
        photoRegion: { type: 'rect', x: photoRect.x, y: photoRect.y, w: photoRect.w, h: photoRect.h, bounds: photoRect },
        textRect: colorRect,
        textPos: null,
        isDiagonal: false,
        wm: { edge: 'bottom', y: H, left: left ? 0 : cw, right: left ? cw : W },
      };
    }

    // portrait
    const top = blockPos === 'top';
    const ch = H / 2;
    const colorRect = top ? { x: 0, y: 0, w: W, h: ch } : { x: 0, y: ch, w: W, h: ch };
    const photoRect = top ? { x: 0, y: ch, w: W, h: ch } : { x: 0, y: 0, w: W, h: ch };
    return {
      colorRegion: { type: 'rect', x: colorRect.x, y: colorRect.y, w: colorRect.w, h: colorRect.h, bounds: colorRect },
      photoRegion: { type: 'rect', x: photoRect.x, y: photoRect.y, w: photoRect.w, h: photoRect.h, bounds: photoRect },
      textRect: colorRect,
      textPos: null,
      isDiagonal: false,
      wm: { edge: 'bottom', y: top ? H / 2 : H, left: 0, right: W },
    };
  }

  // ---- Text ----

  function trimToWidth(ctx, text, maxWidth) {
    const ellipsis = '...';
    let value = text;
    while (value.length > 0 && ctx.measureText(value + ellipsis).width > maxWidth) {
      value = value.slice(0, -1);
    }
    return value ? value + ellipsis : ellipsis;
  }

  function splitLongWord(ctx, word, maxWidth) {
    const parts = [];
    let part = '';
    Array.from(word).forEach((char) => {
      const next = part + char;
      if (part && ctx.measureText(next).width > maxWidth) {
        parts.push(part);
        part = char;
      } else {
        part = next;
      }
    });
    if (part) parts.push(part);
    return parts;
  }

  function wrapText(ctx, text, maxWidth, maxLines) {
    const lines = [];
    const paragraphs = String(text || '').replace(/\r/g, '').split('\n');

    paragraphs.forEach((paragraph) => {
      const words = paragraph.trim().split(/\s+/).filter(Boolean);
      if (!words.length) {
        if (lines.length < maxLines) lines.push('');
        return;
      }
      let line = '';
      words.forEach((word) => {
        const next = line ? line + ' ' + word : word;
        if (ctx.measureText(next).width <= maxWidth) {
          line = next;
          return;
        }
        if (line) lines.push(line);
        if (ctx.measureText(word).width > maxWidth) {
          const parts = splitLongWord(ctx, word, maxWidth);
          parts.forEach((part, index) => {
            if (index === parts.length - 1) line = part;
            else lines.push(part);
          });
        } else {
          line = word;
        }
      });
      if (line) lines.push(line);
    });

    if (!lines.length) lines.push('');
    if (lines.length > maxLines) {
      const limited = lines.slice(0, maxLines);
      limited[maxLines - 1] = trimToWidth(ctx, limited[maxLines - 1], maxWidth);
      return limited;
    }
    return lines;
  }

  function drawWrappedText(ctx, lines, x, firstY, lineHeight) {
    lines.forEach((line, index) => {
      ctx.fillText(line, x, firstY + index * lineHeight);
    });
  }

  function computeTextLayout(rect, pos, metrics) {
    const pad = metrics.pad;
    const nameHalf = metrics.nameFS / 2;
    const moodHalf = metrics.moodFS / 2;
    const hexHalf = metrics.hexFS / 2;
    const gap1 = metrics.gap1;
    const gap2 = metrics.gap2;

    let textX;
    let textAlign = 'left';
    let line1Y, line2Y, line3Y;

    if (pos === 'bottom-left') {
      textX = rect.x + pad;
      line3Y = rect.y + rect.h - pad - hexHalf;
      line2Y = line3Y - hexHalf - gap2 - moodHalf;
      line1Y = line2Y - moodHalf - gap1 - nameHalf;
    } else if (pos === 'top-left') {
      textX = rect.x + pad;
      line1Y = rect.y + pad + nameHalf;
      line2Y = line1Y + nameHalf + gap1 + moodHalf;
      line3Y = line2Y + moodHalf + gap2 + hexHalf;
    } else if (pos === 'top-right') {
      textX = rect.x + rect.w - pad;
      textAlign = 'right';
      line1Y = rect.y + pad + nameHalf;
      line2Y = line1Y + nameHalf + gap1 + moodHalf;
      line3Y = line2Y + moodHalf + gap2 + hexHalf;
    } else if (pos === 'bottom-right') {
      textX = rect.x + rect.w - pad;
      textAlign = 'right';
      line3Y = rect.y + rect.h - pad - hexHalf;
      line2Y = line3Y - hexHalf - gap2 - moodHalf;
      line1Y = line2Y - moodHalf - gap1 - nameHalf;
    } else {
      textX = rect.x + rect.w / 2;
      textAlign = 'center';
      line2Y = rect.y + rect.h / 2;
      line1Y = line2Y - nameHalf - gap1 - moodHalf;
      line3Y = line2Y + moodHalf + gap2 + hexHalf;
    }

    return { textX, textAlign, line1Y, line2Y, line3Y };
  }

  function drawImageCover(ctx, image, bx, by, bw, bh, scale, offsetX, offsetY) {
    const mediaW = image.naturalWidth || image.videoWidth || image.width;
    const mediaH = image.naturalHeight || image.videoHeight || image.height;
    const imgRatio = mediaW / mediaH;
    const boxRatio = bw / bh;

    let coverW, coverH;
    if (imgRatio > boxRatio) {
      coverH = bh;
      coverW = bh * imgRatio;
    } else {
      coverW = bw;
      coverH = bw / imgRatio;
    }

    const drawW = coverW * scale;
    const drawH = coverH * scale;
    const drawX = bx + (bw - coverW) / 2 + offsetX - (drawW - coverW) / 2;
    const drawY = by + (bh - coverH) / 2 + offsetY - (drawH - coverH) / 2;

    ctx.drawImage(image, drawX, drawY, drawW, drawH);
  }

  /**
   * Render a full color card.
   * @param {CanvasRenderingContext2D} ctx
   * @param {object} image
   * @param {object} opts
   *   selectedColor: { hex }
   *   text: { name, mood, hex, textColor }
   *   ratio: { w, h } (from RATIOS)
   *   orientation: 'portrait' | 'landscape' | 'square'
   *   blockPos: 'top'|'bottom'|'left'|'right'|'tl'|'tr'|'bl'|'br'
   *   textPos: one of TEXT_POSITIONS (bands only)
    *   imgScale, imgOffsetX, imgOffsetY
    *   watermark: string
    *   watermarkFont: string (family)
    *   watermarkPos: 'left' | 'center' | 'right'
    *   border: boolean (frame around the photo in the color-block color)
    * @returns {object} { W, H, photoRegion, colorRegion }
   */
  function renderCard(ctx, image, opts) {
    const o = opts || {};
    const sel = o.selectedColor || { hex: '#808080' };
    const text = o.text || {};
    const ratio = o.ratio || RATIOS[0];
    const orientation = o.orientation || 'portrait';
    const imgScale = typeof o.imgScale === 'number' ? o.imgScale : 1;
    const imgOffsetX = o.imgOffsetX || 0;
    const imgOffsetY = o.imgOffsetY || 0;
    const watermark = o.watermark || '';
    const fontFamily = o.fontFamily || FONT_FAMILY;
    const watermarkFont = o.watermarkFont || fontFamily;
    const watermarkPos = o.watermarkPos || 'center';
    const border = !!o.border;

    const hex = text.hex || sel.hex;
    const name = text.name || hex;
    const mood = text.mood || '';
    const textColor = text.textColor || '#FFFFFF';

    const dims = computeDims(ratio, orientation);
    const W = dims.W;
    const H = dims.H;

    const regions = buildRegions(W, H, dims.orientation, o.blockPos || blockPositionsFor(dims.orientation)[0]);
    const textPos = regions.textPos || o.textPos || 'bottom-left';
    const metrics = regions.isDiagonal ? DIAG_METRICS : BAND_METRICS;

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, W, H);

    // Outer rounded clip
    ctx.save();
    roundRectPath(ctx, 0, 0, W, H, CORNER_R);
    ctx.clip();

    // Photo area
    ctx.save();
    regionPath(ctx, regions.photoRegion);
    ctx.clip();
    const pb = regions.photoRegion.bounds;
    drawImageCover(ctx, image, pb.x, pb.y, pb.w, pb.h, imgScale, imgOffsetX, imgOffsetY);
    ctx.restore();

    // Colored border hugging the photo edge (same color as the color block).
    // Stroked while clipped to the photo region, so only the inner half shows.
    // Card-corner vertices are rounded so the border matches the card's arc.
    if (border) {
      ctx.save();
      regionPath(ctx, regions.photoRegion);
      ctx.clip();
      roundedRegionPath(ctx, regions.photoRegion, W, H, CORNER_R);
      ctx.lineWidth = 32;
      ctx.lineJoin = 'round';
      ctx.strokeStyle = hex;
      ctx.stroke();
      ctx.restore();
    }

    // Color area
    ctx.save();
    regionPath(ctx, regions.colorRegion);
    ctx.clip();
    ctx.fillStyle = hex;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();

    // Text (clipped to color region)
    ctx.save();
    regionPath(ctx, regions.colorRegion);
    ctx.clip();

    const layout = computeTextLayout(regions.textRect, textPos, metrics);
    const nameMaxWidth = regions.textRect.w - metrics.pad * 2;

    ctx.globalAlpha = 0.9;
    ctx.fillStyle = textColor;
    ctx.font = '700 ' + metrics.nameFS + 'px ' + fontFamily;
    ctx.textAlign = layout.textAlign;
    ctx.textBaseline = 'middle';
    const nameLines = wrapText(ctx, name, nameMaxWidth, 3);

    let line2Y = layout.line2Y;
    let line3Y = layout.line3Y;

    if (textPos === 'top-left' || textPos === 'top-right') {
      line2Y =
        layout.line1Y + Math.max(0, nameLines.length - 1) * metrics.nameLH + metrics.nameFS / 2 + metrics.gap1 + metrics.moodFS / 2;
      line3Y = line2Y + metrics.moodFS / 2 + metrics.gap2 + metrics.hexFS / 2;
    }

    const nameFirstY =
      textPos === 'bottom-left' || textPos === 'bottom-right' || textPos === 'center'
        ? layout.line1Y - Math.max(0, nameLines.length - 1) * metrics.nameLH
        : layout.line1Y;

    drawWrappedText(ctx, nameLines, layout.textX, nameFirstY, metrics.nameLH);

    if (mood) {
      ctx.globalAlpha = 0.5;
      ctx.font = '400 ' + metrics.moodFS + 'px ' + fontFamily;
      ctx.fillText(mood, layout.textX, line2Y);
    }

    // When there is no mood/date line, pull the hex up into that slot so we
    // don't leave an empty line between the name and the hex.
    const hexY = mood ? line3Y : line2Y;
    ctx.globalAlpha = 0.5;
    ctx.font = '500 ' + metrics.hexFS + 'px ' + HEX_FONT_FAMILY;
    ctx.fillText(hex, layout.textX, hexY);

    // Watermark (clipped to the color block, positioned on its edge)
    if (watermark) {
      const wm = regions.wm;
      const wmFontSize = 22;
      const wmPad = 40;
      const wmY = wm.edge === 'top' ? wm.y + wmPad + wmFontSize : wm.y - wmPad;
      let wmX;
      let wmAlign;
      if (watermarkPos === 'left') {
        wmX = wm.left + wmPad;
        wmAlign = 'left';
      } else if (watermarkPos === 'right') {
        wmX = wm.right - wmPad;
        wmAlign = 'right';
      } else {
        wmX = (wm.left + wm.right) / 2;
        wmAlign = 'center';
      }

      ctx.save();
      regionPath(ctx, regions.colorRegion);
      ctx.clip();
      ctx.globalAlpha = 0.15;
      ctx.fillStyle = '#ffffff';
      ctx.font = '500 ' + wmFontSize + 'px ' + watermarkFont;
      ctx.textAlign = wmAlign;
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(watermark, wmX, wmY);
      ctx.restore();
    }

    ctx.globalAlpha = 1;
    ctx.restore();
    ctx.restore();

    return { W, H, photoRegion: regions.photoRegion, colorRegion: regions.colorRegion };
  }

  return {
    RATIOS,
    TEXT_POSITIONS,
    FONTS,
    CJK_FONTS,
    computeDims,
    blockPositionsFor,
    renderCard,
  };
});
