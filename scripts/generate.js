/* ===== PhotoColor Local - Offline export runner =====
   Generates color cards from `demopic/` into `output/`.
   Also renders a `_layouts.png` grid showing every layout combination
   (ratios x orientation x block position) for the first image.
   Run:  npm run generate   (or)   node scripts/generate.js
*/
const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');

const Extraction = require('../src/colorExtraction.js');
const Naming = require('../src/colorNaming.js');
const Renderer = require('../src/renderer.js');

const DEMO_DIR = path.resolve(__dirname, '..', 'demopic');
const OUT_DIR = path.resolve(__dirname, '..', 'output');

const IMAGE_RE = /\.(jpe?g|png|webp|avif|gif|bmp|heic|heif)$/i;

function registerFonts() {
  const fonts = {
    'Segoe UI': ['segoeui.ttf', 'segoeuib.ttf'],
    'Arial': ['arial.ttf', 'arialbd.ttf'],
    'Georgia': ['georgia.ttf', 'georgiab.ttf'],
    'Times New Roman': ['times.ttf', 'timesbd.ttf'],
    'Consolas': ['consola.ttf', 'consolab.ttf'],
    'Comic Sans MS': ['comic.ttf', 'comicbd.ttf'],
    'Lucida Sans Typewriter': ['LTYPE.TTF'],
    'Lucida Handwriting': ['LHANDW.TTF'],
    'Lucida Calligraphy': ['LCALLIG.TTF'],
  };
  let registered = 0;
  for (const family of Object.keys(fonts)) {
    for (const file of fonts[family]) {
      const full = 'C:/Windows/Fonts/' + file;
      try {
        if (fs.existsSync(full)) {
          GlobalFonts.registerFromPath(full, family);
          registered++;
        }
      } catch (e) {
        console.warn('  ! font register failed:', file, e.message);
      }
    }
  }
  return registered;
}

function extractPalette(img) {
  const maxSize = 640;
  const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));

  const off = createCanvas(w, h);
  const offCtx = off.getContext('2d');
  offCtx.drawImage(img, 0, 0, w, h);

  const data = offCtx.getImageData(0, 0, w, h).data;
  const pixels = Extraction.samplePixels(data, w, h, { maxPixels: 60000 });
  return Extraction.extractColors(pixels, {
    count: 6,
    similarThreshold: 34,
    sort: 'family',
  });
}

function describe(hex) {
  return Naming.describeColor(hex);
}

function renderCardCanvas(img, colors, opts) {
  const o = opts || {};
  const sel = colors[o.selIdx || 0] || colors[0];
  const desc = describe(sel.hex);
  const dims = Renderer.computeDims(o.ratio || { w: 4, h: 5 }, o.orientation || 'portrait');
  const canvas = createCanvas(dims.W, dims.H);
  const ctx = canvas.getContext('2d');
  Renderer.renderCard(ctx, img, {
    selectedColor: sel,
    text: {
      name: desc.displayName,
      mood: desc.moodTags.join(' · '),
      hex: sel.hex,
      textColor: desc.textColor,
    },
    ratio: o.ratio || { w: 4, h: 5 },
    orientation: o.orientation || 'portrait',
    blockPos: o.blockPos || 'bottom',
    textPos: o.textPos || 'bottom-left',
    fontFamily: o.fontFamily,
    watermark: 'ColorCard.local',
  });
  return canvas;
}

function renderCardPng(img, colors, opts) {
  return renderCardCanvas(img, colors, opts).toBuffer('image/png');
}

