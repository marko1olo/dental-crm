import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { RoadmapStageCard } from "../roadmap/RoadmapStageCard";
import { TreatmentPlanStagesList } from "../presenterModules/TreatmentPlanStagesList";
import { sampleRoadmapStage, sampleTier } from "./helpers/stagesDispatchAndPepTestHelpers";

describe("TreatmentPlanStages — 1-Click Dispatch Actions", () => {
	it("renders 1-click stage payment and work-order buttons in TreatmentPlanStagesList", () => {
		const html = renderToString(
			<TreatmentPlanStagesList
				activeTier={sampleTier as any}
				onToggleStage={() => {}}
				onPayStage={() => {}}
				onWorkOrder={() => {}}
				showMicroConsumables={false}
			/>,
		);

		assert.ok(html.includes("presenter-pay-stage-btn-"), "Must contain pay stage button");
		assert.ok(html.includes("Оплатить этап"), "Must have text 'Оплатить этап'");
		assert.ok(html.includes("presenter-work-order-btn-"), "Must contain work order button");
		assert.ok(html.includes("В заказ-наряд"), "Must have text 'В заказ-наряд'");
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
