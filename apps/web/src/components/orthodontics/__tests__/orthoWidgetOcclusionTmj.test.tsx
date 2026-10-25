import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import {
	ANB_CLASS_OPTIONS,
	OrthodonticVisitProtocolWidget,
} from "../OrthodonticVisitProtocolWidget";

describe("OrthodonticVisitProtocolWidget — Steiner ANB, Occlusion & TMJ", () => {
	it("renders 1-click Steiner ANB classification bar with classes I, II, III and norm button", () => {
		const html = renderToString(<OrthodonticVisitProtocolWidget isOpen={true} onClose={() => {}} />);
		assert.ok(html.includes("data-testid=\"ortho-anb-class-selector\""));
		assert.ok(html.includes("data-testid=\"anb-class-norm-1click-btn\""));
		assert.ok(html.includes("ANB I (Норма)"));
		assert.equal(ANB_CLASS_OPTIONS.length, 3);
	});

	it("renders 1-click photo protocol, ZTL lab orders, and ceph launch buttons", () => {
		const html = renderToString(
			<OrthodonticVisitProtocolWidget isOpen={true} onClose={() => {}} currentAligner={5} totalAligners={36} />,
		);
		assert.ok(html.includes("data-testid=\"ortho-open-photo-protocol-btn\""));
		assert.ok(html.includes("data-testid=\"ortho-preset-aligner-lab-order\""));
		assert.ok(html.includes("data-testid=\"ortho-open-ceph-analysis-btn\""));
	});

	it("renders 1-click Occlusal Anomaly Selector Bar with Sagittal, Vertical, and Transversal presets", () => {
		const html = renderToString(<OrthodonticVisitProtocolWidget isOpen={true} onClose={() => {}} />);
		assert.ok(html.includes("data-testid=\"ortho-occlusion-anomaly-selector\""));
		assert.ok(html.includes("data-testid=\"occlusion-norm-1click-btn\""));
		assert.ok(html.includes("data-testid=\"sagittal-norm-btn\""));
		assert.ok(html.includes("data-testid=\"vertical-norm-btn\""));
		assert.ok(html.includes("data-testid=\"transversal-norm-btn\""));
	});

	it("renders 1-click Gnathology & TMJ Status Selector Bar and protocol preview", () => {
		const html = renderToString(<OrthodonticVisitProtocolWidget isOpen={true} onClose={() => {}} />);
		assert.ok(html.includes("data-testid=\"ortho-gnathology-tmj-selector\""));
		assert.ok(html.includes("data-testid=\"tmj-norm-1click-btn\""));
		assert.ok(html.includes("data-testid=\"tmj-status-norm-btn\""));
		assert.ok(html.includes("• Сагиттальное соотношение резцов: норма"));
		assert.ok(html.includes("• ВНЧС и гнатология: пальпация суставов безболезненная"));
	});
});
