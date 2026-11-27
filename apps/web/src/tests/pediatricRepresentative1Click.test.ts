import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { calculateAge } from "@dental/shared";
import { validatePatientDraftWithRequirements } from "../components/patients/patientFieldRequirementsConfig.js";
import { formatRussianPassport } from "../utils/inputSanitation.js";
import { MinorLegalRepresentativeConsentForm } from "../components/documents/forms/MinorLegalRepresentativeConsentForm";
import { PatientAdministrativeForm } from "../components/patients/PatientAdministrativeForm";
import { emptyClinicProfileDraft, patientAdministrativeProfileDraftFromPatient } from "../appHelpers/clinicProfileHelpers";

describe("Педиатрия и законные представители: живые формы и валидация", () => {
	it("MinorLegalRepresentativeConsentForm рендерит быстрые чипы родства и печатные кнопки без блокировок", () => {
		const html = renderToStaticMarkup(
			React.createElement(MinorLegalRepresentativeConsentForm, {
				patientName: "Смирнов Артём (8 лет)",
				patientBirthDate: "2018-04-12",
				doctorName: "Волкова Е.С.",
				clinicProfile: emptyClinicProfileDraft(),
			}),
		);
		assert.ok(html.includes("Мама") || html.includes("Мать"));
		assert.ok(html.includes("Папа") || html.includes("Отец"));
		assert.ok(html.includes("Опекун"));
		assert.equal(html.includes("043/у"), false);
	});

	it("PatientAdministrativeForm рендерит блок законного представителя и незаблокированную печать пустого договора", () => {
		const draft = patientAdministrativeProfileDraftFromPatient(null);
		const html = renderToStaticMarkup(
			React.createElement(PatientAdministrativeForm, {
				patientAdministrativeProfileDraft: draft,
				updatePatientAdministrativeProfileDraft: () => {},
			}),
		);
		assert.ok(html.includes('data-testid="admin-form-print-blank-contract-btn"'));
		assert.equal(html.includes('data-testid="admin-form-print-blank-contract-btn" disabled'), false);
	});

	it("calculateAge корректно определяет возраст < 14 и >= 14 лет", () => {
		const childAge = calculateAge("2018-05-10");
		const teenAge = calculateAge("2010-05-10");
		assert.ok(childAge !== null && childAge < 14);
		assert.ok(teenAge !== null && teenAge >= 14);
	});

	it("formatRussianPassport сохраняет серию и номер и не блокирует validatePatientDraftWithRequirements", () => {
		assert.equal(formatRussianPassport("4512987654"), "4512 987654");
		const res = validatePatientDraftWithRequirements(
			{
				fullName: "Петров Миша",
				phone: "+7 900 111-22-33",
				birthDate: "2019-01-15",
				snils: "",
			},
			{},
		);
		assert.equal(res.isValid, true);
	});
});
