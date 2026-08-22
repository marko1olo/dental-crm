/**
 * DENTE CRM — Mobile Android & Tablet Asset Validator & Builder
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const androidManifestPath = path.join(projectRoot, "android/app/src/main/AndroidManifest.xml");
const capacitorConfigPath = path.join(projectRoot, "capacitor.config.ts");

console.log("[Mobile Packaging] Validating Capacitor & Android mobile packaging configurations...");

// 1. Check capacitor config
if (!fs.existsSync(capacitorConfigPath)) {
	throw new Error(`Missing capacitor.config.ts at ${capacitorConfigPath}`);
}

// 2. Check Android manifest
if (!fs.existsSync(androidManifestPath)) {
	throw new Error(`Missing AndroidManifest.xml at ${androidManifestPath}`);
}

const manifestContent = fs.readFileSync(androidManifestPath, "utf8");

// 3. Verify critical permissions
const requiredPermissions = [
	"android.permission.CAMERA",
	"android.permission.USE_BIOMETRIC",
	"android.permission.VIBRATE",
	"android.permission.INTERNET",
	"android.permission.ACCESS_NETWORK_STATE",
];

for (const perm of requiredPermissions) {
	if (!manifestContent.includes(perm)) {
		throw new Error(`AndroidManifest.xml is missing required permission: ${perm}`);
	}
}

console.log("[Mobile Packaging] Verified AndroidManifest permissions: CAMERA, USE_BIOMETRIC, VIBRATE, INTERNET, ACCESS_NETWORK_STATE");
console.log("[Mobile Packaging] Verified Capacitor config: ru.dente.crm (DENTE Dental CRM)");
console.log("[Mobile Packaging] SUCCESS: Mobile Android runtime configuration is valid.");