// ---- Palette contact sheet (thumbnail + swatches + names) ----
function buildPaletteSheet(entries, sheetW) {
  const rowH = 220;
  const pad = 24;
  const thumbW = 220;
  const swatchW = 150;
  const swatchH = 120;
  const swatchGap = 16;

  const sheetH = pad * 2 + entries.length * rowH;
  const sheet = createCanvas(sheetW, sheetH);
  const ctx = sheet.getContext('2d');

  ctx.fillStyle = '#12141a';
  ctx.fillRect(0, 0, sheetW, sheetH);

  entries.forEach((entry, rowIdx) => {
    const y0 = pad + rowIdx * rowH;
    const rowY = y0 + rowH / 2;

    ctx.fillStyle = '#9aa0ad';
    ctx.font = '600 16px "Segoe UI"';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillText(entry.file, pad, y0 + 18);

    const thumb = entry.thumb;
    const tw = thumbW;
    const th = thumbW * (thumb.height / thumb.width);
    const ty = rowY - th / 2;
    ctx.save();
    ctx.beginPath();
    ctx.rect(pad, ty, tw, th);
    ctx.clip();
    ctx.drawImage(thumb, pad, ty, tw, th);
    ctx.restore();

    let x = pad + thumbW + 24;
    entry.colors.forEach((color) => {
      ctx.fillStyle = color.hex;
      const swY = rowY - swatchH / 2;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x, swY, swatchW, swatchH, 10);
      else ctx.rect(x, swY, swatchW, swatchH);
      ctx.fill();

      ctx.fillStyle = '#eef0f4';
      ctx.font = '400 14px "Consolas", "Segoe UI"';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(color.hex, x + 6, swY + swatchH + 18);

      x += swatchW + swatchGap;
    });

    ctx.fillStyle = '#eef0f4';
    ctx.font = '700 20px "Segoe UI"';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(describe(entry.colors[0].hex).displayName, x + 8, rowY);
  });

  return sheet.toBuffer('image/png');
}

// ---- Layout demo grid ----
function buildLayoutsGrid(img, colors) {
  const layouts = [
    { name: '4:5 · 下', ratio: { w: 4, h: 5 }, orientation: 'portrait', blockPos: 'bottom' },
    { name: '4:5 · 上', ratio: { w: 4, h: 5 }, orientation: 'portrait', blockPos: 'top' },
    { name: '4:5 · 左', ratio: { w: 4, h: 5 }, orientation: 'landscape', blockPos: 'left' },
    { name: '4:5 · 右', ratio: { w: 4, h: 5 }, orientation: 'landscape', blockPos: 'right' },
    { name: '2:3 · 下', ratio: { w: 2, h: 3 }, orientation: 'portrait', blockPos: 'bottom' },
    { name: '3:4 · 下', ratio: { w: 3, h: 4 }, orientation: 'portrait', blockPos: 'bottom' },
    { name: '9:16 · 下', ratio: { w: 9, h: 16 }, orientation: 'portrait', blockPos: 'bottom' },
    { name: '1:1 · 左上', ratio: { w: 1, h: 1 }, orientation: 'square', blockPos: 'tl' },
    { name: '1:1 · 右上', ratio: { w: 1, h: 1 }, orientation: 'square', blockPos: 'tr' },
    { name: '1:1 · 左下', ratio: { w: 1, h: 1 }, orientation: 'square', blockPos: 'bl' },
    { name: '1:1 · 右下', ratio: { w: 1, h: 1 }, orientation: 'square', blockPos: 'br' },
  ];

  const cellH = 460;
  const labelH = 30;
  const gap = 20;
  const pad = 24;

  const cells = layouts.map((l) => {
    const dims = Renderer.computeDims(l.ratio, l.orientation);
    const cw = Math.round((cellH * dims.W) / dims.H);
    const cv = renderCardCanvas(img, colors, l);
    return { ...l, cw, canvas: cv };
  });

  const sheetW = pad * 2 + cells.reduce((s, c) => s + c.cw, 0) + gap * (cells.length - 1);
  const sheetH = pad * 2 + cellH + labelH + gap;
  const sheet = createCanvas(sheetW, sheetH);
  const ctx = sheet.getContext('2d');

  ctx.fillStyle = '#12141a';
  ctx.fillRect(0, 0, sheetW, sheetH);

  let x = pad;
  cells.forEach((c) => {
    ctx.drawImage(c.canvas, x, pad, c.cw, cellH);
    ctx.fillStyle = '#9aa0ad';
    ctx.font = '400 18px "Segoe UI"';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(c.name, x + c.cw / 2, pad + cellH + labelH / 2);
    x += c.cw + gap;
  });

  return sheet.toBuffer('image/png');
}

