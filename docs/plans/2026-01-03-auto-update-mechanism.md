# Sixarms Auto-Update Mechanism Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement automatic update functionality for Sixarms desktop application using Tauri v2 updater plugin

**Architecture:** The updater uses a signed update mechanism where releases are cryptographically signed with a private key, and the app validates updates using a public key. Updates are distributed via GitHub Releases.

**Tech Stack:** Tauri v2 Updater Plugin, GitHub Releases, Cryptographic Signing

---

## Overview

The Tauri v2 updater plugin provides:
- Automatic update checking
- Signed update verification (required, cannot be disabled)
- Download with progress tracking
- Seamless installation and app relaunch

## Prerequisites

Before implementing auto-update, you need:
1. A GitHub repository with releases enabled
2. A signing key pair (public + private)
3. CI/CD setup for building and signing releases

---

## Task 1: Generate Signing Keys

**Files:**
- Create: `~/.tauri/sixarms.key` (private key - KEEP SECRET)
- Output: Public key string for configuration

**Step 1: Generate the signing key pair**

Run this command in the project root:
```bash
pnpm tauri signer generate -w ~/.tauri/sixarms.key
```

This will:
- Create a private key at `~/.tauri/sixarms.key`
- Output the public key string to the console
- Prompt for a password (optional but recommended)

**Step 2: Save the public key**

Copy the public key output (starts with `dW50cnVzdGVk...`) and save it securely.
You'll need it for `tauri.conf.json`.

**Important:**
- NEVER commit the private key to version control
- Store the private key password in a secure location
- Back up the private key - losing it means you can't push updates to existing users

---

## Task 2: Install Updater Plugin Dependencies

**Files:**
- Modify: `src-tauri/Cargo.toml`
- Modify: `package.json`

**Step 1: Add Rust dependencies**

Add to `src-tauri/Cargo.toml` under `[dependencies]`:

```toml
tauri-plugin-updater = "2"
tauri-plugin-process = "2"
```

**Step 2: Add JavaScript dependencies**

```bash
pnpm add @tauri-apps/plugin-updater @tauri-apps/plugin-process
```

---

## Task 3: Register Updater and Process Plugins

**Files:**
- Modify: `src-tauri/src/lib.rs`

**Step 1: Add plugin registration**

In the `run()` function, add both plugins. The process plugin is needed for `relaunch()` after update:

```rust
// Add after existing plugins (shell, fs, dialog, notification)
.plugin(tauri_plugin_process::init())
```

And in the setup block, add the updater plugin:

```rust
.setup(|app| {
    // Add updater plugin for desktop only
    #[cfg(desktop)]
    app.handle().plugin(tauri_plugin_updater::Builder::new().build())?;

    // ... existing setup code ...
    Ok(())
})
```

---

## Task 4: Configure Updater in tauri.conf.json

**Files:**
- Modify: `src-tauri/tauri.conf.json`

**Step 1: Enable updater artifacts**

Add to the `bundle` section:
```json
{
  "bundle": {
    "createUpdaterArtifacts": true
  }
}
```

**Step 2: Add updater plugin configuration**

Add to the `plugins` section:
```json
{
  "plugins": {
    "updater": {
      "pubkey": "YOUR_PUBLIC_KEY_HERE",
      "endpoints": [
        "https://github.com/user/sixarms/releases/latest/download/latest.json"
      ]
    }
  }
}
```

Replace:
- `YOUR_PUBLIC_KEY_HERE` with the public key from Task 1
- `user/sixarms` with your actual GitHub repo path

---

## Task 5: Add Updater Permission

**Files:**
- Modify: `src-tauri/capabilities/default.json`

**Step 1: Add updater permission**

Add to the permissions array:
```json
{
  "permissions": [
    "updater:default",
    "updater:allow-check",
    "updater:allow-download-and-install"
  ]
}
```

---

## Task 6: Create Update Check UI Component

