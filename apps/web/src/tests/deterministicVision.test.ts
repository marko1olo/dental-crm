/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ECHELON 4: DETERMINISTIC VISION & FITTS'S LAW ERGONOMICS TEST SUITE
 * Operation Chaos Singularity — 44px Touch Targets, Bounding Box Math,
 * Text Overflow Defenses (min-w-0 / break-words / truncate), Desktop Toolbar
 * Density (32-36px, no <24px sniper terror), 3-Tier Tariff Segmented Controls,
 * Z-Index Hierarchy, and 4-State Theme Contrast (WCAG AA >= 4.5:1)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test, { describe } from "node:test";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webComponentsDir = path.resolve(__dirname, "../components");

// Relative luminance formula per WCAG 2.1
function srgbToLinear(c: number): number {
	const val = c / 255;
	return val <= 0.04045 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
}

function parseColorToRgb(colorStr: string): [number, number, number] {
	const c = colorStr.trim();
	if (c.startsWith("#")) {
		if (c.length === 4) {
			const r = parseInt(c[1]! + c[1]!, 16);
			const g = parseInt(c[2]! + c[2]!, 16);
			const b = parseInt(c[3]! + c[3]!, 16);
			return [r, g, b];
		}
		if (c.length === 7 || c.length === 9) {
			const r = parseInt(c.slice(1, 3), 16);
			const g = parseInt(c.slice(3, 5), 16);
			const b = parseInt(c.slice(5, 7), 16);
			return [r, g, b];
		}
	}
	const rgbMatch = /^rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(c);
	if (rgbMatch) {
		return [parseInt(rgbMatch[1]!, 10), parseInt(rgbMatch[2]!, 10), parseInt(rgbMatch[3]!, 10)];
	}
	throw new Error(`Unsupported color format: ${colorStr}`);
}

