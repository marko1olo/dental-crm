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
		name: "5. Web PWA Standalone Manifest & Service Worker Compliance",
		cmd: "node scripts/validate-pwa-manifest.mjs",
		cwd: projectRoot,
	},
	{
		name: "6. PWA Manifest & Offline Outbox Unit Suite",
		cmd: "node --import tsx --import ./testCssStub.mjs --test src/tests/pwaManifestAndOfflineOutbox.test.ts",
		cwd: path.join(projectRoot, "apps/web"),
	},
	{
		name: "7. Universal Hardware Dispatcher & Multi-Platform Bridges Suite",
		cmd: "node --import tsx --import ./testCssStub.mjs --test src/tests/multiPlatformNativeBridges.test.ts",
		cwd: path.join(projectRoot, "apps/web"),
	},
	{
		name: "8. 3-Tier Offline Mutation Outbox & Network Connectivity Engine",
		cmd: "node --import tsx --import ./testCssStub.mjs --test src/tests/offlineMutationQueue.test.ts",
		cwd: path.join(projectRoot, "apps/web"),
	},
];

let totalPassed = 0;
let totalFailed = 0;

for (const step of steps) {
	console.log(`\n▶ Running: ${step.name}...`);
	try {
		const output = execSync(step.cmd, {
			cwd: step.cwd,
			stdio: "pipe",
			encoding: "utf8",
		});
		console.log(output.trim());
		console.log(`✔ [PASS] ${step.name}`);
		totalPassed++;
	} catch (err) {
		console.error(`✖ [FAIL] ${step.name}`);
		if (err.stdout) console.error(err.stdout);
		if (err.stderr) console.error(err.stderr);
		totalFailed++;
		process.exit(1);
	}
}

console.log("\n================================================================================");
console.log(`  VERIFICATION RESULT: ALL ${totalPassed}/${steps.length} CROSS-PLATFORM SUITES PASSED (EXIT 0)`);
console.log("================================================================================");
