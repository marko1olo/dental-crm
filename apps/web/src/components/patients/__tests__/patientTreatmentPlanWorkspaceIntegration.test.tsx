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
	dashboard: {
		patients: [{ id: "pat-100", fullName: "Иванова Мария Сергеевна" }],
		treatmentPlanItems: [
			{ id: "plan-item-1", planId: "plan-root-999", patientId: "pat-100", snapshotServiceName: "Профессиональная гигиена полости рта", unitPriceRub: 5500, status: "planned", toothCode: null },
		],
		serviceCatalog: [],
		appointments: [],
	},
	setSelectedPatientId: () => {},
} as any;

describe("PatientTreatmentPlan Workspace Integration", () => {
	const workspaceFilePath = path.resolve(__dirname, "../PatientWorkspaceView.tsx");

	it("1. PatientWorkspaceView eliminates #documents redirect bug and uses modal state", () => {
		const workspaceCode =
			fs.readFileSync(workspaceFilePath, "utf8") + "\n" +
			fs.readFileSync(path.resolve(__dirname, "../workspaceView/usePatientWorkspaceViewLogic.ts"), "utf8") + "\n" +
			fs.readFileSync(path.resolve(__dirname, "../workspaceView/PatientWorkspaceModalsWrapper.tsx"), "utf8");

		assert.ok(!workspaceCode.includes('window.location.hash = "#documents"'));
		assert.ok(workspaceCode.includes("setSelectedPlanIdForModal(planId)"));
		assert.ok(workspaceCode.includes("setIsPlanModalOpen(true)"));
		assert.ok(workspaceCode.includes("PatientTreatmentPlanDrawerModal"));
	});

	it("2. PatientWorkspaceView renders 'Конструктор планов' CTA button in plans tab", () => {
		const html = renderToString(
			<AppLogicProvider value={mockAppContext}>
				<PatientWorkspaceView patientId="pat-100" patientName="Иванова Мария Сергеевна" dashboard={mockAppContext.dashboard} initialTab="plans" />
			</AppLogicProvider>,
		);
		assert.ok(html.includes('data-testid="btn-create-treatment-plan"'));
		assert.ok(html.includes("Конструктор планов"));
	});
});
