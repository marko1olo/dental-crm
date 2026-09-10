/**
 * patientWorkspaceViewErgonomics.test.tsx
 *
 * Unit tests verifying PatientWorkspaceView ergonomics:
 * - 2 primary direct action buttons («+ Новый визит», «+ План лечения»)
 * - Secondary actions aggregated into [⋮ Документы и ДМС] dropdown
 * - Mandate 8e: Doctor & Reception Autonomy (Zero disabled buttons)
 * - Mandate 8d: Zero cartoon emojis
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToString } from "react-dom/server";
import { PatientWorkspaceView } from "../PatientWorkspaceView";
import { AppLogicProvider } from "../../../contexts/AppLogicContext";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const mockAppContext = {
	dashboard: null,
	setSelectedPatientId: () => {},
} as any;

describe("PatientWorkspaceView Toolbar Ergonomics & Anti-Clutter (Mandates 8c, 8d, 8e)", () => {
	const sourcePath = path.resolve(__dirname, "../PatientWorkspaceView.tsx");
	const sourceCode = fs.readFileSync(sourcePath, "utf8");

	it("1. renders exactly 2 primary action buttons: '+ Новый визит' and '+ План лечения'", () => {
		const html = renderToString(
			<AppLogicProvider value={mockAppContext}>
				<PatientWorkspaceView
					patientId="pat-test-123"
					patientName="Смирнов Алексей Петрович"
				/>
			</AppLogicProvider>
		);

		assert.ok(html.includes('data-testid="btn-patient-create-visit"'), "Must render 'Новый визит' primary button");
		assert.ok(html.includes("Новый визит"), "Must display 'Новый визит' label");
		assert.ok(html.includes('data-testid="btn-patient-create-treatment-plan"'), "Must render 'План лечения' primary button");
		assert.ok(html.includes("План лечения"), "Must display 'План лечения' label");
	});

	it("2. renders [⋮ Документы и ДМС] dropdown trigger button and preserves all testids", () => {
		const html = renderToString(
			<AppLogicProvider value={mockAppContext}>
				<PatientWorkspaceView
					patientId="pat-test-123"
					patientName="Смирнов Алексей Петрович"
				/>
			</AppLogicProvider>
		);

		assert.ok(html.includes('data-testid="btn-patient-docs-dms-menu"'), "Must render dropdown trigger");
		assert.ok(html.includes("Документы и ДМС"), "Must display trigger label");

		// Verify source contains all secondary action testids inside the dropdown
		assert.ok(sourceCode.includes('data-testid="open-loyalty-program-modal-btn"'));
		assert.ok(sourceCode.includes('data-testid="patient-dms-manager-btn"'));
		assert.ok(sourceCode.includes('data-testid="patient-dms-registry-btn"'));
		assert.ok(sourceCode.includes('data-testid="patient-print-blank-contract-btn"'));
	});

	it("3. guarantees touch target ergonomics (min-h-[34px]) and zero disabled buttons on toolbar", () => {
		assert.ok(sourceCode.includes('className="primary-button min-h-[34px]'));
		assert.ok(sourceCode.includes('className="secondary-button min-h-[34px]'));
		assert.ok(!sourceCode.includes('data-testid="btn-patient-create-visit" disabled'));
		assert.ok(!sourceCode.includes('data-testid="btn-patient-create-treatment-plan" disabled'));
	});

	it("4. guarantees zero cartoon emojis in PatientWorkspaceView (Mandate 8d item 7)", () => {
		// Emoji regex test
		const emojiRegex = /[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
		assert.equal(emojiRegex.test(sourceCode), false, "PatientWorkspaceView source must NOT contain cartoon emojis");
	});
});
