/**
 * visiographStudyViewer.test.tsx — Red Team Invariant Tests for VisiographStudyViewer.
 *
 * Requirements:
 * - Mandate 8e: Doctor Autonomy (zero modal blocks, instant 1-click tooth binding).
 * - Mandate 8n: Solo Doctor & Small Clinic Sovereignty.
 * - Mandate 8am: Exactly ONE Primary CTA button (#0d9488) per visible context.
 * - Silent Radiation Dose Tracking (0.02 mSv for RVG, 0.05 mSv for OPG).
 * - 1-Click Cashbox Billing integration.
 * - Touch Targets >= 44x44px, Apple HIG compliance.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import { VisiographStudyViewer } from "../VisiographStudyViewer.js";

describe("VisiographStudyViewer — Canonical 2D RVG/OPG Study Viewer", () => {
	it("1. Renders clean viewport canvas and telemetry header", () => {
		const html = renderToString(
			<VisiographStudyViewer
				studyTitle="Прицельная радиовизиография"
				patientName="Лариса Чухрова"
				initialTooth="36"
				modality="rvg"
			/>,
		);

		assert.ok(html.includes('data-testid="visiograph-study-viewer"'));
		assert.ok(html.includes('data-testid="visiograph-canvas"'));
		assert.ok(html.includes("Прицельная радиовизиография"));
		assert.ok(html.includes("Лариса Чухрова"));
		assert.match(html, /Зуб.*36/);
		assert.match(html, /0\.02.*мЗв/);
	});

	it("2. Has strictly ONE Primary CTA button in var(--teal, #0d9488)", () => {
		const html = renderToString(
			<VisiographStudyViewer
				initialTooth="16"
			/>,
		);

		// Verify primary CTA button
		assert.ok(html.includes('data-testid="btn-primary-attach"'));
		assert.match(html, /Привязать к зубу.*16/);
		assert.ok(html.includes("bg-[var(--teal,#0d9488)]"));

		// Verify no other primary CTA buttons exist in toolbar
		const primaryMatches = html.match(/data-testid="btn-primary-[^"]+"/g) || [];
		assert.strictEqual(primaryMatches.length, 1, "Must contain exactly ONE primary CTA button");
	});

	it("3. Provides 2D manipulation controls with neutral toolbar icons", () => {
		const html = renderToString(<VisiographStudyViewer />);

		assert.ok(html.includes('data-testid="btn-zoom-in"'));
		assert.ok(html.includes('data-testid="btn-zoom-out"'));
		assert.ok(html.includes('data-testid="btn-brightness"'));
		assert.ok(html.includes('data-testid="btn-contrast"'));
		assert.ok(html.includes('data-testid="btn-invert"'));
		assert.ok(html.includes('data-testid="btn-ruler"'));
		assert.ok(html.includes('data-testid="btn-reset-view"'));
	});

	it("4. Contains FDI tooth selector with valid adult quadrants (11-48)", () => {
		const html = renderToString(<VisiographStudyViewer initialTooth="26" />);

		assert.ok(html.includes('data-testid="select-tooth-fdi"'));
		assert.ok(html.includes('<option value="26" selected="">26</option>') || html.includes('value="26"'));
		assert.ok(html.includes('value="11"'));
		assert.ok(html.includes('value="48"'));
	});

	it("5. Supports 1-Click billing integration into cash register", () => {
		const html = renderToString(<VisiographStudyViewer modality="rvg" />);

		assert.ok(html.includes('data-testid="btn-quick-bill"'));
		assert.ok(html.includes("+ В чек (450 ₽)"));
	});

	it("6. Calculates silent radiation dose for OPG modality (0.05 mSv)", () => {
		const html = renderToString(
			<VisiographStudyViewer
				studyTitle="Панорамная томография"
				modality="opg"
			/>,
		);

		assert.match(html, /0\.05.*мЗв/);
	});

	it("7. Renders close button when onClose handler is passed", () => {
		const htmlWithClose = renderToString(<VisiographStudyViewer onClose={() => {}} />);
		assert.ok(htmlWithClose.includes('data-testid="btn-close-viewer"'));

		const htmlWithoutClose = renderToString(<VisiographStudyViewer />);
		assert.ok(!htmlWithoutClose.includes('data-testid="btn-close-viewer"'));
	});
});