// ---- Font demo grid ----
function buildFontsGrid(img, colors) {
  const cellH = 460;
  const labelH = 30;
  const gap = 20;
  const pad = 24;
  const ratio = { w: 4, h: 5 };
  const dims = Renderer.computeDims(ratio, 'portrait');
  const cw = Math.round((cellH * dims.W) / dims.H);

  const cells = Renderer.FONTS.map((f) => ({
    name: f.label,
    canvas: renderCardCanvas(img, colors, { ratio, orientation: 'portrait', blockPos: 'bottom', fontFamily: f.family }),
  }));

  const sheetW = pad * 2 + cells.reduce((s) => s + cw, 0) + gap * (cells.length - 1);
  const sheetH = pad * 2 + cellH + labelH;
  const sheet = createCanvas(sheetW, sheetH);
  const ctx = sheet.getContext('2d');

  ctx.fillStyle = '#12141a';
  ctx.fillRect(0, 0, sheetW, sheetH);

  let x = pad;
  cells.forEach((c) => {
    ctx.drawImage(c.canvas, x, pad, cw, cellH);
    ctx.fillStyle = '#9aa0ad';
    ctx.font = '400 18px "Segoe UI"';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(c.name, x + cw / 2, pad + cellH + labelH / 2);
    x += cw + gap;
  });

  return sheet.toBuffer('image/png');
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const registered = registerFonts();
  console.log(`fonts registered: ${registered}`);

  const files = fs.readdirSync(DEMO_DIR).filter((f) => IMAGE_RE.test(f)).sort();
  if (!files.length) {
    console.error('No images found in ' + DEMO_DIR);
    process.exit(1);
  }

  console.log(`found ${files.length} images in demopic/`);

  const entries = [];
  let firstImg = null;
  let firstColors = null;

  for (const file of files) {
    const full = path.join(DEMO_DIR, file);
    const img = await loadImage(full);
    const colors = extractPalette(img);

    console.log('\n== ' + file + ' (' + img.width + 'x' + img.height + ') ==');
    colors.forEach((c, i) => {
      const d = describe(c.hex);
      console.log(
        `  [${i}] ${c.hex}  ${d.displayName.padEnd(22)} ${d.moodTags.join(', ').padEnd(34)} weight=${(c.weight * 100).toFixed(1)}%`
      );
    });

    const base = path.basename(file, path.extname(file));
    const cardPng = renderCardPng(img, colors, { ratio: { w: 4, h: 5 }, orientation: 'portrait', blockPos: 'bottom' });
    fs.writeFileSync(path.join(OUT_DIR, base + '.png'), cardPng);
    console.log('  -> output/' + base + '.png (4:5 portrait, bottom)');

    entries.push({ file, thumb: img, colors });
    if (!firstImg) {
      firstImg = img;
      firstColors = colors;
    }
  }

  // Palette overview
  const sheet = buildPaletteSheet(entries, 1700);
  fs.writeFileSync(path.join(OUT_DIR, '_palettes.png'), sheet);
  console.log('\n-> output/_palettes.png (palette overview)');

  // Layout grid for the first image
  const grid = buildLayoutsGrid(firstImg, firstColors);
  fs.writeFileSync(path.join(OUT_DIR, '_layouts.png'), grid);
  console.log('-> output/_layouts.png (layout combinations)');

  // Font demo grid for the first image
  const fonts = buildFontsGrid(firstImg, firstColors);
  fs.writeFileSync(path.join(OUT_DIR, '_fonts.png'), fonts);
  console.log('-> output/_fonts.png (font samples)');

  console.log('\nDone. Cards written to ' + OUT_DIR);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
