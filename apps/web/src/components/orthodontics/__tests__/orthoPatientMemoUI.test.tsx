import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { OrthodonticVisitProtocolWidget } from "../OrthodonticVisitProtocolWidget.js";

describe("Orthodontic Patient Memo UI & Touch Ergonomics", () => {
	it("renders ortho-copy-patient-memo-btn with touch target >= 44px (min-h-[48px]) in Action Bar", () => {
		const html = renderToString(
			<OrthodonticVisitProtocolWidget
				isOpen={true}
				onClose={() => {}}
				patientId="pat-1"
				patientName="Иванов И.И."
				clinicName="DENTE Clinic"
				clinicPhone="+7 (495) 000-11-22"
				doctorName="Д-р Ортодонт"
			/>,
		);

		assert.ok(html.includes('data-testid="ortho-copy-patient-memo-btn"'));
		assert.ok(html.includes("min-h-[48px] px-3.5 py-2 rounded-xl"));
		assert.ok(html.includes("Скопировать для пациента"));
		assert.ok(html.includes("Памятка"));
		assert.ok(html.includes("title=\"Скопировать памятку по эластикам и уходу для отправки пациенту в WhatsApp/Telegram\""));
		assert.ok(html.includes("title=\"Скопировать протокол в буфер\""));
		assert.ok(html.includes("min-h-[44px] px-2.5 py-1 text-xs font-bold rounded-lg border"));
		assert.ok(html.includes("<svg") && html.includes("lucide-copy"));
		assert.strictEqual(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u.test(html), false);
	});
});
