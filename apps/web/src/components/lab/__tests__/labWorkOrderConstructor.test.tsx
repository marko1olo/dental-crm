import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import {
	LabWorkOrderConstructorModal,
	type LabWorkOrderData,
} from "../LabWorkOrderConstructorModal";

describe("LabWorkOrderConstructorModal (CAD/CAM & Dental Lab Orders Suite)", () => {
	it("renders modal with construction selector, FDI teeth grid, and patient context", () => {
		const html = renderToString(
			<LabWorkOrderConstructorModal
				isOpen={true}
				onClose={() => {}}
				patientName="Смирнова Екатерина Васильевна"
				patientId="PAT-001"
				doctorName="Др. Ковалев А. В."
				initialTeeth={[11, 21]}
			/>
		);

		// Modal container & Header
		assert.ok(html.includes("Конструктор заказ-нарядов ЗТЛ"), "Must display constructor title");
		assert.ok(html.includes("CAD/CAM &amp; Ортопедия") || html.includes("CAD/CAM & Ортопедия"), "Must display badge");
		assert.ok(html.includes("Смирнова Екатерина Васильевна"), "Must display patient name");
		assert.ok(html.includes("Др. Ковалев А. В."), "Must display doctor name");

		// 6 Navigation Tabs
		assert.ok(html.includes("tab-btn-construction"), "Must render construction tab button");
		assert.ok(html.includes("tab-btn-shades"), "Must render shades tab button");
		assert.ok(html.includes("tab-btn-abutment"), "Must render abutment tab button");
		assert.ok(html.includes("tab-btn-scans"), "Must render scans tab button");
		assert.ok(html.includes("tab-btn-timeline"), "Must render timeline tab button");
		assert.ok(html.includes("tab-btn-summary"), "Must render summary tab button");

		// Default Construction cards
		assert.ok(html.includes("Цирконий Multi-Layer (Katana / Prettau)"), "Must include Zirconia card");
		assert.ok(html.includes("IPS e.max Press / CAD (дисиликат лития)"), "Must include E.max card");
		assert.ok(html.includes("Металлокерамика Co-Cr (Noritake / Duceram)"), "Must include Metal-ceramic card");
		assert.ok(html.includes("All-on-4 / All-on-6 и Индивидуальный абатмент"), "Must include All-on-4 card");
		assert.ok(html.includes("Элайнеры и Ортодонтические каппы / Сплинты"), "Must include Aligners card");

		// FDI Teeth grid
		assert.ok(html.includes("tooth-btn-11"), "Must render tooth 11 button");
		assert.ok(html.includes("tooth-btn-21"), "Must render tooth 21 button");
		assert.ok(html.includes("tooth-btn-46"), "Must render tooth 46 button");

		// Action Buttons in Footer
		assert.ok(html.includes("lab-export-pdf-btn"), "Must contain PDF export button");
		assert.ok(html.includes("lab-send-chat-btn"), "Must contain Send to chat button");
		assert.ok(html.includes("lab-save-order-btn"), "Must contain Save order button");
	});

	it("returns null when isOpen is false", () => {
		const html = renderToString(
			<LabWorkOrderConstructorModal
				isOpen={false}
				onClose={() => {}}
			/>
		);

		assert.equal(html, "", "Should return empty string when isOpen is false");
	});
});
