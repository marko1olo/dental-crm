import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PatientCreationModal } from "../../../patients/PatientCreationModal";
import { usePatientStore } from "../../../../store/patientStore";
import { AppLogicProvider, type AppLogicContextType } from "../../../../contexts/AppLogicContext";

const dummyProviderValue = {
	auth: { token: "test", clinicId: "test-clinic" },
	dashboard: { patients: [] },
} as unknown as AppLogicContextType;

describe("PatientCreationModal — 1-Click Parent Binding", () => {
	it("renders child toggle button in PatientCreationModal", () => {
		const html = renderToStaticMarkup(
			createElement(AppLogicProvider, { value: dummyProviderValue },
				createElement(PatientCreationModal, { isOpen: true, onClose: () => {}, createPatient: async () => null }),
			),
		);
		assert.ok(html.includes('data-testid="patient-create-child-toggle"'));
	});

	it("renders 1-click parent binding block when patient is under 18 years old", () => {
		const birthYear = new Date().getFullYear() - 7;
		usePatientStore.getState().setNewPatientBirthDate(`${birthYear}-05-15`);
		usePatientStore.getState().setNewPatientName("Иванов Петр");
		usePatientStore.getState().setNewPatientPhone("+7 (999) 111-22-33");

		const html = renderToStaticMarkup(
			createElement(AppLogicProvider, { value: dummyProviderValue },
				createElement(PatientCreationModal, { isOpen: true, onClose: () => {}, createPatient: async () => null }),
			),
		);

		assert.ok(html.includes('data-testid="create-patient-child-rep-section"'));
		assert.ok(html.includes('data-testid="chip-rep-role-mother"'));
		assert.ok(html.includes('data-testid="chip-rep-role-father"'));
		assert.ok(html.includes('data-testid="chip-rep-role-guardian"'));
		assert.ok(html.includes('data-testid="input-child-parent-name"'));
		assert.ok(html.includes('data-testid="input-child-parent-phone"'));
		assert.ok(html.includes('data-testid="btn-copy-child-phone"'));
	});
});
