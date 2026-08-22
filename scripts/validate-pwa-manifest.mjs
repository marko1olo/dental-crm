/**
 * DENTE CRM — PWA Web Manifest & Service Worker Validator
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const manifestPath = path.join(projectRoot, "apps/web/public/manifest.webmanifest");
const swPath = path.join(projectRoot, "apps/web/public/sw.js");
const iconPath = path.join(projectRoot, "apps/web/public/icon.svg");

console.log("[PWA Validation] Validating Web App Manifest & Service Worker...");

// 1. Check Web App Manifest
if (!fs.existsSync(manifestPath)) {
	throw new Error(`Missing manifest.webmanifest at ${manifestPath}`);
}

const rawManifest = fs.readFileSync(manifestPath, "utf8");
const manifest = JSON.parse(rawManifest);

if (!manifest.name || !manifest.short_name || !manifest.start_url || !manifest.display) {
	throw new Error("PWA manifest is missing required core fields (name, short_name, start_url, display)");
}

if (manifest.display !== "standalone") {
	throw new Error(`PWA display mode should be standalone, got: ${manifest.display}`);
}

if (!Array.isArray(manifest.icons) || manifest.icons.length === 0) {
	throw new Error("PWA manifest must declare at least one icon");
}

if (!Array.isArray(manifest.shortcuts) || manifest.shortcuts.length < 3) {
	throw new Error("PWA manifest must provide clinical shortcuts (Form 043/u, Schedule, Finance)");
}

// 2. Check icon file
if (!fs.existsSync(iconPath)) {
	throw new Error(`Missing icon asset at ${iconPath}`);
}

// 3. Check Service Worker
if (!fs.existsSync(swPath)) {
	throw new Error(`Missing service worker at ${swPath}`);
}

const swContent = fs.readFileSync(swPath, "utf8");
if (!swContent.includes("addEventListener(\"install\"") || !swContent.includes("addEventListener(\"fetch\"")) {
	throw new Error("sw.js is missing required install or fetch event listeners");
}

console.log(`[PWA Validation] Manifest Name: "${manifest.name}" (${manifest.short_name})`);
console.log(`[PWA Validation] Display Mode: ${manifest.display}`);
console.log(`[PWA Validation] Shortcuts: ${manifest.shortcuts.map((s) => s.name).join("; ")}`);
console.log(`[PWA Validation] Icons: ${manifest.icons.length} configured`);
console.log("[PWA Validation] SUCCESS: Web PWA Standalone Runtime is 100% compliant.");
