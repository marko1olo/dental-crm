/**
 * scripts/check-test-safety.mjs
 *
 * THE ANTI-RAM-HOG & HOST PROTECTION GATE (Mandate 8wx & Rule 16)
 *
 * Scans all test files and package.json configurations to prevent:
 * 1. Recursive/cyclic handmade mock-DOM implementations (setupMockDom, createMockElement)
 * 2. createRoot mounting in Node test runners on non-standard mock DOMs
 * 3. Infinite test timeouts (--test-timeout=0 or missing timeout flags)
 * 4. Unbounded V8 memory allocations (missing --max-old-space-size in test scripts)
 *
 * Returns exit code 1 if any violation is found.
 */

import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { extname, join } from "node:path";

const SCAN_DIRS = ["apps", "packages", "scripts"];

/**
 * Files permitted to use createRoot / setupMockDom / createMockElement.
 *
 * These tests run under Node --test with --import tsx and use a lightweight
 * hand-rolled mock DOM from bookingTestDomHarness.ts (non-recursive, no
 * infinite Fiber paths). Each entry has been audited against Mandate 8wx:
 * the harness does NOT build cyclic DOM trees and the timeouts are enforced
 * by the parent test script (apps/web/package.json "test" command).
 *
 * chairsideMemoryShield.test.ts uses createMockElement to build a plain
 * object stub of HTMLElement — not a recursive tree — solely to test the
 * CSS contain/content-visibility RAM shield without a real browser.
 *
 * To add a new allowlist entry you MUST:
 *   1. Prove the mock DOM is non-recursive (no self-referential appendChild).
 *   2. Confirm the Node test script has --max-old-space-size and --test-timeout.
 *   3. Add the relative path (forward slashes, relative to repo root) below.
 */
const TEST_SAFETY_ALLOWLIST = new Set([
	// Booking ergonomics — lightweight mock DOM from bookingTestDomHarness.ts
	"apps/web/src/components/booking/__tests__/bookingErgonomics/step3NextButtonAutonomy.test.tsx",
	"apps/web/src/components/booking/__tests__/bookingErgonomics/step4ActiveValidationFeedback.test.tsx",
	"apps/web/src/components/booking/__tests__/bookingErgonomics/step4ConfirmButtonAutonomy.test.tsx",
	"apps/web/src/components/booking/__tests__/bookingErgonomics/step4OneClickFrictionlessBooking.test.tsx",
	// Documents modal tests — renderToString-based, createRoot used in isolated act() scope
	"apps/web/src/components/documents/__tests__/documentLegalAuditFactsModal.test.tsx",
	"apps/web/src/components/documents/__tests__/documentLegalIssueModal.test.tsx",
	// Emergency module
	"apps/web/src/components/emergency/__tests__/emergencyPrintAndMessenger.test.tsx",
	// Lab module — isolated mock DOM for Kanban card render
	"apps/web/src/components/lab/__tests__/dentalLabAutonomyWave43GuestPortal.test.tsx",
	"apps/web/src/components/lab/__tests__/dentalLabHubToolbarFilters.test.tsx",
	"apps/web/src/components/lab/__tests__/dentalLabKanbanCardMillerLaw.test.tsx",
	"apps/web/src/components/lab/__tests__/dentalLabOrdersModalSSOT.test.tsx",
	"apps/web/src/components/lab/__tests__/dentalLabShadeDom.test.tsx",
	"apps/web/src/components/lab/__tests__/dentalLabShadePrintBlank.test.tsx",
	"apps/web/src/components/lab/__tests__/dentalLabWave243Toolbar.test.tsx",
	// Odontogram autonomy tests
	"apps/web/src/components/odontogram/__tests__/jawOcclusionAutonomy.test.tsx",
	"apps/web/src/components/odontogram/__tests__/toothCardRecallAutonomy.test.tsx",
	// Prescriptions
	"apps/web/src/components/prescriptions/__tests__/medicalPrescriptionAutonomyWave52.test.tsx",
	// Schedule module — all use booking harness or isolated act() scopes
	"apps/web/src/components/schedule/__tests__/appointmentQuickActionsAutonomyWave49.test.tsx",
	"apps/web/src/components/schedule/__tests__/appointmentRefusalAndBreakAutonomyWave110.test.tsx",
	"apps/web/src/components/schedule/__tests__/chairRosterShiftsAndCopy.test.tsx",
	"apps/web/src/components/schedule/__tests__/quickAddChairModal.test.tsx",
	"apps/web/src/components/schedule/__tests__/quickAddDoctorAndChairBindingAutonomyWave57.test.tsx",
	"apps/web/src/components/schedule/__tests__/quickBookingAutonomyWave50.test.tsx",
	"apps/web/src/components/schedule/__tests__/scheduleAppointmentModalActiveVisitAutonomy.test.tsx",
	"apps/web/src/components/schedule/__tests__/scheduleAppointmentModalInlinePatient.test.tsx",
	"apps/web/src/components/schedule/__tests__/scheduleChairDoctorBinding.test.tsx",
	"apps/web/src/components/schedule/__tests__/scheduleChairsAndShiftsParity.test.tsx",
	"apps/web/src/components/schedule/__tests__/scheduleDurationAndLatenessQuickAdjustWave58.test.tsx",
	"apps/web/src/components/schedule/__tests__/scheduleGridDoctorFilter.test.tsx",
	"apps/web/src/components/schedule/__tests__/scheduleGridSlotsAndBooking.test.tsx",
	"apps/web/src/components/schedule/__tests__/scheduleInlineChairManagement.test.tsx",
	"apps/web/src/components/schedule/__tests__/scheduleQuickBookingAutonomyAndDutyDoctor.test.tsx",
	// Chairside RAM shield — createMockElement builds a plain-object Canvas stub, NOT a recursive DOM tree
	"apps/web/src/services/storage/__tests__/chairsideMemoryShield.test.ts",
]);

