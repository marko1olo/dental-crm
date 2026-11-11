import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import type { Patient } from "@dental/shared";
import { PatientCardModal } from "../PatientCardModal.js";
import { PatientHeaderAllergiesAlert } from "../headerModules/PatientHeaderAllergiesAlert.js";
import { AppLogicProvider, type AppLogicContextType } from "../../../contexts/AppLogicContext.js";

const samplePatients: Patient[] = [
	{
		id: "pat-1",
		organizationId: "org-1",
		fullName: "Иванов Иван Иванович",
		phone: "+7 (916) 111-22-33",
		birthDate: "1985-05-15",
		status: "active",
		balanceRub: 3500,
		allergies: "Аллергия на пенициллин",
		createdAt: "2026-01-01T00:00:00.000Z",
		updatedAt: "2026-01-01T00:00:00.000Z",
	},
	{
		id: "pat-2",
		organizationId: "org-1",
		fullName: "Петрова Анна Сергеевна",
		phone: "+7 (926) 333-44-55",
		birthDate: "1992-08-20",
		status: "active",
		balanceRub: -1200,
		allergies: "",
		clinicalSafetyProfile: {
			takesAnticoagulants: true,
			anticoagulantName: "Варфарин",
			hasPacemakerExs: true,
			pregnancyTrimester: "none",
		},
		createdAt: "2026-01-01T00:00:00.000Z",
		updatedAt: "2026-01-01T00:00:00.000Z",
	} as any,
];

describe("3. Somatic Safety Alerts in Patient Headers (PatientCardModal & PatientHeaderCard)", () => {
	it("PatientCardModal renders prominent somatic safety alert banner when patient has critical risks", () => {
		const html = renderToString(
			React.createElement(PatientCardModal, {
				isOpen: true,
				onClose: () => {},
				patient: samplePatients[1] as any,
				initialSafetyProfile: {
					hasArticaineAllergy: true,
					hasPacemakerExs: true,
					takesAnticoagulants: true,
					pregnancyTrimester: "trimester_1",
					hasDiabetesMellitus: true,
				},
			}),
		);

		assert.ok(html.includes('data-testid="patient-card-modal-somatic-banner"'));
		assert.ok(html.includes("Критический стоп-фактор") || html.includes("Клиническое предупреждение"));
		assert.ok(html.includes("data-testid=\"btn-somatic-healthy-norm\""));
	});

	it("PatientHeaderAllergiesAlert renders dedicated somatic alert banner for critical risks", () => {
		const html = renderToString(
			React.createElement(PatientHeaderAllergiesAlert, {
				allergyText: "",
				criticalSomaticFlags: [{ id: "pacemaker", label: "Кардиостимулятор", category: "cardio" }],
			}),
		);

		assert.ok(html.includes('data-testid="header-somatic-alert"'));
		assert.ok(html.includes("СОМАТИЧЕСКИЙ СТАТУС"));
	});

	it("PatientHeaderAllergiesAlert renders dedicated allergy alert banner for allergic patient", () => {
		const html = renderToString(
			React.createElement(PatientHeaderAllergiesAlert, {
				allergyText: "Аллергия на пенициллин",
				criticalSomaticFlags: [],
			}),
		);

		assert.ok(html.includes('data-testid="header-allergy-alert"'));
		assert.ok(html.includes("СТОП-ФАКТОР / АЛЛЕРГИЯ"));
	});
});
