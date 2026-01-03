# Sixarms Auto-Update 測試指南

## 概述

本文件說明如何測試 Sixarms 應用程式的自動更新功能。

## 前置條件

### 環境需求
- Node.js 20+
- Rust 1.77+
- GitHub CLI (`gh`) 已安裝並登入

### 已設定項目
- [x] GitHub Secrets: `TAURI_SIGNING_PRIVATE_KEY`
- [x] GitHub Secrets: `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`
- [x] 更新端點: `https://github.com/888wing/sixarms/releases/latest/download/latest.json`

---

## 測試案例

### TC-01: CI/CD 工作流程觸發

**目的**: 驗證 GitHub Actions 在推送 tag 時正確觸發

**步驟**:
1. 創建版本 tag：`git tag v0.1.0`
2. 推送 tag：`git push origin v0.1.0`
3. 檢查 GitHub Actions 狀態

**預期結果**:
- [ ] Release workflow 被觸發
- [ ] 四個平台 job 開始執行（macOS ARM、macOS Intel、Ubuntu、Windows）
- [ ] 所有 job 成功完成
- [ ] GitHub Release 草稿被創建

**驗證命令**:
```bash
gh run list --repo 888wing/sixarms --limit 5
gh run view <run-id> --repo 888wing/sixarms
```

---

### TC-02: 建構產物驗證

**目的**: 確認各平台安裝檔正確生成

**預期產物**:

| 平台 | 檔案名稱 | 簽名檔 |
|------|----------|--------|
| macOS ARM | `Sixarms_0.1.0_aarch64.app.tar.gz` | `.sig` |
| macOS Intel | `Sixarms_0.1.0_x64.app.tar.gz` | `.sig` |
| Linux | `sixarms_0.1.0_amd64.AppImage` | `.sig` |
| Windows | `Sixarms_0.1.0_x64-setup.exe` | `.sig` |

**驗證步驟**:
1. 前往 GitHub Releases 頁面
2. 確認 Draft Release 存在
3. 檢查所有安裝檔已上傳
4. 確認 `.sig` 簽名檔存在

---

### TC-03: 更新清單生成

**目的**: 驗證 `latest.json` 正確生成

**步驟**:
```bash
node scripts/generate-update-manifest.js 0.1.0
cat latest.json
```

**預期輸出**:
```json
{
  "version": "0.1.0",
  "notes": "See the release notes on GitHub for v0.1.0",
  "pub_date": "2026-01-03T...",
  "platforms": {
    "darwin-aarch64": {
      "signature": "",
      "url": "https://github.com/888wing/sixarms/releases/download/v0.1.0/Sixarms_0.1.0_aarch64.app.tar.gz"
    },
    ...
  }
}
```

---

### TC-04: UpdateChecker 組件顯示

**目的**: 驗證更新通知 UI 正確顯示

**前置條件**: 有新版本發布在 GitHub Releases

**步驟**:
1. 啟動應用程式：`npm run tauri dev`
2. 等待 2-3 秒讓更新檢查完成
3. 觀察右下角是否出現更新通知

**預期結果**:
- [ ] 更新卡片顯示在右下角
- [ ] 顯示「Update Available」標題
- [ ] 顯示新版本號
- [ ] 「Download & Install」按鈕可點擊

**無更新時**:
- [ ] 不顯示任何通知卡片

---

### TC-05: 更新下載流程

**目的**: 測試下載進度和安裝流程

**步驟**:
1. 點擊「Download & Install」按鈕
2. 觀察下載進度條
3. 等待下載完成

**預期結果**:
- [ ] 進度條顯示下載百分比 (0% → 100%)
- [ ] 下載完成後自動安裝
- [ ] 安裝後應用程式自動重啟

---

### TC-06: 錯誤處理

**目的**: 驗證網路錯誤時的使用者體驗

**測試場景**:

#### 6a. 無網路連接
1. 斷開網路
2. 啟動應用程式
3. 觀察更新檢查結果

**預期**: 顯示錯誤訊息，可點擊 Retry 重試

#### 6b. 更新端點無效
1. 修改 `tauri.conf.json` 中的 endpoint 為無效 URL
2. 啟動應用程式

**預期**: 顯示「Update Check Failed」錯誤

#### 6c. 下載中斷
1. 開始下載更新
2. 斷開網路

**預期**: 顯示下載錯誤，允許重試

---

### TC-07: 關閉通知

**目的**: 驗證用戶可以關閉更新通知

**步驟**:
1. 等待更新通知出現
2. 點擊右上角 X 按鈕

**預期結果**:
- [ ] 通知卡片消失
- [ ] 不會再次自動彈出（本次啟動期間）

---

## 手動測試清單

### 開發環境測試
```bash
# 1. 建構前端
npm run build

# 2. 檢查 Rust 編譯
cd src-tauri && cargo check

# 3. 開發模式運行
npm run tauri dev
```

### 生產建構測試
```bash
# 本地建構（需要簽名金鑰）
TAURI_SIGNING_PRIVATE_KEY="..." npm run tauri build
```

---

## 故障排除

### 常見問題

#### Q: Workflow 失敗 - "secret not found"
**A**: 確認 GitHub Secrets 已正確設定：
```bash
gh secret list --repo 888wing/sixarms
```

#### Q: 簽名驗證失敗
**A**: 確認 `tauri.conf.json` 中的 pubkey 與私鑰匹配

#### Q: 更新檢查無反應
**A**: 檢查瀏覽器 DevTools Console 是否有錯誤訊息

#### Q: macOS 建構失敗
**A**: 確認 Rust targets 已安裝：
```bash
rustup target add aarch64-apple-darwin x86_64-apple-darwin
```

---

## CI/CD 狀態監控

### 查看當前 Workflow
```bash
gh run list --repo 888wing/sixarms
```

### 查看特定 Run 詳情
```bash
gh run view <run-id> --repo 888wing/sixarms --log
```

### 重新執行失敗的 Workflow
```bash
gh run rerun <run-id> --repo 888wing/sixarms
```

---

## 版本發布流程

### 1. 更新版本號
編輯以下檔案：
- `src-tauri/tauri.conf.json` → `"version": "0.2.0"`
- `package.json` → `"version": "0.2.0"`

### 2. 提交變更
```bash
git add -A
git commit -m "chore: bump version to 0.2.0"
git push origin main
```

### 3. 創建 Tag
```bash
git tag v0.2.0
git push origin v0.2.0
```

### 4. 監控建構
```bash
gh run watch --repo 888wing/sixarms
```

### 5. 發布 Release
1. 前往 GitHub Releases
2. 編輯 Draft Release
3. 添加發布說明
4. 點擊「Publish release」

---

## 相關文件

- [Auto-Update 實作計劃](../plans/2026-01-03-auto-update-mechanism.md)
- [Tauri Updater 官方文件](https://v2.tauri.app/plugin/updater/)
- [GitHub Actions Workflow](.github/workflows/release.yml)
