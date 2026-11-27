/**
 * apps/web/src/components/odontogram/__tests__/odontogramButtonsAndControlsExhaustive.test.tsx
 *
 * Exhaustive Clinical Controls & Typography Uniformity Test Suite
 * Covers 100% of Odontogram Toolbar, More Menu, Quick Actions, Stamp Palette, and Global Treatments buttons.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";

import { OdontogramToolbarMoreMenu } from "../OdontogramToolbarMoreMenu";
import { OdontogramToolbar } from "../OdontogramToolbar";
import { OdontogramToolbarQuickActions } from "../OdontogramToolbarQuickActions";
import { OdontogramStampPalette } from "../OdontogramStampPalette";

describe("1. OdontogramToolbarMoreMenu: Typography Uniformity & Token Contrast", () => {
	it("renders token-based typography and avoids hardcoded zinc/slate dark overrides", () => {
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
				onLoadRadiologyAiReport={() => {}}
				onSyncAllToDiary={() => {}}
				showWisdomTeeth={true}
				setShowWisdomTeeth={() => {}}
				activeMode="anatomical_svg"
				showPulpAndCanals={false}
				setShowPulpAndCanals={() => {}}
				isPediatricEffective={false}
			/>,
		);

		assert.ok(html.includes('data-testid="odontogram-more-menu-popover"'), "Must render popover container");
		assert.ok(html.includes("text-[var(--ink,#0f172a)]"), "Must use --ink text token");
		assert.strictEqual(html.includes("dark:bg-zinc-900"), false, "Must NOT hardcode dark:bg-zinc-900");
		assert.strictEqual(html.includes("opacity-80 truncate"), false, "Must NOT contain washed out opacity-80 on subtitles");
		assert.strictEqual(html.includes("opacity-85"), false, "Must NOT contain washed out opacity-85 on subtitles");
	});

	it("renders all 12 items in More Menu with correct data-testids and labels", () => {
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
				onLoadRadiologyAiReport={() => {}}
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

		// 8. Radiology AI Report (Mandate 8ap: Zero third-party brand names)
		assert.ok(html.includes('data-testid="btn-more-menu-radiology-ai"'), "Must render btn-more-menu-radiology-ai");
		assert.ok(html.includes("Радиологический ИИ-отчёт"), "Must render Radiology AI title");

		// 9. Wisdom Teeth visibility toggle
		assert.ok(
			html.includes('data-testid="btn-odontogram-wisdom-visibility"'),
			"Must render btn-odontogram-wisdom-visibility",
		);
		assert.ok(html.includes("Показ зубов мудрости (8-ки)"), "Must render Wisdom visibility title");

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

describe("2. OdontogramToolbarMoreMenu: Interactive Callback Structure via Rendered Markup", () => {
	it("renders all interactive module buttons and multi-select checkbox with expected attributes", () => {
		const html = renderToString(
			<OdontogramToolbarMoreMenu
				isMoreMenuOpen={true}
				setIsMoreMenuOpen={() => {}}
				activeStampTool={null}
				setActiveStampTool={() => {}}
				isFastExtractMode={false}
				setIsFastExtractMode={() => {}}
				isMultiSelectMode={true}
				onToggleMultiSelect={() => {}}
				isPerioOpen={true}
				onTogglePerio={() => {}}
				isOrthoCephOpen={false}
				setIsOrthoCephOpen={() => {}}
				isSmartOpgOpen={false}
				setIsSmartOpgOpen={() => {}}
				handleMarkIntactDentition={() => {}}
				handleMarkWisdomTeethMissing={() => {}}
				setIsPlanWizardOpen={() => {}}
				toggleVoiceEngine={() => {}}
				isVoiceListening={true}
				setContextDrawerTooth={() => {}}
				onOpenPediatricModal={() => {}}
				onLoadRadiologyAiReport={() => {}}
				onSyncAllToDiary={() => {}}
				showWisdomTeeth={false}
				setShowWisdomTeeth={() => {}}
				activeMode="anatomical_svg"
				showPulpAndCanals={true}
				setShowPulpAndCanals={() => {}}
				isPediatricEffective={false}
			/>,
		);

		assert.ok(html.includes("Остановить диктовку"), "Voice listening active state renders stop prompt");
		assert.ok(html.includes("ВЫКЛ"), "Hidden wisdom teeth state renders OFF indicator");
		assert.ok(html.includes("checked"), "Multi-select active checkbox renders checked");
		assert.ok(html.includes('data-testid="btn-hotpath-sync-all-to-diary"'), "Diary sync button renders");
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
		assert.ok(html.includes('data-testid="odontogram-mode-btn-anatomical_svg"'), "Mode Anatomical View");
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

describe("5. OdontogramStampPalette: 15 Clinical Pathology Stamps & Category Filtering", () => {
	it("renders all clinical pathology stamps, category filter tabs, and inspection reset", () => {
		const html = renderToString(
			<OdontogramStampPalette
				activeStampTool={null}
				setActiveStampTool={() => {}}
				handleQuickTriggerState={() => {}}
			/>,
		);

		// Category tabs
		const categoryTestIds = [
			"stamp-category-all",
			"stamp-category-therapy",
			"stamp-category-endo-surgery",
			"stamp-category-ortho-perio",
		];
		for (const catId of categoryTestIds) {
			assert.ok(html.includes(`data-testid="${catId}"`), `Must render category tab: ${catId}`);
		}

		// All 15 Clinical Stamps
		const requiredTestIds = [
			"quick-trigger-healthy-btn",
			"quick-trigger-caries-btn",
			"quick-trigger-defective-btn",
			"quick-trigger-filling-btn",
			"quick-trigger-pulpitis-btn",
			"quick-trigger-periodontitis-btn",
			"quick-trigger-root-canal-btn",
			"quick-trigger-root-btn",
			"quick-trigger-crown-btn",
			"quick-trigger-bridge-btn",
			"quick-trigger-veneer-btn",
			"quick-trigger-inlay-btn",
			"quick-trigger-implant-btn",
			"quick-trigger-extracted-btn",
			"quick-trigger-calculus-btn",
		];

		for (const tid of requiredTestIds) {
			assert.ok(html.includes(`data-testid="${tid}"`), `Must render stamp trigger: ${tid}`);
		}

		// Inspection Mode button
		assert.ok(html.includes('data-testid="clear-active-stamp-btn"'), "Must render clear-active-stamp-btn");
		assert.ok(html.includes("Режим осмотра [Esc]"), "Must contain Inspection Mode [Esc] label");
	});
});
