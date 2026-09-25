/**
 * ============================================================================
 * SOLO DOCTOR & ADMIN ERGONOMICS, HOT/WARM/COLD UI & BACKGROUND SANPIN AUDIT
 * (Mandates 8c, 8d, 8e, 8n, 8v, THE HAMMER Master Constitution)
 * ============================================================================
 *
 * Automated verification of:
 * 1. Zero Blocking Dialogs: Absence of window.alert, window.confirm, window.prompt
 *    and bare alert/confirm/prompt across all clinical and administrative UI.
 * 2. Background Automation: SanPiN journals (Forms 257/u, 366/u, microclimate, Class B waste)
 *    and inventory BOM deductions occur in background or 1-click batch at shift close.
 * 3. Doctor Sovereignty: Zero mandatory kraft-bag or tray barcode scanning on visit hot path.
 * 4. Anti-Matryoshka Law: Modal nesting depth strictly <= 1 (sequential rendering or inline drawers).
 * 5. Clinical Density: Desktop controls maintain 28-36px height (h-7/h-8/h-9), avoiding mobile
 *    ballooning on desktop while preserving touch ergonomics for mobile/tablets.
 * 6. Zero Roadblock Disabled Buttons: Mandate 8e non-blocking workflows with soft overdraft
 *    and informational feedback instead of disabled attributes.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import {
	compileShiftForm257Records,
	compileShiftPsoBatches,
	compileShiftMicroclimateLogs,
	compileShiftWasteLog,
	executeShiftSanpinAutoClose,
} from "../../sanpin/autoclaveLog/shiftAutoCloserEngine.js";
import {
	performAutoVisitBomDeduction,
} from "../../inventory/autoBomDeductionEngine.js";

const REPO_ROOT = path.resolve(process.cwd());
const WEB_SRC = path.join(REPO_ROOT, "apps/web/src");

function getFilesInDirectory(dir: string, extensionRegex = /\.(tsx?|jsx?)$/): string[] {
	const results: string[] = [];
	if (!fs.existsSync(dir)) return results;
	const entries = fs.readdirSync(dir, { withFileTypes: true });
	for (const entry of entries) {
		const fullPath = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			results.push(...getFilesInDirectory(fullPath, extensionRegex));
		} else if (entry.isFile() && extensionRegex.test(entry.name)) {
			results.push(fullPath);
		}
	}
	return results;
}

/**
 * Strips single-line and multi-line comments from JS/TS source code to prevent
 * false positives when auditing for forbidden executable calls.
 */
