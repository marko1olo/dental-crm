/**
 * DENTE CRM — Desktop Package Builder & Validator
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const electronDir = path.resolve(__dirname, "..");
const webDistDir = path.resolve(electronDir, "../apps/web/dist");

console.log("[Desktop Packaging] Validating Windows Desktop standalone runtime assets...");

// 1. Check electron main, preload and builder config
const mainPath = path.join(electronDir, "main.cjs");
const preloadPath = path.join(electronDir, "preload.cjs");
const builderConfigPath = path.join(electronDir, "electron-builder.json");
const packageJsonPath = path.join(electronDir, "package.json");

if (!fs.existsSync(mainPath)) {
	throw new Error(`Missing Electron main process file: ${mainPath}`);
}
if (!fs.existsSync(preloadPath)) {
	throw new Error(`Missing Electron preload script: ${preloadPath}`);
}
if (!fs.existsSync(builderConfigPath)) {
	throw new Error(`Missing Electron builder config: ${builderConfigPath}`);
}
if (!fs.existsSync(packageJsonPath)) {
	throw new Error(`Missing Electron package.json: ${packageJsonPath}`);
}

// 2. Validate electron-builder.json structure
const builderConfig = JSON.parse(fs.readFileSync(builderConfigPath, "utf8"));
if (!builderConfig.appId || !builderConfig.win) {
	throw new Error("Invalid electron-builder.json: missing appId or win target definition");
}

const requiredWinTargets = ["nsis", "portable"];
const winTargetNames = (builderConfig.win.target || []).map((t) => (typeof t === "string" ? t : t.target));
for (const target of requiredWinTargets) {
	if (!winTargetNames.includes(target)) {
		throw new Error(`Missing required Windows build target: ${target}`);
	}
}

// Validate file associations
const requiredExts = ["dcm", "dicom", "dente"];
const associatedExts = (builderConfig.win.fileAssociations || []).map((f) => f.ext.replace(/^\./, ""));
for (const ext of requiredExts) {
	if (!associatedExts.includes(ext)) {
		throw new Error(`Missing file association for .${ext}`);
	}
}

// 3. Validate main.cjs hardware exports
const mainModule = await import(pathToFileURL(mainPath).href);
const requiredExports = [
	"getWindowsSerialPorts",
	"getTwainDevices",
	"getSystemPrinters",
	"printThermalLabel",
	"printEscPosReceipt",
	"printFiscalReceiptTcpSocket",
	"setupDicomFolderWatch",
	"unwatchDicomFolder",
	"checkKktStatusTcpSocket",
	"parseDicomFilenameMetadata",
];

for (const fnName of requiredExports) {
	if (typeof mainModule[fnName] !== "function" && typeof mainModule.default?.[fnName] !== "function") {
		throw new Error(`Missing required desktop hardware export in main.cjs: ${fnName}`);
	}
}

// 4. Verify IPC channels alignment in preload.cjs
const preloadContent = fs.readFileSync(preloadPath, "utf8");
const expectedChannels = [
	"dente:list-serial-ports",
	"dente:list-twain-devices",
	"dente:acquire-twain-image",
	"dente:list-printers",
	"dente:print-thermal-label",
	"dente:print-escpos-receipt",
	"dente:print-fiscal-receipt-tcp",
	"dente:check-kkt-status-tcp",
	"dente:watch-dicom-folder",
	"dente:unwatch-dicom-folder",
	"dente:dicom-file-detected",
];

for (const ch of expectedChannels) {
	if (!preloadContent.includes(ch)) {
		throw new Error(`Missing IPC channel in preload.cjs: ${ch}`);
	}
}

console.log(`[Desktop Packaging] Verified builder config: ${builderConfig.appId} (${builderConfig.productName})`);
console.log(`[Desktop Packaging] Targets: ${winTargetNames.join(", ")}`);
console.log(`[Desktop Packaging] File associations: ${associatedExts.map((e) => `.${e}`).join(", ")}`);
console.log(`[Desktop Packaging] Validated ${requiredExports.length} native hardware drivers & ${expectedChannels.length} IPC channels.`);
console.log("[Desktop Packaging] SUCCESS: Desktop standalone runtime configuration is valid.");
