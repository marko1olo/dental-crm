import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { EndoCanalLogModal } from "../EndoCanalLogModal";

describe("Endo Patient Memo Modal Actions & Touch Targets (Mandate 8c, 8e)", () => {
	it("1. renders copy patient memo button and print worksheet button when modal is open", () => {
		const html = renderToString(
			<EndoCanalLogModal
				isOpen={true}
				onClose={() => {}}
				toothNumber={16}
				patientName="Семенов С.С."
				doctorName="Врач Эндодонтист"
			/>,
		);

		assert.ok(html.includes('data-testid="endo-copy-patient-memo-btn"'), "Must render copy button");
		assert.ok(html.includes('data-testid="endo-print-worksheet-btn"'), "Must render print worksheet");
		assert.ok(html.includes("Скопировать для пациента"), "Must show copy patient memo label");
		assert.ok(html.includes("Печать эндо-карты (А4)"), "Must show print worksheet label");
	});

	it("2. renders null when isOpen is false", () => {
		const html = renderToString(
			<EndoCanalLogModal
				isOpen={false}
				onClose={() => {}}
				toothNumber={16}
			/>,
		);
		assert.equal(html, "");
	});

	it("3. footer action buttons have min-height >= 44px (min-h-[50px])", () => {
		const html = renderToString(
			<EndoCanalLogModal
				isOpen={true}
				onClose={() => {}}
				toothNumber={36}
			/>,
		);

		assert.ok(html.includes("min-h-[50px]"), "Footer buttons must have min-h-[50px] >= 44px touch target");
	});
});
