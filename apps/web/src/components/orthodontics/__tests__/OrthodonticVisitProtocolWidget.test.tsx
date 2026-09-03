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

describe("OrthodonticVisitProtocolWidget Component", () => {
	it("renders nothing when isOpen is false", () => {
		const html = renderToString(
			<OrthodonticVisitProtocolWidget isOpen={false} onClose={() => {}} />,
		);
		assert.equal(html, "");
	});

	it("renders full 1-click orthodontic protocol structure when isOpen is true", () => {
		const html = renderToString(
			<OrthodonticVisitProtocolWidget
				isOpen={true}
				onClose={() => {}}
				patientId="pat-101"
				patientName="Иванов Иван Иванович"
			/>,
		);

		// Container & Title
		assert.ok(html.includes("data-testid=\"orthodontic-visit-protocol-widget\""));
		assert.ok(html.includes("Ортодонтический протокол приёма"));
		assert.ok(html.includes("Иванов Иван Иванович"));

		// 1-Click Fast Action Buttons
		assert.ok(html.includes("data-testid=\"apply-to-form-043-btn\""));
		assert.ok(html.includes("data-testid=\"bottom-apply-protocol-btn\""));
		assert.ok(html.includes("В карту 043/у"));

		// Arch Presets
		assert.ok(html.includes("Вся ВЧ"));
		assert.ok(html.includes("Вся НЧ"));
		assert.ok(html.includes("Обе челюсти"));
		assert.ok(html.includes("Фронт"));

		// Brackets Slots
		assert.ok(html.includes("0.018"));
		assert.ok(html.includes("0.022"));

		// Materials
		assert.ok(html.includes("NiTi"));
		assert.ok(html.includes("CuNiTi"));
		assert.ok(html.includes("SS"));
		assert.ok(html.includes("TMA"));

		// Sections
		assert.ok(html.includes(".016"));
		assert.ok(html.includes(".019x.025"));

		// Elastics
		assert.ok(html.includes("Межчелюстные эластики"));
		assert.ok(html.includes("II класс"));

		// Live 043/u Protocol Preview
		assert.ok(html.includes("ДНЕВНИК ОРТОДОНТИЧЕСКОГО ПРИЁМА (ФОРМА 043/у)"));
		assert.ok(html.includes("1. ЖАЛОБЫ"));
		assert.ok(html.includes("2. ОБЪЕКТИВНЫЙ СТАТУС"));
		assert.ok(html.includes("3. ПРОВЕДЁННОЕ ЛЕЧЕНИЕ"));
		assert.ok(html.includes("4. РЕКОМЕНДАЦИИ И НАЗНАЧЕНИЯ"));
	});

	it("contains all canonical orthodontic presets and catalogs", () => {
		// Bracket Systems
		assert.ok(BRACKET_SYSTEMS.some((b) => b.id === "damon_q2"));
		assert.ok(BRACKET_SYSTEMS.some((b) => b.id === "damon_clear"));
		assert.ok(BRACKET_SYSTEMS.some((b) => b.id === "empower"));
		assert.ok(BRACKET_SYSTEMS.some((b) => b.id === "pitts21"));

		// Wire Materials
		assert.equal(ARCHWIRE_MATERIALS.length, 4);
		assert.ok(ARCHWIRE_MATERIALS.some((m) => m.id === "NiTi"));
		assert.ok(ARCHWIRE_MATERIALS.some((m) => m.id === "CuNiTi"));
		assert.ok(ARCHWIRE_MATERIALS.some((m) => m.id === "SS"));
		assert.ok(ARCHWIRE_MATERIALS.some((m) => m.id === "TMA"));

		// Sections
		assert.ok(ROUND_SECTIONS.includes(".014"));
		assert.ok(ROUND_SECTIONS.includes(".016"));
		assert.ok(RECT_SECTIONS.includes(".016x.022"));
		assert.ok(RECT_SECTIONS.includes(".019x.025"));

		// Elastics
		assert.ok(ELASTIC_SCHEMES.some((e) => e.id === "class_ii"));
		assert.ok(ELASTIC_SCHEMES.some((e) => e.id === "class_iii"));
		assert.ok(ELASTIC_SIZES.some((s) => s.id === "fox_3_16"));
		assert.ok(ELASTIC_SIZES.some((s) => s.id === "kangaroo_1_4"));

		// Clinical Actions
		assert.ok(CLINICAL_ACTIONS.some((a) => a.id === "wire_change"));
		assert.ok(CLINICAL_ACTIONS.some((a) => a.id === "power_chain"));
		assert.ok(CLINICAL_ACTIONS.some((a) => a.id === "rebracket"));
	});
});
