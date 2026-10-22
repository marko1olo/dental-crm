import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { RoadmapStageCard } from "../roadmap/RoadmapStageCard";
import { TreatmentPlanPresenterStagesTab } from "../TreatmentPlanPresenterStagesTab";
import { sampleRoadmapStage, sampleTier } from "./helpers/stagesDispatchAndPepTestHelpers";

describe("TreatmentPlanStages — 1-Click Dispatch Actions", () => {
	it("renders 1-click stage transfer buttons to visit and invoice in TreatmentPlanPresenterStagesTab", () => {
		const html = renderToString(
			<TreatmentPlanPresenterStagesTab
				selectedTier={sampleTier}
				selectedTierId="standard"
				allTiers={[sampleTier]}
				onSelectTier={() => {}}
				showMicroConsumables={false}
				onUpdateItemPrice={() => {}}
			/>,
		);

		assert.ok(html.includes('data-testid="stage-send-to-visit-btn-1"'), "Must contain send to visit button");
		assert.ok(html.includes("В приём"), "Must have text 'В приём'");
		assert.ok(html.includes('data-testid="stage-send-to-invoice-btn-1"'), "Must contain send to invoice button");
		assert.ok(html.includes("В счёт"), "Must have text 'В счёт'");
	});

	it("renders 1-click stage transfer buttons to visit and invoice in RoadmapStageCard", () => {
		const html = renderToString(
			<RoadmapStageCard
				stage={sampleRoadmapStage}
				isExpanded={true}
				onToggle={() => {}}
				effectivePatientName="Петров Иван Васильевич"
			/>,
		);

		assert.ok(html.includes('data-testid="roadmap-send-to-visit-1"'), "Must contain roadmap send to visit button");
		assert.ok(html.includes('data-testid="roadmap-send-to-invoice-1"'), "Must contain roadmap send to invoice button");
	});
});
