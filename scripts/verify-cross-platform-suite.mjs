/**
 * DENTE CRM — Universal Cross-Platform Packaging & Resilience Verification Suite
 */

import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

console.log("================================================================================");
console.log("  DENTE DENTAL CRM — UNIVERSAL CROSS-PLATFORM VERIFICATION SUITE");
console.log("  Platforms: Windows Desktop (.EXE) | Mobile Android (.APK) | Web PWA Standalone");
console.log("================================================================================");

const steps = [
	{
		name: "1. Desktop Windows Standalone Runtime (.EXE) Harness",
		cmd: "node --test electron/test/desktopHarness.test.mjs",
		cwd: projectRoot,
	},
	{
		name: "2. Desktop Package Assets & Builder Configuration",
		cmd: "node electron/scripts/package-desktop.mjs",
		cwd: projectRoot,
	},
	{
		name: "3. Mobile Android Capacitor & AndroidManifest Permissions",
		cmd: "node scripts/build-mobile-assets.mjs",
		cwd: projectRoot,
	},
	{
		name: "4. Mobile Android GS1 DataMatrix (МДЛП) & Biometric Auth Suite",
		cmd: "node --import tsx --import ./testCssStub.mjs --test src/tests/mobileNativeBridge.test.ts",
		cwd: path.join(projectRoot, "apps/web"),
	},
	{
		name: "5. Desktop Silent Thermal Label Printing & Form Factors Suite",
		cmd: "node --import tsx --import ./testCssStub.mjs --test src/tests/desktopSilentPrint.test.ts",
		cwd: path.join(projectRoot, "apps/web"),
	},
	{
		name: "6. Web PWA Standalone Manifest & Service Worker Compliance",
		cmd: "node scripts/validate-pwa-manifest.mjs",
		cwd: projectRoot,
	},
	{
		name: "7. PWA Manifest & Offline Outbox Unit Suite",
		cmd: "node --import tsx --import ./testCssStub.mjs --test src/tests/pwaManifestAndOfflineOutbox.test.ts",
		cwd: path.join(projectRoot, "apps/web"),
	},
	{
		name: "8. Universal Hardware Dispatcher & Multi-Platform Bridges Suite",
		cmd: "node --import tsx --import ./testCssStub.mjs --test src/tests/multiPlatformNativeBridges.test.ts src/tests/hardwareBridgeMultiPlatform.test.ts",
		cwd: path.join(projectRoot, "apps/web"),
	},
	{
		name: "9. Local Clinic Server Discovery & Offline Failover Suite",
		cmd: "node --import tsx --import ./testCssStub.mjs --test src/tests/lanServerDiscovery.test.ts",
		cwd: path.join(projectRoot, "apps/web"),
	},
	{
		name: "10. 3-Tier Offline Mutation Outbox & Network Connectivity Engine",
		cmd: "node --import tsx --import ./testCssStub.mjs --test src/tests/offlineMutationQueue.test.ts",
		cwd: path.join(projectRoot, "apps/web"),
	},
	{
		name: "11. SanPiN 3.3686-21 Kraft Package TSPL/ZPL Thermal Label Suite",
		cmd: "node --import tsx --import ./testCssStub.mjs --test src/tests/kraftPackage.test.ts",
		cwd: path.join(projectRoot, "apps/web"),
	},
	{
		name: "12. Visiograph 2D/3D & RVG Tonal Processing Suite",
		cmd: "node --import tsx --import ./testCssStub.mjs --test src/components/visiograph/__tests__/visiographImageProcessing.test.ts src/components/visiograph/__tests__/visiographPresetsAndMath.test.ts",
		cwd: path.join(projectRoot, "apps/web"),
	},
	{
		name: "13. Clinical Document Camera Scanner & Russian ID/Insurance OCR Suite",
		cmd: "node --import tsx --import ./testCssStub.mjs --test src/components/scanner/__tests__/documentScannerEngine.test.ts",
		cwd: path.join(projectRoot, "apps/web"),
	},
	{
		name: "14. Patient Personal Cabinet & 375px Mobile Portal Ergonomics Suite",
		cmd: "node --import tsx --import ./testCssStub.mjs --test src/tests/patientCabinetMobile375.test.ts src/tests/portalTimeline.test.ts src/tests/portalSelfCheckin.test.ts src/tests/mobileErgonomicsRound84.test.ts src/tests/patientPortalReceptionQr85.test.ts",
		cwd: path.join(projectRoot, "apps/web"),
	},
	{
		name: "15. Universal Portability, Service Worker Caching & Offline Cold-Start (<500ms) Suite",
		cmd: "node --import tsx --import ./testCssStub.mjs --test src/tests/universalPortabilityAndOfflineSpeed.test.ts",
		cwd: path.join(projectRoot, "apps/web"),
	},
	{
		name: "16. Autonomous Local Backup (.dente), Encryption & Cache Integrity Suite",
		cmd: "node --import tsx --import ./testCssStub.mjs --test ../../packages/shared/src/tests/denteBackup.test.ts src/tests/offlineBackupAndIntegrity.test.ts",
		cwd: path.join(projectRoot, "apps/web"),
	},
];

let totalPassed = 0;
let totalFailed = 0;

for (const step of steps) {
	console.log(`\n▶ Running: ${step.name}...`);
	try {
		execSync(step.cmd, {
			cwd: step.cwd,
			stdio: "inherit",
		});
		console.log(`✔ [PASS] ${step.name}`);
		totalPassed++;
	} catch (err) {
		console.error(`✖ [FAIL] ${step.name}`);
		totalFailed++;
		process.exit(1);
	}
}

console.log("\n================================================================================");
console.log(`  VERIFICATION RESULT: ALL ${totalPassed}/${steps.length} CROSS-PLATFORM SUITES PASSED (EXIT 0)`);
console.log("================================================================================");
