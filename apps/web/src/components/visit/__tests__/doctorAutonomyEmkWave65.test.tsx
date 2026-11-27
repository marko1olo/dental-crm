/**
 * doctorAutonomyEmkWave65.test.tsx
 *
 * Dedicated Execution Suite for Doctor Autonomy across EMK 043/y and Visit Diary (Mandates 8e, 8n, 8v, 8t):
 * 1. validateMedicalRecordCompleteness: Missing secondary fields never block saving (isComplete: true),
 *    and missing fields are classified as non-blocking warnings.
 * 2. Form 043 printing watermark: Draft documents render "ЧЕРНОВИК" watermark, signed documents render "ПОДПИСАНО ВРАЧОМ".
 * 3. Clinical template resolution: resolveProtocolFromTemplate resolves SOAP clinical templates with norm defaults.
 * 4. Dual-state stamp constants: FORM_043_STAMP_DRAFT and FORM_043_STAMP_SIGNED match Russian clinical standards.
 * 5. Clean output guarantee: Zero cartoon emojis in rendered clinical print documents.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateMedicalRecordCompleteness } from "../../emr/math/recordMathValidation.js";
import {
	FORM_043_STAMP_DRAFT,
	FORM_043_STAMP_SIGNED,
	FORM_043_WATERMARK_DRAFT_HTML,
	FORM_043_WATERMARK_SIGNED_HTML,
} from "../../emr/math/recordMathStamps.js";
import { generateMedicalRecordPrintHtml } from "../../emr/record/html/recordHtmlGenerator.js";
import { resolveProtocolFromTemplate } from "../../emr/clinicalDiaryMath.js";
import type { MedicalRecordData } from "../../emr/types/recordDataTypes.js";
import { STOMX_ALL_448_TEMPLATES_INDEX } from "@dental/shared";

function createMockRecordData(overrides?: Partial<MedicalRecordData>): MedicalRecordData {
	return {
		formNumber: "Медицинская карта приёма",
		formOrderName: "Медицинская карта стоматологического пациента",
		clinic: {
			clinicName: "Клиника DENTE",
			clinicLegalName: "ООО ДЕНТЕ Клиник",
			clinicAddress: "г. Москва, ул. Клиническая, д. 10",
			clinicPhone: "+7 (495) 000-00-00",
			clinicOgrn: "1234567890123",
			clinicInn: "7701234567",
			clinicKpp: "770101001",
			licenseNumber: "ЛО-77-01-012345",
			licenseDate: "2022-01-15",
			licenseIssuer: "Департамент здравоохранения г. Москвы",
			chiefDoctorFullName: "Д-р Смирнов А.В.",
		},
		passport: {
			patientFullName: "Иванов Иван Иванович",
			patientBirthDate: "1990-05-15",
			patientSex: "M",
			medicalCardNumber: "4821-Л",
			cardOpenedDate: "2026-01-10",
			primaryDiagnosisText: "Z01.2 Осмотр полости рта, патологий не выявлено (Норма)",
			primaryDiagnosisIcd10: "Z01.2",
			attendingDoctorFullName: "Д-р Смирнов А.В.",
			attendingDoctorSpecialty: "Врач-стоматолог-терапевт",
		},
		anamnesis: {
			pastIllnesses: "Соматически здоров. Аллергоанамнез не отягощен.",
			presentIllnessDevelopment: "Плановый профилактический осмотр.",
			biteType: "Ортогнатический",
			mucousMembraneState: "Слизистая оболочка полости рта бледно-розовая, влажная.",
		},
		dentalStatus: {
			odontogramTeeth: [],
			biteType: "orthognathic",
			cpitnIndex: {
				sextant18_14: "0_healthy",
				sextant13_23: "0_healthy",
				sextant24_28: "0_healthy",
				sextant48_44: "0_healthy",
				sextant43_33: "0_healthy",
				sextant34_38: "0_healthy",
			},
			oralMucosaStatus: {
				color: "pale_pink",
				moisture: "moist",
				pathology: "none",
			},
		},
		generalTreatmentPlan: "Профилактический осмотр через 6 месяцев.",
		visitDiaries: [],
		epicrisis: {
			treatmentSummary: "Осмотр проведен, патологий не выявлено.",
			treatmentOutcome: "complete_cure",
			treatmentOutcomeLabel: "Выздоровление",
			dispensaryGroup: "D_I_healthy",
			dispensaryGroupLabel: "Д-I Здоровые",
			plannedRecallIntervalMonths: 6,
			preventivePlanRecommendations: "Гигиена полости рта дважды в день.",
			dateCompleted: "2026-01-10",
			headOfDepartmentFullName: "Зав. отделением Петров П.П.",
			attendingDoctorFullName: "Д-р Смирнов А.В.",
		},
		isDraft: true,
		isLocked: false,
		status: "draft",
		...overrides,
	};
}

describe("Mandate 8e & 8n: Doctor EMK & Visit Diary Autonomy Enforcement", () => {
	it("1. validateMedicalRecordCompleteness: missing secondary fields never block saving", () => {
		const minimalRecord = createMockRecordData({
			passport: {
				patientFullName: "Иванов Иван Иванович",
				patientBirthDate: "1990-05-15",
				patientSex: "M",
				medicalCardNumber: "4821-Л",
				cardOpenedDate: "2026-01-10",
				primaryDiagnosisText: "Z01.2 Норма",
				primaryDiagnosisIcd10: "Z01.2",
				attendingDoctorFullName: "Д-р Тестов",
				attendingDoctorSpecialty: "Терапевт",
				patientSnils: "",
				patientAddressRegistration: "",
			},
		});

		const result = validateMedicalRecordCompleteness(minimalRecord);
		assert.equal(typeof result.completenessScore, "number");
		assert.equal(result.completenessScore > 0, true);
		assert.equal(result.isComplete, true);
		// Crucial Mandate 8e guarantee: None of the missing fields are critical blockers
		const criticalBlockers = result.missingFields.filter((f) => f.severity === "critical");
		assert.equal(criticalBlockers.length, 0);
	});

	it("2. Form 043 dual-state watermarks: draft vs signed render distinct clinical stamps", () => {
		const draftRecord = createMockRecordData({ isDraft: true, isLocked: false, status: "draft" });
		const draftHtml = generateMedicalRecordPrintHtml(draftRecord, { isDraft: true });
		assert.equal(draftHtml.includes("ЧЕРНОВИК"), true);
		assert.equal(draftHtml.includes("watermark-draft"), true);

		const signedRecord = createMockRecordData({ isDraft: false, isLocked: true, status: "signed" });
		const signedHtml = generateMedicalRecordPrintHtml(signedRecord, { isDraft: false, isLocked: true, status: "signed" });
		assert.equal(signedHtml.includes("ПОДПИСАНО ВРАЧОМ"), true);
		assert.equal(signedHtml.includes("watermark-signed"), true);
	});

	it("3. Dual-state stamp constants comply with Russian clinical standards", () => {
		assert.equal(FORM_043_STAMP_DRAFT, "ЧЕРНОВИК (ПРИЁМ НЕ ЗАКРЫТ)");
		assert.equal(FORM_043_STAMP_SIGNED, "ПОДПИСАНО ВРАЧОМ");
		assert.equal(FORM_043_WATERMARK_DRAFT_HTML.includes("ЧЕРНОВИК"), true);
		assert.equal(FORM_043_WATERMARK_SIGNED_HTML.includes("ПОДПИСАНО ВРАЧОМ"), true);
	});

	it("4. resolveProtocolFromTemplate resolves authentic clinical template with norm defaults", () => {
		const firstTemplate = STOMX_ALL_448_TEMPLATES_INDEX[0];
		assert.equal(firstTemplate !== undefined, true);
		if (firstTemplate) {
			const protocol = resolveProtocolFromTemplate(firstTemplate);
			assert.equal(typeof protocol.name, "string");
			assert.equal(protocol.name.length > 0, true);
			assert.equal(typeof protocol.complaint, "string");
			assert.equal(typeof protocol.treatmentProtocol, "string");
		}
	});

	it("5. Zero cartoon emojis in rendered clinical print documents", () => {
		const record = createMockRecordData();
		const html = generateMedicalRecordPrintHtml(record);
		const emojiRegex = /[\u{1F300}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F1E0}-\u{1F1FF}]/u;
		assert.equal(emojiRegex.test(html), false);
	});
});
