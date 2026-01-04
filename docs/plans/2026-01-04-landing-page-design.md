# Sixarms Landing Page 設計規格

> 設計日期: 2026-01-04
> 狀態: 已確認，待實作

## 概述

為 Sixarms AI 開發進度追蹤助手建立完整的 Landing Page，包含主頁、下載頁、隱私權政策及服務條款頁面。

## 技術架構

### 框架選擇
- **靜態網站生成器**: Astro
- **部署平台**: Cloudflare Pages
- **樣式**: 原生 CSS (Terminal 主題)

### 專案結構
```
sixarms-landing/
├── src/
│   ├── pages/
│   │   ├── index.astro          # 首頁/Landing
│   │   ├── download.astro       # 下載頁
│   │   ├── privacy.astro        # 隱私權政策
│   │   └── terms.astro          # 服務條款
│   ├── components/
│   │   ├── Terminal.astro       # 可重用終端機視窗
│   │   ├── TypeWriter.astro     # 打字動畫效果
│   │   ├── FeatureCard.astro    # 功能展示卡片
│   │   └── DownloadButton.astro # 平台感知下載按鈕
│   ├── layouts/
│   │   └── Base.astro           # 主佈局 (導航/頁尾)
│   └── styles/
│       └── global.css           # Terminal 主題樣式
├── public/
│   ├── downloads/               # DMG/安裝檔
│   └── og-image.png             # 社群預覽圖
└── astro.config.mjs
```

---

## 視覺設計系統

### 色彩配置 (Matrix 風格)
```css
:root {
  --bg-primary: #0a0a0a;      /* 深黑背景 */
  --bg-secondary: #111111;    /* 終端機視窗背景 */
  --bg-tertiary: #1a1a1a;     /* 卡片背景 */
  --text-primary: #00ff41;    /* Matrix 綠 - 主要文字 */
  --text-secondary: #33ff66;  /* 淺綠 - 次要文字 */
  --text-muted: #4a4a4a;      /* 灰色 - 註解/提示 */
  --accent: #00d9ff;          /* 青藍 - 連結/強調 */
  --border: #1e1e1e;          /* 邊框色 */
}
```

### 字體系統
- **主要字體**: `'JetBrains Mono', 'Fira Code', 'SF Mono', monospace`
- **標題**: 加粗等寬字體
- **程式碼**: 標準等寬字體

### 動畫效果
- 打字機效果 (Hero 區塊)
- 游標閃爍動畫
- 視差滾動
- 終端機視窗載入動畫
- 按鈕 hover 發光效果

---

## 頁面設計

### 1. 首頁 (index.astro)

#### Hero 區塊
```
┌─────────────────────────────────────────────────────────────┐
│ ● ○ ○  sixarms-terminal                              — □ ✕ │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  $ sixarms --init                                           │
│                                                             │
│  ✓ Scanning git repositories...                             │
│  ✓ Auto-classifying today's commits...                      │
│  ✓ Generating daily summary with AI...                      │
│                                                             │
│  > Ready. Your dev progress is now tracked.                 │
│  █                                                          │
│                                                             │
│     [Download for macOS]    [View on GitHub]                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Hero 文案**:
- 標題: `Stop writing daily logs manually.`
- 副標題: `Let AI track your development progress automatically.`
- CTA 按鈕:
  - 主要: `Download for macOS` (綠色發光)
  - 次要: `View on GitHub` (描邊樣式)

#### 功能區塊 (3 個終端機卡片)

**卡片 1: Auto Tracking**
```
┌─────────────────────────────────┐
│ $ git log --oneline            │
│                                │
│ > Commits detected: 12         │
│ > Files changed: 28            │
│ > Auto-logged to Sixarms ✓     │
└─────────────────────────────────┘
```
- 標題: `Auto Tracking`
- 說明: 自動偵測 Git 變更，無需手動記錄

**卡片 2: Smart Classify**
```
┌─────────────────────────────────┐
│ $ sixarms classify             │
│                                │
│ > feature: 45%                 │
│ > bugfix: 30%                  │
│ > refactor: 25%                │
└─────────────────────────────────┘
```
- 標題: `Smart Classify`
- 說明: AI 自動分類工作類型：功能開發、Bug 修復、重構...

**卡片 3: Daily Summary**
```
┌─────────────────────────────────┐
│ $ sixarms summary --today      │
│                                │
│ > "Implemented user auth       │
│    with JWT tokens and         │
│    added password reset..."    │
└─────────────────────────────────┘
```
- 標題: `Daily Summary`
- 說明: 自動產生有意義的每日開發摘要

---

### 2. 下載頁 (download.astro)

#### 主要下載區塊
```
┌──────────────────────────────────────────────────────┐
│                                                      │
│  $ curl -O sixarms.app/download/latest              │
│                                                      │
│  ████████████████████████████ 100%                   │
│                                                      │
│  ✓ sixarms-1.0.0-arm64.dmg downloaded               │
│                                                      │
└──────────────────────────────────────────────────────┘

      [⬇ Download for macOS]
        Universal (Intel + Apple Silicon)
              Version 1.0.0 • 45 MB