**Files:**
- Create: `src/components/UpdateChecker.tsx`
- Create: `src/stores/updateStore.ts`

**Step 1: Create update store**

```typescript
// src/stores/updateStore.ts
import { create } from 'zustand';
import { check, Update } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

interface UpdateState {
  checking: boolean;
  downloading: boolean;
  downloadProgress: number;
  update: Update | null;
  error: string | null;

  checkForUpdates: () => Promise<void>;
  downloadAndInstall: () => Promise<void>;
}

export const useUpdateStore = create<UpdateState>((set, get) => ({
  checking: false,
  downloading: false,
  downloadProgress: 0,
  update: null,
  error: null,

  checkForUpdates: async () => {
    set({ checking: true, error: null });
    try {
      const update = await check();
      set({ update, checking: false });
    } catch (error) {
      set({ error: String(error), checking: false });
    }
  },

  downloadAndInstall: async () => {
    const { update } = get();
    if (!update) return;

    set({ downloading: true, downloadProgress: 0, error: null });
    try {
      let downloaded = 0;
      let contentLength = 0;

      await update.download((event) => {
        if (event.event === 'Started') {
          contentLength = event.data.contentLength || 0;
        } else if (event.event === 'Progress') {
          downloaded += event.data.chunkLength;
          const progress = contentLength > 0
            ? Math.round((downloaded / contentLength) * 100)
            : 0;
          set({ downloadProgress: progress });
        }
      });

      await update.install();
      await relaunch();
    } catch (error) {
      set({ error: String(error), downloading: false });
    }
  },
}));
```

**Step 2: Create UpdateChecker component**

```typescript
// src/components/UpdateChecker.tsx
import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, RefreshCw, X } from 'lucide-react';
import { useUpdateStore } from '../stores/updateStore';

export function UpdateChecker() {
  const {
    checking,
    downloading,
    downloadProgress,
    update,
    error,
    checkForUpdates,
    downloadAndInstall,
  } = useUpdateStore();

  // Check for updates on mount
  useEffect(() => {
    checkForUpdates();
  }, [checkForUpdates]);

  if (!update && !error) return null;

  return (
    <AnimatePresence>
      {(update || error) && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-4 right-4 z-50"
        >
          <div className="card p-4 max-w-sm">
            {error ? (
              <div className="text-accent-rose text-sm">{error}</div>
            ) : update ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-display text-sm text-accent-cyan">
                    UPDATE AVAILABLE
                  </span>
                  <span className="font-mono text-xs text-text-muted">
                    v{update.version}
                  </span>
                </div>

                {update.body && (
                  <p className="text-text-secondary text-sm line-clamp-3">
                    {update.body}
                  </p>
                )}

                {downloading ? (
                  <div className="space-y-2">
                    <div className="h-2 bg-bg-elevated rounded overflow-hidden">
                      <motion.div
                        className="h-full bg-accent-cyan"
                        initial={{ width: 0 }}
                        animate={{ width: `${downloadProgress}%` }}
                      />
                    </div>
                    <span className="text-xs text-text-muted font-mono">
                      Downloading... {downloadProgress}%
                    </span>
                  </div>
                ) : (
                  <button
                    onClick={downloadAndInstall}
                    className="w-full px-4 py-2 bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/50 rounded hover:bg-accent-cyan/30 transition-colors flex items-center justify-center gap-2"
                  >
                    <Download size={16} />
                    Download & Install
                  </button>
                )}
              </div>
            ) : null}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

---

## Task 7: Integrate UpdateChecker in App

**Files:**
- Modify: `src/App.tsx`

**Step 1: Add UpdateChecker to App**

Import and add the component:
```typescript
import { UpdateChecker } from './components/UpdateChecker';

