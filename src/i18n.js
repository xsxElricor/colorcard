/* ===== PhotoColor Local - UI i18n (zh / en) ===== */
/* Static UI strings + dynamic labels. Color names/mood come from colorNaming.js. */

(function (global, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    global.PhotoColorI18n = factory();
  }
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const STRINGS = {
    zh: {
      'intro.title': '照片一键生成配色卡',
      'intro.desc': '上传一张照片，自动提取主色并生成一张可分享的配色卡。可自定义比例、色块布局、字体与水印，全部在本地完成，照片不会离开你的电脑。',
      'dz.title': '把照片拖进来，或点击选择',
      'dz.hint': '支持 JPG / PNG / WebP 等格式',
      'processing.text': '正在提取配色…',

      'sec.size': '尺寸',
      'sec.layout': '布局',
      'sec.palette': '配色',
      'sec.font': '字体',
      'sec.text': '文字编辑',
      'sec.meta': '文案',
      'sec.watermark': '水印',
      'info.mood': '情绪',
      'info.hex': '色值',

      'btn.download': '下载 PNG',
      'btn.new': '重新选图',
      'btn.eyedropper': '吸管取色',
      'label.textPos': '文字位置',
      'label.showMood': '显示情绪',
      'label.showDate': '显示日期',
      'label.useToday': '使用今天',
      'label.showWatermark': '显示水印',
      'label.showBorder': '显示边框',
      'label.latinFont': '英文字体',
      'label.cjkFont': '中文字体',

      'ph.name': '色名',
      'ph.hex': '手动色号，如 #FF8800',
      'ph.watermark': '留空则隐藏水印',
      'ph.mood': '自定义情绪（1-3 个词）',
      'ph.year': '年',
      'ph.month': '月',
      'ph.day': '日',
      'hint.drag': '点击照片区域可拖拽 / 滚轮缩放。',

      'orient.portrait': '纵向',
      'orient.landscape': '横向',

      'toast.saved': '已保存 PNG',
      'toast.exportFail': '导出失败',
      'toast.processFail': '处理失败',
      'toast.readFail': '无法读取这张图片。',
      'toast.eyedropperOn': '吸管已开启：点击照片取色',
      'toast.hexInvalid': '色号无效，请输入 6 位十六进制',

      // block positions
      'pos.top': '上', 'pos.bottom': '下', 'pos.left': '左', 'pos.right': '右',
      'pos.tl': '左上', 'pos.tr': '右上', 'pos.bl': '左下', 'pos.br': '右下',
      // text positions
      'tpos.bottom-left': '左下', 'tpos.top-left': '左上', 'tpos.top-right': '右上',
      'tpos.bottom-right': '右下', 'tpos.center': '居中',
      // watermark positions
      'wm.left': '左', 'wm.center': '中', 'wm.right': '右',
    },
    en: {
      'intro.title': 'Turn a photo into a color card',
      'intro.desc': 'Upload a photo to auto-extract its colors and create a shareable color card. Customize ratio, layout, fonts and watermark — everything runs locally and your photo never leaves your device.',
      'dz.title': 'Drag a photo here, or click to choose',
      'dz.hint': 'Supports JPG / PNG / WebP and more',
      'processing.text': 'Extracting colors…',

      'sec.size': 'Size',
      'sec.layout': 'Layout',
      'sec.palette': 'Palette',
      'sec.font': 'Font',
      'sec.text': 'Text',
      'sec.meta': 'Caption',
      'sec.watermark': 'Watermark',
      'info.mood': 'Mood',
      'info.hex': 'Hex',

      'btn.download': 'Download PNG',
      'btn.new': 'New photo',
      'btn.eyedropper': 'Eyedropper',
      'label.textPos': 'Text position',
      'label.showMood': 'Show mood',
      'label.showDate': 'Show date',
      'label.useToday': 'Use today',
      'label.showWatermark': 'Show watermark',
      'label.showBorder': 'Show border',
      'label.latinFont': 'Latin font',
      'label.cjkFont': 'Chinese font',

      'ph.name': 'Color name',
      'ph.hex': 'Hex, e.g. #FF8800',
      'ph.watermark': 'Empty to hide',
      'ph.mood': 'Custom mood (1–3 words)',
      'ph.year': 'YYYY',
      'ph.month': 'MM',
      'ph.day': 'DD',
      'hint.drag': 'Drag the photo to move · scroll to zoom.',

      'orient.portrait': 'Portrait',
      'orient.landscape': 'Landscape',

      'toast.saved': 'Saved PNG',
      'toast.exportFail': 'Export failed',
      'toast.processFail': 'Processing failed',
      'toast.readFail': 'Cannot read this image.',
      'toast.eyedropperOn': 'Eyedropper on — click the photo',
      'toast.hexInvalid': 'Invalid hex, enter 6 hex digits',

      'pos.top': 'Top', 'pos.bottom': 'Bottom', 'pos.left': 'Left', 'pos.right': 'Right',
      'pos.tl': 'TL', 'pos.tr': 'TR', 'pos.bl': 'BL', 'pos.br': 'BR',
      'tpos.bottom-left': 'Bottom-left', 'tpos.top-left': 'Top-left', 'tpos.top-right': 'Top-right',
      'tpos.bottom-right': 'Bottom-right', 'tpos.center': 'Center',
      'wm.left': 'Left', 'wm.center': 'Center', 'wm.right': 'Right',
    },
  };

  const LOCALES = ['zh', 'en'];
  let locale = 'zh';

  function normalize(value) {
    return value === 'en' ? 'en' : 'zh';
  }

  function t(key, loc) {
    const l = loc || locale;
    const table = STRINGS[l] || STRINGS.zh;
    if (table[key] != null) return table[key];
    if (STRINGS.zh[key] != null) return STRINGS.zh[key];
    return key;
  }

  function getLocale() {
    return locale;
  }

  function setLocale(value) {
    locale = normalize(value);
    return locale;
  }

  // Apply translations to the DOM: [data-i18n] text, [data-i18n-placeholder], [data-i18n-title].
  function apply(root) {
    const scope = root || document;
    scope.querySelectorAll('[data-i18n]').forEach((el) => {
      el.textContent = t(el.getAttribute('data-i18n'));
    });
    scope.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      el.setAttribute('placeholder', t(el.getAttribute('data-i18n-placeholder')));
    });
    scope.querySelectorAll('[data-i18n-title]').forEach((el) => {
      el.setAttribute('title', t(el.getAttribute('data-i18n-title')));
    });
  }

  return { STRINGS, LOCALES, t, getLocale, setLocale, apply };
});
