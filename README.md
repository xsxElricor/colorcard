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

## 下载与使用

> GitHub 页面只显示源码、**不会运行网页**。请先把整个仓库下载到本地再使用。

**方式一：下载压缩包（推荐，最简单）**

1. 在本页右上角点击绿色的 **Code** 按钮 → **Download ZIP**
2. 解压得到一个文件夹
3. 双击打开其中的 `color-card.html`，即可在浏览器中使用

**方式二：克隆仓库**

```bash
git clone https://github.com/xsxElricor/colorcard.git
cd colorcard
```

然后双击 `color-card.html`。

**无需安装、无需构建、无需联网、无需注册。** 网页版不依赖 `node_modules`，全部在浏览器本地运行。

### 重要：请保持目录结构

`color-card.html` 通过相对路径引用 `styles.css` 和 `src/` 下的脚本：

```
color-card.html
styles.css
src/
  app.js  renderer.js  colorNaming.js  colorExtraction.js  i18n.js
```

如果逐个单独下载文件、丢失了 `src/` 目录，页面会打开但功能失效。**请用 Download ZIP 整包下载。**

### 关于字体

配色卡用系统字体渲染。Windows 上最全（微软雅黑、楷体、宋体、Segoe UI、Consolas 等）；macOS / Linux 上部分字体会自动回退（可正常使用，只是字形不同）。

### 在线使用（可选）

若仓库启用了 GitHub Pages，可以直接访问 `https://xsxElricor.github.io/colorcard/` 在线使用（需要根目录提供 `index.html`）。

## 离线批量导出（可选，需要 Node）

网页版不需要任何安装；以下仅用于「命令行批量导出卡片」：

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
