/**
 * DENTE CRM — Mobile Android & Tablet Asset Validator & Packager Helper
 *
 * Validates single root capacitor.config.ts, Android Gradle scaffold, @capacitor/* dependencies,
 * AndroidManifest permissions (including CHANGE_WIFI_MULTICAST_STATE for mDNS),
 * and reports honest host APK toolchain readiness (Java >= 17 + ANDROID_HOME).
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const requiredAndroidFiles = [
	"capacitor.config.ts",
	"android/build.gradle",
	"android/settings.gradle",
	"android/gradle.properties",
	"android/variables.gradle",
	"android/app/build.gradle",
	"android/app/src/main/AndroidManifest.xml",
	"android/app/src/main/java/ru/dente/crm/MainActivity.java",
	"android/app/src/main/res/xml/file_paths.xml",
	"android/app/src/main/res/values/strings.xml",
	"android/app/src/main/res/values/styles.xml",
];

for (const rel of requiredAndroidFiles) {
	const full = path.join(projectRoot, rel);
	if (!fs.existsSync(full)) {
		throw new Error(`[Mobile Packaging] Missing required Android/Capacitor file: ${rel}`);
	}
}

const webPkgPath = path.join(projectRoot, "apps/web/package.json");
const webPkg = JSON.parse(fs.readFileSync(webPkgPath, "utf8").replace(/^\uFEFF/, ""));
const allDeps = { ...(webPkg.dependencies ?? {}), ...(webPkg.devDependencies ?? {}) };
const requiredCapacitorPackages = [
	"@capacitor/core",
	"@capacitor/cli",
	"@capacitor/android",
	"@capacitor/camera",
	"@capacitor/network",
	"@capacitor/preferences",
	"@capacitor/filesystem",
];
for (const pkg of requiredCapacitorPackages) {
	if (!allDeps[pkg]) {
		throw new Error(`[Mobile Packaging] Missing Capacitor package in apps/web/package.json: ${pkg}`);
	}
}

const manifestPath = path.join(projectRoot, "android/app/src/main/AndroidManifest.xml");
const manifestContent = fs.readFileSync(manifestPath, "utf8");
const requiredPermissions = [
	"android.permission.CAMERA",
	"android.permission.USE_BIOMETRIC",
	"android.permission.VIBRATE",
	"android.permission.INTERNET",
	"android.permission.ACCESS_NETWORK_STATE",
	"android.permission.ACCESS_WIFI_STATE",
	"android.permission.CHANGE_WIFI_MULTICAST_STATE",
	"android.permission.BLUETOOTH_CONNECT",
	"android.permission.BLUETOOTH_SCAN",
];
for (const perm of requiredPermissions) {
	if (!manifestContent.includes(perm)) {
		throw new Error(`[Mobile Packaging] AndroidManifest.xml is missing required permission: ${perm}`);
	}
}

const webDistDir = path.join(projectRoot, "apps/web/dist");
const androidAssetsDir = path.join(projectRoot, "android/app/src/main/assets/public");
if (fs.existsSync(webDistDir)) {
	fs.cpSync(webDistDir, androidAssetsDir, { recursive: true, force: true });
	console.log(`[Mobile Packaging] Synced built web bundle (${webDistDir}) -> ${androidAssetsDir}`);
} else {
	console.log("[Mobile Packaging] INFO: apps/web/dist not built yet — run `npm run build -w @dental/web` before APK bundling.");
}

function detectJavaMajorVersion() {
	try {
		const out = execFileSync("java", ["-version"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
		return out;
	} catch (err) {
		if (err && typeof err === "object" && "stderr" in err && typeof err.stderr === "string") {
			return err.stderr;
		}
		return "";
	}
}

const javaVersionText = detectJavaMajorVersion();
const javaMatch = javaVersionText.match(/version\s+"(\d+)(?:\.(\d+))?/i);
const javaMajor = javaMatch ? (javaMatch[1] === "1" ? Number(javaMatch[2] ?? 0) : Number(javaMatch[1])) : 0;
const androidHome = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || "";
const canCompileApk = javaMajor >= 17 && Boolean(androidHome);

if (!canCompileApk && process.argv.includes("--require-apk")) {
	throw new Error(
		`[Mobile Packaging] Cannot compile .apk on this host: AGP 8.2.1 requires Java >= 17 (detected ${javaMajor || "none"}) and ANDROID_HOME (${androidHome || "unset"}).`,
	);
}

console.log(
	`[Mobile Packaging] Config OK (ru.dente.crm, Capacitor ${allDeps["@capacitor/core"]}, multicast LAN permission verified). Host APK build toolchain ready: ${canCompileApk} (Java ${javaMajor || "none"}, ANDROID_HOME=${androidHome ? "set" : "unset"}).`,
);
