/**
 * DiarySigningCeremonyService.test.ts — изолированное модульное тестирование сервиса подписания.
 */

import assert from "node:assert/strict";
import crypto from "node:crypto";
import { describe, it } from "node:test";
import { hashCredential } from "../../utils/cryptoHelper.js";
import {
	DiarySigningCeremonyService,
	DiarySigningError,
	computeDiaryHash,
	formatDoctorSpecialtyLabel,
	isDeductibleQuantity,
	redactLegacyPinSignature,
} from "./DiarySigningCeremonyService.js";

describe("DiarySigningCeremonyService — Unit & Domain Logic", () => {
	it("computeDiaryHash produces deterministic SHA-256 across all 8 segments", () => {
		const visitId = "visit-123";
		const patientId = "patient-456";
		const anamnesis = "Pain in lower jaw";
		const statusLocalis = "Tooth 36 deep cavity";
		const treatment = "Composite restoration";
		const icd10 = "K02.1";
		const tooth = "36";
		const complications = "None";
		const comorbidities = "Hypertension";
		const trayBarcode = "TRAY-2026-08";

		const hash1 = computeDiaryHash(
			visitId,
			patientId,
			anamnesis,
			statusLocalis,
			treatment,
			icd10,
			tooth,
			complications,
			comorbidities,
			trayBarcode,
		);

		const expectedRaw = `${visitId}|${patientId}|${anamnesis}|${statusLocalis}|${treatment}|${icd10}|${tooth}|${complications}|${comorbidities}|${trayBarcode}`;
		const expectedHash = crypto.createHash("sha256").update(expectedRaw).digest("hex");

		assert.equal(hash1, expectedHash);
		assert.equal(hash1.length, 64);

		// Changing tray barcode produces a different hash
		const hash2 = computeDiaryHash(
			visitId,
			patientId,
			anamnesis,
			statusLocalis,
			treatment,
			icd10,
			tooth,
			complications,
			comorbidities,
			"TRAY-DIFFERENT",
		);
		assert.notEqual(hash1, hash2);

		// Changing ICD-10 produces a different hash
		const hash3 = computeDiaryHash(
			visitId,
			patientId,
			anamnesis,
			statusLocalis,
			treatment,
			"K04.0",
			tooth,
			complications,
			comorbidities,
			trayBarcode,
		);
		assert.notEqual(hash1, hash3);
	});

	it("formatDoctorSpecialtyLabel translates dental specialties and filters universal", () => {
		assert.equal(formatDoctorSpecialtyLabel(["therapist"]), "терапия");
		assert.equal(formatDoctorSpecialtyLabel(["orthopedist", "surgeon"]), "ортопедия, хирургия");
		assert.equal(formatDoctorSpecialtyLabel(["universal", "implantologist"]), "имплантация");
		assert.equal(formatDoctorSpecialtyLabel(["universal"]), "универсально");
		assert.equal(formatDoctorSpecialtyLabel([]), null);
		assert.equal(formatDoctorSpecialtyLabel(null), null);
		assert.equal(formatDoctorSpecialtyLabel("orthodontist"), "ортодонтия");
	});

	it("redactLegacyPinSignature masks raw PIN: prefix and leaves standard signatures intact", () => {
		assert.equal(
			redactLegacyPinSignature("PIN:1234"),
			"SIMPLE_PIN_EP|redacted-legacy",
		);
		assert.equal(
			redactLegacyPinSignature("SIMPLE_PIN_EP|user-1|2026-08-16T12:00:00Z|abcd1234ef56"),
			"SIMPLE_PIN_EP|user-1|2026-08-16T12:00:00Z|abcd1234ef56",
		);
		assert.equal(
			redactLegacyPinSignature("MIIB-pkcs7-signature-blob"),
			"MIIB-pkcs7-signature-blob",
		);
		assert.equal(redactLegacyPinSignature(null), null);
		assert.equal(redactLegacyPinSignature(undefined), null);
	});

	it("isDeductibleQuantity validates only positive finite numbers", () => {
		assert.equal(isDeductibleQuantity(1), true);
		assert.equal(isDeductibleQuantity(0.5), true);
		assert.equal(isDeductibleQuantity(100), true);

		assert.equal(isDeductibleQuantity(0), false);
		assert.equal(isDeductibleQuantity(-1), false);
		assert.equal(isDeductibleQuantity(-0.01), false);
		assert.equal(isDeductibleQuantity(Number.NaN), false);
		assert.equal(isDeductibleQuantity(Number.POSITIVE_INFINITY), false);
		assert.equal(isDeductibleQuantity(Number.NEGATIVE_INFINITY), false);
	});

	it("DiarySigningError exposes code and message", () => {
		const err = new DiarySigningError("Icd10Required", "МКБ-10 обязателен");
		assert.equal(err.name, "DiarySigningError");
		assert.equal(err.code, "Icd10Required");
		assert.equal(err.message, "МКБ-10 обязателен");
		assert.ok(err instanceof Error);

		const toothErr = new DiarySigningError("ToothRequired", "Зуб обязателен");
		assert.equal(toothErr.code, "ToothRequired");

		const invalidToothErr = new DiarySigningError("ToothInvalid", "Недопустимый зуб");
		assert.equal(invalidToothErr.code, "ToothInvalid");

		const invalidIcdErr = new DiarySigningError("Icd10Invalid", "Недопустимый МКБ");
		assert.equal(invalidIcdErr.code, "Icd10Invalid");
	});

	it("DiarySigningCeremonyService delegates clinical protocol validation", () => {
		assert.equal(DiarySigningCeremonyService.isDentalIcd10("K02.1"), true);
		assert.equal(DiarySigningCeremonyService.isDentalIcd10("J00"), false);
		assert.equal(DiarySigningCeremonyService.isToothSpecificDiagnosis("K02.1"), true);
		assert.equal(DiarySigningCeremonyService.isToothSpecificDiagnosis("K04.0"), true);
		assert.equal(DiarySigningCeremonyService.isToothSpecificDiagnosis("K05.1"), false);
		assert.equal(DiarySigningCeremonyService.isToothSpecificDiagnosis("K08.1"), false);

		// Z-коды профилактических осмотров, диспансеризации и примерки (Мандаты 8e, 8k)
		assert.equal(DiarySigningCeremonyService.isDentalIcd10("Z01.2"), true);
		assert.equal(DiarySigningCeremonyService.isDentalIcd10("Z00.0"), true);
		assert.equal(DiarySigningCeremonyService.isDentalIcd10("Z13.84"), true);
		assert.equal(DiarySigningCeremonyService.isDentalIcd10("Z46.3"), true);
		assert.equal(DiarySigningCeremonyService.isDentalIcd10("Z46.4"), true);
		assert.equal(DiarySigningCeremonyService.isDentalIcd10("Z96.5"), true);

		assert.equal(DiarySigningCeremonyService.isToothSpecificDiagnosis("Z01.2"), false);
		assert.equal(DiarySigningCeremonyService.isToothSpecificDiagnosis("Z00.0"), false);
		assert.equal(DiarySigningCeremonyService.isToothSpecificDiagnosis("Z13.84"), false);
		assert.equal(DiarySigningCeremonyService.isToothSpecificDiagnosis("Z46.3"), false);
		assert.equal(DiarySigningCeremonyService.isToothSpecificDiagnosis("Z46.4"), false);
		assert.equal(DiarySigningCeremonyService.isToothSpecificDiagnosis("Z96.5"), false);

		// Валидация протокола для здорового пациента (Z01.2) без указания зуба
		const healthyRes = DiarySigningCeremonyService.validateClinicalProtocol("Z01.2");
		assert.equal(healthyRes.isValid, true);
		if (healthyRes.isValid) {
			assert.equal(healthyRes.normalizedCode, "Z01.2");
			assert.equal(healthyRes.baseRubric, "Z01");
			assert.equal(healthyRes.isToothSpecific, false);
			assert.deepEqual(healthyRes.parsedTeeth, []);
		}

		// Валидация протокола для общего осмотра (Z00.0) и скрининга (Z13.84)
		const routineRes = DiarySigningCeremonyService.validateClinicalProtocol("Z00.0");
		assert.equal(routineRes.isValid, true);
		const screeningRes = DiarySigningCeremonyService.validateClinicalProtocol("Z13.84");
		assert.equal(screeningRes.isValid, true);

		// Валидация протокола для протезирования/имплантатов с опциональным зубом
		const fittingRes = DiarySigningCeremonyService.validateClinicalProtocol("Z46.3", "21");
		assert.equal(fittingRes.isValid, true);
		if (fittingRes.isValid) {
			assert.deepEqual(fittingRes.parsedTeeth, [21]);
		}
		const implantRes = DiarySigningCeremonyService.validateClinicalProtocol("Z96.5", "36");
		assert.equal(implantRes.isValid, true);
		if (implantRes.isValid) {
			assert.deepEqual(implantRes.parsedTeeth, [36]);
		}

		// Valid tooth-specific protocol
		const validRes = DiarySigningCeremonyService.validateClinicalProtocol("K02.1", "36");
		assert.equal(validRes.isValid, true);

		// Missing tooth on tooth-specific diagnosis
		const missingTooth = DiarySigningCeremonyService.validateClinicalProtocol("K02.1", null);
		assert.equal(missingTooth.isValid, false);
		if (!missingTooth.isValid) {
			assert.equal(missingTooth.errorCode, "ToothRequired");
		}

		// Invalid tooth on tooth-specific diagnosis
		const badTooth = DiarySigningCeremonyService.validateClinicalProtocol("K04.0", "99");
		assert.equal(badTooth.isValid, false);
		if (!badTooth.isValid) {
			assert.equal(badTooth.errorCode, "ToothInvalid");
		}
	});
});
