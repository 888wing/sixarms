# Sixarms Landing Page 設計規格

> 設計日期: 2026-01-04
> 更新日期: 2026-01-05
> 狀態: ✅ 程式碼實作完成，待部署設定

## 概述

為 Sixarms AI 開發進度追蹤助手建立完整的 Landing Page，包含主頁、下載頁、隱私權政策及服務條款頁面。

## 轉換目標

| 優先級 | 目標 | 指標 |
|--------|------|------|
| 🔴 主要 | macOS App 下載 | 下載點擊率 |
| 🟡 次要 | 郵件訂閱 (Windows 等待名單) | 訂閱數量 |
| 🟢 輔助 | GitHub Star | Star 數 |

---

## 技術架構

### 框架選擇
- **靜態網站生成器**: Astro
- **部署平台**: Cloudflare Pages
- **資料庫**: Cloudflare D1 (郵件訂閱)
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
│   │   ├── FeatureCard.astro    # 功能展示卡片
│   │   ├── SubscribeForm.astro  # 郵件訂閱表單
│   │   ├── TrustBadge.astro     # 信任指標徽章
│   │   └── AppScreenshot.astro  # App 截圖展示
│   ├── layouts/
│   │   └── Base.astro           # 主佈局 (導航/頁尾)
│   └── styles/
│       └── global.css           # Terminal 主題樣式
├── functions/
│   └── api/
│       └── subscribe.ts         # D1 郵件訂閱 API
├── public/
│   ├── images/
│   │   ├── app-screenshot.png   # App 截圖
│   │   └── og-image.png         # 社群預覽圖
│   └── downloads/               # DMG/安裝檔
├── schema.sql                   # D1 資料表定義
├── wrangler.toml                # Cloudflare 設定
└── astro.config.mjs
```

---

## Cloudflare D1 郵件訂閱系統

### 資料庫設定

**建立 D1 Database**
```bash
wrangler d1 create sixarms-subscribers
```

**wrangler.toml**
```toml
name = "sixarms-landing"
compatibility_date = "2024-01-01"

[[d1_databases]]
binding = "DB"
database_name = "sixarms-subscribers"
database_id = "YOUR_DATABASE_ID"
```

**schema.sql**
```sql
CREATE TABLE IF NOT EXISTS subscribers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  source TEXT DEFAULT 'windows-waitlist',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  confirmed INTEGER DEFAULT 0
);

CREATE INDEX idx_email ON subscribers(email);
```

### API Endpoint

**functions/api/subscribe.ts**
```typescript
interface Env {
  DB: D1Database;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  try {
    const { email, source = 'windows-waitlist' } = await request.json();

    if (!email || !isValidEmail(email)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid email' }),
        { status: 400, headers }
      );
    }

    await env.DB.prepare(
      'INSERT OR IGNORE INTO subscribers (email, source) VALUES (?, ?)'
    ).bind(email.toLowerCase().trim(), source).run();

    return new Response(
      JSON.stringify({ success: true, message: 'Subscribed!' }),
      { status: 200, headers }
    );

  } catch (error) {
    if (error.message?.includes('UNIQUE constraint')) {
      return new Response(
        JSON.stringify({ success: true, message: 'Already subscribed' }),
        { status: 200, headers }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Server error' }),
      { status: 500, headers }
    );
  }
};

export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
};

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
```

### 訂閱者管理指令
```bash
# 查看所有訂閱者
wrangler d1 execute sixarms-subscribers --command "SELECT * FROM subscribers;"

# 統計數量
wrangler d1 execute sixarms-subscribers --command "SELECT COUNT(*) as total FROM subscribers;"

# 匯出
wrangler d1 execute sixarms-subscribers --command "SELECT email, created_at FROM subscribers;" --json
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

### 核心動畫效果
- 游標閃爍動畫 (必要)
- CTA 按鈕脈衝發光 (必要)
- 按鈕 hover 發光效果 (必要)

### 延後實作的動畫
- 打字機效果 (Phase 2+)
- 視差滾動 (Phase 2+)
- 終端機視窗載入動畫 (Phase 2+)

---

## 頁面設計

### 1. 首頁 (index.astro)

#### Hero 區塊 (優化版)

