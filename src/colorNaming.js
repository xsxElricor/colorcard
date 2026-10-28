/* ===== ColorCard - Color Naming Module ===== */
/* Rule-based color naming + mood tags, bilingual (en / zh). Fully deterministic. */

(function (global, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    global.ColorCardNaming = factory();
  }
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  // ---------- Hex helpers ----------

  function normalizeHex(hex) {
    let value = String(hex || '').trim().replace('#', '');
    if (value.length === 3) {
      value = value.split('').map((c) => c + c).join('');
    }
    if (!/^[0-9A-Fa-f]{6}$/.test(value)) return null;
    return '#' + value.toUpperCase();
  }

  function hexToHsl(hex) {
    const normalized = normalizeHex(hex);
    if (!normalized) return null;
    const v = normalized.replace('#', '');
    const r = parseInt(v.substring(0, 2), 16) / 255;
    const g = parseInt(v.substring(2, 4), 16) / 255;
    const b = parseInt(v.substring(4, 6), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;
    const d = max - min;

    if (d !== 0) {
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
      else if (max === g) h = ((b - r) / d + 2) * 60;
      else h = ((r - g) / d + 4) * 60;
    }

    return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
  }

  function getReadableTextColor(hex) {
    const normalized = normalizeHex(hex);
    if (!normalized) return '#FFFFFF';
    const v = normalized.replace('#', '');
    const r = parseInt(v.substring(0, 2), 16);
    const g = parseInt(v.substring(2, 4), 16);
    const b = parseInt(v.substring(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    if (luminance > 0.72) return '#111111';
    if (luminance > 0.55) return '#000000';
    return '#FFFFFF';
  }

  // ---------- Color family classification ----------

  function getColorFamily(hsl) {
    const h = hsl.h;
    const s = hsl.s;
    const l = hsl.l;

    if (s <= 6) {
      if (l >= 94) return 'white';
      if (l <= 10) return 'black';
      return 'gray';
    }
    if (s <= 22 && l >= 70 && h >= 25 && h <= 70) return 'beige';
    if (s <= 35 && l >= 58 && h >= 20 && h <= 75) return 'beige';
    if (l <= 45 && h >= 15 && h <= 55 && s >= 18) return 'brown';

    if (h >= 0 && h < 8) return 'red';
    if (h >= 8 && h < 18) return 'coral';
    if (h >= 18 && h < 32) return 'orange';
    if (h >= 32 && h < 45) return 'amber';
    if (h >= 45 && h < 65) return 'yellow';
    if (h >= 65 && h < 90) return 'lime';
    if (h >= 90 && h < 145) return 'green';
    if (h >= 145 && h < 165) return 'mint';
    if (h >= 165 && h < 185) return 'teal';
    if (h >= 185 && h < 205) return 'cyan';
    if (h >= 205 && h < 230) return 'blue';
    if (h >= 230 && h < 245) return 'navy';
    if (h >= 245 && h < 260) return 'indigo';
    if (h >= 260 && h < 280) return 'violet';
    if (h >= 280 && h < 305) return 'purple';
    if (h >= 305 && h < 335) return 'magenta';
    if (h >= 335 && h < 350) return 'pink';
    return 'rose';
  }

  // ---------- Base names (English) ----------

  const BASE_NAMES = {
    red: ['Red', 'Ruby', 'Crimson', 'Cherry', 'Scarlet', 'Brick', 'Garnet', 'Tomato', 'Cardinal', 'Ember'],
    rose: ['Rose', 'Tea Rose', 'Vintage Rose', 'Wild Rose', 'Rosewood', 'Blush Rose', 'Soft Rose', 'Petal'],
    pink: ['Pink', 'Blush', 'Peony', 'Petal Pink', 'Cotton Candy', 'Bubblegum', 'Powder Pink', 'Ballet Pink'],
    coral: ['Coral', 'Salmon', 'Peach Coral', 'Terracotta', 'Clay', 'Sunset Coral', 'Melon', 'Papaya'],
    orange: ['Orange', 'Tangerine', 'Apricot', 'Marigold', 'Pumpkin', 'Clementine', 'Persimmon', 'Mango'],
    amber: ['Amber', 'Honey', 'Caramel', 'Goldenrod', 'Butterscotch', 'Ochre', 'Saffron', 'Burnt Gold'],
    yellow: ['Yellow', 'Lemon', 'Butter', 'Cream Gold', 'Sunbeam', 'Daffodil', 'Vanilla', 'Champagne'],
    lime: ['Lime', 'Chartreuse', 'Pear', 'Pistachio', 'Spring Green', 'Citrus', 'Matcha', 'Apple Green'],
    green: ['Green', 'Sage', 'Moss', 'Olive', 'Fern', 'Pine', 'Forest', 'Eucalyptus', 'Laurel', 'Cedar', 'Basil', 'Clover'],
    mint: ['Mint', 'Seafoam', 'Aqua Mint', 'Fresh Mint', 'Icy Mint', 'Celadon', 'Jade Mist'],
    teal: ['Teal', 'Peacock', 'Lagoon', 'Sea Glass', 'Deep Teal', 'Ocean Teal', 'Pine Teal', 'Bluegrass'],
    cyan: ['Cyan', 'Aqua', 'Sky Aqua', 'Glacier', 'Ice Blue', 'Pool Blue', 'Turquoise', 'Clear Water'],
    blue: ['Blue', 'Sky', 'Ocean', 'Azure', 'Denim', 'Cornflower', 'Cerulean', 'Harbor Blue', 'Coastal Blue', 'Lake Blue'],
    navy: ['Navy', 'Midnight Blue', 'Ink Blue', 'Deep Sea', 'Marine', 'Prussian Blue', 'Storm Blue', 'Oxford Blue'],
    indigo: ['Indigo', 'Royal Indigo', 'Ink', 'Blue Violet', 'Twilight', 'Deep Indigo', 'Nightshade'],
    violet: ['Violet', 'Lavender', 'Lilac', 'Wisteria', 'Periwinkle', 'Iris', 'Amethyst', 'Orchid Violet'],
    purple: ['Purple', 'Plum', 'Grape', 'Mauve', 'Orchid', 'Heather', 'Mulberry', 'Royal Purple'],
    magenta: ['Magenta', 'Fuchsia', 'Raspberry', 'Berry', 'Bougainvillea', 'Electric Pink', 'Wine Pink'],
    brown: ['Brown', 'Walnut', 'Mocha', 'Chestnut', 'Coffee', 'Cocoa', 'Umber', 'Cedar Brown', 'Leather', 'Espresso'],
    beige: ['Beige', 'Sand', 'Linen', 'Oat', 'Almond', 'Cream', 'Ivory', 'Wheat', 'Stone', 'Parchment', 'Canvas', 'Warm Taupe'],
    gray: ['Gray', 'Slate', 'Ash', 'Smoke', 'Graphite', 'Zinc', 'Pewter', 'Mist', 'Stone Gray', 'Dove Gray'],
    black: ['Black', 'Charcoal', 'Obsidian', 'Onyx', 'Ink Black', 'Graphite Black', 'Soft Black'],
    white: ['White', 'Snow', 'Porcelain', 'Ivory', 'Cloud', 'Milk', 'Pearl', 'Soft White'],
  };

  // ---------- Base names (Chinese) ----------

  const BASE_NAMES_ZH = {
    red: ['正红', '朱红', '绯红', '胭脂', '石榴红', '砖红', '殷红', '枣红'],
    rose: ['玫瑰', '藕粉', '豆沙', '干枯玫瑰', '茶玫瑰', '烟粉'],
    pink: ['粉色', '樱粉', '蜜桃粉', '婴儿粉', '泡泡粉', '蔷薇粉'],
    coral: ['珊瑚', '蜜桃橘', '陶土', '杏色', '西瓜红', '落日橘'],
    orange: ['橘色', '橙色', '橘红', '南瓜色', '柿子色', '万寿菊'],
    amber: ['琥珀', '蜂蜜', '焦糖', '姜黄', '金黄', '赭石'],
    yellow: ['黄色', '柠檬黄', '奶油黄', '鹅黄', '香槟黄', '水仙黄'],
    lime: ['青柠', '黄绿', '嫩芽绿', '抹茶绿', '苹果绿', '春绿'],
    green: ['绿色', '苔藓绿', '橄榄绿', '森林绿', '鼠尾草', '竹青', '柏绿', '青苔', '雪松绿', '罗勒绿'],
    mint: ['薄荷', '海沫绿', '玉色', '沁蓝绿', '青瓷'],
    teal: ['蓝绿', '孔雀蓝', '湖水绿', '深海绿', '海玻璃', '松石绿'],
    cyan: ['青色', '水蓝', '冰蓝', '湖蓝', '天青', '清波'],
    blue: ['蓝色', '天空蓝', '雾霾蓝', '牛仔蓝', '矢车菊蓝', '海蓝', '宝石蓝'],
    navy: ['藏青', '午夜蓝', '深海蓝', '墨蓝', '雾蓝'],
    indigo: ['靛蓝', '靛青', '暮蓝', '夜蓝', '暗紫蓝'],
    violet: ['紫罗兰', '薰衣草', '丁香紫', '鸢尾紫', '藤紫'],
    purple: ['紫色', '梅子紫', '葡萄紫', '灰紫', '王室紫', '桑葚紫'],
    magenta: ['品红', '玫红', '洋红', '莓果红', '紫红'],
    brown: ['棕色', '咖啡', '摩卡', '栗色', '驼色', '焦棕', '胡桃', '皮革'],
    beige: ['米色', '燕麦', '亚麻', '奶咖', '沙色', '奶油', '象牙', '陶土白', '羊皮纸'],
    gray: ['灰色', '烟灰', '石板灰', '雾灰', '铅灰', '银灰', '青灰'],
    black: ['黑色', '墨黑', '炭黑', '曜石黑', '暗墨'],
    white: ['白色', '雪白', '象牙白', '云白', '珍珠白', '奶白'],
  };

  // ---------- Base name selection ----------

  function getBaseName(family, hsl, locale) {
    const zh = locale === 'zh';
    const names = zh ? BASE_NAMES_ZH[family] : BASE_NAMES[family];
    const s = hsl.s;
    const l = hsl.l;

    if (family === 'white') {
      if (zh) return l >= 97 ? '纯白' : s > 4 ? '暖白' : '雪白';
      if (l >= 98) return 'White';
      if (l >= 95 && s <= 4) return 'Snow';
      if (s > 4) return 'Ivory';
      return 'Soft White';
    }
    if (family === 'black') {
      if (zh) return l <= 5 ? '纯黑' : l <= 10 ? '墨黑' : '炭黑';
      if (l <= 5) return 'Black';
      if (l <= 10) return 'Onyx';
      return 'Charcoal';
    }
    if (family === 'gray') {
      if (zh) {
        if (l >= 80) return '浅灰';
        if (l >= 65) return '雾灰';
        if (l >= 45) return '石板灰';
        if (l >= 25) return '石墨灰';
        return '炭灰';
      }
      if (l >= 80) return 'Mist';
      if (l >= 65) return 'Dove Gray';
      if (l >= 45) return 'Slate';
      if (l >= 25) return 'Graphite';
      return 'Charcoal';
    }

    // Deterministic index from HSL (same color always yields the same name)
    const index = Math.abs(Math.round(hsl.h * 0.37 + hsl.s * 0.41 + hsl.l * 0.53)) % names.length;
    return names[index];
  }

  // ---------- Modifier generation ----------

  function getModifier(hsl, family, locale) {
    const s = hsl.s;
    const l = hsl.l;

    if (locale === 'zh') {
      if (family === 'white') return l >= 97 ? '纯' : s > 4 ? '暖' : '柔';
      if (family === 'black') return l <= 5 ? '纯' : l <= 12 ? '深' : '柔';
      if (family === 'gray') return l >= 80 ? '浅' : l >= 60 ? '柔' : l >= 40 ? '冷' : l >= 25 ? '深' : '暗';
      if (l >= 86) return '浅';
      if (l <= 20) return '深';
      if (s <= 12) return '灰调';
      return '';
    }

    if (family === 'white') {
      if (l >= 98) return 'Pure';
      if (s <= 3) return 'Soft';
      return 'Warm';
    }
    if (family === 'black') {
      if (l <= 5) return 'Pure';
      if (l <= 12) return 'Deep';
      return 'Soft';
    }
    if (family === 'gray') {
      if (l >= 78) return 'Pale';
      if (l >= 60) return 'Soft';
      if (l >= 40) return 'Cool';
      if (l >= 25) return 'Deep';
      return 'Dark';
    }

    if (l >= 90) return s <= 20 ? 'Pale' : 'Light';
    if (l >= 78) {
      if (s <= 18) return 'Soft';
      if (s >= 60) return 'Bright';
      return 'Light';
    }
    if (l <= 14) return 'Dark';
    if (l <= 24) return 'Deep';
    if (l <= 35 && s >= 45) return 'Rich';
    if (l <= 35 && s < 45) return 'Dark';

    if (s <= 10) return 'Dusty';
    if (s <= 22) return 'Muted';
    if (s <= 35) return 'Soft';
    if (s >= 82) return 'Vivid';
    if (s >= 68) return 'Bright';
    if (s >= 52) return 'Fresh';

    const warmFamilies = ['red', 'rose', 'coral', 'orange', 'amber', 'yellow', 'brown', 'beige'];
    const coolFamilies = ['blue', 'navy', 'cyan', 'teal', 'mint', 'indigo', 'violet'];
    if (warmFamilies.includes(family)) return 'Warm';
    if (coolFamilies.includes(family)) return 'Cool';
    return 'Natural';
  }

  // ---------- Display name formatting ----------

  function formatDisplayName(modifier, baseName, locale) {
    if (locale === 'zh') {
      if (!modifier) return baseName;
      if (baseName.indexOf(modifier) === 0) return baseName;
      return modifier + baseName;
    }
    const lowerBase = baseName.toLowerCase();
    if (lowerBase.startsWith(modifier.toLowerCase())) return titleCase(baseName);
    return titleCase(modifier + ' ' + baseName);
  }

  function titleCase(input) {
    return input
      .split(' ')
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  // ---------- Mood tags (English) ----------

  const EASTERN_TAGS = ['zen', 'wabi', 'ink', 'matcha', 'moss', 'bamboo', 'plum', 'weathered', 'tranquil', 'aged'];

  const FAMILY_TAGS = {
    red: ['bold', 'passionate', 'warm', 'energetic', 'vintage', 'joyful'],
    rose: ['romantic', 'delicate', 'nostalgic', 'emotional', 'whimsical', 'tender'],
    pink: ['sweet', 'playful', 'gentle', 'youthful', 'charming', 'lovely'],
    coral: ['warm', 'friendly', 'inviting', 'coastal', 'sunlit', 'mellow'],
    orange: ['energetic', 'sunny', 'cheerful', 'zesty', 'sparkling', 'joyful'],
    amber: ['warm', 'golden', 'cozy', 'honeyed', 'radiant', 'sunlit'],
    yellow: ['cheerful', 'optimistic', 'bright', 'radiant', 'warm', 'youthful'],
    lime: ['fresh', 'zesty', 'lively', 'botanical', 'springlike', 'vivid'],
    green: ['calm', 'organic', 'natural', 'botanical', 'restorative', 'wholesome'],
    mint: ['serene', 'clean', 'light', 'fresh', 'tranquil', 'refreshing'],
    teal: ['balanced', 'calm', 'cool', 'coastal', 'fluid', 'refreshing'],
    cyan: ['clear', 'cool', 'crisp', 'aquatic', 'crystalline', 'luminous'],
    blue: ['calm', 'clean', 'trustworthy', 'serene', 'open', 'clear'],
    navy: ['stable', 'classic', 'professional', 'mature', 'composed', 'dependable'],
    indigo: ['deep', 'focused', 'creative', 'artistic', 'mysterious', 'nocturnal'],
    violet: ['dreamy', 'poetic', 'ethereal', 'mystic', 'romantic', 'imaginative'],
    purple: ['creative', 'elegant', 'expressive', 'luxurious', 'sophisticated', 'chic'],
    magenta: ['bold', 'vivid', 'confident', 'expressive', 'electric', 'dynamic'],
    brown: ['earthy', 'grounded', 'rustic', 'weathered', 'tactile', 'mineral'],
    beige: ['warm', 'welcoming', 'timeless', 'understated', 'restrained', 'honest'],
    gray: ['cool', 'quiet', 'reserved', 'refined', 'understated', 'architectural'],
    black: ['bold', 'dramatic', 'sleek', 'mysterious', 'intense', 'powerful'],
    white: ['clean', 'pure', 'airy', 'minimal', 'spacious', 'pristine'],
  };

  const SATURATION_TAGS = {
    tier1: ['neutral', 'minimal'],
    tier2: ['dusty', 'faded'],
    tier3: ['muted', 'softened'],
    tier4: ['balanced', 'natural'],
    tier5: ['vibrant', 'polished'],
    tier6: ['electric', 'intense'],
  };

  const LIGHTNESS_TAGS = {
    tier1: ['airy', 'light'],
    tier2: ['soft', 'delicate'],
    tier3: ['balanced', 'even'],
    tier4: ['moody', 'rich'],
    tier5: ['deep', 'dark'],
    tier6: ['dramatic', 'immersive'],
  };

  // ---------- Mood tags (Chinese) ----------

  const EASTERN_TAGS_ZH = ['禅意', '侘寂', '墨色', '抹茶', '苔藓', '竹青', '梅色', '做旧', '静谧', '岁月'];

  const FAMILY_TAGS_ZH = {
    red: ['热烈', '复古', '温暖', '活力', '张扬', '喜庆'],
    rose: ['浪漫', '温柔', '怀旧', '细腻', '柔情', '梦幻'],
    pink: ['甜美', '俏皮', '柔和', '少女', '可爱', '明媚'],
    coral: ['温暖', '亲和', '海滨', '阳光', '柔和', '活力'],
    orange: ['活力', '阳光', '欢快', '清爽', '明快', '热烈'],
    amber: ['温暖', '金色', '暖意', '蜜糖', '明亮', '阳光'],
    yellow: ['欢快', '乐观', '明亮', '温暖', '青春', '阳光'],
    lime: ['清新', '爽口', '生机', '草木', '春日', '鲜活'],
    green: ['平静', '有机', '自然', '草木', '疗愈', '清新'],
    mint: ['宁静', '干净', '轻盈', '清新', '安静', '清爽'],
    teal: ['平衡', '平静', '冷调', '海滨', '流动', '清爽'],
    cyan: ['清透', '冷调', '清脆', '水感', '通透', '明亮'],
    blue: ['平静', '干净', '信任', '宁静', '开阔', '清透'],
    navy: ['稳重', '经典', '专业', '成熟', '沉稳', '可靠'],
    indigo: ['深邃', '专注', '创意', '艺术', '神秘', '夜色'],
    violet: ['梦幻', '诗意', '空灵', '神秘', '浪漫', '想象'],
    purple: ['创意', '优雅', '表现力', '奢华', '高级', '时髦'],
    magenta: ['大胆', '鲜明', '自信', '表现力', '电流', '动感'],
    brown: ['大地', '踏实', '质朴', '做旧', '触感', '矿物'],
    beige: ['温暖', '亲和', '隽永', '低调', '克制', '质朴'],
    gray: ['冷调', '安静', '内敛', '精致', '低调', '建筑感'],
    black: ['大胆', '戏剧', '利落', '神秘', '强烈', '力量'],
    white: ['干净', '纯粹', '通透', '极简', '开阔', '纯净'],
  };

  const SATURATION_TAGS_ZH = {
    tier1: ['中性', '极简'],
    tier2: ['灰调', '退色'],
    tier3: ['柔和', '低饱和'],
    tier4: ['自然', '平衡'],
    tier5: ['鲜明', '干净'],
    tier6: ['浓烈', '强烈'],
  };

  const LIGHTNESS_TAGS_ZH = {
    tier1: ['轻盈', '明亮'],
    tier2: ['柔软', '细腻'],
    tier3: ['平衡', '均匀'],
    tier4: ['沉稳', '浓郁'],
    tier5: ['深邃', '暗沉'],
    tier6: ['戏剧', '沉浸'],
  };

  function _idx(hsl, poolLen) {
    return Math.abs(Math.round(hsl.h * 0.37 + hsl.s * 0.41 + hsl.l * 0.53)) % poolLen;
  }

  function getMoodTags(family, hsl, locale) {
    const zh = locale === 'zh';
    const s = hsl.s;
    const l = hsl.l;
    const tags = [];

    const familyMap = zh ? FAMILY_TAGS_ZH : FAMILY_TAGS;
    const satMap = zh ? SATURATION_TAGS_ZH : SATURATION_TAGS;
    const litMap = zh ? LIGHTNESS_TAGS_ZH : LIGHTNESS_TAGS;
    const easternPoolAll = zh ? EASTERN_TAGS_ZH : EASTERN_TAGS;

    const familyPool = familyMap[family] || familyMap.gray;
    let familyTag = familyPool[_idx(hsl, familyPool.length)];

    const easternFamilies = ['green', 'mint', 'teal', 'beige', 'brown', 'gray', 'navy', 'indigo'];
    if (easternFamilies.includes(family) && s <= 40) {
      const easternPool = easternPoolAll.filter((t) => t !== familyTag);
      const injected = easternPool[_idx(hsl, easternPool.length)];
      if (s <= 22) familyTag = injected;
    }
    tags.push(familyTag);

    let satPool;
    if (s <= 8) satPool = satMap.tier1;
    else if (s <= 22) satPool = satMap.tier2;
    else if (s <= 40) satPool = satMap.tier3;
    else if (s <= 65) satPool = satMap.tier4;
    else if (s <= 82) satPool = satMap.tier5;
    else satPool = satMap.tier6;
    const sidx = _idx(hsl, satPool.length);
    let satTag = satPool[sidx];
    if (satTag === familyTag && satPool.length > 1) satTag = satPool[(sidx + 1) % satPool.length];
    tags.push(satTag);

    let litPool;
    if (l >= 88) litPool = litMap.tier1;
    else if (l >= 72) litPool = litMap.tier2;
    else if (l >= 45) litPool = litMap.tier3;
    else if (l >= 25) litPool = litMap.tier4;
    else if (l >= 14) litPool = litMap.tier5;
    else litPool = litMap.tier6;
    const lidx = _idx(hsl, litPool.length);
    let litTag = litPool[lidx];
    if ((litTag === familyTag || litTag === satTag) && litPool.length > 1) {
      litTag = litPool[(lidx + 1) % litPool.length];
    }
    tags.push(litTag);

    return tags;
  }

  // ---------- Main describeColor ----------

  function describeColor(hex, locale) {
    const loc = locale === 'zh' ? 'zh' : 'en';
    const normalized = normalizeHex(hex);
    if (!normalized) {
      return {
        hex: '#000000',
        hsl: { h: 0, s: 0, l: 0 },
        family: 'gray',
        baseName: loc === 'zh' ? '未知' : 'Unknown',
        modifier: loc === 'zh' ? '柔和' : 'Muted',
        displayName: loc === 'zh' ? '未知' : 'Unknown',
        moodTags: [loc === 'zh' ? '中性' : 'neutral'],
        textColor: '#FFFFFF',
      };
    }

    const hsl = hexToHsl(normalized);
    const family = getColorFamily(hsl);
    const baseName = getBaseName(family, hsl, loc);
    let modifier = getModifier(hsl, family, loc);
    // Chinese neutral names already encode lightness (e.g. 浅灰/纯白/墨黑)
    if (loc === 'zh' && (family === 'gray' || family === 'white' || family === 'black')) modifier = '';
    const moodTags = getMoodTags(family, hsl, loc);
    const displayName = formatDisplayName(modifier, baseName, loc);
    const textColor = getReadableTextColor(normalized);

    return { hex: normalized, hsl, family, baseName, modifier, displayName, moodTags, textColor };
  }

  return {
    normalizeHex,
    describeColor,
  };
});
