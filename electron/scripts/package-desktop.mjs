/**
 * DENTE CRM — Desktop Package Builder & Validator
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const electronDir = path.resolve(__dirname, "..");
const webDistDir = path.resolve(electronDir, "../apps/web/dist");

console.log("[Desktop Packaging] Validating Windows Desktop standalone runtime assets...");

// 1. Check electron main & preload
const mainPath = path.join(electronDir, "main.cjs");
const preloadPath = path.join(electronDir, "preload.cjs");
const builderConfigPath = path.join(electronDir, "electron-builder.json");

if (!fs.existsSync(mainPath)) {
	throw new Error(`Missing Electron main process file: ${mainPath}`);
}
if (!fs.existsSync(preloadPath)) {
	throw new Error(`Missing Electron preload script: ${preloadPath}`);
}
if (!fs.existsSync(builderConfigPath)) {
	throw new Error(`Missing Electron builder config: ${builderConfigPath}`);
}

const builderConfig = JSON.parse(fs.readFileSync(builderConfigPath, "utf8"));
if (!builderConfig.appId || !builderConfig.win) {
	throw new Error("Invalid electron-builder.json: missing appId or win target definition");
}

console.log(`[Desktop Packaging] Verified builder config: ${builderConfig.appId} (${builderConfig.productName})`);
console.log(`[Desktop Packaging] Targets: ${builderConfig.win.target.map((t) => t.target).join(", ")}`);
console.log(`[Desktop Packaging] File associations: ${builderConfig.win.fileAssociations.map((f) => `.${f.ext}`).join(", ")}`);
console.log("[Desktop Packaging] SUCCESS: Desktop standalone runtime configuration is valid.");
