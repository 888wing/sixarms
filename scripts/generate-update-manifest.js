/**
 * Generate update manifest (latest.json) for Tauri updater
 *
 * Usage: node generate-update-manifest.js <version>
 * Example: node generate-update-manifest.js 0.2.0
 *
 * This script generates a latest.json file that the Tauri updater checks
 * to determine if a new version is available.
 *
 * Note: The signature fields need to be filled with actual .sig file contents
 * after the build artifacts are created.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration - Update these values for your repository
const GITHUB_OWNER = '888wing';
const GITHUB_REPO = 'sixarms';

const version = process.argv[2];

if (!version) {
  console.error('Usage: node generate-update-manifest.js <version>');
  console.error('Example: node generate-update-manifest.js 0.2.0');
  process.exit(1);
}

const baseUrl = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/download/v${version}`;

const manifest = {
  version,
  notes: `See the release notes on GitHub for v${version}`,
  pub_date: new Date().toISOString(),
  platforms: {
    'darwin-aarch64': {
      signature: '',  // Will be filled from .sig file
      url: `${baseUrl}/Sixarms_${version}_aarch64.app.tar.gz`
    },
    'darwin-x86_64': {
      signature: '',  // Will be filled from .sig file
      url: `${baseUrl}/Sixarms_${version}_x64.app.tar.gz`
    },
    'linux-x86_64': {
      signature: '',  // Will be filled from .sig file
      url: `${baseUrl}/sixarms_${version}_amd64.AppImage`
    },
    'windows-x86_64': {
      signature: '',  // Will be filled from .sig file
      url: `${baseUrl}/Sixarms_${version}_x64-setup.exe`
    }
  }
};

// Try to read signature files if they exist (in CI environment)
const sigFiles = {
  'darwin-aarch64': `Sixarms_${version}_aarch64.app.tar.gz.sig`,
  'darwin-x86_64': `Sixarms_${version}_x64.app.tar.gz.sig`,
  'linux-x86_64': `sixarms_${version}_amd64.AppImage.sig`,
  'windows-x86_64': `Sixarms_${version}_x64-setup.exe.sig`
};

for (const [platform, sigFile] of Object.entries(sigFiles)) {
  const sigPath = path.join(process.cwd(), sigFile);
  if (fs.existsSync(sigPath)) {
    manifest.platforms[platform].signature = fs.readFileSync(sigPath, 'utf8').trim();
    console.log(`Found signature for ${platform}`);
  }
}

const outputPath = path.join(process.cwd(), 'latest.json');
fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2));

console.log(`Generated latest.json for version ${version}`);
console.log(`Output: ${outputPath}`);

// Warn if no signatures were found
const hasSignatures = Object.values(manifest.platforms).some(p => p.signature);
if (!hasSignatures) {
  console.warn('\nWarning: No signature files found.');
  console.warn('Signatures will need to be added manually or by the CI pipeline.');
}
