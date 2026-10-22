import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { TreatmentPlanPresenterModal } from "../TreatmentPlanPresenterModal";
import { sampleTiers } from "./helpers/presenterModalTestHelpers";

describe("TreatmentPlanPresenterModal — Layout & 3-Tier Grid", () => {
	it("renders 3-column side-by-side comparison with doctor recommendation badge and DENTE tokens", () => {
		const html = renderToString(
			<TreatmentPlanPresenterModal
				isOpen={true}
				onClose={() => {}}
				tiers={sampleTiers}
				patientName="Смирнова Екатерина Васильевна"
				patientId="PAT-2026-0891"
				doctorFullName="Д-р Смирнов Алексей Петрович"
				clinicName="Стоматологическая клиника «ДЕНТЕ СТОМАТОЛОГИЯ»"
			/>,
		);

		assert.ok(html.includes("Презентация планов лечения"));
		assert.ok(html.includes("Прейскурант клиники"));
		assert.ok(html.includes("Смирнова Екатерина Васильевна"));
		assert.ok(html.includes("Д-р Смирнов Алексей Петрович"));
		assert.ok(html.includes("Рекомендация врача"));
		assert.ok(html.includes("tier-card-economy"));
		assert.ok(html.includes("tier-card-standard"));
		assert.ok(html.includes("tier-card-optimum"));
		assert.ok(html.includes("treatment-3tier-grid"));
	});

	it("renders collapsible clinical stages with nomenclature codes, FDI teeth, and timeline metrics", () => {
		const html = renderToString(
			<TreatmentPlanPresenterModal isOpen={true} onClose={() => {}} tiers={sampleTiers} initialSelectedTierId="standard" />,
		);

		assert.ok(html.includes("Клинические этапы плана"));
		assert.ok(html.includes("Этап 1"));
		assert.ok(html.includes("Этап 2"));
		assert.ok(html.includes("Этап 3"));
		assert.ok(html.includes("A16.07"));
		assert.ok(html.includes("code-804n-badge"));
	});

	it("returns null when isOpen is false", () => {
		const html = renderToString(<TreatmentPlanPresenterModal isOpen={false} onClose={() => {}} />);
		assert.equal(html, "");
	});
});
