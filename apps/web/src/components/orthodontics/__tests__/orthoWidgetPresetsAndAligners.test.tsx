import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import {
	ALIGNER_ATTACHMENT_PRESETS,
	OrthodonticVisitProtocolWidget,
} from "../OrthodonticVisitProtocolWidget";

describe("OrthodonticVisitProtocolWidget — Presets & Aligners", () => {
	it("renders 8 autonomous 1-click clinical presets with correct testids and labels", () => {
		const html = renderToString(
			<OrthodonticVisitProtocolWidget isOpen={true} onClose={() => {}} patientId="pat-102" patientName="Петрова Анна Сергеевна" />,
		);

		assert.ok(html.includes("data-testid=\"ortho-quick-presets-panel\""));
		assert.ok(html.includes("Клинические пресеты"));

		assert.ok(html.includes("data-testid=\"ortho-preset-routine-activation\""));
		assert.ok(html.includes("Плановая активация"));

		assert.ok(html.includes("data-testid=\"ortho-preset-wire-change\""));
		assert.ok(html.includes("Смена дуг"));

		assert.ok(html.includes("data-testid=\"ortho-preset-bracket-bonding\""));
		assert.ok(html.includes("Фиксация брекет-системы"));

		assert.ok(html.includes("data-testid=\"ortho-preset-debonding-retainer\""));
		assert.ok(html.includes("Снятие брекет-системы"));

		assert.ok(html.includes("data-testid=\"ortho-preset-leveling\""));
		assert.ok(html.includes("Смена дуг: нивелирование"));

		assert.ok(html.includes("data-testid=\"ortho-preset-springs\""));
		assert.ok(html.includes("Активация пружин"));

		assert.ok(html.includes("data-testid=\"ortho-preset-separation-rings\""));
		assert.ok(html.includes("Сепарация под кольца"));

		assert.ok(html.includes("data-testid=\"ortho-preset-aligner-lab-order\""));
		assert.ok(html.includes("Наряд ЗТЛ (Элайнеры / Каппа)"));
	});

	it("renders aligner attachments express block with 4 presets, delivery sets, and SOAP append button", () => {
		const html = renderToString(
			<OrthodonticVisitProtocolWidget isOpen={true} onClose={() => {}} patientId="pat-103" patientName="Сидорова Елена Васильевна" currentAligner={12} totalAligners={36} />,
		);

		assert.ok(html.includes("data-testid=\"aligner-attachments-express-block\""));
		assert.ok(html.includes("Аттачменты элайнеров"));

		assert.ok(html.includes("data-testid=\"preset-standard-attachments\""));
		assert.ok(html.includes("Стандартные аттачменты: клыки и премоляры (15, 14, 13, 23, 24, 25, 35, 34, 33, 43, 44, 45)"));

		assert.ok(html.includes("data-testid=\"preset-intact-attachments\""));
		assert.ok(html.includes("Аттачменты интактны, сколов нет"));

		assert.ok(html.includes("data-testid=\"preset-refixation-attachments\""));
		assert.ok(html.includes("Повторная фиксация аттачмента (замена)"));

		assert.ok(html.includes("data-testid=\"preset-debonding-attachments\""));
		assert.ok(html.includes("Снятие аттачментов и полировка (финиш)"));

		assert.ok(html.includes("data-testid=\"widget-issue-set-2-aligners-btn\""));
		assert.ok(html.includes("Сет 2 каппы (+14 дн.)"));
		assert.ok(html.includes("data-testid=\"widget-issue-set-4-aligners-btn\""));
		assert.ok(html.includes("Сет 4 каппы (+28 дн.)"));

		assert.ok(html.includes("data-testid=\"append-attachments-to-soap-btn\""));
		assert.ok(html.includes("Внести в дневник"));

		assert.equal(ALIGNER_ATTACHMENT_PRESETS.length, 4);
		assert.ok(ALIGNER_ATTACHMENT_PRESETS.some((p) => p.id === "standard"));
		assert.ok(ALIGNER_ATTACHMENT_PRESETS.some((p) => p.id === "intact"));
		assert.ok(ALIGNER_ATTACHMENT_PRESETS.some((p) => p.id === "refixation"));
		assert.ok(ALIGNER_ATTACHMENT_PRESETS.some((p) => p.id === "debonding"));
	});
});