```

#### 系統需求
```
System Requirements:
├── macOS 12.0 (Monterey) or later
├── Apple Silicon or Intel processor
└── ~100MB disk space
```

#### Windows 等待區塊
```
┌──────────────────────────────────────────────────────┐
│                                                      │
│  $ sixarms --platform windows                        │
│                                                      │
│  > Windows version: Coming Soon                      │
│  > Enter your email to get notified                  │
│                                                      │
│  [email@example.com          ] [Notify Me]           │
│                                                      │
└──────────────────────────────────────────────────────┘
```

#### 安裝指南
```markdown
## Installation

1. Download the `.dmg` file
2. Open the downloaded file
3. Drag Sixarms to Applications folder
4. Open Sixarms from Applications
5. Grant necessary permissions when prompted
```

---

### 3. 隱私權政策 (privacy.astro)

#### 頁面設計
```
┌─────────────────────────────────────────────────────────────┐
│ // privacy-policy.md                                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ # Privacy Policy                                            │
│                                                             │
│ Last updated: 2026-01-04                                    │
│                                                             │
│ ## Data Collection                                          │
│                                                             │
│ Sixarms collects minimal data necessary for operation:      │
│                                                             │
│ - **Local Git Data**: Commit messages, file changes         │
│   (stored locally on your device)                           │
│ - **API Usage**: Requests to Grok AI for classification     │
│   (no personal data sent)                                   │
│ - **Crash Reports**: Anonymous error logs (optional)        │
│                                                             │
│ ## Data Storage                                             │
│                                                             │
│ All your development logs are stored **locally** in:        │
│ `~/Library/Application Support/sixarms/`                    │
│                                                             │
│ We do **not** sync your data to any cloud server.           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### 主要內容
1. **資料收集** - 說明收集哪些資料
2. **資料儲存** - 強調本地儲存
3. **第三方服務** - Grok API 使用說明
4. **使用者權利** - 資料刪除方式
5. **聯絡方式** - 隱私問題聯絡

---

### 4. 服務條款 (terms.astro)

#### 頁面設計
```
┌─────────────────────────────────────────────────────────────┐
│ // terms-of-service.md                                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ # Terms of Service                                          │
│                                                             │
│ Last updated: 2026-01-04                                    │
│                                                             │
│ ## License                                                  │
│                                                             │
│ Sixarms is released under the MIT License.                  │
│ You are free to use, modify, and distribute this software.  │
│                                                             │
│ ## Disclaimer                                               │
│                                                             │
│ THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY          │
│ OF ANY KIND...                                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### 主要內容
1. **授權條款** - MIT License
2. **使用限制** - 合法使用要求
3. **免責聲明** - 標準軟體免責
4. **變更條款** - 更新通知方式
5. **聯絡方式** - 法律問題聯絡

---

### 5. 頁尾設計

```
────────────────────────────────────────────────────────────────

  Sixarms © 2026

  [GitHub]  [Download]  [Privacy]  [Terms]

  Made with ♥ for developers who hate writing daily logs

────────────────────────────────────────────────────────────────
```

---

## 導航設計

### 桌面版導航
```
┌─────────────────────────────────────────────────────────────┐
│  [Logo] Sixarms      Features  Download  GitHub    [★ Star] │
└─────────────────────────────────────────────────────────────┘
```

### 行動版導航
- 漢堡選單 (☰)
- 側邊滑出選單
- 固定底部 CTA 按鈕

---

## 技術實作細節

### Astro 設定
```javascript
// astro.config.mjs
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://sixarms.app',
  output: 'static',
  build: {
    assets: 'assets'
  }
});
```

### Cloudflare Pages 部署
```yaml
# 部署設定
build_command: npm run build
output_directory: dist
node_version: 18
```

### 效能目標
- Lighthouse 分數: 95+
- 首次內容繪製 (FCP): < 1.5s
- 總阻塞時間 (TBT): < 200ms
- 累積版面配置位移 (CLS): < 0.1

---

## 實作優先順序

1. **Phase 1**: 基礎架構
   - Astro 專案初始化
   - 全域樣式系統
   - Base 佈局組件

2. **Phase 2**: 首頁
   - Hero 區塊 (終端機動畫)
   - 功能卡片
   - 導航與頁尾

3. **Phase 3**: 下載頁
   - 平台偵測
   - 下載按鈕
   - Windows 等待清單

4. **Phase 4**: 法律頁面
   - 隱私權政策
   - 服務條款

5. **Phase 5**: 優化與部署
   - 效能優化
   - SEO meta tags
   - Cloudflare Pages 部署

---

## 參考資源

- Astro 官方文件: https://docs.astro.build
- Cloudflare Pages: https://pages.cloudflare.com
- JetBrains Mono 字體: https://www.jetbrains.com/lp/mono/