**佈局結構**
```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│  [Badge: Open Source • MIT License]                                     │
│                                                                         │
│  ┌─────────────────────────────┐    ┌─────────────────────────────┐    │
│  │                             │    │                             │    │
│  │  Stop writing daily logs    │    │    ╭─────────────────────╮  │    │
│  │       manually.             │    │    │                     │  │    │
│  │       ~~~~~~~~              │    │    │   [App Screenshot]  │  │    │
│  │                             │    │    │                     │  │    │
│  │  Your commits tell a story. │    │    │   Dashboard 或      │  │    │
│  │  Let AI write it.           │    │    │   Home 頁面實際截圖 │  │    │
│  │                             │    │    │                     │  │    │
│  │  ┌─────────────────────┐    │    │    ╰─────────────────────╯  │    │
│  │  │ $ sixarms --init    │    │    │         ↑ 傾斜 5° + 陰影   │    │
│  │  │ ✓ Scanning...       │    │    └─────────────────────────────┘    │
│  │  │ ✓ Classifying...    │    │                                       │
│  │  │ > Ready. █          │    │                                       │
│  │  └─────────────────────┘    │                                       │
│  │                             │                                       │
│  │  [Download for macOS]       │                                       │
│  │  [View on GitHub]           │                                       │
│  │                             │                                       │
│  └─────────────────────────────┘                                       │
│           60%                                40%                        │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Hero 文案**:
- 標題: `Stop writing daily logs manually.`
- 副標題: `Your commits tell a story. Let AI write it.`
- CTA 按鈕:
  - 主要: `Download for macOS` (綠色發光脈衝)
  - 次要: `View on GitHub` (描邊樣式)

**CTA 按鈕樣式 (關鍵轉換元素)**
```css
.cta-download {
  background: linear-gradient(135deg, #00ff41 0%, #00cc33 100%);
  color: #000;
  font-weight: 700;
  font-size: 1.1rem;
  padding: 14px 32px;
  border-radius: 8px;
  box-shadow:
    0 0 20px rgba(0, 255, 65, 0.4),
    0 4px 15px rgba(0, 0, 0, 0.3);
  transition: all 0.2s ease;
  animation: subtle-pulse 3s ease-in-out infinite;
}

.cta-download:hover {
  transform: translateY(-2px);
  box-shadow:
    0 0 30px rgba(0, 255, 65, 0.6),
    0 6px 20px rgba(0, 0, 0, 0.4);
}

@keyframes subtle-pulse {
  0%, 100% { box-shadow: 0 0 20px rgba(0, 255, 65, 0.4), 0 4px 15px rgba(0, 0, 0, 0.3); }
  50% { box-shadow: 0 0 30px rgba(0, 255, 65, 0.6), 0 4px 15px rgba(0, 0, 0, 0.3); }
}
```

**App 截圖樣式**
```css
.app-screenshot {
  transform: perspective(1000px) rotateY(-5deg);
  box-shadow:
    30px 30px 80px rgba(0, 0, 0, 0.5),
    0 0 40px rgba(0, 255, 65, 0.1);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}
```

**游標閃爍動畫**
```css
.terminal-cursor {
  display: inline-block;
  width: 10px;
  height: 20px;
  background: #00ff41;
  animation: blink 1s step-end infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}
```

#### Trust Indicators (優化版)

```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│       🔒        │  │       ⭐        │  │       🍎        │
│      100%       │  │       MIT       │  │     macOS       │
│  Local Storage  │  │   Open Source   │  │   Native App    │
│                 │  │                 │  │                 │
│  Your data      │  │  Fully          │  │  Built for      │
│  stays local    │  │  auditable      │  │  Apple Silicon  │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

#### 功能區塊 (3 個終端機卡片)

**卡片 1: Auto Tracking**
```
┌─────────────────────────────────┐
│ ● ● ●                           │
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
│ ● ● ●                           │
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
│ ● ● ●                           │
│ $ sixarms summary --today      │
│                                │
│ > "Implemented user auth       │
│    with JWT tokens and         │
│    added password reset..."    │
└─────────────────────────────────┘
```
- 標題: `Daily Summary`
- 說明: 自動產生有意義的每日開發摘要

#### 郵件訂閱區塊 (新增)

**位置**: Features 和 How It Works 之間

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│  // STAY UPDATED                                                        │
│                                                                         │
│  Windows version coming soon.                                           │
│  Get notified when it's ready.                                          │
│                                                                         │
│  ┌──────────────────────────────────┐  ┌─────────────────┐              │
│  │  your@email.com                  │  │   Notify Me     │              │
│  └──────────────────────────────────┘  └─────────────────┘              │
│                                                                         │
│  ✓ No spam, only release updates                                        │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**訂閱表單樣式**
```css
.subscribe-section {
  padding: 60px 20px;
  text-align: center;
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
}

.subscribe-form {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin: 24px 0 16px;
  max-width: 450px;
  margin-left: auto;
  margin-right: auto;
}

.subscribe-form input[type="email"] {
  flex: 1;
  padding: 14px 18px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text-primary);
  font-family: inherit;
  font-size: 1rem;
}

.subscribe-form input:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 2px rgba(0, 217, 255, 0.2);
}

.subscribe-form button {
  padding: 14px 24px;
  background: var(--accent);
  color: #000;
  font-weight: 600;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 120px;
}

.subscribe-form button:hover:not(:disabled) {
  background: #00f0ff;
  box-shadow: 0 0 20px rgba(0, 217, 255, 0.4);
}

.form-message.success { color: var(--text-primary); }
.form-message.error { color: #ff4444; }
```

**前端 JavaScript**
```javascript
document.getElementById('subscribe-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const form = e.target;
  const btn = document.getElementById('subscribe-btn');
  const message = document.getElementById('form-message');
  const email = form.email.value;

  btn.disabled = true;
  btn.querySelector('.btn-text').hidden = true;
  btn.querySelector('.btn-loading').hidden = false;

  try {
    const res = await fetch('/api/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, source: 'windows-waitlist' })
    });

    const data = await res.json();

    message.hidden = false;
    message.textContent = data.success
      ? "✓ You're on the list!"
      : data.error || 'Something went wrong';
    message.className = `form-message ${data.success ? 'success' : 'error'}`;

    if (data.success) form.reset();
  } catch (err) {
    message.hidden = false;
    message.textContent = 'Network error, please try again';
    message.className = 'form-message error';
  } finally {
    btn.disabled = false;
    btn.querySelector('.btn-text').hidden = false;
    btn.querySelector('.btn-loading').hidden = true;
  }
});
```

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

#### Windows 等待區塊 (使用 D1 訂閱)
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

#### 主要內容
1. **資料收集** - 說明收集哪些資料
2. **資料儲存** - 強調本地儲存
3. **第三方服務** - Grok API 使用說明
4. **郵件訂閱** - 說明 D1 儲存的訂閱資料
5. **使用者權利** - 資料刪除方式
6. **聯絡方式** - 隱私問題聯絡

---

### 4. 服務條款 (terms.astro)

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

### 行動版導航 (延後優化)
- 漢堡選單 (☰)
- 側邊滑出選單
- 固定底部 CTA 按鈕

---

## 技術實作細節

### Astro 設定
```javascript
// astro.config.mjs
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  site: 'https://sixarms.app',
  output: 'hybrid',
  adapter: cloudflare({
    mode: 'directory',
  }),
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

## 實作優先順序 (優化版)

### Phase 1: 核心轉換元素 (3-4 小時)

**目標**: 快速上線，專注轉換

| 任務 | 時間 | 優先級 |
|------|------|--------|
| Astro 專案初始化 + D1 設定 | 30min | 🔴 |
| Hero 區塊 (含 App 截圖) | 1h | 🔴 |
| CTA 按鈕 (glow 動畫) | 30min | 🔴 |
| 郵件訂閱區塊 + API | 1h | 🔴 |
| Trust Indicators (含圖示) | 30min | 🔴 |
| 游標閃爍動畫 | 15min | 🟡 |

### Phase 2: 完整首頁 (2-3 小時)

| 任務 | 時間 | 優先級 |
|------|------|--------|
| 功能卡片區塊 | 1h | 🟡 |
| How It Works 區塊 | 45min | 🟡 |
| 導航與頁尾 | 45min | 🟡 |
| 響應式調整 | 30min | 🟡 |

### Phase 3: 下載頁 (1-2 小時)

| 任務 | 時間 | 優先級 |
|------|------|--------|
| 下載區塊 | 45min | 🟡 |
| 系統需求 | 15min | 🟡 |
| Windows 等待區塊 (複用訂閱元件) | 30min | 🟡 |
| 安裝指南 | 15min | 🟢 |

### Phase 4: 法律頁面 (1 小時)

| 任務 | 時間 | 優先級 |
|------|------|--------|
| 隱私權政策 | 30min | 🟢 |
| 服務條款 | 30min | 🟢 |

### Phase 5: 優化與部署 (1 小時)

| 任務 | 時間 | 優先級 |
|------|------|--------|
| SEO meta tags + OG image | 30min | 🟡 |
| Cloudflare Pages 部署 | 15min | 🔴 |
| 效能檢測 | 15min | 🟢 |

---

## 延後實作項目

以下項目待驗證效果後再考慮：

| 項目 | 原因 |
|------|------|
| 打字機效果 | 開發時間長，可後期迭代 |
| 視差滾動 | 非核心轉換元素 |
| Feature Cards 多色方案 | 可能破壞統一性 |
| How It Works 連接線動畫 | 優先級低 |
| 行動版優化 | 主要流量為桌面 |

---

## 成功指標

| 指標 | 目標 | 追蹤方式 |
|------|------|----------|
| 下載點擊率 | >5% | Cloudflare Analytics |
| 郵件訂閱數 | 持續增長 | D1 查詢 |
| 跳出率 | <60% | Cloudflare Analytics |
| Lighthouse 分數 | >95 | 定期檢測 |

---

## 參考資源

- Astro 官方文件: https://docs.astro.build
- Cloudflare Pages: https://pages.cloudflare.com
- Cloudflare D1: https://developers.cloudflare.com/d1/
- JetBrains Mono 字體: https://www.jetbrains.com/lp/mono/