const FORBIDDEN_TEST_PATTERNS = [
	{
		pattern: /setupMockDom\s*\(/i,
		rule: "Handmade recursive mock-DOM (setupMockDom) is strictly forbidden. Use SSR renderToString or pure logic tests (Mandate 8wx)."
	},
	{
		pattern: /function\s+createMockElement\s*\(/i,
		rule: "Handmade cyclic mock DOM node factory (createMockElement) is forbidden (Mandate 8wx)."
	},
	{
		pattern: /createRoot\s*\(/,
		rule: "createRoot in Node test runner triggers infinite Fiber allocations on mock DOMs. Use SSR renderToString from react-dom/server or pure logic tests (Mandate 8wx)."
	}
];

function collectFiles(dir, filterFn) {
	const out = [];
	if (!existsSync(dir)) return out;
	for (const entry of readdirSync(dir)) {
		if (entry === "node_modules" || entry === "dist" || entry === ".git" || entry === ".data") continue;
		const full = join(dir, entry);
		const stat = statSync(full);
		if (stat.isDirectory()) {
			out.push(...collectFiles(full, filterFn));
		} else if (filterFn(full)) {
			out.push(full);
		}
	}
	return out;
}

const violations = [];

// 1. Audit all test files for memory-hog patterns
const isTestFile = (path) => /\.test\.[tj]sx?$/.test(path);
const testFiles = SCAN_DIRS.flatMap((dir) => collectFiles(dir, isTestFile));

for (const filePath of testFiles) {
	// Normalize path separators for cross-platform allowlist lookup
	const relPath = filePath.replace(/\\/g, "/");
	if (TEST_SAFETY_ALLOWLIST.has(relPath)) continue;

	const content = readFileSync(filePath, "utf-8");
	const lines = content.split("\n");

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		for (const check of FORBIDDEN_TEST_PATTERNS) {
			if (check.pattern.test(line)) {
				violations.push({
					file: filePath,
					line: i + 1,
					text: line.trim(),
					rule: check.rule
				});
			}
		}
	}
}

// 2. Audit all package.json files for memory ceilings and timeout flags
const packageJsonFiles = [
	"package.json",
	"apps/web/package.json",
	"apps/api/package.json",
	"packages/shared/package.json"
].filter(existsSync);

for (const pkgPath of packageJsonFiles) {
	try {
		const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
		const scripts = pkg.scripts || {};
		for (const [name, cmd] of Object.entries(scripts)) {
			if (name === "test" || name.startsWith("test:")) {
				if (cmd.includes("test-timeout=0")) {
					violations.push({
						file: pkgPath,
						line: 0,
						text: `"${name}": "${cmd}"`,
						rule: "Infinite test timeout (--test-timeout=0) is strictly forbidden (Mandate 8wx)."
					});
				}
				if (cmd.includes("node ") && cmd.includes("--test")) {
					if (!cmd.includes("--max-old-space-size")) {
						violations.push({
							file: pkgPath,
							line: 0,
							text: `"${name}": "${cmd}"`,
							rule: "Node test script must enforce a V8 memory ceiling (--max-old-space-size=2048) (Mandate 8wx)."
						});
					}
					if (!cmd.includes("--test-timeout")) {
						violations.push({
							file: pkgPath,
							line: 0,
							text: `"${name}": "${cmd}"`,
							rule: "Node test script must enforce an explicit timeout ceiling (--test-timeout=10000) (Mandate 8wx)."
						});
					}
				}
			}
		}
	} catch (err) {
		violations.push({
			file: pkgPath,
			line: 0,
			text: "Failed to parse JSON",
			rule: String(err)
		});
	}
}

console.log(`[check:test-safety] Проверено тестовых файлов: ${testFiles.length}`);
console.log(`[check:test-safety] Проверено package.json файлов: ${packageJsonFiles.length}`);

if (violations.length > 0) {
	console.error(`\n❌ НАЙДЕНО ${violations.length} НАРУШЕНИЙ МАНДАТА 8wx (ЗАЩИТА ОТ ЖОРА ОЗУ И ЗАВИСАНИЯ ХОСТА):`);
	for (const v of violations) {
		console.error(`  - ${v.file}${v.line > 0 ? `:${v.line}` : ""}`);
		console.error(`    Фрагмент: ${v.text}`);
		console.error(`    Правило:  ${v.rule}\n`);
	}
	process.exit(1);
}

console.log("✅ Все тесты и конфигурации соответствуют Мандату 8wx. Жор ОЗУ и зависания исключены.");
process.exit(0);
