/**
 * patientWorkspaceHeaderFamilyBadge.test.tsx
 *
 * Verifies:
 * - PatientWorkspaceHeader renders personal balance and family balance / open wallet badge (Mandate 8n)
 * - Raw bureaucratic codes (decree 659, form 043/u) are clean and absent from UI strings
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToString } from "react-dom/server";
import { PatientWorkspaceHeader } from "../workspaceView/PatientWorkspaceHeader";
import { AppLogicProvider } from "../../../contexts/AppLogicContext";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const mockAppContext = {
	dashboard: {
		patients: [],
	},
	selectedPatient: null,
	setSelectedPatientId: () => {},
} as any;

describe("PatientWorkspaceHeader & Family Wallet Badge (Mandates 8e, 8n)", () => {
	it("1. renders personal balance and family wallet button in initial state", () => {
		const html = renderToString(
			<AppLogicProvider value={mockAppContext}>
				<PatientWorkspaceHeader
					patientId="patient-uuid-1"
					patientName="Иванов Иван Иванович"
					patientCardNumber="K-00123"
					patientBalanceRub={3500}
				/>
			</AppLogicProvider>,
		);

		assert.ok(
			html.includes('data-testid="patient-workspace-balance-badge"'),
			"Must render personal balance badge",
		);
		assert.ok(
			html.includes((3500).toLocaleString("ru-RU")),
			"Must display personal balance amount",
		);
		assert.ok(
			html.includes('data-testid="patient-workspace-open-family-btn"') ||
				html.includes('data-testid="patient-workspace-family-balance-badge"'),
			"Must render family badge or open-family button",
		);
	});

	it("2. PatientMedicalFlagsStep does not have raw decree number in anonymous title", () => {
		const flagsStepPath = path.resolve(
			__dirname,
			"../patientCreation/PatientMedicalFlagsStep.tsx",
		);
		const flagsStepCode = fs.readFileSync(flagsStepPath, "utf8");

		assert.ok(
			!flagsStepCode.includes("Анонимный приём (ПП РФ №659)"),
			"Must not contain raw 'ПП РФ №659' in intake title",
		);
		assert.ok(
			flagsStepCode.includes("Анонимный приём"),
			"Must contain clean 'Анонимный приём' title",
		);
	});

	it("3. PatientDocumentsTab does not contain raw '043/у' in the insert print button", () => {
		const docsTabPath = path.resolve(
			__dirname,
			"../tabs/PatientDocumentsTab.tsx",
		);
		const docsTabCode = fs.readFileSync(docsTabPath, "utf8");

		assert.ok(
			!docsTabCode.includes("Вкладыш в карту 043/у"),
			"Must not contain raw '043/у' in insert button text",
		);
		assert.ok(
			docsTabCode.includes("Вкладыш в амбулаторную карту"),
			"Must use human clinical Russian 'Вкладыш в амбулаторную карту'",
		);
	});
});
