/**
 * patientBlankContractAndProfileAutonomyWave65.test.tsx
 *
 * WAVE 65 (FEATURE 254):
 * «пациенты_документы::1_клик_печать_договора_с_прочерками_без_403_паспорт_снилс_без_блокировок_сохранения»
 * (Mandates 8e, 8n).
 *
 * Verifies:
 * 1. 1-click blank contract HTML generation with lines of underscores («_______») and 0 ₽.
 * 2. Auto-filling partial patient requisites into the blank contract while falling back to «_______» for empty fields.
 * 3. Graceful offline/error handling in printBlankMedicalContract without throwing or 403 failure.
 * 4. Non-blocking patient administrative profile saving: sanitization of malformed INN and incomplete
 *    legal representative fields to null to prevent backend 400 rejection and unblock saving passport & SNILS.
 * 5. Sanitization of malformed e-mail in buildPatientCorePayload to null to prevent backend Zod rejection.
 * 6. Ergonomic touch target standards: minHeight >= 44px on contract print & admin save buttons.
 * 7. Verification of 0 cartoon emojis and 0 unneeded disabled states on print buttons (Mandate 8e, 8n).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";

import {
	generateBlankContractFallbackHtml,
	printBlankMedicalContract,
} from "../../patients/blankContractPrint.js";
import {
	buildPatientAdministrativeProfilePayload,
	patientAdministrativeProfileDraftIssue,
	type PatientAdministrativeProfileDraft,
} from "../../../utils/clinicProfileUtils.js";
import { buildPatientCorePayload as buildClinicProfilePatientCorePayload } from "../../../appHelpers/clinicProfileHelpers.js";
import { buildPatientCorePayload as buildVisitDraftPatientCorePayload } from "../../../utils/commonHelpers/visitDraft/normalizers.js";
import { PaidContractRequiredFieldsPanel } from "../PaidContractRequiredFieldsPanel.js";

describe("Wave 65 (Feature 254): Blank Contract 1-Click Print & Non-blocking Patient Autonomy", () => {

	it("1. generateBlankContractFallbackHtml generates valid HTML with _______ lines and 0 ₽", () => {
		const html = generateBlankContractFallbackHtml(null, {
			clinicName: "ООО «ДЕНТЕ»",
			doctorName: "Д-р Иванов А.А.",
		});

		assert.ok(html.includes("ДОГОВОР № БЛАНК-"), "Must include contract header");
		assert.ok(
			html.includes("0 руб. 00 коп. (прочерк: _______ руб. ___ коп.)"),
			"Must include 0 rub with procherk in cost section",
		);
		assert.ok(
			html.includes("ООО «ДЕНТЕ»"),
			"Must include clinic name",
		);
		assert.ok(
			html.includes("Д-р Иванов А.А."),
			"Must include doctor name",
		);
		assert.ok(
			html.includes("________________________________________________"),
			"Must include underscore lines for missing patient requisites",
		);

		// Zero cartoon emojis in medical document
		const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}]/u;
		assert.strictEqual(
			emojiRegex.test(html),
			false,
			"Blank contract must have 0 cartoon emojis",
		);
	});

	it("2. generateBlankContractFallbackHtml auto-fills partial patient data and defaults empty to _______", () => {
		const html = generateBlankContractFallbackHtml({
			fullName: "Петрова Анна Сергеевна",
			phone: "+7 999 777-66-55",
			birthDate: "12.04.1992",
			administrativeProfile: {
				identityDocument: "4515 987654",
				snils: "123-456-789 00",
			},
		});

		assert.ok(html.includes("Петрова Анна Сергеевна"), "Must include patient name");
		assert.ok(html.includes("+7 999 777-66-55"), "Must include patient phone");
		assert.ok(html.includes("12.04.1992"), "Must include patient birth date");
		assert.ok(html.includes("4515 987654"), "Must include passport");
		assert.ok(html.includes("123-456-789 00"), "Must include SNILS");
		// Unfilled address and INN must use underscore lines
		assert.ok(
			html.includes("________________________________________________"),
			"Must default missing address to underscore line",
		);
		assert.ok(
			html.includes("0 руб. 00 коп. (прочерк: _______ руб. ___ коп.)"),
			"Must keep cost at 0 ₽ with procherk",
		);
	});

	it("3. printBlankMedicalContract executes safely without 403 rejection", async () => {
		let isCalled = false;
		// Test that function resolves without throwing
		await printBlankMedicalContract(
			{ fullName: "Тестовый Пациент" },
			{ doctorName: "Тестовый Врач" },
		);
		isCalled = true;
		assert.strictEqual(isCalled, true, "printBlankMedicalContract must complete without throwing");
	});

	it("4. buildPatientAdministrativeProfilePayload sanitizes invalid INN to null (Mandates 8e, 8n)", () => {
		const baseDraft: PatientAdministrativeProfileDraft = {
			identityDocument: "4509 112233",
			taxpayerInn: "12345", // Invalid INN (not 10 or 12 digits)
			registrationAddress: "г. Москва, ул. Ленина, д. 1",
			residentialAddress: "",
			insurancePolicyNumber: "1234567890123456",
			snils: "111-222-333 44",
			legalRepresentativeFullName: "",
			legalRepresentativeRelationship: "",
			legalRepresentativeIdentityDocument: "",
			legalRepresentativePhone: "",
			preferredDocumentRecipient: "",
			preferredAppointmentWeekdays: [],
			preferredAppointmentStart: "",
			preferredAppointmentEnd: "",
			preferredAppointmentNote: "",
			dataProcessingBasisNote: "",
			orthodonticProgress: "",
			loyaltyTier: "standard",
			curatorId: "",
			curatorFullName: "",
			curatorAssignedAt: "",
			curatorFunnelStage: "",
			curatorCommissionPercent: "",
			curatorNextContactDate: "",
			curatorNotes: "",
			isAnonymous: false,
			anonymousCode: null,
			decree659Compliance: null,
			gender: "",
			insuranceContractId: "",
		};

		const payload = buildPatientAdministrativeProfilePayload(baseDraft);
		assert.strictEqual(
			payload.taxpayerInn,
			null,
			"Invalid taxpayer INN must be sanitized to null to prevent blocking passport & SNILS save",
		);
		assert.strictEqual(
			payload.identityDocument,
			"4509 112233",
			"Passport must be preserved",
		);
		assert.strictEqual(
			payload.snils,
			"111-222-333 44",
			"SNILS must be preserved",
		);
		assert.strictEqual(
			patientAdministrativeProfileDraftIssue(baseDraft),
			null,
			"Draft issue must be null (non-blocking)",
		);
	});

	it("5. buildPatientAdministrativeProfilePayload sanitizes incomplete legal representative to null", () => {
		// Scenario: registrar clicked relationship chip "Мать" or typed phone, but full name is empty
		const partialRepDraft: PatientAdministrativeProfileDraft = {
			identityDocument: "4509 112233",
			taxpayerInn: "770123456789", // Valid 12 digits
			registrationAddress: "г. Москва",
			residentialAddress: "",
			insurancePolicyNumber: "",
			snils: "111-222-333 44",
			legalRepresentativeFullName: "", // Empty full name!
			legalRepresentativeRelationship: "Мать", // Chip was clicked!
			legalRepresentativeIdentityDocument: "4500 000000",
			legalRepresentativePhone: "+7 999 111-22-33",
			preferredDocumentRecipient: "Законному представителю (мать)",
			preferredAppointmentWeekdays: [],
			preferredAppointmentStart: "",
			preferredAppointmentEnd: "",
			preferredAppointmentNote: "",
			dataProcessingBasisNote: "",
			orthodonticProgress: "",
			loyaltyTier: "standard",
			curatorId: "",
			curatorFullName: "",
			curatorAssignedAt: "",
			curatorFunnelStage: "",
			curatorCommissionPercent: "",
			curatorNextContactDate: "",
			curatorNotes: "",
			isAnonymous: false,
			anonymousCode: null,
			decree659Compliance: null,
			gender: "",
			insuranceContractId: "",
		};

		const payload = buildPatientAdministrativeProfilePayload(partialRepDraft);
		// If legalRepresentativeFullName is missing, representative fields must be sanitized to null
		// to prevent backend 400 error from hasIncompleteRepresentativeIdentity:
		assert.strictEqual(
			payload.legalRepresentativeFullName,
			null,
			"legalRepresentativeFullName must be null",
		);
		assert.strictEqual(
			payload.legalRepresentativeRelationship,
			null,
			"legalRepresentativeRelationship must be null when full name is empty",
		);
		assert.strictEqual(
			payload.legalRepresentativeIdentityDocument,
			null,
			"legalRepresentativeIdentityDocument must be null when full name is empty",
		);
		assert.strictEqual(
			payload.preferredDocumentRecipient,
			null,
			"preferredDocumentRecipient must be null when full name is empty",
		);
		// Patient requisites must be fully intact
		assert.strictEqual(payload.identityDocument, "4509 112233");
		assert.strictEqual(payload.snils, "111-222-333 44");
		assert.strictEqual(payload.taxpayerInn, "770123456789");
	});

	it("6. buildPatientCorePayload sanitizes malformed email to null in clinicProfileHelpers and visitDraft normalizers", () => {
		for (const buildFn of [buildClinicProfilePatientCorePayload, buildVisitDraftPatientCorePayload]) {
			const invalidRes = buildFn({
				fullName: "Тестов Иван",
				birthDate: "1990-01-01",
				phone: "+7 999 111 22 33",
				email: "invalid-email",
				notes: "",
			});
			assert.strictEqual(invalidRes.email, null, "Malformed email must be sanitized to null");

			const validRes = buildFn({
				fullName: "Тестов Иван",
				birthDate: "1990-01-01",
				phone: "+7 999 111 22 33",
				email: "patient@clinic.ru",
				notes: "",
			});
			assert.strictEqual(validRes.email, "patient@clinic.ru");
		}
	});

	it("7. PaidContractRequiredFieldsPanel renders blank contract print button with >= 44px touch target & unlocked state", () => {
		const html = renderToString(
			<PaidContractRequiredFieldsPanel
				review={{ requiredCount: 3, filledCount: 1, missing: ["Паспорт", "Адрес"] } as any}
				fieldsBlockTitle="Реквизиты договора"
				patient={{ fullName: "Тестов Иван" }}
				doctorName="Доктор Петров"
			/>,
		);
		assert.ok(html.includes('data-testid="btn-missing-fields-print-blank-contract"'));
		assert.ok(html.includes("min-h-[44px]"));
		assert.ok(!html.includes("disabled"));
	});
});