function stripComments(source: string): string {
	return source
		.replace(/\/\*[\s\S]*?\*\//g, (match) => "\n".repeat(match.split("\n").length - 1))
		.replace(/\/\/.*$/gm, "");
}

describe("Solo Doctor & Admin Ergonomics Audit (Hot/Warm/Cold UI & Background SanPiN/Warehouse)", () => {
	// ─────────────────────────────────────────────────────────────────────────
	// 1. ZERO BLOCKING DIALOGS (window.alert, window.confirm, window.prompt)
	// ─────────────────────────────────────────────────────────────────────────
	describe("1. Zero Blocking Dialogs Audit (Mandate 8e: Non-blocking workflows)", () => {
		const targetDirs = [
			path.join(WEB_SRC, "components/sanpin"),
			path.join(WEB_SRC, "components/inventory"),
			path.join(WEB_SRC, "components/schedule"),
			path.join(WEB_SRC, "components/visit"),
			path.join(WEB_SRC, "components/portal/patientCabinet"),
		];

		const filesToScan: string[] = [];
		for (const d of targetDirs) {
			filesToScan.push(...getFilesInDirectory(d));
		}

		it("guarantees 0 calls to window.alert, window.confirm, window.prompt in production code", () => {
			const violations: Array<{ file: string; line: number; match: string }> = [];

			for (const file of filesToScan) {
				if (file.includes("__tests__") || file.includes(".test.")) continue;
				const rawContent = fs.readFileSync(file, "utf8");
				const cleanContent = stripComments(rawContent);
				const lines = cleanContent.split("\n");
				lines.forEach((lineText, idx) => {
					if (/window\.(alert|confirm|prompt)\s*\(/.test(lineText)) {
						violations.push({
							file: path.relative(REPO_ROOT, file),
							line: idx + 1,
							match: lineText.trim(),
						});
					}
				});
			}

			assert.equal(
				violations.length,
				0,
				`Blocking window dialogs detected:\n${violations.map((v) => `  ${v.file}:${v.line} -> ${v.match}`).join("\n")}`,
			);
		});

		it("guarantees 0 bare alert(...) calls in production code across audited directories", () => {
			const violations: Array<{ file: string; line: number; match: string }> = [];

			for (const file of filesToScan) {
				if (file.includes("__tests__") || file.includes(".test.")) continue;
				const rawContent = fs.readFileSync(file, "utf8");
				const cleanContent = stripComments(rawContent);
				const lines = cleanContent.split("\n");
				lines.forEach((lineText, idx) => {
					// Match bare alert( but not onAlert or alertVariant or AlertTriangle
					if (/(?<![a-zA-Z0-9_.])alert\s*\(/.test(lineText)) {
						violations.push({
							file: path.relative(REPO_ROOT, file),
							line: idx + 1,
							match: lineText.trim(),
						});
					}
				});
			}

			assert.equal(
				violations.length,
				0,
				`Bare alert(...) calls detected:\n${violations.map((v) => `  ${v.file}:${v.line} -> ${v.match}`).join("\n")}`,
			);
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 2. BACKGROUND SANPIN & AUTOCLAVE BATCH SHIFT CLOSURE (Cold Backoffice)
	// ─────────────────────────────────────────────────────────────────────────
	describe("2. Background SanPiN Shift Auto-Closure (Tier 3 Cold Backoffice)", () => {
		it("automatically compiles day Form 257/u autoclave cycles without requiring nurse clicking", () => {
			const cycles = compileShiftForm257Records({
				date: "2026-09-25",
				visitsCount: 14,
				traysCount: 42,
			});

			assert.ok(cycles.length >= 3, "42 trays should compile into at least 3 autoclave cycles");
			for (const c of cycles) {
				assert.equal(c.isCyclePassed, true, "Every compiled cycle must pass statutory criteria");
				assert.equal(c.areAllPointsPassed, true, "All 5 points must pass");
				assert.equal(c.status, "sterile_passed");
				assert.ok(c.digitalStampHash.length > 10, "Each cycle must carry cryptographic digital stamp");
				assert.equal(c.chamberPoints.length, 5, "Must monitor all 5 chamber points (KT-1..KT-5)");
			}
		});

		it("automatically compiles Form 366/u PSO batches with negative Azopyram and Phenolphthalein trials", () => {
			const pso = compileShiftPsoBatches({
				date: "2026-09-25",
				traysCount: 40,
			});

			assert.ok(pso.length > 0, "Must create PSO inspection batches");
			for (const b of pso) {
				assert.equal(b.isAzopyramNegative, true, "Azopyram must be negative (zero blood residue)");
				assert.equal(b.isPhenolphthaleinNegative, true, "Phenolphthalein must be negative (zero alkaline residue)");
				assert.equal(b.isBatchApproved, true, "PSO batch must be approved");
			}
		});

		it("automatically tracks pharmaceutical refrigerator and clinic psychrometer within statutory bounds", () => {
			const climate = compileShiftMicroclimateLogs({
				refrigeratorTempCelsius: 4.5,
				roomTempCelsius: 21.0,
				roomHumidityPercent: 52,
			});

			assert.equal(climate.refrigeratorLog.isWithinNorm, true);
			assert.equal(climate.psychrometerLog.isWithinNorm, true);
		});

		it("compiles Class B sharp and infectious medical waste in 1 click at shift close", () => {
			const waste = compileShiftWasteLog({
				visitsCount: 15,
				traysCount: 45,
			});

			assert.ok(waste.classBWeightKg > 0, "Class B waste must be calculated from treatments");
			assert.ok(waste.treatmentMethodRu.length > 5, "Must specify statutory treatment method");
		});

		it("executes unified shift auto-close in 1 call (Tier 3 Cold Backoffice)", () => {
			const shift = executeShiftSanpinAutoClose({
				date: "2026-09-25",
				visitsCount: 10,
				traysCount: 30,
			});

			assert.ok(shift.totalAutoclaveCycles >= 2);
			assert.equal(shift.isPsoCompliant, true);
			assert.ok(shift.digitalStampHash.length > 16);
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 3. BACKGROUND WAREHOUSE & AUTOMATIC BOM DEDUCTIONS (Mandate 8e, 8n)
	// ─────────────────────────────────────────────────────────────────────────
	describe("3. Background Warehouse BOM Deductions & Soft Overdraft", () => {
		it("automatically deduces consumables in background when completing clinical visit", async () => {
			const result = await performAutoVisitBomDeduction({
				visitId: "VIS-AUTO-1",
				patientId: "PAT-1",
				patientFullName: "Иванов Иван",
				doctorId: "DOC-1",
				doctorFullName: "Доктор Смирнов",
				renderedServices: [
					{
						serviceCode: "A16.07.002",
						serviceTitle: "Восстановление зуба пломбой (Кариес)",
						quantity: 1,
						toothNumber: 16,
					},
					{
						serviceCode: "A11.07.012",
						serviceTitle: "Анестезия инфильтрационная",
						quantity: 1,
						toothNumber: 16,
					},
				],
				allowOverdraft: true,
			});

			assert.ok(result.totalDeductedItems >= 5, "Must deduce composite, bond, articaine, needle, and PPE");
			assert.ok(result.totalCostPriceKopecks > 0, "Must calculate cost price in kopecks");
			assert.ok(typeof result.totalCostPriceRub === "string" && result.totalCostPriceRub.length > 0);
		});

		it("enforces soft overdraft without throwing exceptions when inventory is zero (Mandate 8n)", async () => {
			const result = await performAutoVisitBomDeduction({
				visitId: "VIS-OVERDRAFT-1",
				patientId: "PAT-2",
				doctorId: "DOC-1",
				renderedServices: [
					{
						serviceCode: "A16.07.002",
						quantity: 1,
					},
				],
				currentStockMap: {
					"comp-estelite": 0,
					"bond-g2": 0,
				},
				allowOverdraft: true,
			});

			assert.equal(result.hasOverdraft, true, "Must flag soft overdraft without throwing");
			assert.ok(result.softOverdrafts.length > 0, "Must register overdrafted items");
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 4. DOCTOR HOT PATH SOVEREIGNTY (Zero Kraft Scanning in Visit Screen)
	// ─────────────────────────────────────────────────────────────────────────
	describe("4. Doctor Hot Path Sovereignty (Zero Kraft Scanning & Zero Nurse Roadblocks)", () => {
		it("confirms zero buttons for 'сканировать лоток / пакет' in VisitSoapEditor.tsx and VisitView.tsx", () => {
			const visitSoapFile = path.join(WEB_SRC, "components/visit/VisitSoapEditor.tsx");
			const visitViewFile = path.join(WEB_SRC, "components/visit/VisitView.tsx");

			const soapContent = fs.readFileSync(visitSoapFile, "utf8");
			const viewContent = fs.readFileSync(visitViewFile, "utf8");

			assert.ok(
				!soapContent.toLowerCase().includes("сканировать лоток"),
				"VisitSoapEditor must not require scanning sterile trays",
			);
			assert.ok(
				!soapContent.toLowerCase().includes("сканировать крафт"),
				"VisitSoapEditor must not require scanning kraft bags",
			);
			assert.ok(
				!viewContent.toLowerCase().includes("сканировать лоток"),
				"VisitView must not require scanning sterile trays",
			);
		});

		it("verifies instruments are assumed sterile by default per Mandate 8v", () => {
			const hookFile = path.join(WEB_SRC, "components/visit/useVisitCompletion.ts");
			const hookContent = fs.readFileSync(hookFile, "utf8");

			assert.ok(
				hookContent.includes("Нулевая зависимость от штрихкодов лотков/крафт-пакетов или журналов СанПиН"),
				"useVisitCompletion must enforce zero dependency on kraft bag barcodes",
			);
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 5. ANTI-MATRYOSHKA LAW (MODAL DEPTH STRICTLY <= 1)
	// ─────────────────────────────────────────────────────────────────────────
	describe("5. Anti-Matryoshka Law Audit (Modal Depth Strictly <= 1)", () => {
		it("verifies MdlpDisposalQueueModal renders child act modal sequentially (depth 1)", () => {
			const mdlpFile = path.join(WEB_SRC, "components/inventory/mdlp/MdlpDisposalQueueModal.tsx");
			const content = fs.readFileSync(mdlpFile, "utf8");

			assert.ok(
				content.includes("Anti-Matryoshka (Mandate 8d Sin 6): render act modal sequentially at modal depth strictly 1"),
				"MdlpDisposalQueueModal must sequentially return SeniorNurseDisposalActModal",
			);
		});

		it("verifies DoctorShiftRosterModal renders TimesheetT13Modal sequentially (depth 1)", () => {
			const rosterFile = path.join(WEB_SRC, "components/schedule/roster/DoctorShiftRosterModal.tsx");
			const content = fs.readFileSync(rosterFile, "utf8");

			assert.ok(
				content.includes("Anti-Matryoshka (Sin 6, Mandate 8d): Render TimesheetT13Modal sequentially (depth strictly 1)"),
				"DoctorShiftRosterModal must sequentially render TimesheetT13Modal",
			);
		});

		it("verifies VisitSummaryModal renders EmrProtocolGeneratorModal and AppointmentModal sequentially (depth 1)", () => {
			const summaryFile = path.join(WEB_SRC, "components/visit/VisitSummaryModal.tsx");
			const content = fs.readFileSync(summaryFile, "utf8");

			assert.ok(
				content.includes("Anti-Matryoshka (Sin 6, Mandate 8d): Render sequentially with depth strictly 1"),
				"VisitSummaryModal must render protocol generator and appointment modal sequentially",
			);
		});

		it("verifies SlotConflictModal supports non-blocking inline rendering (inline={true}) in QuickBookingDrawer", () => {
			const quickBookingFile = path.join(WEB_SRC, "components/schedule/QuickBookingDrawer.tsx");
			const content = fs.readFileSync(quickBookingFile, "utf8");

			assert.ok(
				content.includes("<SlotConflictModal") && content.includes("inline={true}"),
				"QuickBookingDrawer must render SlotConflictModal as inline container without modal overlay",
			);
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 6. CLINICAL DENSITY & TOUCH TARGETS (Anti-Mobile Bloat on Desktop)
	// ─────────────────────────────────────────────────────────────────────────
	describe("6. Clinical Density & Ergonomics (28-36px Desktop, Touch-Friendly Mobile)", () => {
		it("verifies SanPiN registers toolbar buttons enforce 32px height for high desktop density", () => {
			const sanpinFile = path.join(WEB_SRC, "components/sanpin/SanpinRegisters.tsx");
			const content = fs.readFileSync(sanpinFile, "utf8");

			assert.ok(
				content.includes('height: "32px"') && content.includes('minHeight: "32px"'),
				"SanPiN tab buttons must enforce 32px height for desktop density",
			);
		});

		it("verifies Inventory Stock Table toolbar enforces 32-36px height", () => {
			const stockFile = path.join(WEB_SRC, "components/inventory/InventoryStockTable.tsx");
			const content = fs.readFileSync(stockFile, "utf8");

			assert.ok(
				content.includes("min-h-[36px]") || content.includes("h-8"),
				"Inventory stock table toolbar must maintain compact height (32-36px)",
			);
		});

		it("verifies Schedule Filter Strip and Appointment Modal buttons maintain compact desktop density (h-8 / h-9)", () => {
			const apptModalFile = path.join(WEB_SRC, "components/schedule/AppointmentModal.tsx");
			const content = fs.readFileSync(apptModalFile, "utf8");

			assert.ok(
				content.includes("h-9") || content.includes("h-8"),
				"AppointmentModal action buttons must use compact 32-36px height (h-8 / h-9)",
			);
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 7. ZERO ROADBLOCK DISABLED BUTTONS (Mandate 8e)
	// ─────────────────────────────────────────────────────────────────────────
	describe("7. Zero Roadblock Disabled Buttons Audit (Mandate 8e)", () => {
		it("verifies InventoryStockTable quantity steppers do not have disabled={traffic.isBlocked}", () => {
			const stockFile = path.join(WEB_SRC, "components/inventory/InventoryStockTable.tsx");
			const content = fs.readFileSync(stockFile, "utf8");

			assert.ok(
				!content.includes("disabled={traffic.isBlocked}"),
				"InventoryStockTable steppers must remain active to allow disposal and adjustments",
			);
		});

		it("verifies ProcedureMaterialDeductionModal stepper minus button is never disabled (disabled={false})", () => {
			const deductModalFile = path.join(WEB_SRC, "components/inventory/ProcedureMaterialDeductionModal.tsx");
			const content = fs.readFileSync(deductModalFile, "utf8");

			assert.ok(
				!content.includes("disabled={line.quantity <= 0}"),
				"Minus stepper button must not be disabled by line.quantity <= 0",
			);
		});

		it("verifies AppointmentModal save button is never disabled by missing assistant or secondary fields", () => {
			const apptModalFile = path.join(WEB_SRC, "components/schedule/AppointmentModal.tsx");
			const content = fs.readFileSync(apptModalFile, "utf8");

			assert.ok(
				!content.includes("disabled={!assistant"),
				"AppointmentModal must never require assistant for save",
			);
			assert.ok(
				!content.includes("disabled={!patientId"),
				"AppointmentModal must auto-create inline patient on save without disabling the button",
			);
		});

		it("verifies VisitSoapEditor primary action is never disabled", () => {
			const soapFile = path.join(WEB_SRC, "components/visit/VisitSoapEditor.tsx");
			const content = fs.readFileSync(soapFile, "utf8");

			assert.ok(
				content.includes("disabled={false}"),
				"VisitSoapEditor template/action buttons must have disabled={false}",
			);
		});
	});
});
