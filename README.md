# ColorCard

把一张照片变成一张可分享的「配色卡」——纯浏览器本地处理，照片不会离开你的电脑。

## 功能

- 自动提取照片的 6 色调色板（固定网格直方图 + 加权挑色，保留小面积点缀色）
- 中英双语界面；色名与情绪标签随语言切换
- 显示比例：1:1 / 2:3 / 3:4 / 4:5 / 9:16，支持纵向 / 横向
- 色块位置：上下、左右，正方形为四角对角线
- 文字：色名、情绪（可自定义 1–3 个词）、日期（使用今天 / 手动年月日）
- 字体：9 种英文字体 + 12 种中文字体，可分别设置；HEX 固定等宽字体
- 吸管取色、手动输入 HEX 色号、照片拖拽 / 滚轮缩放
- 可编辑水印（文案 / 字体 / 左中右位置 / 开关）
- 照片圆角边框开关
- 导出短边 1080px 的 PNG

## 使用

直接用浏览器打开 `color-card.html` 即可，无需服务器、无需联网、无需注册。

## 离线批量导出（可选）

```bash
npm install
# 把图片放进 demopic/
npm run generate
```

生成的卡片会写入 `output/`（已在 `.gitignore` 中忽略）。

## 项目结构

```
color-card.html        网页入口
styles.css             界面样式
src/
  colorNaming.js       色名与情绪（中英双语，规则式）
  colorExtraction.js   采样 + 量化 + 调色板挑选
  renderer.js          配色卡渲染器（浏览器 / Node 共用）
  i18n.js              界面多语言
  app.js               交互与导出
scripts/generate.js    离线批量导出脚本
```

## 技术

原生 JavaScript + Canvas 2D，无框架、无后端。`src/renderer.js` 同时运行在浏览器与 Node（`@napi-rs/canvas`）中，保证网页与离线导出的视觉一致。

## 说明

- `demopic/`、`output/`、`node_modules/` 不纳入版本控制。
- 依赖仅 `@napi-rs/canvas`（仅离线导出脚本使用，网页本身不依赖）。
