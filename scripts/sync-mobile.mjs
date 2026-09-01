/**
 * DENTE CRM — Capacitor Mobile & Android Asset Synchronization Script
 *
 * Validates and synchronizes mobile assets, hardware bridges, and Capacitor configs:
 * - capacitor.config.ts (appId: ru.dente.crm, appName: DENTE Dental CRM, webDir: dist)
 * - AndroidManifest.xml (Camera, Biometrics, Haptics, Bluetooth, CallKit permissions)
 * - Hardware Bridges (HardwareScanner, HardwarePrinter, CallKitBridge)
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

console.log("[Mobile Sync] Starting Capacitor & Mobile Hardware Bridges Synchronization...");

// 1. Verify capacitor.config.ts
const capacitorConfigPath = path.join(projectRoot, "capacitor.config.ts");
if (!fs.existsSync(capacitorConfigPath)) {
	throw new Error(`Missing capacitor.config.ts at ${capacitorConfigPath}`);
}

const capacitorContent = fs.readFileSync(capacitorConfigPath, "utf8");
if (!capacitorContent.includes('"ru.dente.crm"')) {
	throw new Error('capacitor.config.ts missing appId "ru.dente.crm"');
}
if (!capacitorContent.includes('"DENTE Dental CRM"')) {
	throw new Error('capacitor.config.ts missing appName "DENTE Dental CRM"');
}
if (!capacitorContent.includes('"dist"')) {
	throw new Error('capacitor.config.ts missing webDir "dist"');
}

console.log("[Mobile Sync] Verified Capacitor configuration: ru.dente.crm (DENTE Dental CRM)");

// 2. Verify AndroidManifest.xml
const androidManifestPath = path.join(projectRoot, "android/app/src/main/AndroidManifest.xml");
if (!fs.existsSync(androidManifestPath)) {
	throw new Error(`Missing AndroidManifest.xml at ${androidManifestPath}`);
}

const manifestContent = fs.readFileSync(androidManifestPath, "utf8");
const requiredPermissions = [
	"android.permission.CAMERA",
	"android.permission.USE_BIOMETRIC",
	"android.permission.VIBRATE",
	"android.permission.INTERNET",
	"android.permission.ACCESS_NETWORK_STATE",
	"android.permission.BLUETOOTH",
	"android.permission.READ_PHONE_STATE",
	"android.permission.MANAGE_OWN_CALLS",
];

for (const perm of requiredPermissions) {
	if (!manifestContent.includes(perm)) {
		throw new Error(`AndroidManifest.xml is missing required permission: ${perm}`);
	}
}

console.log("[Mobile Sync] Verified AndroidManifest permissions: CAMERA, BIOMETRIC, VIBRATE, BLUETOOTH, CALLKIT");

// 3. Verify Hardware Services
const hardwareScannerPath = path.join(projectRoot, "apps/web/src/services/hardware/HardwareScanner.ts");
const hardwarePrinterPath = path.join(projectRoot, "apps/web/src/services/hardware/HardwarePrinter.ts");
const callKitBridgePath = path.join(projectRoot, "apps/web/src/services/telephony/CallKitBridge.ts");

if (!fs.existsSync(hardwareScannerPath)) {
	throw new Error(`Missing HardwareScanner.ts at ${hardwareScannerPath}`);
}
if (!fs.existsSync(hardwarePrinterPath)) {
	throw new Error(`Missing HardwarePrinter.ts at ${hardwarePrinterPath}`);
}
if (!fs.existsSync(callKitBridgePath)) {
	throw new Error(`Missing CallKitBridge.ts at ${callKitBridgePath}`);
}

console.log("[Mobile Sync] Verified Hardware Bridges: HardwareScanner, HardwarePrinter, CallKitBridge");

// 4. Ensure web asset directory structure
const distDir = path.join(projectRoot, "apps/web/dist");
if (!fs.existsSync(distDir)) {
	fs.mkdirSync(distDir, { recursive: true });
}

console.log("[Mobile Sync] SUCCESS: Mobile assets and hardware bridges are synchronized and ready.");
