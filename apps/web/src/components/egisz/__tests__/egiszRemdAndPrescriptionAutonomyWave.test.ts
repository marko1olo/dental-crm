/**
 * ═══════════════════════════════════════════════════════════════════════════
 * EGISZ REMD 101/102 & PRESCRIPTIONS 107-1/U AUTONOMY WAVE TEST SUITE
 * DENTE DENTAL CRM — Russian Ministry of Health & Order 1094n / 1051n Invariants
 * ═══════════════════════════════════════════════════════════════════════════
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import {
	EGISZ_DENTAL_SEMD_TYPES,
	EGISZ_REMD_OIDS,
	generateEgiszDentalCdaXml,
	runEgisz043uPreflight,
	DEFAULT_EGISZ_CLINIC_PRESET,
	DEFAULT_EGISZ_DOCTOR_PRESET,
	SAMPLE_043U_PATIENT_PRESET,
	type EgiszDentalCdaPayload,
} from "../egiszRemdEngine.js";

import {
	buildCdaXml,
	validateCdaSemanticRules,
	EGISZ_SEMD_DOC_TYPES,
	type CdaExportData,
} from "../egiszCdaValidator.js";

import {
	DENTAL_MEDICATIONS_CATALOG,
	DENTAL_FAST_PRESCRIPTION_PACKAGES,
} from "../../prescriptions/generator/prescriptionPresets.js";

import {
	calculateMedicationDosage,
	generateForm107Prescription,
	validateDentalMnn,
	type Form107PrescriptionInput,
} from "../../prescriptions/generator/prescriptionEngine.js";

import {
	CONSENT_THERAPY,
	CONSENT_ANESTHESIA,
	renderConsentTemplate,
} from "../../consents/consentTemplates.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webRoot = path.resolve(__dirname, "../../..");

describe("EGISZ REMD, Form 107-1/u & Consents Autonomy & Demolition Wave", () => {
	// ═════════════════════════════════════════════════════════════════════════
	// 1. ПРОВЕРКА ПОЛНОГО ОТСУТСТВИЯ СТАЦИОНАРНОГО И ГОСПИТАЛЬНОГО БЛОАТА
	// ═════════════════════════════════════════════════════════════════════════
	describe("1. Zero Hospital & Inpatient Bloat Inquest", () => {
		const targetDirs = [
			path.join(webRoot, "components/egisz"),
			path.join(webRoot, "components/prescriptions"),
			path.join(webRoot, "components/consents"),
		];

		const FORBIDDEN_TERMS = [
			"стационар",
			"онкоконсилиум",
			"переливани",
			"гемотрансфуз",
			"выписной эпикриз",
			"койко-день",
		];

		it("1.1. В модулях egisz, prescriptions и consents полностью отсутствуют термины стационара", () => {
			for (const dir of targetDirs) {
				assert.ok(fs.existsSync(dir), `Папка ${dir} должна существовать`);
				const files = fs.readdirSync(dir, { recursive: true })
					.filter((f): f is string => typeof f === "string" && (f.endsWith(".ts") || f.endsWith(".tsx")))
					.filter((f) => !f.includes("egiszRemdAndPrescriptionAutonomyWave.test.ts"));

				for (const relativeFile of files) {
					const fullPath = path.join(dir, relativeFile);
					const content = fs.readFileSync(fullPath, "utf-8").toLowerCase();

					for (const term of FORBIDDEN_TERMS) {
						assert.ok(
							!content.includes(term),
							`Файл ${relativeFile} содержит запрещенный госпитальный термин: «${term}»`,
						);
					}
				}
			}
		});

		it("1.2. Реестры СЭМД содержат только амбулаторные стоматологические типы (101, 102, 302, 303, 105)", () => {
			assert.ok("101" in EGISZ_DENTAL_SEMD_TYPES, "СЭМД 101 должен присутствовать");
			assert.ok("102" in EGISZ_DENTAL_SEMD_TYPES, "СЭМД 102 должен присутствовать");
			assert.ok("302" in EGISZ_DENTAL_SEMD_TYPES, "СЭМД 302 должен присутствовать");
			assert.ok("303" in EGISZ_DENTAL_SEMD_TYPES, "СЭМД 303 должен присутствовать");
			assert.equal("106" in EGISZ_DENTAL_SEMD_TYPES, false, "СЭМД 106 (выписной эпикриз) должен быть удален");

			assert.ok("101" in EGISZ_SEMD_DOC_TYPES, "СЭМД 101 в валидаторе");
			assert.ok("102" in EGISZ_SEMD_DOC_TYPES, "СЭМД 102 в валидаторе");
			assert.equal("104" in EGISZ_SEMD_DOC_TYPES, false, "СЭМД 104 (эпикриз) должен быть удален");
			assert.equal("106" in EGISZ_SEMD_DOC_TYPES, false, "СЭМД 106 (эпикриз) должен быть удален");
		});
	});

	// ═════════════════════════════════════════════════════════════════════════
	// 2. РЭМД 101 / 102 CDA R2 XML GENERATION & VALIDATION
	// ═════════════════════════════════════════════════════════════════════════
	describe("2. REMD 101/102 CDA R2 XML Statutory Compliance", () => {
		const validDentalPayload: EgiszDentalCdaPayload = {
			docTypeCode: "102",
			documentUuid: "DOC-REMD-102-TEST-001",
			documentVersion: 1,
			encounterDate: "2026-09-25",
			clinic: {
				...DEFAULT_EGISZ_CLINIC_PRESET,
				clinicOgrn: "1157746123457",
				clinicInn: "7701234560",
				clinicOid: "1.2.643.5.1.13.13.12.2.77.10425",
			},
			doctor: {
				...DEFAULT_EGISZ_DOCTOR_PRESET,
				doctorSnils: "123-456-789 64",
				doctorPosition: "Врач-стоматолог-терапевт",
				doctorPositionCode: "71",
			},
			patient: {
				...SAMPLE_043U_PATIENT_PRESET,
				patientFullName: "Смирнов Алексей Викторович",
				patientSnils: "112-233-445 95",
				patientBirthDate: "1988-06-15",
				patientGender: "male",
			},
			complaints: "Жалобы на кратковременные боли в зубе 46 от сладкого и холодного.",
			anamnesisMorbi: "Боли появились около 2 недель назад, постепенно усиливаются.",
			anamnesisVitae: "Соматически здоров. Аллергический анамнез не отягощен.",
			toothStates: {
				46: "Caries",
			},
			toothSurfaces: {
				46: ["O", "D"],
			},
			diagnoses: [
				{
					icd10Code: "K02.1",
					icd10Name: "Кариес дентина",
					diagnosisName: "Кариес дентина",
					isPrimary: true,
					tooth: 46,
				},
			],
			procedures: [
				{
					code: "A16.07.002",
					name: "Восстановление зуба пломбой с нарушением формы",
					tooth: 46,
					quantity: 1,
				},
			],
			treatmentProtocolDescription: "Препарирование полости зуба 46, антисептическая обработка, пломбирование светоотверждаемым композитом.",
			recommendations: "Контрольный осмотр через 6 месяцев, соблюдение гигиены полости рта.",
		};

		it("2.1. Формирует валидный CDA R2 XML для СЭМД 102 с реквизитами врача, клиники, МКБ-10 и 804н", () => {
			const xml = generateEgiszDentalCdaXml(validDentalPayload);

			assert.ok(xml.includes('<realmCode code="RU"/>'), "Должен содержать профиль РФ");
			assert.ok(xml.includes('<templateId root="1.2.643.5.1.13.13.11.1527"/>'), "Должен содержать OID шаблона");
			assert.ok(xml.includes('extension="12345678964"'), "СНИЛС врача должен быть нормализован без дефисов");
			assert.ok(xml.includes('extension="1157746123457"'), "ОГРН клиники должен присутствовать");
			assert.ok(xml.includes('code="K02.1"'), "Код МКБ-10 должен присутствовать");
			assert.ok(xml.includes('code="A16.07.002"'), "Код услуги по Приказу 804н должен присутствовать");
			assert.ok(xml.includes('targetSiteCode code="46"'), "Номер зуба FDI должен присутствовать");
		});

		it("2.2. Preflight-валидатор успешно пропускает корректный стоматологический протокол", () => {
			const report = runEgisz043uPreflight(validDentalPayload);
			assert.ok(report.isValid, "Протокол должен быть валидным");
			assert.equal(report.failedCount, 0, "Количество критических ошибок должно быть 0");
		});

		it("2.3. Семантический валидатор подтверждает прохождение всех 11 правил ЕГИСЗ", () => {
			const exportData: CdaExportData = {
				docTypeCode: "102",
				patientId: "PAT-001",
				patientFullName: "Смирнов Алексей Викторович",
				patientSnils: "112-233-445 95",
				patientBirthDate: "1988-06-15",
				patientGender: "male",
				clinicName: 'ООО "Стоматологический Центр ДЕНТЕ Премиум"',
				clinicOid: "1.2.643.5.1.13.13.12.2.77.10425",
				clinicOgrn: "1157746123457",
				clinicInn: "7701234560",
				doctorFullName: "Иванов Сергей Владимирович",
				doctorSnils: "123-456-789 64",
				doctorPosition: "Врач-стоматолог-терапевт",
				doctorPositionCode: "71",
				icd10Code: "K02.1",
				diagnosisText: "Кариес дентина",
				diagnosisTooth: "46",
				toothStates: { 46: "Caries" },
				procedures: [{ code: "A16.07.002", name: "Восстановление зуба пломбой", tooth: 46 }],
			};

			const cdaXml = buildCdaXml(exportData);
			const validationReport = validateCdaSemanticRules(exportData, cdaXml, true, true);

			assert.ok(validationReport.isValid, "CDA XML обязан быть валидным");
			assert.equal(validationReport.failedCount, 0, "Не должно быть проваленных проверок");
			assert.equal(validationReport.rules.find((r) => r.id === "RULE_DOCTOR_SNILS_FRMR")?.status, "passed");
			assert.equal(validationReport.rules.find((r) => r.id === "RULE_CLINIC_OGRN_INN")?.status, "passed");
			assert.equal(validationReport.rules.find((r) => r.id === "RULE_ICD10_DIAGNOSIS")?.status, "passed");
		});

		it("2.4. Формирует валидный CDA R2 XML для консультативного протокола СЭМД 101", () => {
			const semd101Payload: EgiszDentalCdaPayload = {
				...validDentalPayload,
				docTypeCode: "101",
				documentUuid: "DOC-REMD-101-TEST-002",
			};
			const xml101 = generateEgiszDentalCdaXml(semd101Payload);
			assert.ok(xml101.includes('templateId root="1.2.643.5.1.13.13.11.101"'), "OID шаблона СЭМД 101");
			assert.ok(xml101.includes("Протокол консультации стоматолога"), "Заголовок СЭМД 101");
		});
	});

	// ═════════════════════════════════════════════════════════════════════════
	// 3. СТОМАТОЛОГИЧЕСКИЙ ЭКСПРЕСС-ФОРМУЛЯР РЕЦЕПТОВ ФОРМЫ 107-1/У (ПРИКАЗ 1094н)
	// ═════════════════════════════════════════════════════════════════════════
	describe("3. Form 107-1/u Prescriptions & 7 Statutory Dental Drugs (Order 1094n)", () => {
		const STATUTORY_SEVEN_DRUG_IDS = [
			"amoxiclav_875_125",
			"ciprolet_500",
			"nimesil_100",
			"ketorol_10",
			"chlorhexidine_005",
			"holisal_gel",
			"solcoseryl_dental",
		];

		it("3.1. Каталог содержит все 7 обязательных препаратов стоматологического формуляра", () => {
			for (const drugId of STATUTORY_SEVEN_DRUG_IDS) {
				const drug = DENTAL_MEDICATIONS_CATALOG.find((d) => d.id === drugId);
				assert.ok(drug, `Препарат ${drugId} должен присутствовать в каталоге`);
				assert.ok(drug.latinRp.startsWith("Rp.:"), `Латинская сигнатура Rp.: для ${drugId}`);
				assert.ok(drug.dispenseLatin.length > 0, `Формула отпуска для ${drugId}`);
				assert.ok(drug.signaRu.startsWith("S."), `Сигнатура S. для ${drugId}`);
			}
		});

		it("3.2. Автоматический расчет дозировок корректно обрабатывает все 7 препаратов", () => {
			// 1. Амоксиклав
			const amoxAdult = calculateMedicationDosage("amoxiclav_875_125", 75, 30);
			assert.ok(amoxAdult && !amoxAdult.isPediatric);
			assert.ok(amoxAdult.recommendedDosageRu.includes("875/125 мг"));

			const amoxChild = calculateMedicationDosage("amoxiclav_875_125", 20, 6);
			assert.ok(amoxChild && amoxChild.isPediatric);
			assert.ok(amoxChild.recommendedDosageRu.includes("Детская дозировка"));

			// 2. Ципролет (противопоказан до 18 лет)
			const ciproAdult = calculateMedicationDosage("ciprolet_500", 70, 35);
			assert.ok(ciproAdult && !ciproAdult.isPediatric);
			assert.ok(ciproAdult.recommendedDosageRu.includes("500 мг"));

			const ciproChild = calculateMedicationDosage("ciprolet_500", 45, 14);
			assert.ok(ciproChild && ciproChild.isContraindicated);
			assert.ok(ciproChild.recommendedDosageRu.includes("ПРОТИВОПОКАЗАН"));

			// 3. Нимесил (противопоказан до 12 лет)
			const nimesilAdult = calculateMedicationDosage("nimesil_100", 80, 40);
			assert.ok(nimesilAdult && !nimesilAdult.isPediatric);
			assert.ok(nimesilAdult.recommendedDosageRu.includes("100 мг"));

			const nimesilChild = calculateMedicationDosage("nimesil_100", 25, 8);
			assert.ok(nimesilChild && nimesilChild.recommendedDosageRu.includes("ПРОТИВОПОКАЗАН"));

			// 4. Кеторол (противопоказан до 16 лет)
			const ketorolAdult = calculateMedicationDosage("ketorol_10", 70, 25);
			assert.ok(ketorolAdult && !ketorolAdult.isPediatric);
			assert.ok(ketorolAdult.recommendedDosageRu.includes("10 мг"));

			const ketorolChild = calculateMedicationDosage("ketorol_10", 40, 13);
			assert.ok(ketorolChild && ketorolChild.isContraindicated);

			// 5. Хлоргексидин 0.05%
			const chx = calculateMedicationDosage("chlorhexidine_005", 70, 30);
			assert.ok(chx && chx.recommendedDosageRu.includes("Ротовые ванночки"));

			// 6. Холисал гель
			const holisalAdult = calculateMedicationDosage("holisal_gel", 70, 28);
			assert.ok(holisalAdult && holisalAdult.recommendedDosageRu.includes("Полоска геля 1 см"));

			const holisalChild = calculateMedicationDosage("holisal_gel", 15, 4);
			assert.ok(holisalChild && holisalChild.recommendedDosageRu.includes("0.5 см"));

			// 7. Солкосерил
			const solco = calculateMedicationDosage("solcoseryl_dental", 70, 30);
			assert.ok(solco && solco.recommendedDosageRu.includes("Полоска пасты"));
		});

		it("3.3. Валидатор МНН корректно верифицирует лекарственные средства по Приказу 1094н", () => {
			const amoxRes = validateDentalMnn("Амоксициллин");
			assert.ok(amoxRes.isValid);
			assert.equal(amoxRes.matchedMnn?.id, "amoxicillin");

			const ciproRes = validateDentalMnn("Ципролет");
			assert.ok(ciproRes.isValid);
			assert.equal(ciproRes.matchedMnn?.id, "ciprofloxacin");

			const cholisalRes = validateDentalMnn("Холисал");
			assert.ok(cholisalRes.isValid);
			assert.equal(cholisalRes.matchedMnn?.id, "cholisal");

			const solcoRes = validateDentalMnn("Солкосерил");
			assert.ok(solcoRes.isValid);
			assert.equal(solcoRes.matchedMnn?.id, "solcoseryl");
		});

		it("3.4. Генерирует официальный рецептурный документ Формы 107-1/у со всеми реквизитами", () => {
			const prescriptionInput: Form107PrescriptionInput = {
				prescriptionSeriesNumber: "107-2026-7841",
				dateIso: "2026-09-25",
				validityDays: 60,
				clinicName: 'ООО "Стоматологический Центр ДЕНТЕ Премиум"',
				clinicOgrn: "1157746123457",
				clinicAddress: "г. Москва, ул. Клиническая, д. 10",
				clinicInn: "7701234560",
				medicalLicenseNumber: "ЛО41-01137-77/00368412",
				patientFullName: "Соколова Марина Юрьевна",
				patientBirthDate: "1992-04-12",
				patientMedicalCardNumber: "К-2026/0942",
				patientAddress: "г. Москва, пр-т Вернадского, д. 45",
				doctorFullName: "Ковалев Игорь Николаевич",
				doctorSpecialty: "Врач-стоматолог-хирург",
				doctorSnils: "123-456-789 64",
				selectedMedicationIds: ["amoxiclav_875_125", "nimesil_100", "chlorhexidine_005"],
			};

			const doc = generateForm107Prescription(prescriptionInput);

			assert.equal(doc.header.seriesNumber, "107-2026-7841");
			assert.equal(doc.header.validityPeriodLabelRu, "60 дней (Стандарт)");
			assert.equal(doc.patient.fullName, "Соколова Марина Юрьевна");
			assert.equal(doc.doctor.fullName, "Ковалев Игорь Николаевич");
			assert.equal(doc.items.length, 3);
			assert.ok(doc.items[0]?.latinRp.includes("Amoxicillini"));
			assert.ok(doc.items[1]?.latinRp.includes("Nimesulidi"));
			assert.ok(doc.items[2]?.latinRp.includes("Chlorhexidini"));
		});

		it("3.5. Доступен стоматологический экспресс-пакет для 1-клик назначения", () => {
			const pkg = DENTAL_FAST_PRESCRIPTION_PACKAGES.find((p) => p.id === "dental_statutory_express_formulary");
			assert.ok(pkg, "Экспресс-пакет 1094н должен существовать");
			assert.equal(pkg.drugIds.length, 7, "Экспресс-пакет должен содержать все 7 препаратов");
			for (const id of STATUTORY_SEVEN_DRUG_IDS) {
				assert.ok(pkg.drugIds.includes(id), `Пакет должен содержать ${id}`);
			}
		});
	});

	// ═════════════════════════════════════════════════════════════════════════
	// 4. ИНФОРМИРОВАННЫЕ ДОБРОВОЛЬНЫЕ СОГЛАСИЯ (ИДС, ПРИКАЗ 1051н)
	// ═════════════════════════════════════════════════════════════════════════
	describe("4. Informed Consents 1-Click Tablet/Print Autonomy (Order 1051n)", () => {
		it("4.1. Шаблоны ИДС не содержат отсылок к стационару или академическому блоату", () => {
			for (const alt of CONSENT_ANESTHESIA.alternativeTreatments) {
				assert.ok(
					!alt.toLowerCase().includes("стационар"),
					`Альтернативный метод анестезии содержит стационар: ${alt}`,
				);
			}
		});

		it("4.2. Рендеринг ИДС подставляет клинические контекстные данные без ошибок", () => {
			const rendered = renderConsentTemplate(CONSENT_THERAPY, {
				patientName: "Кузнецов Петр Сергеевич",
				birthDate: "1985-11-20",
				passport: "4512 876543",
				doctorName: "Иванов Сергей Владимирович",
				clinicName: 'ООО "Стоматологический Центр ДЕНТЕ Премиум"',
				diagnosisIcd: "K02.1 (Кариес дентина)",
				toothNumbers: "46",
				date: "25.09.2026",
			});

			assert.ok(rendered.fullTextContent.includes("Кузнецов Петр Сергеевич"), "Имя пациента подставлено");
			assert.ok(rendered.fullTextContent.includes("Иванов Сергей Владимирович"), "Имя врача подставлено");
			assert.ok(rendered.fullTextContent.includes("K02.1"), "Диагноз подставлен");
			assert.ok(rendered.fullTextContent.includes("46"), "Номер зуба подставлен");
		});
	});
});
