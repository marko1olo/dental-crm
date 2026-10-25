import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import {
	ARCHWIRE_MATERIALS,
	BRACKET_SYSTEMS,
	CLINICAL_ACTIONS,
	ELASTIC_SCHEMES,
	ELASTIC_SIZES,
	OrthodonticVisitProtocolWidget,
	RECT_SECTIONS,
	ROUND_SECTIONS,
} from "../OrthodonticVisitProtocolWidget";

describe("OrthodonticVisitProtocolWidget — Structure & Catalogs", () => {
	it("renders nothing when isOpen is false", () => {
		const html = renderToString(<OrthodonticVisitProtocolWidget isOpen={false} onClose={() => {}} />);
		assert.equal(html, "");
	});

	it("renders full 1-click orthodontic protocol structure when isOpen is true", () => {
		const html = renderToString(
			<OrthodonticVisitProtocolWidget isOpen={true} onClose={() => {}} patientId="pat-101" patientName="Иванов Иван Иванович" />,
		);

		assert.ok(html.includes("data-testid=\"orthodontic-visit-protocol-widget\""));
		assert.ok(html.includes("Ортодонтический протокол приёма"));
		assert.ok(html.includes("Иванов Иван Иванович"));
		assert.ok(html.includes("data-testid=\"apply-to-form-043-btn\""));
		assert.ok(html.includes("data-testid=\"bottom-apply-protocol-btn\""));
		assert.ok(html.includes("В медицинскую карту"));
		assert.ok(html.includes("data-testid=\"add-ortho-services-to-invoice-btn\""));
		assert.ok(html.includes("data-testid=\"bottom-add-services-to-invoice-btn\""));
		assert.ok(html.includes("data-testid=\"ortho-services-count-badge\""));
		assert.ok(html.includes("Начислить услуги в чек/смету"));

		assert.ok(html.includes("Вся ВЧ"));
		assert.ok(html.includes("Вся НЧ"));
		assert.ok(html.includes("Обе челюсти"));
		assert.ok(html.includes("Фронт"));
		assert.ok(html.includes("min-w-[40px] min-h-[40px]"));

		assert.ok(html.includes("0.018"));
		assert.ok(html.includes("0.022"));
		assert.ok(html.includes("NiTi"));
		assert.ok(html.includes("CuNiTi"));
		assert.ok(html.includes("SS"));
		assert.ok(html.includes("TMA"));
		assert.ok(html.includes(".016"));
		assert.ok(html.includes(".019x.025"));
		assert.ok(html.includes("Межчелюстные эластики"));
		assert.ok(html.includes("II класс"));
		assert.ok(html.includes("ДНЕВНИК ОРТОДОНТИЧЕСКОГО ПРИЁМА"));
	});

	it("contains all canonical orthodontic presets and catalogs", () => {
		assert.ok(BRACKET_SYSTEMS.some((b) => b.id === "damon_q2"));
		assert.ok(BRACKET_SYSTEMS.some((b) => b.id === "damon_clear"));
		assert.ok(BRACKET_SYSTEMS.some((b) => b.id === "empower"));
		assert.ok(BRACKET_SYSTEMS.some((b) => b.id === "pitts21"));

		assert.equal(ARCHWIRE_MATERIALS.length, 4);
		assert.ok(ARCHWIRE_MATERIALS.some((m) => m.id === "NiTi"));
		assert.ok(ARCHWIRE_MATERIALS.some((m) => m.id === "CuNiTi"));
		assert.ok(ARCHWIRE_MATERIALS.some((m) => m.id === "SS"));
		assert.ok(ARCHWIRE_MATERIALS.some((m) => m.id === "TMA"));

		assert.ok(ROUND_SECTIONS.includes(".014"));
		assert.ok(ROUND_SECTIONS.includes(".016"));
		assert.ok(RECT_SECTIONS.includes(".016x.022"));
		assert.ok(RECT_SECTIONS.includes(".019x.025"));

		assert.ok(ELASTIC_SCHEMES.some((e) => e.id === "class_ii"));
		assert.ok(ELASTIC_SCHEMES.some((e) => e.id === "class_iii"));
		assert.ok(ELASTIC_SIZES.some((s) => s.id === "fox_3_16"));
		assert.ok(ELASTIC_SIZES.some((s) => s.id === "kangaroo_1_4"));

		assert.ok(CLINICAL_ACTIONS.some((a) => a.id === "wire_change"));
		assert.ok(CLINICAL_ACTIONS.some((a) => a.id === "power_chain"));
		assert.ok(CLINICAL_ACTIONS.some((a) => a.id === "rebracket"));
	});
});
