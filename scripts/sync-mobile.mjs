/**
 * DENTE CRM — Capacitor Mobile & Android Asset Synchronization Script
 *
 * Validates single root capacitor.config.ts (appId: ru.dente.crm), @capacitor/* packages,
 * AndroidManifest.xml (Camera, Biometrics, Multicast Wi-Fi LAN, Bluetooth, CallKit),
 * native Hardware/Telephony bridges, and mirrors built web assets for Capacitor Android.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

console.log("[Mobile Sync] Starting Capacitor & Mobile Hardware Bridges Synchronization...");

// 1. Verify single root capacitor.config.ts (no duplicate in apps/web)
const capacitorConfigPath = path.join(projectRoot, "capacitor.config.ts");
const duplicateConfigPath = path.join(projectRoot, "apps/web/capacitor.config.ts");
if (!fs.existsSync(capacitorConfigPath)) {
	throw new Error(`Missing capacitor.config.ts at ${capacitorConfigPath}`);
}
if (fs.existsSync(duplicateConfigPath)) {
	throw new Error(`Duplicate apps/web/capacitor.config.ts exists; keep single root SSOT.`);
}

const capacitorContent = fs.readFileSync(capacitorConfigPath, "utf8");
for (const needle of ['"ru.dente.crm"', '"DENTE Dental CRM"', '"dist"']) {
	if (!capacitorContent.includes(needle)) {
		throw new Error(`capacitor.config.ts missing ${needle}`);
	}
}

// 2. Verify @capacitor/* deps in apps/web/package.json
const webPkgPath = path.join(projectRoot, "apps/web/package.json");
const webPkg = JSON.parse(fs.readFileSync(webPkgPath, "utf8").replace(/^\uFEFF/, ""));
const allDeps = { ...(webPkg.dependencies ?? {}), ...(webPkg.devDependencies ?? {}) };
for (const pkg of ["@capacitor/core", "@capacitor/cli", "@capacitor/android", "@capacitor/camera", "@capacitor/network", "@capacitor/preferences", "@capacitor/filesystem"]) {
	if (!allDeps[pkg]) {
		throw new Error(`apps/web/package.json missing dependency: ${pkg}`);
	}
}

// 3. Verify AndroidManifest.xml & Gradle project structure
const androidManifestPath = path.join(projectRoot, "android/app/src/main/AndroidManifest.xml");
if (!fs.existsSync(androidManifestPath)) {
	throw new Error(`Missing AndroidManifest.xml at ${androidManifestPath}`);
}
const manifestContent = fs.readFileSync(androidManifestPath, "utf8");
for (const perm of [
	"android.permission.CAMERA",
	"android.permission.USE_BIOMETRIC",
	"android.permission.VIBRATE",
	"android.permission.INTERNET",
	"android.permission.ACCESS_NETWORK_STATE",
	"android.permission.ACCESS_WIFI_STATE",
	"android.permission.CHANGE_WIFI_MULTICAST_STATE",
	"android.permission.BLUETOOTH",
	"android.permission.READ_PHONE_STATE",
	"android.permission.MANAGE_OWN_CALLS",
]) {
	if (!manifestContent.includes(perm)) {
		throw new Error(`AndroidManifest.xml is missing required permission: ${perm}`);
	}
}

// 4. Verify Hardware Services
for (const rel of [
	"apps/web/src/services/hardware/HardwareScanner.ts",
	"apps/web/src/services/hardware/HardwarePrinter.ts",
	"apps/web/src/services/telephony/CallKitBridge.ts",
	"android/settings.gradle",
	"android/app/src/main/java/ru/dente/crm/MainActivity.java",
]) {
	if (!fs.existsSync(path.join(projectRoot, rel))) {
		throw new Error(`Missing required mobile file: ${rel}`);
	}
}

// 5. Mirror web dist into Android WebView public assets when available
const webDistDir = path.join(projectRoot, "apps/web/dist");
const androidAssetsDir = path.join(projectRoot, "android/app/src/main/assets/public");
if (fs.existsSync(webDistDir)) {
	fs.cpSync(webDistDir, androidAssetsDir, { recursive: true, force: true });
}

console.log("[Mobile Sync] SUCCESS: Mobile assets, Capacitor packages, and hardware bridges are synchronized.");
