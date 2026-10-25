import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import {
	ANGLE_CLASS_OPTIONS,
	OrthodonticVisitProtocolWidget,
	WORKHORSE_ARCHWIRES,
} from "../OrthodonticVisitProtocolWidget";

describe("OrthodonticVisitProtocolWidget — Angle Class & Workhorse Wires", () => {
	it("renders 1-click Angle classification selector bar with I, II/1, II/2, and III classes", () => {
		const html = renderToString(
			<OrthodonticVisitProtocolWidget isOpen={true} onClose={() => {}} patientId="pat-104" patientName="Кузнецов Дмитрий Павлович" />,
		);

		assert.ok(html.includes("data-testid=\"ortho-angle-class-selector\""));
		assert.ok(html.includes("Прикус по Энглю"));

		assert.ok(html.includes("data-testid=\"angle-class-class_1-btn\""));
		assert.ok(html.includes("data-testid=\"angle-class-class_2_div_1-btn\""));
		assert.ok(html.includes("data-testid=\"angle-class-class_2_div_2-btn\""));
		assert.ok(html.includes("data-testid=\"angle-class-class_3-btn\""));

		assert.ok(html.includes("I класс"));
		assert.ok(html.includes("II/1 класс"));
		assert.ok(html.includes("II/2 класс"));
		assert.ok(html.includes("III класс"));

		assert.ok(html.includes("• Прикус (классификация Энгля):"));
		assert.ok(html.includes("I класс по Энглю (нейтральный прикус)"));
	});

	it("renders 1-click workhorse archwires strip (NiTi .014, .016, .018, SS .019x.025)", () => {
		const html = renderToString(
			<OrthodonticVisitProtocolWidget isOpen={true} onClose={() => {}} patientId="pat-105" patientName="Морозова Ольга Игоревна" />,
		);

		assert.ok(html.includes("data-testid=\"ortho-workhorse-wires-strip\""));
		assert.ok(html.includes("Рабочие дуги ортодонта"));

		assert.ok(html.includes("data-testid=\"quick-wire-niti_014-btn\""));
		assert.ok(html.includes("data-testid=\"quick-wire-niti_016-btn\""));
		assert.ok(html.includes("data-testid=\"quick-wire-niti_016x022-btn\""));
		assert.ok(html.includes("data-testid=\"quick-wire-niti_018-btn\""));
		assert.ok(html.includes("data-testid=\"quick-wire-ss_019x025-btn\""));
		assert.ok(html.includes("data-testid=\"quick-wire-tma_017x025-btn\""));
	});

	it("exports canonical ANGLE_CLASS_OPTIONS and WORKHORSE_ARCHWIRES", () => {
		assert.equal(ANGLE_CLASS_OPTIONS.length, 4);
		assert.ok(ANGLE_CLASS_OPTIONS.some((a) => a.id === "class_1"));
		assert.ok(ANGLE_CLASS_OPTIONS.some((a) => a.id === "class_2_div_1"));
		assert.ok(ANGLE_CLASS_OPTIONS.some((a) => a.id === "class_2_div_2"));
		assert.ok(ANGLE_CLASS_OPTIONS.some((a) => a.id === "class_3"));

		assert.equal(WORKHORSE_ARCHWIRES.length, 6);
		assert.ok(WORKHORSE_ARCHWIRES.some((w) => w.id === "niti_014"));
		assert.ok(WORKHORSE_ARCHWIRES.some((w) => w.id === "ss_019x025"));
	});
});
