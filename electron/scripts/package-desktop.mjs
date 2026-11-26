/**
 * DENTE CRM — Desktop Package Builder & Validator
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const electronDir = path.resolve(__dirname, "..");

console.log("[Desktop Packaging] Validating Windows Desktop standalone runtime assets...");

const mainPath = path.join(electronDir, "main.cjs");
const preloadPath = path.join(electronDir, "preload.cjs");
const builderConfigPath = path.join(electronDir, "electron-builder.json");
const packageJsonPath = path.join(electronDir, "package.json");

const requiredModules = [
	"src/desktopLogger.cjs",
	"src/loopbackHttpServer.cjs",
	"src/embeddedServerSupervisor.cjs",
	"src/kktProtocolFramingCjs.cjs",
	"src/kktHardwareDriver.cjs",
	"src/printerAndSerialBridge.cjs",
	"src/twainWiaScannerBridge.cjs",
	"src/dentalHardwareCatalog.cjs",
	"src/dentalHardwarePresets.cjs",
	"src/imagingExchangeProtocols.cjs",
	"src/ctDownloadsScanner.cjs",
	"src/ctViewerBridge.cjs",
	"src/lanBeaconDesktopBridge.cjs",
	"src/autoBackupVaultRunner.cjs",
	"src/windowLifecycleAndUpdater.cjs",
	"src/ipcHandlers.cjs",
];

for (const filePath of [mainPath, preloadPath, builderConfigPath, packageJsonPath]) {
	if (!fs.existsSync(filePath)) {
		throw new Error(`Missing required Electron file: ${filePath}`);
	}
}
for (const relMod of requiredModules) {
	const modPath = path.join(electronDir, relMod);
	if (!fs.existsSync(modPath)) {
		throw new Error(`Missing decomposed Electron module: ${modPath}`);
	}
}

const pkgJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
if (!pkgJson.devDependencies?.electron || !pkgJson.devDependencies?.["electron-builder"]) {
	throw new Error("electron/package.json must declare electron and electron-builder in devDependencies");
}

const builderConfig = JSON.parse(fs.readFileSync(builderConfigPath, "utf8"));
if (!builderConfig.appId || !builderConfig.win) {
	throw new Error("Invalid electron-builder.json: missing appId or win target definition");
}

const winTargetNames = (builderConfig.win.target || []).map((t) => (typeof t === "string" ? t : t.target));
for (const target of ["nsis", "portable"]) {
	if (!winTargetNames.includes(target)) {
		throw new Error(`Missing required Windows build target: ${target}`);
	}
}

const associatedExts = (builderConfig.win.fileAssociations || []).map((f) => f.ext.replace(/^\./, ""));
for (const ext of ["dcm", "dicom", "dente"]) {
	if (!associatedExts.includes(ext)) {
		throw new Error(`Missing file association for .${ext}`);
	}
}

const mainModule = await import(pathToFileURL(mainPath).href);
const requiredExports = [
	"getWindowsSerialPorts",
	"getTwainDevices",
	"acquireTwainImage",
	"validateHotFolderPath",
	"getSystemPrinters",
	"printThermalLabel",
	"printEscPosReceipt",
	"printFiscalReceiptTcpSocket",
	"printAtol10FiscalReceipt",
	"printShtrihMFiscalReceipt",
	"setupDicomFolderWatch",
	"unwatchDicomFolder",
	"checkKktStatusTcpSocket",
	"parseDicomFilenameMetadata",
	"toggleFullScreen",
	"toggleKioskMode",
	"getWindowState",
	"getLocalServerStatus",
	"switchLocalDatabaseMode",
	"startLoopbackHttpServer",
	"stopLoopbackHttpServer",
	"checkForDesktopUpdates",
	"installDesktopUpdate",
];

for (const fnName of requiredExports) {
	const exportCandidate = mainModule[fnName] ?? mainModule.default?.[fnName];
	if (typeof exportCandidate !== "function") {
		throw new Error(`Missing required desktop hardware export in main.cjs: ${fnName}`);
	}
}

const preloadContent = fs.readFileSync(preloadPath, "utf8");
const expectedChannels = [
	"dente:list-serial-ports",
	"dente:list-twain-devices",
	"dente:acquire-twain-image",
	"dente:list-printers",
	"dente:print-thermal-label",
	"dente:print-escpos-receipt",
	"dente:print-fiscal-receipt-tcp",
	"dente:print-atol10-fiscal-receipt",
	"dente:print-shtrih-fiscal-receipt",
	"dente:check-kkt-status-tcp",
	"dente:watch-dicom-folder",
	"dente:unwatch-dicom-folder",
	"dente:dicom-file-detected",
	"dente:toggle-fullscreen",
	"dente:toggle-kiosk",
	"dente:get-window-state",
	"dente:get-local-server-status",
	"dente:switch-local-database-mode",
	"dente:check-for-updates",
	"dente:install-update",
	"dente:update-available",
];

for (const ch of expectedChannels) {
	if (!preloadContent.includes(ch)) {
		throw new Error(`Missing IPC channel in preload.cjs: ${ch}`);
	}
}

console.log(`[Desktop Packaging] Verified builder config: ${builderConfig.appId} (${builderConfig.productName})`);
console.log(`[Desktop Packaging] Targets: ${winTargetNames.join(", ")}`);
console.log(`[Desktop Packaging] Validated ${requiredModules.length} CJS modules, ${requiredExports.length} exports & ${expectedChannels.length} IPC channels.`);
console.log("[Desktop Packaging] SUCCESS: Desktop standalone runtime configuration is valid.");