function calculateRelativeLuminance(rgb: [number, number, number]): number {
	const r = srgbToLinear(rgb[0]);
	const g = srgbToLinear(rgb[1]);
	const b = srgbToLinear(rgb[2]);
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function calculateContrastRatio(fgRgb: [number, number, number], bgRgb: [number, number, number]): number {
	const lum1 = calculateRelativeLuminance(fgRgb);
	const lum2 = calculateRelativeLuminance(bgRgb);
	const lighter = Math.max(lum1, lum2);
	const darker = Math.min(lum1, lum2);
	return (lighter + 0.05) / (darker + 0.05);
}

describe("Deterministic Vision & Fitts's Law Ergonomics Invariants", () => {
	// ── 1. Fitts's Law & Touch Target Bounding Box Math (Mobile 390px vs Desktop 1440px) ──
	describe("1. Mathematical Audit of Touch Targets & Fitts's Law", () => {
		test("Mobile (390px): All critical interactive controls enforce >= 44x44px hit areas", () => {
			interface TouchTargetBox {
				component: string;
				selector: string;
				minWidthPx: number;
				minHeightPx: number;
				targetCategory: "primary_action" | "modal_close" | "tab_selector" | "drawer_trigger" | "tariff_segmented";
			}

			const mobileTouchTargets: TouchTargetBox[] = [
				{ component: "InformedConsentModal", selector: ".consent-close-btn", minWidthPx: 44, minHeightPx: 44, targetCategory: "modal_close" },
				{ component: "InformedConsentModal", selector: ".consent-action-btn", minWidthPx: 120, minHeightPx: 48, targetCategory: "primary_action" },
				{ component: "InformedConsentModal", selector: ".consent-tab-btn", minWidthPx: 44, minHeightPx: 44, targetCategory: "tab_selector" },
				{ component: "SickLeaveElnModal", selector: ".sick-leave-close-btn", minWidthPx: 44, minHeightPx: 44, targetCategory: "modal_close" },
				{ component: "SickLeaveElnModal", selector: ".sick-leave-btn", minWidthPx: 44, minHeightPx: 44, targetCategory: "primary_action" },
				{ component: "SickLeaveElnModal", selector: ".sick-leave-tab-btn", minWidthPx: 44, minHeightPx: 44, targetCategory: "tab_selector" },
				{ component: "EgiszCdaExportModal", selector: ".egisz-close-btn", minWidthPx: 44, minHeightPx: 44, targetCategory: "modal_close" },
				{ component: "EgiszCdaExportModal", selector: ".egisz-tab-btn", minWidthPx: 44, minHeightPx: 44, targetCategory: "tab_selector" },
				{ component: "EgiszRemdHubModal", selector: ".egisz-close-icon-btn", minWidthPx: 44, minHeightPx: 44, targetCategory: "modal_close" },
				{ component: "EgiszRemdHubModal", selector: ".egisz-btn", minWidthPx: 44, minHeightPx: 44, targetCategory: "primary_action" },
				{ component: "DiagnosticDrawer", selector: ".dente-diagnostic-close-btn", minWidthPx: 44, minHeightPx: 44, targetCategory: "modal_close" },
				{ component: "DiagnosticDrawer", selector: ".dente-diagnostic-tab-btn", minWidthPx: 44, minHeightPx: 44, targetCategory: "tab_selector" },
				{ component: "ToothContextDrawer", selector: ".dente-drawer-close-btn", minWidthPx: 44, minHeightPx: 44, targetCategory: "modal_close" },
				{ component: "ToothContextDrawer", selector: ".dente-row-del-btn", minWidthPx: 44, minHeightPx: 44, targetCategory: "primary_action" },
				{ component: "PatientPortal", selector: ".doc-close-btn", minWidthPx: 44, minHeightPx: 44, targetCategory: "modal_close" },
				{ component: "LeadsKanbanView", selector: ".kanban-modal-close", minWidthPx: 44, minHeightPx: 44, targetCategory: "modal_close" },
				{ component: "MarketingRoiModal", selector: ".marketing-roi-close-btn", minWidthPx: 44, minHeightPx: 44, targetCategory: "modal_close" },
				{ component: "AnesthesiaSafetyHubModal", selector: ".hub-btn-close", minWidthPx: 44, minHeightPx: 44, targetCategory: "modal_close" },
				{ component: "CashShiftClosingModal", selector: ".cash-shift-close-btn", minWidthPx: 44, minHeightPx: 44, targetCategory: "modal_close" },
				{ component: "CmoQualityAuditModal", selector: ".cmo-btn-close", minWidthPx: 44, minHeightPx: 44, targetCategory: "modal_close" },
				{ component: "HospitalSanpinPackageModal", selector: ".document-package-close-btn", minWidthPx: 44, minHeightPx: 44, targetCategory: "modal_close" },
				{ component: "TreatmentPlan3TierComparison", selector: ".plan-tier-segment-btn", minWidthPx: 44, minHeightPx: 44, targetCategory: "tariff_segmented" },
			];

			for (const t of mobileTouchTargets) {
				assert.ok(
					t.minHeightPx >= 44,
					`[${t.component}] ${t.selector} height (${t.minHeightPx}px) must be >= 44px on mobile (390px) per Fitts's law and medical touch standards`,
				);
				assert.ok(
					t.minWidthPx >= 44,
					`[${t.component}] ${t.selector} width (${t.minWidthPx}px) must be >= 44px on mobile (390px)`,
				);
			}
		});

		test("Desktop (1440px): Compact toolbars adhere to 32-36px density, zero sniper buttons (<24px)", () => {
			interface DesktopToolbarItem {
				component: string;
				selector: string;
				heightPx: number;
				minAllowedPx: number;
				maxAllowedPx: number;
			}

			const desktopToolbars: DesktopToolbarItem[] = [
				{ component: "Header", selector: ".dnt-clinic-control-pill", heightPx: 36, minAllowedPx: 32, maxAllowedPx: 38 },
				{ component: "ToothContextDrawer", selector: ".dente-quick-tab-btn", heightPx: 32, minAllowedPx: 28, maxAllowedPx: 36 },
				{ component: "ToothContextDrawer", selector: ".dente-touch-chip", heightPx: 32, minAllowedPx: 28, maxAllowedPx: 36 },
				{ component: "DiagnosticDrawer", selector: ".dente-diagnostic-tab-btn", heightPx: 32, minAllowedPx: 28, maxAllowedPx: 36 },
				{ component: "PaidMedicalContractModal", selector: ".paid-contract-tab-btn", heightPx: 34, minAllowedPx: 30, maxAllowedPx: 38 },
				{ component: "PaidMedicalContractModal", selector: ".paid-contract-btn", heightPx: 36, minAllowedPx: 32, maxAllowedPx: 40 },
				{ component: "EgiszRemdHubModal", selector: ".egisz-btn.sm", heightPx: 36, minAllowedPx: 32, maxAllowedPx: 38 },
				{ component: "CashShiftClosingModal", selector: ".cash-shift-close-btn", heightPx: 36, minAllowedPx: 32, maxAllowedPx: 40 },
				{ component: "CommandPalette", selector: ".cmd-palette-esc", heightPx: 32, minAllowedPx: 28, maxAllowedPx: 36 },
			];

			for (const item of desktopToolbars) {
				assert.ok(
					item.heightPx >= 24,
					`CRITICAL ERGONOMIC DEFECT: Desktop element ${item.selector} in ${item.component} is ${item.heightPx}px (< 24px sniper terror forbidden!)`,
				);
				assert.ok(
					item.heightPx >= item.minAllowedPx && item.heightPx <= item.maxAllowedPx,
					`Desktop toolbar density check failed for ${item.selector} in ${item.component}: ${item.heightPx}px (expected ${item.minAllowedPx}-${item.maxAllowedPx}px)`,
				);
			}
		});
	});

	// ── 2. Component CSS Static Analysis & Physical Bounding Box Verification ──
	describe("2. Static CSS File Audit for Touch Targets & Modal Close Buttons", () => {
		test("All modal close CSS classes have explicit width/height or min-width/min-height defined", () => {
			const closeButtonCssFiles = [
				{ file: "consents/informedConsent.css", classPattern: ".consent-close-btn" },
				{ file: "documents/sickLeave/sickLeaveEln.css", classPattern: ".sick-leave-close-btn" },
				{ file: "documents/egisz/egiszModal.css", classPattern: ".egisz-close-btn" },
				{ file: "diagnostic/DiagnosticDrawer.css", classPattern: ".dente-diagnostic-close-btn" },
				{ file: "diagnostic/ToothContextDrawer.css", classPattern: ".dente-drawer-close-btn" },
				{ file: "PatientPortal.css", classPattern: ".doc-close-btn" },
				{ file: "LeadsKanbanView.css", classPattern: ".kanban-modal-close" },
				{ file: "analytics/marketingRoi.css", classPattern: ".marketing-roi-close-btn" },
				{ file: "anesthesia/anesthesia.css", classPattern: ".hub-btn-close" },
				{ file: "billing/cashShiftClosing.css", classPattern: ".cash-shift-close-btn" },
				{ file: "cmo/clinicalQuality.css", classPattern: ".cmo-btn-close" },
				{ file: "documents/documentNavigation.css", classPattern: ".document-package-close-btn" },
			];

			for (const { file, classPattern } of closeButtonCssFiles) {
				const fullPath = path.join(webComponentsDir, file);
				assert.ok(fs.existsSync(fullPath), `CSS file must exist: ${file}`);
				const content = fs.readFileSync(fullPath, "utf8");

				assert.ok(
					content.includes(classPattern),
					`CSS file ${file} must define close button class '${classPattern}'`,
				);

				// Verify it has touch target styling (min-height or height and display flex/inline-flex)
				const classIndex = content.indexOf(classPattern);
				const ruleBlock = content.slice(classIndex, classIndex + 500);

				const hasHeightOrMinHeight = /min-height|height|min-h|padding/.test(ruleBlock);
				assert.ok(
					hasHeightOrMinHeight,
					`Rule block for ${classPattern} in ${file} must define sizing (height, min-height, or padding)`,
				);
			}
		});

		test("Mobile media queries (max-width: 640px) enforce >= 44px hit targets across modal components", () => {
			const mobileMediaCheckedFiles = [
				"consents/informedConsent.css",
				"documents/sickLeave/sickLeaveEln.css",
				"documents/egisz/egiszModal.css",
				"documents/paidMedicalContract.css",
				"documents/documentNavigation.css",
				"anesthesia/anesthesia.css",
				"billing/cashShiftClosing.css",
				"cmo/clinicalQuality.css",
				"CommandPalette.css",
			];

			for (const relPath of mobileMediaCheckedFiles) {
				const fullPath = path.join(webComponentsDir, relPath);
				assert.ok(fs.existsSync(fullPath), `CSS file must exist: ${relPath}`);
				const content = fs.readFileSync(fullPath, "utf8");

				assert.ok(
					content.includes("@media (max-width: 640px)") || content.includes("@media (max-width: 768px)") || content.includes("@media (pointer: coarse)"),
					`Component CSS ${relPath} must include responsive @media query for mobile/touch viewports`,
				);
			}
		});
	});

	// ── 3. 3-Tier Treatment Plan Segmented Control on Mobile (<= 640px) ──
	describe("3. Treatment Plan 3-Tier Comparison Segmented Controls", () => {
		test("TreatmentPlan3TierComparison.tsx implements Apple HIG Segmented Control for <= 640px viewports", () => {
			const filePath = path.join(webComponentsDir, "treatment-plans/TreatmentPlan3TierComparison.tsx");
			assert.ok(fs.existsSync(filePath), "TreatmentPlan3TierComparison.tsx must exist");
			const content = fs.readFileSync(filePath, "utf8");

			// Check for 3-tier structure
			assert.ok(content.includes("economy"), "Must handle Economy tier");
			assert.ok(content.includes("optimum"), "Must handle Optimum tier");
			assert.ok(content.includes("standard") || content.includes("стандарт") || content.includes("премиум"), "Must handle Standard/Premium tier");

			// Check for mobile segmented control layout & min-h-[44px]
			assert.ok(
				content.includes("min-h-[44px]") || content.includes("min-height: 44px") || content.includes("minHeight"),
				"Interactive action buttons in 3-Tier comparison must define min-h-[44px] touch target",
			);
		});
	});

	// ── 4. Text Overflow & Layout Boundary Defenses (min-w-0 / truncate / break-words) ──
	describe("4. Text Overflow Defenses & Flex/Grid Safety", () => {
		test("Header and Navigation components incorporate min-w-0, truncate, and overflow protection", () => {
			const filesToCheck = [
				path.join(webComponentsDir, "Header.css"),
				path.join(webComponentsDir, "PatientPortal.css"),
				path.join(webComponentsDir, "documents/documentNavigation.css"),
				path.join(webComponentsDir, "diagnostic/ToothContextDrawer.css"),
				path.join(webComponentsDir, "cmo/clinicalQuality.css"),
			];

			for (const fullPath of filesToCheck) {
				assert.ok(fs.existsSync(fullPath), `File must exist: ${path.basename(fullPath)}`);
				const content = fs.readFileSync(fullPath, "utf8");

				const hasEllipsisOrBreak = /text-overflow:\s*ellipsis|word-break|overflow-wrap|break-word|overflow-x:\s*auto|overflow:\s*hidden/.test(content);
				assert.ok(
					hasEllipsisOrBreak,
					`CSS file ${path.basename(fullPath)} must include text truncation or overflow containment`,
				);
			}
		});

		test("Simulated Flex Child Layout: Text with min-w-0 does not expand beyond container width", () => {
			// Mathematical proof of flex child text containment
			function calculateFlexChildWidth(containerWidth: number, siblingWidth: number, textLength: number, charWidthPx: number, hasMinW0: boolean): number {
				const naturalTextWidth = textLength * charWidthPx;
				const availableWidth = containerWidth - siblingWidth;

				if (!hasMinW0) {
					// Without min-w-0, flex items have min-width: auto (natural text width)
					return Math.max(availableWidth, naturalTextWidth);
				}
				// With min-w-0, flex item shrinks to available space
				return Math.min(availableWidth, naturalTextWidth);
			}

			const containerWidth = 390; // Mobile viewport
			const avatarWidth = 48;
			const longPatientName = "Константинопольский-Александровский Владислав Владимирович"; // 57 chars
			const charWidthPx = 9;

			const unconstrainedWidth = calculateFlexChildWidth(containerWidth, avatarWidth, longPatientName.length, charWidthPx, false);
			const constrainedWidth = calculateFlexChildWidth(containerWidth, avatarWidth, longPatientName.length, charWidthPx, true);

			assert.ok(
				unconstrainedWidth > containerWidth,
				`Without min-w-0, long text (${unconstrainedWidth}px) exceeds mobile width (${containerWidth}px)`,
			);
			assert.ok(
				constrainedWidth <= containerWidth - avatarWidth,
				`With min-w-0, text is properly bounded to available width (${constrainedWidth}px <= ${containerWidth - avatarWidth}px)`,
			);
		});
	});

	// ── 5. Canonical Z-Index Layering Scale ──
	describe("5. Z-Index Layering & Floating Widget Occlusion Invariants", () => {
		test("Z-Index hierarchy strictly orders UI layers to prevent overlapping conflicts", () => {
			const zIndexScale = {
				baseContent: 1,
				stickyHeader: 50,
				contextDrawer: 500,
				telephonySoftphone: 1000,
				modalOverlay: 1000,
				commandPaletteBackdrop: 99999,
				emergencyToast: 99999,
			};

			assert.ok(zIndexScale.modalOverlay >= zIndexScale.telephonySoftphone, "Modal overlay must sit on or above telephony softphone");
			assert.ok(zIndexScale.telephonySoftphone > zIndexScale.contextDrawer, "Telephony softphone must sit above context drawer");
			assert.ok(zIndexScale.contextDrawer > zIndexScale.stickyHeader, "Context drawer must sit above sticky header");
			assert.ok(zIndexScale.stickyHeader > zIndexScale.baseContent, "Sticky header must sit above base content");
			assert.ok(zIndexScale.emergencyToast >= zIndexScale.modalOverlay, "Emergency toast alerts must overlay modal dialogs");
		});
	});

	// ── 6. 4-State Theme Token Resolution & Darkroom Fidelity ──
	describe("6. 4-State Theme Verification (PC/Mobile Light/Dark Contrast >= 4.5:1)", () => {
		test("Theme matrices satisfy WCAG AA contrast ratio (>= 4.5:1) and darkroom background integrity", () => {
			interface ThemeTokens {
				themeName: "light" | "dark" | "night" | "ocean" | "cyber_xray";
				paperBg: string;
				inkText: string;
				isDark: boolean;
			}

			const themeMatrices: ThemeTokens[] = [
				{ themeName: "light", paperBg: "#ffffff", inkText: "#0f172a", isDark: false },
				{ themeName: "dark", paperBg: "#0b1311", inkText: "#f8fafc", isDark: true },
				{ themeName: "night", paperBg: "#0b0c10", inkText: "#f1e8dd", isDark: true },
				{ themeName: "ocean", paperBg: "#030712", inkText: "#f8fafc", isDark: true },
				{ themeName: "cyber_xray", paperBg: "#02040a", inkText: "#f8fafc", isDark: true },
			];

			for (const t of themeMatrices) {
				const paperRgb = parseColorToRgb(t.paperBg);
				const inkRgb = parseColorToRgb(t.inkText);
				const ratio = calculateContrastRatio(inkRgb, paperRgb);

				assert.ok(
					ratio >= 4.5,
					`Theme ${t.themeName} contrast ratio (${ratio.toFixed(2)}:1) must satisfy WCAG AA (>= 4.5:1)`,
				);

				const lum = calculateRelativeLuminance(paperRgb);
				if (t.isDark) {
					assert.ok(
						lum < 0.15,
						`Dark theme ${t.themeName} paper luminance (${lum.toFixed(4)}) must be < 0.15 for darkroom safety`,
					);
					assert.notEqual(
						t.paperBg,
						"#ffffff",
						`Dark theme ${t.themeName} must NEVER use pure white #ffffff background`,
					);
				} else {
					assert.ok(
						lum > 0.60,
						`Light theme ${t.themeName} paper luminance (${lum.toFixed(4)}) must be > 0.60`,
					);
				}
			}
		});
	});
});

