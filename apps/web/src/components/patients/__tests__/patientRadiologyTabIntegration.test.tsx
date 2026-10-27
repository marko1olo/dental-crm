import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PatientRadiologyTab } from "../tabs/PatientRadiologyTab";
import { PatientCardModal } from "../PatientCardModal";

describe("Patient Radiology Tab Integration", () => {
	it("1. PatientRadiologyTab renders clinical radiology hub with action buttons", () => {
		const html = renderToStaticMarkup(
			React.createElement(PatientRadiologyTab, {
				patientId: "01a00000-0000-0000-0000-000000000001",
				patientName: "Захаров Иван Дмитриевич",
				patientBirthDate: "1985-04-12",
			}),
		);
		assert.ok(html.includes('data-testid="patient-radiology-tab"'));
		assert.ok(html.includes('data-testid="btn-patient-upload-ct"'));
		assert.ok(html.includes("+ Загрузить КТ для этого пациента"));
		assert.ok(html.includes('data-testid="btn-refresh-patient-radiology"'));
	});

	it("2. PatientRadiologyTab displays empty state gracefully when no studies exist", () => {
		const html = renderToStaticMarkup(
			React.createElement(PatientRadiologyTab, { patientId: "non-existent-patient-uuid", patientName: "Новый Пациент" }),
		);
		assert.ok(html.includes('data-testid="patient-radiology-tab"'));
	});

	it("3. PatientCardModal integrates «Снимки и КТ» tab in navigation", () => {
		const html = renderToStaticMarkup(
			React.createElement(PatientCardModal, {
				isOpen: true,
				onClose: () => {},
				patient: { id: "01a00000-0000-0000-0000-000000000001", fullName: "Захаров Иван Дмитриевич", birthDate: "1985-04-12", phone: "+7 (916) 123-45-67" },
			}),
		);
		assert.ok(html.includes('data-testid="tab-patient-radiology"'));
		assert.ok(html.includes("Снимки и КТ"));
		assert.ok(html.includes('data-testid="tab-patient-general"'));
		assert.ok(html.includes('data-testid="tab-patient-anamnesis"'));
		assert.ok(html.includes('data-testid="tab-patient-visits"'));
		assert.ok(html.includes('data-testid="tab-patient-family"'));
	});
});
