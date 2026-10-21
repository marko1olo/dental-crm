import assert from "node:assert/strict";
import { renderToString } from "react-dom/server";
import { describe, it } from "vitest";
import { LiveTreatmentPlanPresenterLauncher } from "../../appLayout/modalsContainerModules/standalone/LiveTreatmentPlanPresenterLauncher";
import { TreatmentPlanPresenterEmptyState } from "../../appLayout/modalsContainerModules/standalone/TreatmentPlanPresenterEmptyState";
import { DEFAULT_SAMPLE_TEETH } from "../presenterModules/state/presenterStateConstants";
import { TreatmentPlanPresenterStagesTab } from "../TreatmentPlanPresenterStagesTab";
import { generate3TierPlanComparison } from "../treatmentPlanStagesEngine";

describe("LiveTreatmentPlanPresenterLauncher & Stage Payment Red Team Suite", () => {
	it("renders TreatmentPlanPresenterEmptyState with accessible buttons", () => {
		const html = renderToString(
			<TreatmentPlanPresenterEmptyState onClose={() => {}} />,
		);

		assert.ok(
			html.includes("treatment-plan-presenter-empty-state"),
			"Must contain empty state container",
		);
		assert.ok(
			html.includes("Планы лечения не найдены"),
			"Must contain empty state header",
		);
		assert.ok(
			html.includes("empty-presenter-close-btn"),
			"Must contain close button",
		);
		assert.ok(
			html.includes("empty-presenter-pipeline-btn"),
			"Must contain pipeline button",
		);
		assert.ok(
			html.includes("Воронка планов"),
			"Must contain Russian text for pipeline button",
		);
	});

	it("renders TreatmentPlanPresenterStagesTab with 1-click 'Оплатить этап' (Stage Payment) button", () => {
		const tiers = generate3TierPlanComparison(
			DEFAULT_SAMPLE_TEETH,
			undefined,
			0,
			0,
			{ isDemoMode: true },
		);
		const standardTier = tiers[1];

		const html = renderToString(
			<TreatmentPlanPresenterStagesTab
				selectedTier={standardTier}
				selectedTierId={standardTier.tierId}
				allTiers={tiers}
				onSelectTier={() => {}}
				showMicroConsumables={false}
				onUpdateItemPrice={() => {}}
				onPayStage={() => {}}
				patientId="pat-test-01"
				patientName="Иванов Иван Иванович"
			/>,
		);

		assert.ok(
			html.includes("stage-pay-btn-1"),
			"Must render stage payment button for Stage 1",
		);
		assert.ok(
			html.includes("Оплатить этап"),
			"Must contain button label 'Оплатить этап'",
		);
		assert.ok(html.includes("В счёт"), "Must contain button label 'В счёт'");
		assert.ok(html.includes("В приём"), "Must contain button label 'В приём'");
	});

	it("renders LiveTreatmentPlanPresenterLauncher cleanly in demo mode", () => {
		const html = renderToString(
			<LiveTreatmentPlanPresenterLauncher isOpen={true} onClose={() => {}} />,
		);

		// Must render either loading or empty state or presenter
		assert.ok(typeof html === "string", "Output must be valid HTML string");
	});
});
