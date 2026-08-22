/**
 * ═══════════════════════════════════════════════════════════════════════════
 * STATUTORY FORM 057/U-04 REFERRAL STUDIO TEST SUITE
 * Приказ Минздравсоцразвития РФ от 22.11.2004 № 255 (Форма № 057/у-04)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import assert from "node:assert/strict";
import test from "node:test";
import {
	DEFAULT_DIAGNOSTIC_TESTS,
	MedicalReferral057Modal,
	PARTNER_HOSPITALS_CATALOG,
	REFERRAL_057_PROFILES,
	buildHospitalScanPayload,
	createDefaultReferral057Document,
	exportReferralToJson,
	generateCode128Svg,
	generateDataMatrixSvg,
	getPartnerHospitalPreset,
	getPaymentSourceLabelRu,
	getPurposeLabelRu,
	getReferralProfileDefinition,
	getUrgencyLabelRu,
	renderStatutoryForm057uHtml,
	validateReferral057Document,
	type Referral057ClinicalProfileId,
} from "../components/documents/referral057";

test("Statutory Form 057/u-04 Referral Studio Suite", async (t) => {
	// ─── 1. Presets & Partner Hospitals Catalog ──────────────────────────────
	await t.test("1. Presets & Partner Hospitals Catalog Integrity", () => {
		// All 5 statutory profiles exist
		assert.equal(REFERRAL_057_PROFILES.length, 5);
		const profileIds: Referral057ClinicalProfileId[] = [
			"hospitalization_cmfs",
			"imaging_mri_cbct",
			"allergic_examination",
			"ent_consultation",
			"cardio_consultation",
		];

		for (const pid of profileIds) {
			const prof = REFERRAL_057_PROFILES.find((p) => p.id === pid);
			assert.ok(prof, `Profile ${pid} must exist`);
			assert.ok(prof.labelRu.length > 0);
			assert.ok(prof.icd10Templates.length >= 2, `Profile ${pid} must have at least 2 ICD-10 templates`);
			assert.ok(prof.preOpTestsChecklist.length >= 3, `Profile ${pid} must have pre-op test checklist`);
		}

		// Partner Hospitals Catalog
		assert.ok(PARTNER_HOSPITALS_CATALOG.length >= 7);
		for (const hosp of PARTNER_HOSPITALS_CATALOG) {
			assert.ok(hosp.fullName.length > 5);
			assert.ok(hosp.ogrn.length >= 13, "OGRN must be valid");
			assert.ok(hosp.address.length > 10);
			assert.ok(hosp.phone.length > 5);
			assert.ok(hosp.supportedProfiles.length >= 1);
		}

		// Lookup functions & fallback tests
		const cmfsProfile = getReferralProfileDefinition("hospitalization_cmfs");
		assert.equal(cmfsProfile.id, "hospitalization_cmfs");
		assert.equal(cmfsProfile.defaultPurpose, "hospitalization");

		const fallbackProfile = getReferralProfileDefinition("unknown_profile");
		assert.equal(fallbackProfile.id, "hospitalization_cmfs");

		const pirogovHosp = getPartnerHospitalPreset("hosp_cmfs_pirogov");
		assert.equal(pirogovHosp.id, "hosp_cmfs_pirogov");
		assert.ok(pirogovHosp.fullName.includes("Пирогова"));

		const fallbackHosp = getPartnerHospitalPreset("unknown_hosp");
		assert.equal(fallbackHosp.id, "hosp_cmfs_pirogov");

		// Label Helpers
		assert.equal(getPurposeLabelRu("hospitalization"), "Госпитализация");
		assert.equal(getPurposeLabelRu("examination"), "Обследование");
		assert.equal(getPurposeLabelRu("consultation"), "Консультация");
		assert.equal(getUrgencyLabelRu("routine"), "Плановое");
		assert.equal(getUrgencyLabelRu("urgent"), "Экстренное (неотложное)");
		assert.ok(getPaymentSourceLabelRu("oms").includes("ОМС"));
		assert.ok(getPaymentSourceLabelRu("dms").includes("ДМС"));
		assert.ok(getPaymentSourceLabelRu("commercial").includes("ПМУ"));
	});

	// ─── 2. Form 057/u-04 Document Factory & Vector Barcodes ──────────────────
	await t.test("2. Document Factory & Vector Barcodes (Code128 & DataMatrix)", () => {
		const doc = createDefaultReferral057Document({
			profileId: "imaging_mri_cbct",
			referralNumber: "057-2026-7788",
			patient: {
				fullName: "Иванов Петр Сергеевич",
				omsPolicyNumber: "7751234567890123",
			},
		});

		assert.equal(doc.referralNumber, "057-2026-7788");
		assert.equal(doc.patient.fullName, "Иванов Петр Сергеевич");
		assert.equal(doc.clinical.profileId, "imaging_mri_cbct");
		assert.equal(doc.clinical.purpose, "examination");
		assert.ok(doc.clinical.diagnosticTests.length >= 1);

		// Scan Payload
		assert.ok(doc.scanPayload.includes("REF057"));
		assert.ok(doc.scanPayload.includes("057-2026-7788"));
		assert.ok(doc.scanPayload.includes("Иванов Петр Сергеевич"));
		assert.ok(doc.scanPayload.includes("7751234567890123"));

		// Code128 Vector SVG
		const code128 = generateCode128Svg("057-2026-7788", { height: 40 });
		assert.ok(code128.startsWith("<svg"));
		assert.ok(code128.includes("<rect"));
		assert.ok(code128.includes("057-2026-7788"));

		// DataMatrix Vector SVG
		const dataMatrix = generateDataMatrixSvg(doc.scanPayload, { size: 100 });
		assert.ok(dataMatrix.startsWith("<svg"));
		assert.ok(dataMatrix.includes("<rect"));
		assert.ok(dataMatrix.includes('viewBox="0 0 100 100"'));
	});

	// ─── 3. Statutory Validation Engine ──────────────────────────────────────
	await t.test("3. Statutory Validation Engine (Order № 255 Requirements)", () => {
		const validDoc = createDefaultReferral057Document({
			profileId: "hospitalization_cmfs",
			patient: {
				fullName: "Кузнецов Дмитрий Андреевич",
				birthDate: "1990-02-15",
				registeredAddress: "г. Москва, ул. Тверская, д. 12, кв. 45",
				omsPolicyNumber: "7754890213456789",
			},
			clinical: {
				primaryIcd10Code: "K10.2",
				primaryDiagnosisText: "Хронический остеомиелит нижней челюсти",
				clinicalJustification: "Показана секвестрэктомия в условиях стационара ЧЛХ",
			},
		});

		const validRes = validateReferral057Document(validDoc);
		assert.equal(validRes.isValid, true);
		assert.equal(validRes.errors.length, 0);

		// Test invalid document (missing patient name, invalid OMS, missing ICD-10)
		const invalidDoc = createDefaultReferral057Document({
			patient: {
				fullName: "",
				birthDate: "",
				registeredAddress: "",
				omsPolicyNumber: "123", // Too short
			},
			clinical: {
				primaryIcd10Code: "INVALID_CODE",
				primaryDiagnosisText: "",
				clinicalJustification: "",
				diagnosticTests: [], // Hospitalization requires tests
			},
			signatures: {
				attendingDoctorFullName: "",
			},
		});

		const invalidRes = validateReferral057Document(invalidDoc);
		assert.equal(invalidRes.isValid, false);
		assert.ok(invalidRes.errors.some((e) => e.includes("ФИО пациента")));
		assert.ok(invalidRes.errors.some((e) => e.includes("дата рождения")));
		assert.ok(invalidRes.errors.some((e) => e.includes("адрес постоянного места жительства")));
		assert.ok(invalidRes.errors.some((e) => e.includes("16-значный номер полиса")));
		assert.ok(invalidRes.errors.some((e) => e.includes("МКБ-10")));
		assert.ok(invalidRes.errors.some((e) => e.includes("клинический диагноз")));
		assert.ok(invalidRes.errors.some((e) => e.includes("клиническое обоснование")));
		assert.ok(invalidRes.errors.some((e) => e.includes("госпитализации обязательно внесение результатов")));
		assert.ok(invalidRes.errors.some((e) => e.includes("направившего врача")));
	});

	// ─── 4. Statutory A4 HTML Generator ──────────────────────────────────────
	await t.test("4. Statutory Form 057/u-04 A4 HTML Generator", () => {
		const doc = createDefaultReferral057Document({
			profileId: "ent_consultation",
			referralNumber: "057-2026-9901",
			patient: {
				fullName: "Смирнова Елена Михайловна",
				birthDate: "1985-11-20",
			},
			clinical: {
				primaryIcd10Code: "J32.0",
				primaryDiagnosisText: "Хронический одонтогенный верхнечелюстной синусит справа",
				clinicalJustification: "Оценка состояния соустья пазухи перед синус-лифтингом",
			},
		});

		const html = renderStatutoryForm057uHtml(doc);
		assert.ok(html.includes("<!DOCTYPE html>"));
		assert.ok(html.includes("Форма № 057/у-04"));
		assert.ok(html.includes("Минздравсоцразвития") || html.includes("255"));
		assert.ok(html.includes("057-2026-9901"));
		assert.ok(html.includes("Смирнова Елена Михайловна"));
		assert.ok(html.includes("J32.0"));
		assert.ok(html.includes("Хронический одонтогенный верхнечелюстной синусит"));
		assert.ok(html.includes("Печать направляющей"));
		assert.ok(html.includes("Электронный штрихкод ЕГИСЗ / ОМС"));
	});

	// ─── 5. JSON Export & React Component Integrity ──────────────────────────
	await t.test("5. JSON Export & React Component Integrity", () => {
		const doc = createDefaultReferral057Document();
		const jsonString = exportReferralToJson(doc);
		assert.ok(jsonString.length > 100);

		const parsed = JSON.parse(jsonString);
		assert.equal(parsed.statutoryStandard, "Приказ Минздравсоцразвития РФ № 255 (Форма № 057/у-04)");
		assert.equal(parsed.referralDocument.referralNumber, doc.referralNumber);
		assert.equal(parsed.referralDocument.patient.fullName, doc.patient.fullName);

		// Component export check
		assert.equal(typeof MedicalReferral057Modal, "function");
	});
});
