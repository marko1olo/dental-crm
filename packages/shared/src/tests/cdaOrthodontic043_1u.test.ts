/**
 * ═══════════════════════════════════════════════════════════════════════════
 * TEST SUITE: FORM 043-1/у (SEMD 109) CDA R2 XML & UKEP SIGNATURE SUITE
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
	generateCdaXml,
	generateSemd043_1uXml,
	validateCdaParams,
	validateDetachedSignature,
	validateUkepCertificate,
	buildEgiszRemdPackage,
	build1ClickExportPackage,
	createDemonstrationGostSignature,
	EGISZ_OIDS,
	type CdaSemd043_1uParams,
} from "../index.js";

const VALID_DOCTOR_SNILS = "123-456-789 64";
const VALID_PATIENT_SNILS = "123-456-789 64";
const VALID_CLINIC_OGRN = "1157746123457";
const VALID_CLINIC_OID = "1.2.643.5.1.13.13.12.2.77.10425";

const SAMPLE_043_1U_PARAMS: CdaSemd043_1uParams = {
	docKind: "043-1u",
	documentId: "ORTHO-DOC-2026-0001",
	documentVersion: 1,
	visitDate: new Date("2026-08-27T10:00:00Z"),
	encounterId: "ENC-ORTHO-100",
	patient: {
		patientId: "PAT-ORTHO-100",
		name: {
			first: "Алиса",
			last: "Волкова",
			middle: "Сергеевна",
		},
		gender: "female",
		birthDate: "2012-05-14",
		snils: VALID_PATIENT_SNILS,
		address: "г. Москва, ул. Профсоюзная, д. 42, кв. 10",
		phone: "+79991234567",
	},
	doctor: {
		name: {
			first: "Елена",
			last: "Смирнова",
			middle: "Викторовна",
		},
		snils: VALID_DOCTOR_SNILS,
		specialtyCode: "1.2.643.5.1.13.13.11.1066.31.08.77",
		specialtyName: "Ортодонтия",
		position: "Врач-ортодонт",
		positionCode: "71",
	},
	clinic: {
		oid: VALID_CLINIC_OID,
		name: 'ООО "Стоматологическая клиника ДЕНТЕ"',
		address: "г. Москва, Ленинский проспект, д. 15",
		phone: "+74951234567",
		ogrn: VALID_CLINIC_OGRN,
	},
	legalAuthenticator: {
		name: {
			first: "Алексей",
			last: "Петров",
			middle: "Иванович",
		},
		snils: VALID_DOCTOR_SNILS,
		position: "Главный врач",
		positionCode: "71",
	},
	orthodonticDiagnosis: "Дистальная окклюзия зубных рядов, сужение верхней челюсти, скученное положение резцов",
	icd10Code: "K07.2",
	angleMolarClassRight: "class_2_sub_1",
	angleMolarClassLeft: "class_2_sub_1",
	angleCanineClassRight: "class_2",
	angleCanineClassLeft: "class_2",
	complaints: "Жалобы на неровные передние зубы, затрудненное откусывание пищи, эстетический дискомфорт при улыбке.",
	anamnesis: "Патология прикуса замечена родителями в возрасте 9 лет. Ранее ортодонтическое лечение не проводилось.",
	anamnesisVitae: "Соматический статус сохранен, хронические соматические заболевания отрицает. Аллергоанамнез спокойный.",
	anthropometry: {
		facialType: "mesoprosopic",
		profileType: "convex",
		facialSymmetry: "symmetric",
		chinDeviationMm: 0,
		nasolabialAngleDegrees: 102,
		mentolabialSulcus: "deep_pronounced",
		lipCompetenceAtRest: "closed_with_strain",
		incisalDisplayAtSmileMm: 4.5,
		gummySmileMm: 0,
		photoProtocolCompleted: true,
	},
	cephalometry: {
		snaAngle: 82.5,
		snbAngle: 77.0,
		anbAngle: 5.5,
		witsAppraisalMm: 3.2,
		fmaAngle: 26.0,
		snGoGnAngle: 33.5,
		upperIncisorToNaAngle: 28.0,
		upperIncisorToNaMm: 6.0,
		lowerIncisorToNbAngle: 24.0,
		lowerIncisorToNbMm: 4.5,
		interincisalAngle: 122.0,
		growthPattern: "normodivergent",
		skeletalClass: "class_2_sub_1",
	},
	indices: {
		tonnIndexNotes: "1.34 (гармоничное соотношение резцов в пределах анатомической нормы)",
		pontIndexNotes: "Сужение зубного ряда в области премоляров на 3.5 мм, в области моляров на 2.0 мм",
		boltonIndexNotes: "Переднее соотношение 77.5%, общее 91.2% (пропорции зубов гармоничны)",
		korkhausIndexNotes: "Укорочение переднего отрезка верхнего зубного ряда на 2 мм",
	},
	appliancePlan: {
		applianceType: "metal_braces_self_ligating",
		extractionPlan: "Лечение без удаления постоянных зубов, с расширением верхнего зубного ряда",
		treatmentStages: [
			"1 этап: Нивелирование и выравнивание зубных рядов (дуги NiTi .014, .016, .014x.025)",
			"2 этап: Нормализация сагиттального и трансверзального соотношения, юстировка торка",
			"3 этап: Детализация окклюзионных контактов на стальных дугах с эластиками II класса",
			"4 этап: Снятие аппаратуры, профессиональная гигиена, установка несъемных ретейнеров",
		],
		estimatedDurationMonths: 20,
		retentionProtocol: "Несъемный проволочный ретейнер на зубах 1.3-2.3 и 3.3-4.3 + ночная ретенционная капа",
	},
	dentalStatus: [
		{ tooth: 11, condition: "K07.3", conditionName: "Вестибулярное положение" },
		{ tooth: 12, condition: "K07.3", conditionName: "Тортоокклюзия" },
		{ tooth: 21, condition: "K07.3", conditionName: "Вестибулярное положение" },
		{ tooth: 22, condition: "K07.3", conditionName: "Небное положение" },
	],
	services: [
		{ code: "A16.07.046", name: "Ортодонтическая коррекция с применением брекет-систем", quantity: 1 },
		{ code: "B01.063.001", name: "Прием (осмотр, консультация) врача-ортодонта первичный", quantity: 1 },
	],
	recommendations: [
		"Тщательная гигиена полости рта с использованием ортодонтической щетки, ершиков и ирригатора",
		"Ограничение твердой и липкой пищи во избежание отклеивания брекетов",
		"Контрольный визит и активация аппаратуры через 4-6 недель",
	],
};

describe("SEMD 109 / Form 043-1/u Orthodontic CDA R2 XML Generation & Verification", () => {
	it("generates complete and valid CDA R2 XML for Form 043-1/u", () => {
		const genResult = generateCdaXml(SAMPLE_043_1U_PARAMS);
		assert.strictEqual(genResult.success, true);
		if (!genResult.success) return;

		const xml = genResult.xml;

		// 1. CDA Root & Header Structure
		assert.ok(xml.includes("<ClinicalDocument"), "Must have ClinicalDocument root");
		assert.ok(xml.includes(`extension="${SAMPLE_043_1U_PARAMS.documentId}"`), "Must include documentId");
		assert.ok(xml.includes(EGISZ_OIDS.SEMD_TEMPLATE_109), "Must declare template OID 109");
		assert.ok(xml.includes("Медицинская карта ортодонтического пациента (Форма 043-1/у)"), "Must have proper title");

		// 2. Doctor & Patient Identifiers
		const cleanPatientSnils = VALID_PATIENT_SNILS.replace(/\D/g, "");
		const cleanDoctorSnils = VALID_DOCTOR_SNILS.replace(/\D/g, "");
		assert.ok(xml.includes(cleanPatientSnils), "Must include patient SNILS in extension");
		assert.ok(xml.includes(cleanDoctorSnils), "Must include doctor SNILS in extension");
		assert.ok(xml.includes(VALID_CLINIC_OID), "Must include clinic OID");

		// 3. Section 1: Orthodontic Diagnosis & Angle Occlusion
		assert.ok(xml.includes('displayName="Диагнозы"'), "Must include diagnosis section");
		assert.ok(xml.includes('code="K07.2"'), "Must include ICD-10 K07.2 code");
		assert.ok(xml.includes("II класс 1 подкласс по Энглю"), "Must include Angle classification label");

		// 4. Section 2: Anamnesis & Complaints
		assert.ok(xml.includes('displayName="Анамнез и жалобы"'), "Must include anamnesis section");
		assert.ok(xml.includes("эстетический дискомфорт"), "Must include complaints text");

		// 5. Section 3: Anthropometry & Photometry (LOINC 55286-9)
		assert.ok(xml.includes(EGISZ_OIDS.LOINC_FACIAL_ANTHROPOMETRY), "Must include anthropometry LOINC");
		assert.ok(xml.includes("Мезопрозоп"), "Must include facial type label");
		assert.ok(xml.includes("102°"), "Must include nasolabial angle");

		// 6. Section 4: TRG Cephalometrics (LOINC 55287-7)
		assert.ok(xml.includes(EGISZ_OIDS.LOINC_CEPHALOMETRICS), "Must include cephalometry LOINC");
		assert.ok(xml.includes("82.5°"), "Must include SNA angle");
		assert.ok(xml.includes("77°"), "Must include SNB angle");
		assert.ok(xml.includes("Скелетный класс II подкласс 1"), "Must include skeletal class");

		// 7. Section 5: Model Biometric Indices (LOINC 55288-5)
		assert.ok(xml.includes(EGISZ_OIDS.LOINC_ORTHODONTIC_INDICES), "Must include model indices LOINC");
		assert.ok(xml.includes("Индекс Тона (Tonn)"), "Must include Tonn index");
		assert.ok(xml.includes("Индекс Пона (Pont)"), "Must include Pont index");

		// 8. Section 6: Appliance Plan (LOINC 18776-5)
		assert.ok(xml.includes(EGISZ_OIDS.LOINC_APPLIANCE_PLAN), "Must include appliance plan LOINC");
		assert.ok(xml.includes("Металлическая самолигирующая брекет-система"), "Must include appliance label");
		assert.ok(xml.includes("20 мес."), "Must include duration");

		// 9. Section 7: Dental Formula (FDI)
		assert.ok(xml.includes("<td>11</td>"), "Must include tooth 11 in dental status");
		assert.ok(xml.includes("<td>22</td>"), "Must include tooth 22 in dental status");

		// 10. Section 8: Services 804n
		assert.ok(xml.includes("A16.07.046"), "Must include 804n code A16.07.046");
		assert.ok(xml.includes("B01.063.001"), "Must include 804n code B01.063.001");

		// 11. Section 9: Recommendations
		assert.ok(xml.includes("Ограничение твердой и липкой пищи"), "Must include recommendations text");
	});

	it("validates parameters and rejects invalid data", () => {
		// 1. Zod schema rejection: empty diagnosis
		const invalidSchema = {
			...SAMPLE_043_1U_PARAMS,
			orthodonticDiagnosis: "",
		};
		const val1 = validateCdaParams(invalidSchema);
		assert.strictEqual(val1.valid, false);
		assert.ok(val1.errors.some((e) => e.includes("orthodonticDiagnosis") || e.includes("диагноз")));

		// 2. Clinical rules rejection: invalid ICD-10 and FDI tooth number
		const invalidClinical = {
			...SAMPLE_043_1U_PARAMS,
			orthodonticDiagnosis: "Аномалия прикуса",
			icd10Code: "INVALID_CODE",
			dentalStatus: [{ tooth: 99, condition: "K07.3" }],
		};
		const val2 = validateCdaParams(invalidClinical);
		assert.strictEqual(val2.valid, false);
		assert.ok(val2.errors.some((e) => e.includes("МКБ-10")));
		assert.ok(val2.errors.some((e) => e.includes("номер зуба")));
	});

	it("validates UKEP certificate attributes correctly", () => {
		const now = new Date();
		const validCert = {
			subject: `CN=Смирнова Елена Викторовна, SNILS=${VALID_DOCTOR_SNILS}, O=ООО ДЕНТЕ, OGRN=${VALID_CLINIC_OGRN}, C=RU`,
			issuer: "CN=Головной Удостоверяющий Центр Минцифры РФ (Квалифицированный), C=RU",
			validFrom: new Date(now.getTime() - 86400000).toISOString(),
			validTo: new Date(now.getTime() + 86400000 * 365).toISOString(),
			serialNumber: "00E4A28B12345678",
		};

		const checkValid = validateUkepCertificate({
			certificate: validCert,
			expectedDoctorSnils: VALID_DOCTOR_SNILS,
			expectedClinicOgrn: VALID_CLINIC_OGRN,
		});

		assert.strictEqual(checkValid.valid, true);
		assert.strictEqual(checkValid.notExpired, true);
		assert.strictEqual(checkValid.snilsMatched, true);
		assert.strictEqual(checkValid.ogrnMatched, true);
		assert.strictEqual(checkValid.errors.length, 0);

		// Test expired certificate
		const expiredCert = {
			...validCert,
			validTo: new Date(now.getTime() - 86400000).toISOString(),
		};
		const checkExpired = validateUkepCertificate({ certificate: expiredCert });
		assert.strictEqual(checkExpired.valid, false);
		assert.strictEqual(checkExpired.notExpired, false);
		assert.ok(checkExpired.errors.some((e) => e.includes("истек")));

		// Test SNILS mismatch
		const checkMismatch = validateUkepCertificate({
			certificate: validCert,
			expectedDoctorSnils: "999-999-999 99",
		});
		assert.strictEqual(checkMismatch.valid, false);
		assert.strictEqual(checkMismatch.snilsMatched, false);
		assert.ok(checkMismatch.errors.some((e) => e.includes("не совпадает со СНИЛС врача")));
	});

	it("builds a validated EGISZ REMD submission package and 1-click export bundle", () => {
		const genResult = generateCdaXml(SAMPLE_043_1U_PARAMS);
		assert.strictEqual(genResult.success, true);
		if (!genResult.success) return;

		const doctorSig = createDemonstrationGostSignature({
			doctorName: "Смирнова Елена Викторовна",
			doctorSnils: VALID_DOCTOR_SNILS,
			clinicName: 'ООО "Стоматологическая клиника ДЕНТЕ"',
			isMoSignature: false,
		});

		const moSig = createDemonstrationGostSignature({
			doctorName: "Петров Алексей Иванович",
			doctorSnils: "112-233-445 95",
			clinicName: 'ООО "Стоматологическая клиника ДЕНТЕ"',
			isMoSignature: true,
		});

		// Verify signature structure
		const sigCheck = validateDetachedSignature(doctorSig);
		assert.strictEqual(sigCheck.valid, true);

		// Build REMD package
		const remdPackage = buildEgiszRemdPackage({
			documentId: SAMPLE_043_1U_PARAMS.documentId,
			documentVersion: 1,
			docTypeNsiCode: "109",
			rawXml: genResult.xml,
			doctorSignature: doctorSig,
			moSignature: moSig,
			patientSnils: VALID_PATIENT_SNILS,
			clinicOid: VALID_CLINIC_OID,
			clinicOgrn: VALID_CLINIC_OGRN,
		});

		assert.ok(remdPackage.xmlCanonicalPayload.length > 500);
		assert.strictEqual(remdPackage.docTypeNsiCode, "109");
		assert.strictEqual(remdPackage.doctorSignature.certificateSerialNumber, doctorSig.certificateSerialNumber);
		assert.strictEqual(remdPackage.moSignature?.certificateSerialNumber, moSig.certificateSerialNumber);

		// Build 1-click export package bundle
		const exportBundle = build1ClickExportPackage({
			documentId: SAMPLE_043_1U_PARAMS.documentId,
			documentVersion: 1,
			docTypeNsiCode: "109",
			rawXml: genResult.xml,
			doctorSignature: doctorSig,
			moSignature: moSig,
			patientSnils: VALID_PATIENT_SNILS,
			clinicOid: VALID_CLINIC_OID,
			clinicOgrn: VALID_CLINIC_OGRN,
		});

		assert.ok(exportBundle.xmlFileName.endsWith(".xml"));
		assert.ok(exportBundle.doctorSigFileName.endsWith(".sig"));
		assert.ok(exportBundle.moSigFileName?.endsWith("_mo.sig"));
		assert.ok(exportBundle.manifestFileName.endsWith("_manifest.json"));
		assert.ok(exportBundle.manifestJson.includes("EGISZ_REMD_PACKAGE_V1"));
		assert.strictEqual(exportBundle.packageMeta.hasMoSignature, true);
	});
});
