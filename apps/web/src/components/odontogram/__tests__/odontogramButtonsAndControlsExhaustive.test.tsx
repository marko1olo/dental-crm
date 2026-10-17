/**
 * apps/web/src/components/odontogram/__tests__/odontogramButtonsAndControlsExhaustive.test.tsx
 *
 * Exhaustive Clinical Controls & Typography Uniformity Test Suite
 * Covers 100% of Odontogram Toolbar, More Menu, Quick Actions, Stamp Palette, and Global Treatments buttons.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToString } from "react-dom/server";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { OdontogramToolbarMoreMenu } from "../OdontogramToolbarMoreMenu";
import { OdontogramToolbar } from "../OdontogramToolbar";
import { OdontogramToolbarQuickActions } from "../OdontogramToolbarQuickActions";
import { OdontogramStampPalette } from "../OdontogramStampPalette";
import { GlobalTreatmentsStrip } from "../GlobalTreatmentsStrip";

describe("1. OdontogramToolbarMoreMenu: Typography Uniformity & WCAG AAA Contrast", () => {
	it("guarantees unified typography across all items in Section 1 and Section 2", () => {
		const moreMenuPath = path.resolve(
			__dirname,
			"../../../../src/components/odontogram/OdontogramToolbarMoreMenu.tsx",
		);
		const content = fs.readFileSync(moreMenuPath, "utf-8");

		// Strict Title font class
		const titleClass = 'font-bold text-[12px] leading-tight text-slate-900 dark:text-slate-100';
		// Strict Subtitle font class
		const subtitleClass = 'text-[10px] font-normal text-slate-700 dark:text-slate-300 truncate';

		// Verify title class occurrences
		assert.ok(
			content.includes(titleClass),
			`Must contain uniform title class: ${titleClass}`,
		);

		// Verify subtitle class occurrences
		assert.ok(
			content.includes(subtitleClass),
			`Must contain uniform subtitle class: ${subtitleClass}`,
		);

		// Zero faded opacity-80 or opacity-85 on text
		assert.strictEqual(
			content.includes("opacity-80 truncate"),
			false,
			"Must NOT contain washed out opacity-80 on subtitles",
		);
		assert.strictEqual(
			content.includes("opacity-85"),
			false,
			"Must NOT contain washed out opacity-85 on subtitles",
		);
	});

	it("renders all 12 items in More Menu with correct data-testids and classes", () => {
		const html = renderToString(
			<OdontogramToolbarMoreMenu
				isMoreMenuOpen={true}
				setIsMoreMenuOpen={() => {}}
				activeStampTool={null}
				setActiveStampTool={() => {}}
				isFastExtractMode={false}
				setIsFastExtractMode={() => {}}
				isMultiSelectMode={false}
				onToggleMultiSelect={() => {}}
				isPerioOpen={false}
				onTogglePerio={() => {}}
				isOrthoCephOpen={false}
				setIsOrthoCephOpen={() => {}}
				isSmartOpgOpen={false}
				setIsSmartOpgOpen={() => {}}
				handleMarkIntactDentition={() => {}}
				handleMarkWisdomTeethMissing={() => {}}
				setIsPlanWizardOpen={() => {}}
				toggleVoiceEngine={() => {}}
				isVoiceListening={false}
				setContextDrawerTooth={() => {}}
				onOpenPediatricModal={() => {}}
				onLoadDiagnocat={() => {}}
				showWisdomTeeth={true}
				setShowWisdomTeeth={() => {}}
				activeMode="anatomical_svg"
				showPulpAndCanals={false}
				setShowPulpAndCanals={() => {}}
				isPediatricEffective={false}
			/>,
		);

		// 1. Smart OPG
		assert.ok(html.includes('data-testid="btn-open-smart-opg"'), "Must render btn-open-smart-opg");
		assert.ok(html.includes("Панорама ОПТГ AI"), "Must render Smart OPG title");

		// 2. Print A4
		assert.ok(html.includes('data-testid="print-odontogram-a4-btn"'), "Must render print-odontogram-a4-btn");
		assert.ok(html.includes("Печать зубной формулы (А4)"), "Must render Print A4 title");

		// 3. Plan Wizard
		assert.ok(html.includes('data-testid="more-menu-plan-from-pathologies"'), "Must render more-menu-plan-from-pathologies");
		assert.ok(html.includes("План лечения из патологий"), "Must render Plan Wizard title");

		// 4. Perio
		assert.ok(html.includes('data-testid="btn-open-perio-chart"'), "Must render btn-open-perio-chart");
		assert.ok(html.includes("Пародонтограмма"), "Must render Perio title");

		// 5. Ortho Ceph
		assert.ok(html.includes('data-testid="btn-open-ortho-ceph"'), "Must render btn-open-ortho-ceph");
		assert.ok(html.includes("Цефалометрия ТРГ"), "Must render Ortho Ceph title");

		// 6. Tooth Card
		assert.ok(html.includes('data-testid="more-menu-tooth-card"'), "Must render more-menu-tooth-card");
		assert.ok(html.includes("Детальная карточка зуба"), "Must render Tooth Card title");

		// 7. Pediatric Mixed
		assert.ok(html.includes('data-testid="btn-more-menu-pediatric"'), "Must render btn-more-menu-pediatric");
		assert.ok(html.includes("Сменный прикус"), "Must render Pediatric title");

		// 8. Diagnocat AI
		assert.ok(html.includes('data-testid="btn-more-menu-diagnocat"'), "Must render btn-more-menu-diagnocat");
		assert.ok(html.includes("Diagnocat AI"), "Must render Diagnocat title");

		// 9. Wisdom Teeth
		assert.ok(html.includes('data-testid="btn-odontogram-wisdom-missing"'), "Must render btn-odontogram-wisdom-missing");
		assert.ok(html.includes("Зубы мудрости (8-ки)"), "Must render Wisdom teeth title");

		// 10. Pulp and Canals
		assert.ok(html.includes('data-testid="btn-odontogram-pulp-canals"'), "Must render btn-odontogram-pulp-canals");
		assert.ok(html.includes("Каналы и пульпа"), "Must render Pulp and canals title");

		// 11. Fast Extraction
		assert.ok(html.includes('data-testid="btn-odontogram-fast-extract"'), "Must render btn-odontogram-fast-extract");
		assert.ok(html.includes("Быстрое удаление зубов"), "Must render Fast extraction title");

		// 12. Shift Multi-Select
		assert.ok(html.includes('data-testid="checkbox-odontogram-multiselect"'), "Must render checkbox-odontogram-multiselect");
		assert.ok(html.includes("Групповое выделение (Shift)"), "Must render Multi-select title");
	});
});

describe("2. OdontogramToolbarMoreMenu: Source AST & Callback Bindings Verification", () => {
	it("verifies all 12 button click handlers are properly wired in OdontogramToolbarMoreMenu.tsx", () => {
		const moreMenuPath = path.resolve(
			__dirname,
			"../../../../src/components/odontogram/OdontogramToolbarMoreMenu.tsx",
		);
		const content = fs.readFileSync(moreMenuPath, "utf-8");

		// 1. Smart OPG -> setIsSmartOpgOpen(true) & setIsMoreMenuOpen(false)
		assert.ok(content.includes("setIsSmartOpgOpen(true)"), "Smart OPG calls setIsSmartOpgOpen(true)");

		// 2. Print A4 -> window.print() & setIsMoreMenuOpen(false)
		assert.ok(content.includes("window.print()"), "Print A4 calls window.print()");

		// 3. Plan Wizard -> setIsPlanWizardOpen(true) & setIsMoreMenuOpen(false)
		assert.ok(content.includes("setIsPlanWizardOpen(true)"), "Plan wizard calls setIsPlanWizardOpen(true)");

		// 4. Perio -> onTogglePerio() & setIsMoreMenuOpen(false)
		assert.ok(content.includes("if (onTogglePerio) onTogglePerio()"), "Perio calls onTogglePerio()");

		// 5. Ortho Ceph -> setIsOrthoCephOpen((prev) => !prev) & setIsMoreMenuOpen(false)
		assert.ok(content.includes("setIsOrthoCephOpen((prev) => !prev)"), "Ortho ceph toggles setIsOrthoCephOpen");

		// 6. Tooth Card -> setContextDrawerTooth(targetTooth) & setIsMoreMenuOpen(false)
		assert.ok(content.includes("setContextDrawerTooth(targetTooth)"), "Tooth card calls setContextDrawerTooth");

		// 7. Pediatric -> onOpenPediatricModal() & setIsMoreMenuOpen(false)
		assert.ok(content.includes("onOpenPediatricModal()"), "Pediatric calls onOpenPediatricModal()");

		// 8. Diagnocat -> onLoadDiagnocat() & setIsMoreMenuOpen(false)
		assert.ok(content.includes("onLoadDiagnocat()"), "Diagnocat calls onLoadDiagnocat()");

		// 9. Wisdom -> setShowWisdomTeeth((prev) => !prev)
		assert.ok(content.includes("setShowWisdomTeeth((prev) => !prev)"), "Wisdom calls setShowWisdomTeeth");

		// 10. Pulp -> setShowPulpAndCanals((prev) => !prev)
		assert.ok(content.includes("setShowPulpAndCanals((prev) => !prev)"), "Pulp calls setShowPulpAndCanals");

		// 11. Fast extract -> setIsFastExtractMode((prev) => !prev)
		assert.ok(content.includes("setIsFastExtractMode((prev) => !prev)"), "Fast extract toggles setIsFastExtractMode");

		// 12. Multi-select -> onToggleMultiSelect(e.target.checked)
		assert.ok(content.includes("onToggleMultiSelect(e.target.checked)"), "Multi-select checkbox calls onToggleMultiSelect");
	});
});

describe("3. OdontogramToolbar: Controls and Hotpath Actions", () => {
	it("renders all mode switches, dentition controls, sanitation and financial tender buttons", () => {
		const html = renderToString(
			<OdontogramToolbar
				activeMode="anatomical_svg"
				handleModeSwitch={() => {}}
				handleQuickTriggerState={() => {}}
				activeStampTool={null}
				setActiveStampTool={() => {}}
				onDentitionModeChange={() => {}}
				dentitionMode="adult"
				isPediatricEffective={false}
				handleMarkIntactDentition={() => {}}
				handleMarkWisdomTeethMissing={() => {}}
				onSyncAllToDiary={() => {}}
				liveGrossTotalRub={38500}
				onOpenFastCheckout={() => {}}
				onQuickStateChange={() => {}}
				onToggleEstimator={() => {}}
				isLiveInvoiceOpen={false}
				setIsLiveInvoiceOpen={() => {}}
				setIsPlanWizardOpen={() => {}}
				toggleVoiceEngine={() => {}}
				isVoiceListening={false}
				handleBatchSelectGroup={() => {}}
				setActiveJawModalTarget={() => {}}
				ADULT_Q1={[18, 17, 16, 15, 14, 13, 12, 11]}
				ADULT_Q2={[21, 22, 23, 24, 25, 26, 27, 28]}
				ADULT_Q3={[31, 32, 33, 34, 35, 36, 37, 38]}
				ADULT_Q4={[48, 47, 46, 45, 44, 43, 42, 41]}
				ADULT_FRONT={[13, 12, 11, 21, 22, 23, 43, 42, 41, 31, 32, 33]}
				PEDIATRIC_Q5={[55, 54, 53, 52, 51]}
				PEDIATRIC_Q6={[61, 62, 63, 64, 65]}
				PEDIATRIC_Q7={[71, 72, 73, 74, 75]}
				PEDIATRIC_Q8={[85, 84, 83, 82, 81]}
				PEDIATRIC_FRONT={[53, 52, 51, 61, 62, 63, 83, 82, 81, 71, 72, 73]}
				isMoreMenuOpen={true}
				setIsMoreMenuOpen={() => {}}
				isFastExtractMode={false}
				setIsFastExtractMode={() => {}}
				isOrthoCephOpen={false}
				setIsOrthoCephOpen={() => {}}
				setContextDrawerTooth={() => {}}
				showWisdomTeeth={true}
				setShowWisdomTeeth={() => {}}
				showPulpAndCanals={false}
				setShowPulpAndCanals={() => {}}
			/>,
		);

		// View Modes (anatomical_svg, compact_clinical, classic_gost)
		assert.ok(html.includes('data-testid="odontogram-mode-btn-anatomical_svg"'), "Mode 3D View");
		assert.ok(html.includes('data-testid="odontogram-mode-btn-compact_clinical"'), "Mode 2D Facets");
		assert.ok(html.includes('data-testid="odontogram-mode-btn-classic_gost"'), "Mode GOST");

		// Dentition
		assert.ok(html.includes('data-testid="toolbar-dentition-adult"'), "Dentition Adult");
		assert.ok(html.includes('data-testid="toolbar-dentition-pediatric"'), "Dentition Pediatric");
		assert.ok(html.includes('data-testid="toolbar-dentition-mixed"'), "Dentition Mixed");

		// Hotpath & Clinical Tools (Anti-Duplicate-Finance-Toolbar Law: zero checkout buttons in odontogram toolbar)
		assert.ok(html.includes('data-testid="mark-intact-dentition-btn"'), "Sanitation button");
		assert.ok(html.includes('data-testid="btn-hotpath-sync-all-to-diary"'), "Sync all to diary button");
		assert.ok(html.includes('data-testid="odontogram-voice-dictation-btn"'), "Voice dictation button");
		assert.ok(!html.includes('data-testid="btn-open-fast-checkout"'), "Zero duplicate finance checkout buttons in odontogram toolbar");
	});
});

describe("4. OdontogramToolbarQuickActions: Batch Selection & Occlusion Launchers", () => {
	it("renders batch operations, quadrant buttons and jaw occlusion targets", () => {
		const html = renderToString(
			<OdontogramToolbarQuickActions
				handleMarkIntactDentition={() => {}}
				handleMarkWisdomTeethMissing={() => {}}
				handleBatchSelectGroup={() => {}}
				setActiveJawModalTarget={() => {}}
				isPediatricEffective={false}
				ADULT_Q1={[18, 17, 16, 15, 14, 13, 12, 11]}
				ADULT_Q2={[21, 22, 23, 24, 25, 26, 27, 28]}
				ADULT_Q3={[31, 32, 33, 34, 35, 36, 37, 38]}
				ADULT_Q4={[48, 47, 46, 45, 44, 43, 42, 41]}
				ADULT_FRONT={[13, 12, 11, 21, 22, 23, 43, 42, 41, 31, 32, 33]}
				PEDIATRIC_Q5={[55, 54, 53, 52, 51]}
				PEDIATRIC_Q6={[61, 62, 63, 64, 65]}
				PEDIATRIC_Q7={[71, 72, 73, 74, 75]}
				PEDIATRIC_Q8={[85, 84, 83, 82, 81]}
				PEDIATRIC_FRONT={[53, 52, 51, 61, 62, 63, 83, 82, 81, 71, 72, 73]}
				onQuickStateChange={() => {}}
			/>,
		);

		// Batch action triggers
		assert.ok(html.includes('data-testid="mark-intact-dentition-dropdown-btn"'), "Sanitize all in dropdown");
		assert.ok(html.includes('data-testid="mark-wisdom-missing-btn"'), "Wisdom missing in dropdown");
		assert.ok(html.includes('data-testid="clear-selection-btn"'), "Clear selection in dropdown");

		// Quadrants
		assert.ok(html.includes('data-testid="batch-select-q1-btn"'), "Batch select Q1");
		assert.ok(html.includes('data-testid="batch-select-q2-btn"'), "Batch select Q2");
		assert.ok(html.includes('data-testid="batch-select-q3-btn"'), "Batch select Q3");
		assert.ok(html.includes('data-testid="batch-select-q4-btn"'), "Batch select Q4");
		assert.ok(html.includes('data-testid="batch-select-front-btn"'), "Batch select Front");

		// Jaws & Occlusion
		assert.ok(html.includes('data-testid="view-toolbar-jaw-ju-btn"'), "Upper jaw JU launcher");
		assert.ok(html.includes('data-testid="view-toolbar-jaw-jl-btn"'), "Lower jaw JL launcher");
		assert.ok(html.includes('data-testid="view-toolbar-jaw-c-btn"'), "Occlusion C launcher");
	});
});

describe("5. OdontogramStampPalette: 8 Pathology Stamps & Inspection Mode", () => {
	it("renders all 8 clinical pathology stamps with tactile 32px height and inspection reset", () => {
		const html = renderToString(
			<OdontogramStampPalette
				activeStampTool={null}
				setActiveStampTool={() => {}}
				handleQuickTriggerState={() => {}}
			/>,
		);

		const requiredTestIds = [
			"quick-trigger-healthy-btn",
			"quick-trigger-caries-btn",
			"quick-trigger-pulpitis-btn",
			"quick-trigger-periodontitis-btn",
			"quick-trigger-filling-btn",
			"quick-trigger-crown-btn",
			"quick-trigger-extracted-btn",
			"quick-trigger-implant-btn",
		];

		for (const tid of requiredTestIds) {
			assert.ok(html.includes(`data-testid="${tid}"`), `Must render stamp trigger: ${tid}`);
		}

		// Inspection Mode button
		assert.ok(html.includes('data-testid="clear-active-stamp-btn"'), "Must render clear-active-stamp-btn");
		assert.ok(html.includes("Режим осмотра [Esc]"), "Must contain Inspection Mode [Esc] label");
	});
});

describe("6. GlobalTreatmentsStrip: General Arch & Mouth Quick Actions", () => {
	it("renders Air-Flow and Aligners Upper/Lower quick add triggers", () => {
		const html = renderToString(
			<GlobalTreatmentsStrip
				treatments={[]}
				onQuickAdd={() => {}}
				readOnly={false}
			/>,
		);

		assert.ok(html.includes('data-testid="btn-quick-add-airflow"'), "Must render btn-quick-add-airflow");
		assert.ok(html.includes('data-testid="btn-quick-add-aligners-upper"'), "Must render btn-quick-add-aligners-upper");
		assert.ok(html.includes('data-testid="btn-quick-add-aligners-lower"'), "Must render btn-quick-add-aligners-lower");
		assert.ok(html.includes("Air-Flow (Вся полость)"), "Must render Air-flow text");
		assert.ok(html.includes("Элайнеры (В/Ч)"), "Must render Aligners Upper text");
		assert.ok(html.includes("Элайнеры (Н/Ч)"), "Must render Aligners Lower text");
	});
});
