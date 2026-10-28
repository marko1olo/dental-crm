import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToString } from "react-dom/server";
import { PatientTreatmentPlanDrawerModal } from "../workspace/PatientTreatmentPlanDrawerModal";
import { AppLogicProvider } from "../../../contexts/AppLogicContext";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const mockAppContext = {
	dashboard: {
		patients: [{ id: "pat-100", fullName: "Иванова Мария Сергеевна" }],
		treatmentPlanItems: [],
		serviceCatalog: [],
		appointments: [],
	},
	setSelectedPatientId: () => {},
} as any;

describe("PatientTreatmentPlanDrawerModal Lifecycle & Ergonomics", () => {
	const drawerFilePath = path.resolve(__dirname, "../workspace/PatientTreatmentPlanDrawerModal.tsx");

	it("1. PatientTreatmentPlanDrawerModal renders nothing when isOpen=false", () => {
		const html = renderToString(
			<AppLogicProvider value={mockAppContext}>
				<PatientTreatmentPlanDrawerModal isOpen={false} onClose={() => {}} patientId="pat-100" activePatient={{ fullName: "Иванова Мария Сергеевна" }} />
			</AppLogicProvider>,
		);
		assert.equal(html, "");
	});

	it("2. PatientTreatmentPlanDrawerModal renders full modal shell with patient name and close button when isOpen=true", () => {
		const html = renderToString(
			<AppLogicProvider value={mockAppContext}>
				<PatientTreatmentPlanDrawerModal isOpen={true} onClose={() => {}} patientId="pat-100" activePatient={{ fullName: "Иванова Мария Сергеевна" }} />
			</AppLogicProvider>,
		);
		assert.ok(html.includes('data-testid="patient-treatment-plan-drawer-modal"'));
		assert.ok(html.includes("Иванова Мария Сергеевна"));
		assert.ok(html.includes('data-testid="btn-close-plan-modal"'));
		assert.ok(html.includes("Конструктор планов лечения"));
	});

	it("3. PatientTreatmentPlanDrawerModal shows 'Редактирование плана лечения' when initialPlanId is provided", () => {
		const html = renderToString(
			<AppLogicProvider value={mockAppContext}>
				<PatientTreatmentPlanDrawerModal isOpen={true} onClose={() => {}} patientId="pat-100" activePatient={{ fullName: "Иванова Мария Сергеевна" }} initialPlanId="plan-999" />
			</AppLogicProvider>,
		);
		assert.ok(html.includes("Редактирование плана лечения"));
		assert.ok(html.includes("Текущий план"));
	});

	it("4. Drawer component source code strictly adheres to Mandate 8b / 8zi and Apple HIG", () => {
		const drawerCode = fs.readFileSync(drawerFilePath, "utf8");
		const lines = drawerCode.split("\n").length;
		assert.ok(lines <= 350, `Drawer component line count must be in healthy sweet spot <= 350, got ${lines}`);
		assert.ok(drawerCode.includes("Escape"), "Must support Escape key event handler");
		assert.ok(drawerCode.includes("backdrop-blur"), "Must have backdrop-blur per Apple HIG");
		assert.ok(drawerCode.includes("min-w-[44px]") && drawerCode.includes("min-h-[44px]"), "Close button touch target >= 44x44px");
	});

	it("5. Natural Russian language verification (Zero Bird Language)", () => {
		const drawerCode = fs.readFileSync(drawerFilePath, "utf8");
		assert.ok(!drawerCode.includes("Мандат 8e"));
		assert.ok(!drawerCode.includes("043/у"));
		assert.ok(!drawerCode.includes("804н"));
		assert.ok(!drawerCode.includes("0 блокировок"));
	});
});