function App() {
  return (
    <>
      {/* ... existing app content ... */}
      <UpdateChecker />
    </>
  );
}
```

---

## Task 8: Setup GitHub Actions for Signed Releases

**Files:**
- Create: `.github/workflows/release.yml`

**Step 1: Create release workflow**

```yaml
name: Release
on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    permissions:
      contents: write
    strategy:
      fail-fast: false
      matrix:
        include:
          - platform: 'macos-latest'
            args: '--target aarch64-apple-darwin'
          - platform: 'macos-latest'
            args: '--target x86_64-apple-darwin'
          - platform: 'ubuntu-22.04'
            args: ''
          - platform: 'windows-latest'
            args: ''

    runs-on: ${{ matrix.platform }}
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install Rust stable
        uses: dtolnay/rust-toolchain@stable
        with:
          targets: ${{ matrix.platform == 'macos-latest' && 'aarch64-apple-darwin,x86_64-apple-darwin' || '' }}

      - name: Install dependencies (Ubuntu only)
        if: matrix.platform == 'ubuntu-22.04'
        run: |
          sudo apt-get update
          sudo apt-get install -y libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf

      - name: Install pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8

      - name: Install frontend dependencies
        run: pnpm install

      - name: Build Tauri App
        uses: tauri-apps/tauri-action@v0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          TAURI_SIGNING_PRIVATE_KEY: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY }}
          TAURI_SIGNING_PRIVATE_KEY_PASSWORD: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY_PASSWORD }}
        with:
          tagName: v__VERSION__
          releaseName: 'Sixarms v__VERSION__'
          releaseBody: 'See the assets to download and install this version.'
          releaseDraft: true
          prerelease: false
          args: ${{ matrix.args }}
```

**Step 2: Add GitHub Secrets**

In your GitHub repository settings, add these secrets:
- `TAURI_SIGNING_PRIVATE_KEY`: Content of `~/.tauri/sixarms.key`
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`: The password used when generating the key (if any)

---

## Task 9: Create Update Manifest Generator

**Files:**
- Create: `scripts/generate-update-manifest.js`

This script generates the `latest.json` file that the updater checks.

```javascript
const fs = require('fs');
const path = require('path');

const version = process.argv[2];
if (!version) {
  console.error('Usage: node generate-update-manifest.js <version>');
  process.exit(1);
}

const manifest = {
  version,
  notes: 'See release notes on GitHub',
  pub_date: new Date().toISOString(),
  platforms: {
    'darwin-aarch64': {
      signature: '', // Fill from .sig file
      url: `https://github.com/user/sixarms/releases/download/v${version}/Sixarms_${version}_aarch64.app.tar.gz`
    },
    'darwin-x86_64': {
      signature: '',
      url: `https://github.com/user/sixarms/releases/download/v${version}/Sixarms_${version}_x64.app.tar.gz`
    },
    'linux-x86_64': {
      signature: '',
      url: `https://github.com/user/sixarms/releases/download/v${version}/sixarms_${version}_amd64.AppImage`
    },
    'windows-x86_64': {
      signature: '',
      url: `https://github.com/user/sixarms/releases/download/v${version}/Sixarms_${version}_x64-setup.exe`
    }
  }
};

fs.writeFileSync('latest.json', JSON.stringify(manifest, null, 2));
console.log('Generated latest.json');
```

---

## Summary

### Implementation Order:
1. Generate signing keys (one-time setup)
2. Install dependencies
3. Register plugin in Rust
4. Configure tauri.conf.json
5. Add permissions
6. Create UI components
7. Integrate in App
8. Setup CI/CD
9. Test with a release

### Key Environment Variables for CI:
- `TAURI_SIGNING_PRIVATE_KEY` - Private key content
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` - Key password (if set)

### Testing:
1. Create a release with version higher than current
2. Build and run the app
3. App should detect the update and show notification
4. Click "Download & Install" to test the full flow

### Security Notes:
- Never commit private keys
- Use GitHub Secrets for CI/CD
- Public key is safe to commit
- Users will only install updates signed with your private key
