import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import {
	ORTHODONTIC_STAGE_TABS,
	OrthodonticVisitProtocolWidget,
	TORQUE_PRESETS,
} from "../OrthodonticVisitProtocolWidget";

describe("OrthodonticVisitProtocolWidget — Autonomy, Stages & Friction-Killer", () => {
	it("renders 32-36px stages toolbar per Hick's Law with 6 stages", () => {
		const html = renderToString(<OrthodonticVisitProtocolWidget isOpen={true} onClose={() => {}} />);
		assert.ok(html.includes("data-testid=\"ortho-stages-toolbar\""));
		assert.equal(ORTHODONTIC_STAGE_TABS.length, 6);
		assert.ok(html.includes("Все этапы"));
		assert.ok(html.includes("1. Нивелирование"));
	});

	it("renders Doctor Autonomy badge for optional photo protocol without blocking", () => {
		const html = renderToString(<OrthodonticVisitProtocolWidget isOpen={true} onClose={() => {}} />);
		assert.ok(html.includes("data-testid=\"photo-protocol-optional-badge\""));
		assert.ok(html.includes("фотопротокол опционален"));
	});

	it("renders 1-click aligner tray tracker with step controls and messenger reminder", () => {
		const html = renderToString(
			<OrthodonticVisitProtocolWidget isOpen={true} onClose={() => {}} currentAligner={5} totalAligners={20} />,
		);
		assert.ok(html.includes("data-testid=\"aligner-tray-tracker\""));
		assert.ok(html.includes("data-testid=\"aligner-tray-badge\""));
		assert.ok(html.includes("data-testid=\"aligner-prev-tray-btn\""));
		assert.ok(html.includes("data-testid=\"aligner-next-tray-btn\""));
		assert.ok(html.includes("data-testid=\"aligner-send-reminder-btn\""));
	});

	it("renders 1-click torque and angulation calculation panel with 5 presets", () => {
		const html = renderToString(<OrthodonticVisitProtocolWidget isOpen={true} onClose={() => {}} />);
		assert.ok(html.includes("data-testid=\"ortho-torque-angulation-panel\""));
		assert.equal(TORQUE_PRESETS.length, 5);
		assert.ok(html.includes("data-testid=\"torque-preset-damon_std-btn\""));
		assert.ok(html.includes("data-testid=\"angulation-preset-norm-btn\""));
	});

	it("renders print protocol buttons and conforms to Mandate 8e: zero disabled buttons", () => {
		const html = renderToString(<OrthodonticVisitProtocolWidget isOpen={true} onClose={() => {}} />);
		assert.ok(html.includes("data-testid=\"print-ortho-protocol-btn\""));
		assert.ok(!html.includes("disabled=\"\""));
		assert.ok(!html.includes("disabled=\"true\""));
	});
});
