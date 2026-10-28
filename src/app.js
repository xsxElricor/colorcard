/* ===== ColorCard - Browser UI ===== */
(function () {
  'use strict';

  const Naming = window.ColorCardNaming;
  const Extraction = window.ColorCardExtraction;
  const Renderer = window.ColorCardRenderer;
  const I18n = window.ColorCardI18n;

  const RATIOS = Renderer.RATIOS;
  const TEXT_POSITIONS = Renderer.TEXT_POSITIONS;

  function t(key) {
    return I18n.t(key);
  }
  function blockLabel(p) {
    return t('pos.' + p);
  }
  function textPosLabel(p) {
    return t('tpos.' + p);
  }
  function wmPosLabel(p) {
    return t('wm.' + p);
  }

  // ---- State ----
  let locale = I18n.getLocale();
  let currentImage = null;
  let currentSample = null;
  let currentColors = [];
  let selectedIdx = 0;
  let ratioIdx = 3; // 4:5 default
  let orientation = 'portrait'; // 'portrait' | 'landscape'
  let blockPos = 'bottom';
  let textPosIdx = 0;
  let fontIdx = 0;
  let cjkIdx = 0; // Chinese font (CJK fallback)
  let watermarkText = 'ColorCard.local';
  let wmEnabled = true;
  let wmFontIdx = 0;
  let wmPos = 'center'; // 'left' | 'center' | 'right'
  let showMood = true;
  let showDate = false;
  let useToday = true;
  let customMood = '';
  let borderOn = false;
  let eyedropperOn = false;
  let imgScale = 1;
  let imgOffsetX = 0;
  let imgOffsetY = 0;
  let currentPhotoRegion = null;
  const customNames = {};

  // ---- DOM ----
  const dropzone = document.getElementById('dropzone');
  const home = document.getElementById('home');
  const fileInput = document.getElementById('fileInput');
  const processing = document.getElementById('processing');
  const editor = document.getElementById('editor');
  const canvas = document.getElementById('cardCanvas');
  const canvasWrap = document.getElementById('canvasWrap');
  const swatches = document.getElementById('swatches');
  const nameInput = document.getElementById('nameInput');
  const fontSelect = document.getElementById('fontSelect');
  const cjkSelect = document.getElementById('cjkSelect');
  const watermarkInput = document.getElementById('watermarkInput');
  const wmToggle = document.getElementById('wmToggle');
  const wmFontSelect = document.getElementById('wmFontSelect');
  const wmPosBtns = document.getElementById('wmPosBtns');
  const infoMood = document.getElementById('infoMood');
  const infoHex = document.getElementById('infoHex');
  const ratioBtns = document.getElementById('ratioBtns');
  const orientBtns = document.getElementById('orientBtns');
  const blockPosWrap = document.getElementById('blockPosWrap');
  const blockPosBtns = document.getElementById('blockPosBtns');
  const textPosBtn = document.getElementById('btnTextPos');
  const btnDownload = document.getElementById('btnDownload');
  const btnNew = document.getElementById('btnNew');
  const btnEyedropper = document.getElementById('btnEyedropper');
  const hexInput = document.getElementById('hexInput');
  const moodToggle = document.getElementById('moodToggle');
  const dateToggle = document.getElementById('dateToggle');
  const dateTodayToggle = document.getElementById('dateTodayToggle');
  const dateManual = document.getElementById('dateManual');
  const dateY = document.getElementById('dateY');
  const dateM = document.getElementById('dateM');
  const dateD = document.getElementById('dateD');
  const moodTextInput = document.getElementById('moodTextInput');
  const borderToggle = document.getElementById('borderToggle');
  const langSwitch = document.getElementById('langSwitch');
  const toast = document.getElementById('toast');

  // ---- Helpers ----
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toast.classList.remove('show'), 2000);
  }
  function show(el) {
    el.classList.remove('hidden');
  }
  function hide(el) {
    el.classList.add('hidden');
  }
  function selectedColor() {
    return currentColors[selectedIdx] || currentColors[0];
  }
  function currentRatio() {
    return RATIOS[ratioIdx];
  }
  function currentOrientation() {
    return currentRatio().w === currentRatio().h ? 'square' : orientation;
  }

  // ---- Image loading ----
  function loadImage(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error(t('toast.readFail')));
      };
      img.src = url;
    });
  }

  function buildSample(img) {
    const maxSize = 640;
    const scale = Math.min(maxSize / img.naturalWidth, maxSize / img.naturalHeight, 1);
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));

    const off = document.createElement('canvas');
    off.width = w;
    off.height = h;
    const offCtx = off.getContext('2d', { willReadFrequently: true });
    offCtx.drawImage(img, 0, 0, w, h);

    const data = offCtx.getImageData(0, 0, w, h).data;
    const pixels = Extraction.samplePixels(data, w, h, { maxPixels: 60000 });
    const colors = Extraction.extractColors(pixels, {
      count: 6,
      similarThreshold: 34,
      sort: 'family',
    });
    return { colors, sample: { canvas: off, ctx: offCtx, w, h } };
  }

  // ---- Rendering ----
  function pad2(n) {
    return String(n).padStart(2, '0');
  }

  function formatDate() {
    if (useToday) {
      const d = new Date();
      return d.getFullYear() + '.' + pad2(d.getMonth() + 1) + '.' + pad2(d.getDate());
    }
    const y = String(dateY.value).replace(/\D/g, '').slice(0, 4);
    const m = String(dateM.value).replace(/\D/g, '').slice(0, 2);
    const dd = String(dateD.value).replace(/\D/g, '').slice(0, 2);
    if (!y || !m || !dd) return '';
    let mi = parseInt(m, 10);
    let di = parseInt(dd, 10);
    if (mi < 1) mi = 1;
    if (mi > 12) mi = 12;
    if (di < 1) di = 1;
    if (di > 31) di = 31;
    return y + '.' + pad2(mi) + '.' + pad2(di);
  }

  function customMoodText() {
    const raw = customMood.trim();
    if (!raw) return '';
    return raw.split(/[\s,，、]+/).filter(Boolean).slice(0, 3).join(' · ');
  }

  function effectiveMood(desc) {
    const c = customMoodText();
    if (c) return c;
    return (desc.moodTags || []).join(' · ');
  }

  function buildMeta(desc) {
    const parts = [];
    if (showMood) {
      const mood = effectiveMood(desc);
      if (mood) parts.push(mood);
    }
    if (showDate) {
      const d = formatDate();
      if (d) parts.push(d);
    }
    return parts.join(' · ');
  }

  function renderCard() {
    if (!currentImage) return;
    const color = selectedColor();
    if (!color) return;
    const desc = Naming.describeColor(color.hex, locale);
    const name = customNames[color.hex] || desc.displayName;
    const ctx = canvas.getContext('2d');

    const dims = Renderer.computeDims(currentRatio(), currentOrientation());
    if (canvas.width !== dims.W) canvas.width = dims.W;
    if (canvas.height !== dims.H) canvas.height = dims.H;

    const result = Renderer.renderCard(ctx, currentImage, {
      selectedColor: color,
      text: {
        name,
        mood: buildMeta(desc),
        hex: color.hex,
        textColor: desc.textColor,
      },
      ratio: currentRatio(),
      orientation: currentOrientation(),
      blockPos,
      textPos: TEXT_POSITIONS[textPosIdx],
      fontFamily: Renderer.FONTS[fontIdx].family + ', ' + Renderer.CJK_FONTS[cjkIdx].family,
      imgScale,
      imgOffsetX,
      imgOffsetY,
      watermark: wmEnabled ? watermarkText : '',
      watermarkFont: Renderer.FONTS[wmFontIdx].family + ', ' + Renderer.CJK_FONTS[cjkIdx].family,
      watermarkPos: wmPos,
      border: borderOn,
    });

    currentPhotoRegion = result.photoRegion;
    updateInfo(color, desc, name);
    updateSwatches();
    if (document.activeElement !== nameInput) nameInput.value = name;
  }

  function updateInfo(color, desc, name) {
    infoMood.textContent = effectiveMood(desc);
    infoHex.textContent = color.hex;
  }

  function updateSwatches() {
    swatches.innerHTML = '';
    currentColors.forEach((color, i) => {
      const dot = document.createElement('button');
      dot.className = 'swatch' + (i === selectedIdx ? ' selected' : '');
      dot.style.background = color.hex;
      dot.title = Naming.describeColor(color.hex, locale).displayName;
      dot.addEventListener('click', () => {
        selectedIdx = i;
        renderCard();
      });
      swatches.appendChild(dot);
    });
  }

  // Add a color (from eyedropper / manual hex) to the palette and select it.
  function addColor(hex) {
    const norm = Naming.normalizeHex(hex);
    if (!norm) return false;
    const existing = currentColors.findIndex((c) => c.hex === norm);
    if (existing >= 0) {
      selectedIdx = existing;
      renderCard();
      return true;
    }
    currentColors.unshift({ hex: norm, weight: 0 });
    selectedIdx = 0;
    renderCard();
    return true;
  }

  // Sample the photo color at a card-space point (accounts for cover + pan/zoom).
  function sampleColorAt(cx, cy) {
    if (!currentImage || !currentSample || !currentPhotoRegion) return null;
    const pb = currentPhotoRegion.bounds;
    const mediaW = currentImage.naturalWidth;
    const mediaH = currentImage.naturalHeight;
    const imgRatio = mediaW / mediaH;
    const boxRatio = pb.w / pb.h;
    let coverW, coverH;
    if (imgRatio > boxRatio) {
      coverH = pb.h;
      coverW = pb.h * imgRatio;
    } else {
      coverW = pb.w;
      coverH = pb.w / imgRatio;
    }
    const drawW = coverW * imgScale;
    const drawH = coverH * imgScale;
    const drawX = pb.x + (pb.w - coverW) / 2 + imgOffsetX - (drawW - coverW) / 2;
    const drawY = pb.y + (pb.h - coverH) / 2 + imgOffsetY - (drawH - coverH) / 2;
    const u = (cx - drawX) / drawW;
    const v = (cy - drawY) / drawH;
    if (u < 0 || u > 1 || v < 0 || v > 1) return null;
    const sx = Math.min(currentSample.w - 1, Math.max(0, Math.round(u * currentSample.w)));
    const sy = Math.min(currentSample.h - 1, Math.max(0, Math.round(v * currentSample.h)));
    const d = currentSample.ctx.getImageData(sx, sy, 1, 1).data;
    return Extraction.rgbToHex(d[0], d[1], d[2]);
  }

  function setEyedropper(on) {
    eyedropperOn = on;
    btnEyedropper.classList.toggle('active', on);
    if (on) showToast(t('toast.eyedropperOn'));
  }

  // ---- Layout controls UI ----
  function updateRatioButtons() {
    Array.from(ratioBtns.children).forEach((b, i) => {
      b.classList.toggle('active', i === ratioIdx);
    });
  }

  function buildRatioButtons() {
    ratioBtns.innerHTML = '';
    RATIOS.forEach((ratio, i) => {
      const b = document.createElement('button');
      b.className = 'seg';
      b.textContent = ratio.id;
      b.addEventListener('click', () => {
        ratioIdx = i;
        if (currentRatio().w === currentRatio().h) {
          blockPos = 'tl';
        } else {
          blockPos = orientation === 'landscape' ? 'left' : 'bottom';
        }
        applyLayout();
      });
      ratioBtns.appendChild(b);
    });
    updateRatioButtons();
  }

  function buildOrientationButtons() {
    orientBtns.innerHTML = '';
    const opts = [
      { id: 'portrait', label: t('orient.portrait') },
      { id: 'landscape', label: t('orient.landscape') },
    ];
    opts.forEach((o) => {
      const b = document.createElement('button');
      b.className = 'seg' + (orientation === o.id ? ' active' : '');
      b.textContent = o.label;
      b.disabled = currentRatio().w === currentRatio().h;
      b.addEventListener('click', () => {
        orientation = o.id;
        blockPos = o.id === 'landscape' ? 'left' : 'bottom';
        applyLayout();
      });
      orientBtns.appendChild(b);
    });
  }

  function buildBlockButtons() {
    blockPosBtns.innerHTML = '';
    const positions = Renderer.blockPositionsFor(currentOrientation());
    if (!positions.includes(blockPos)) blockPos = positions[0];
    positions.forEach((p) => {
      const b = document.createElement('button');
      b.className = 'seg' + (blockPos === p ? ' active' : '');
      b.textContent = blockLabel(p);
      b.addEventListener('click', () => {
        blockPos = p;
        applyLayout();
      });
      blockPosBtns.appendChild(b);
    });
    // text position is only meaningful for band layouts
    blockPosWrap.classList.toggle('hidden', currentOrientation() === 'square');
  }

  function updateTextPosButton() {
    const square = currentOrientation() === 'square';
    textPosBtn.classList.toggle('hidden', square);
    if (!square) {
      textPosBtn.textContent = t('label.textPos') + ' · ' + textPosLabel(TEXT_POSITIONS[textPosIdx]);
    }
  }

  function populateSelect(select, list, selectedIdx) {
    select.innerHTML = '';
    list.forEach((font, i) => {
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = locale === 'en' ? font.labelEn || font.label : font.label;
      opt.style.fontFamily = font.family;
      select.appendChild(opt);
    });
    select.value = selectedIdx;
    select.style.fontFamily = list[selectedIdx].family;
  }

  function buildFontOptions() {
    populateSelect(fontSelect, Renderer.FONTS, fontIdx);
  }

  function buildCjkOptions() {
    populateSelect(cjkSelect, Renderer.CJK_FONTS, cjkIdx);
  }

  function buildWmFontOptions() {
    populateSelect(wmFontSelect, Renderer.FONTS, wmFontIdx);
  }

  const WM_POSITIONS = ['left', 'center', 'right'];

  function buildWmPosButtons() {
    wmPosBtns.innerHTML = '';
    WM_POSITIONS.forEach((p) => {
      const b = document.createElement('button');
      b.className = 'seg' + (wmPos === p ? ' active' : '');
      b.textContent = wmPosLabel(p);
      b.addEventListener('click', () => {
        wmPos = p;
        buildWmPosButtons();
        renderCard();
      });
      wmPosBtns.appendChild(b);
    });
  }

  function updateWmControls() {
    const disabled = !wmEnabled;
    watermarkInput.disabled = disabled;
    wmFontSelect.disabled = disabled;
    wmPosBtns.classList.toggle('disabled', disabled);
    wmPosBtns.querySelectorAll('button').forEach((b) => {
      b.disabled = disabled;
    });
  }

  function updateDateManual() {
    if (!dateManual) return;
    dateY.disabled = useToday;
    dateM.disabled = useToday;
    dateD.disabled = useToday;
    dateManual.classList.toggle('disabled', useToday);
  }

  function applyLayout() {
    imgScale = 1;
    imgOffsetX = 0;
    imgOffsetY = 0;
    updateRatioButtons();
    buildOrientationButtons();
    buildBlockButtons();
    updateTextPosButton();
    renderCard();
    requestAnimationFrame(() => requestAnimationFrame(fitCanvas));
  }

  function applyLocale() {
    I18n.setLocale(locale);
    I18n.apply();
    document.documentElement.lang = locale === 'en' ? 'en' : 'zh-CN';
    if (langSwitch) {
      langSwitch.querySelectorAll('[data-locale]').forEach((b) => {
        b.classList.toggle('active', b.getAttribute('data-locale') === locale);
      });
    }
    buildOrientationButtons();
    buildBlockButtons();
    updateTextPosButton();
    buildFontOptions();
    buildCjkOptions();
    buildWmFontOptions();
    buildWmPosButtons();
    updateWmControls();
    if (currentImage) renderCard();
    try {
      localStorage.setItem('colorcard_locale', locale);
    } catch (e) {
      /* ignore */
    }
  }

  function fitCanvas() {
    const area = document.querySelector('.preview-area');
    const aw = area.clientWidth;
    const ah = area.clientHeight;
    if (!aw || !ah) return;
    const dims = Renderer.computeDims(currentRatio(), currentOrientation());
    const cardRatio = dims.W / dims.H;
    let w = aw;
    let h = aw / cardRatio;
    if (h > ah) {
      h = ah;
      w = ah * cardRatio;
    }
    canvasWrap.style.width = Math.floor(w) + 'px';
    canvasWrap.style.height = Math.floor(h) + 'px';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
  }

  // ---- Text editing ----
  nameInput.addEventListener('input', () => {
    const color = selectedColor();
    if (color) {
      customNames[color.hex] = nameInput.value;
      renderCard();
    }
  });

  watermarkInput.addEventListener('input', () => {
    watermarkText = watermarkInput.value;
    renderCard();
  });

  wmToggle.addEventListener('change', () => {
    wmEnabled = wmToggle.checked;
    updateWmControls();
    renderCard();
  });

  // ---- Hit testing / coordinates ----
  function screenToCanvas(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height),
    };
  }

  function pointInPolygon(px, py, pts) {
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const xi = pts[i][0];
      const yi = pts[i][1];
      const xj = pts[j][0];
      const yj = pts[j][1];
      const intersect = ((yi > py) !== (yj > py)) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  }

  function pointInRegion(region, x, y) {
    if (!region) return false;
    if (region.pts) return pointInPolygon(x, y, region.pts);
    return x >= region.x && x <= region.x + region.w && y >= region.y && y <= region.y + region.h;
  }

  // ---- Pan / zoom ----
  function clampOffset() {
    if (!currentImage || !currentPhotoRegion) return;
    const pb = currentPhotoRegion.bounds;
    const w = pb.w;
    const h = pb.h;
    const imgRatio = currentImage.naturalWidth / currentImage.naturalHeight;
    const boxRatio = w / h;
    let coverW, coverH;
    if (imgRatio > boxRatio) {
      coverH = h;
      coverW = h * imgRatio;
    } else {
      coverW = w;
      coverH = w / imgRatio;
    }
    const drawW = coverW * imgScale;
    const drawH = coverH * imgScale;
    const overflowX = (drawW - w) / 2;
    const overflowY = (drawH - h) / 2;
    const maxX = Math.max(0, overflowX);
    const maxY = Math.max(0, overflowY);
    imgOffsetX = Math.max(-maxX, Math.min(maxX, imgOffsetX));
    imgOffsetY = Math.max(-maxY, Math.min(maxY, imgOffsetY));

    const minScaleX = w / coverW;
    const minScaleY = h / coverH;
    const minScale = Math.max(minScaleX, minScaleY);
    if (imgScale < minScale) imgScale = minScale;
  }

  let dragging = false;
  let lastX = 0;
  let lastY = 0;

  canvas.addEventListener('mousedown', (e) => {
    if (!currentImage) return;
    const pt = screenToCanvas(e.clientX, e.clientY);
    if (!pointInRegion(currentPhotoRegion, pt.x, pt.y)) return;
    if (eyedropperOn) {
      e.preventDefault();
      const hex = sampleColorAt(pt.x, pt.y);
      if (hex) {
        addColor(hex);
        setEyedropper(false);
      }
      return;
    }
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    e.preventDefault();
  });

  window.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    const rect = canvas.getBoundingClientRect();
    imgOffsetX += dx * (canvas.width / rect.width);
    imgOffsetY += dy * (canvas.height / rect.height);
    clampOffset();
    renderCard();
  });

  window.addEventListener('mouseup', () => {
    dragging = false;
  });

  canvas.addEventListener('wheel', (e) => {
    if (!currentImage) return;
    const pt = screenToCanvas(e.clientX, e.clientY);
    if (!pointInRegion(currentPhotoRegion, pt.x, pt.y)) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.95 : 1.05;
    imgScale *= delta;
    clampOffset();
    renderCard();
  }, { passive: false });

  // Touch
  let touches = [];
  let lastTouchDist = 0;
  let lastTouchMidX = 0;
  let lastTouchMidY = 0;
  let touchDragging = false;

  canvas.addEventListener('touchstart', (e) => {
    if (!currentImage) return;
    const tch = e.touches[0];
    const pt = screenToCanvas(tch.clientX, tch.clientY);
    if (!pointInRegion(currentPhotoRegion, pt.x, pt.y)) return;
    if (eyedropperOn) {
      e.preventDefault();
      const hex = sampleColorAt(pt.x, pt.y);
      if (hex) {
        addColor(hex);
        setEyedropper(false);
      }
      return;
    }
    touchDragging = true;
    touches = Array.from(e.touches);
    if (touches.length === 2) {
      const dx = touches[1].clientX - touches[0].clientX;
      const dy = touches[1].clientY - touches[0].clientY;
      lastTouchDist = Math.sqrt(dx * dx + dy * dy);
      lastTouchMidX = (touches[0].clientX + touches[1].clientX) / 2;
      lastTouchMidY = (touches[0].clientY + touches[1].clientY) / 2;
    } else {
      lastX = tch.clientX;
      lastY = tch.clientY;
    }
    e.preventDefault();
  }, { passive: false });

  canvas.addEventListener('touchmove', (e) => {
    if (!touchDragging || !currentImage) return;
    e.preventDefault();
    const curTouches = Array.from(e.touches);
    if (curTouches.length === 2 && touches.length >= 2) {
      const dx = curTouches[1].clientX - curTouches[0].clientX;
      const dy = curTouches[1].clientY - curTouches[0].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (lastTouchDist > 0) imgScale *= dist / lastTouchDist;
      const midX = (curTouches[0].clientX + curTouches[1].clientX) / 2;
      const midY = (curTouches[0].clientY + curTouches[1].clientY) / 2;
      const rect = canvas.getBoundingClientRect();
      imgOffsetX += (midX - lastTouchMidX) * (canvas.width / rect.width);
      imgOffsetY += (midY - lastTouchMidY) * (canvas.height / rect.height);
      lastTouchDist = dist;
      lastTouchMidX = midX;
      lastTouchMidY = midY;
    } else if (curTouches.length === 1) {
      const tch = curTouches[0];
      const dx = tch.clientX - lastX;
      const dy = tch.clientY - lastY;
      lastX = tch.clientX;
      lastY = tch.clientY;
      const rect = canvas.getBoundingClientRect();
      imgOffsetX += dx * (canvas.width / rect.width);
      imgOffsetY += dy * (canvas.height / rect.height);
    }
    clampOffset();
    renderCard();
    touches = curTouches;
  }, { passive: false });

  canvas.addEventListener('touchend', () => {
    touchDragging = false;
    touches = [];
  });

  // ---- Main flow ----
  async function handleFile(file) {
    if (!file) return;
    show(processing);
    hide(home);
    hide(editor);

    try {
      const img = await loadImage(file);
      currentImage = img;
      imgOffsetX = 0;
      imgOffsetY = 0;
      imgScale = 1;
      selectedIdx = 0;
      setEyedropper(false);
      const built = buildSample(img);
      currentColors = built.colors;
      currentSample = built.sample;

      if (!currentColors || !currentColors.length) {
        throw new Error('未能提取到配色。');
      }

      hide(processing);
      show(editor);
      applyLayout();
      requestAnimationFrame(() => requestAnimationFrame(fitCanvas));
    } catch (err) {
      hide(processing);
      show(home);
      showToast(err.message || t('toast.processFail'));
      console.error(err);
    }
  }

  function resetToDropzone() {
    currentImage = null;
    currentSample = null;
    currentColors = [];
    setEyedropper(false);
    hide(editor);
    hide(processing);
    show(home);
    fileInput.value = '';
  }

  // ---- Events ----
  dropzone.addEventListener('click', (e) => {
    if (e.target === fileInput) return; // avoid recursion from the synthetic click
    fileInput.click();
  });
  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length) handleFile(e.target.files[0]);
  });

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) handleFile(file);
  });

  textPosBtn.addEventListener('click', () => {
    textPosIdx = (textPosIdx + 1) % TEXT_POSITIONS.length;
    updateTextPosButton();
    renderCard();
  });

  fontSelect.addEventListener('change', () => {
    fontIdx = parseInt(fontSelect.value, 10);
    fontSelect.style.fontFamily = Renderer.FONTS[fontIdx].family;
    renderCard();
  });

  cjkSelect.addEventListener('change', () => {
    cjkIdx = parseInt(cjkSelect.value, 10);
    cjkSelect.style.fontFamily = Renderer.CJK_FONTS[cjkIdx].family;
    renderCard();
  });

  wmFontSelect.addEventListener('change', () => {
    wmFontIdx = parseInt(wmFontSelect.value, 10);
    wmFontSelect.style.fontFamily = Renderer.FONTS[wmFontIdx].family;
    renderCard();
  });

  // Eyedropper
  btnEyedropper.addEventListener('click', () => setEyedropper(!eyedropperOn));

  // Manual hex input
  hexInput.addEventListener('change', () => {
    const raw = hexInput.value.trim();
    if (!raw) return;
    if (Naming.normalizeHex(raw)) {
      addColor(raw);
    } else {
      showToast(t('toast.hexInvalid'));
    }
  });

  // Date + caption toggles
  moodToggle.addEventListener('change', () => {
    showMood = moodToggle.checked;
    renderCard();
  });
  dateToggle.addEventListener('change', () => {
    showDate = dateToggle.checked;
    renderCard();
  });
  dateTodayToggle.addEventListener('change', () => {
    useToday = dateTodayToggle.checked;
    updateDateManual();
    renderCard();
  });
  [dateY, dateM, dateD].forEach((el) => {
    el.addEventListener('input', () => renderCard());
  });

  moodTextInput.addEventListener('input', () => {
    customMood = moodTextInput.value;
    renderCard();
  });

  borderToggle.addEventListener('change', () => {
    borderOn = borderToggle.checked;
    renderCard();
  });

  // Language switch
  if (langSwitch) {
    langSwitch.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-locale]');
      if (!btn) return;
      const next = btn.getAttribute('data-locale');
      if (next === locale) return;
      locale = next;
      applyLocale();
    });
  }

  btnDownload.addEventListener('click', () => {
    if (!currentImage) return;
    renderCard();
    canvas.toBlob((blob) => {
      if (!blob) {
        showToast(t('toast.exportFail'));
        return;
      }
      const a = document.createElement('a');
      const url = URL.createObjectURL(blob);
      a.href = url;
      a.download = 'colorcard-' + currentRatio().id.replace(':', 'x') + '-' + Date.now() + '.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      showToast(t('toast.saved'));
    }, 'image/png');
  });

  btnNew.addEventListener('click', resetToDropzone);

  window.addEventListener('resize', () => {
    if (currentImage) fitCanvas();
  });

  // ---- Init ----
  try {
    const saved = localStorage.getItem('colorcard_locale');
    if (saved === 'en' || saved === 'zh') locale = saved;
  } catch (e) {
    /* ignore */
  }

  // default manual date = today (used when "use today" is turned off)
  (function () {
    const d = new Date();
    dateY.value = String(d.getFullYear());
    dateM.value = String(d.getMonth() + 1).padStart(2, '0');
    dateD.value = String(d.getDate()).padStart(2, '0');
  })();
  moodToggle.checked = showMood;
  dateToggle.checked = showDate;
  dateTodayToggle.checked = useToday;
  borderToggle.checked = borderOn;
  updateDateManual();

  buildRatioButtons();
  applyLocale();
})();
