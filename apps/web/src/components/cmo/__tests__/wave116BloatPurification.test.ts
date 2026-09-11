/**
 * wave116BloatPurification.test.ts — Unit-тесты ликвидации госпитального блоата из схемы 025/у,
 * гармонизации формулировок внутреннего контроля качества и очистки хардкода ВК (Wave 116, Mandates 8a–8q).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { outpatientMedicalCard025uPayloadSchema } from "@dental/shared";
import { generateForm036uEntry } from "../../documents/sickLeave/sickLeaveElnEngine.js";

describe("Wave 116: Hospital Bloat & Commission Purification (Mandates 8a–8q)", () => {
	const __filename = fileURLToPath(import.meta.url);
	const __dirname = path.dirname(__filename);
	const repoRoot = path.resolve(__dirname, "../../../../../..");

	it("1. CmoQualityAuditModal: отсутствие стационарного текста «Служба контроля качества Начмеда» в пользу Формы 043/у", () => {
		const modalPath = path.join(
			repoRoot,
			"apps/web/src/components/cmo/CmoQualityAuditModal.tsx",
		);
		const modalContent = fs.readFileSync(modalPath, "utf-8");

		// Проверка заголовка
		assert.ok(
			!modalContent.includes("Служба контроля качества Начмеда (ВКК Приказ № 785н & 834н)"),
			"CmoQualityAuditModal не должна содержать громоздкий стационарный заголовок начмеда",
		);
		assert.ok(
			modalContent.includes("Внутренний контроль качества (Форма 043/у Минздрава РФ)"),
			"CmoQualityAuditModal обязана содержать заголовок Внутренний контроль качества (Форма 043/у Минздрава РФ)",
		);

		// Проверка подписи в акте экспертизы
		assert.ok(
			!modalContent.includes("Председатель комиссии (Начмед):"),
			"Подпись не должна требовать должность Начмеда",
		);
		assert.ok(
			modalContent.includes("Ответственный за контроль качества:"),
			"Подпись должна быть нейтральной: 'Ответственный за контроль качества:'",
		);

		// Проверка фиксации принципа консультативности (Мандат 8e)
		assert.ok(
			modalContent.includes("Мандат 8e (п. 4): Аудит качества носит строго консультативный/экспертный характер"),
			"В коде модала зафиксирован приоритет Мандата 8e и отсутствие блокировки врача",
		);
	});

	it("2. sickLeaveElnEngine: отсутствие захардкоженных членов комиссий Смирнова и Кузнецовой", () => {
		const elnEnginePath = path.join(
			repoRoot,
			"apps/web/src/components/documents/sickLeave/sickLeaveElnEngine.ts",
		);
		const elnEngineContent = fs.readFileSync(elnEnginePath, "utf-8");

		assert.ok(
			!elnEngineContent.includes("Смирнов П.А.") && !elnEngineContent.includes("Кузнецова О.Д."),
			"sickLeaveElnEngine не должен содержать хардкод членов комиссий Смирнов П.А. и Кузнецова О.Д.",
		);

		// Тестирование функции generateForm036uEntry на пустые динамические члены комиссии
		const dummyPatient = {
			patientFio: "Петров Василий Иванович",
			patientBirthDate: "1985-05-12",
			patientSnils: "123-456-789 00",
		};
		const dummyForm = {
			elnNumber: "999123456789",
			issueDate: "2026-09-10",
			diagnosisText: "Острый пульпит",
			icd10Code: "K04.0",
			regimeType: "ambulatory" as const,
			periods: [{ dateFrom: "2026-09-10", dateTo: "2026-09-26", doctorFio: "Врач В.В." }],
			isVkRequired: true,
			vkProtocol: {
				protocolNumber: "ВК-101",
				protocolDate: "2026-09-10",
				chairpersonFio: "Председатель П.П.",
				// Члены комиссии не указаны
			},
		};

		const entry = generateForm036uEntry(dummyForm as any, dummyPatient as any, "СТ-001");
		assert.ok(entry);
		// Проверяем, что в результирующем объекте нет фиктивных захардкоженных фамилий
		assert.deepStrictEqual(entry.membersSign, []);
		assert.ok(!JSON.stringify(entry).includes("Смирнов П.А."));
		assert.ok(!JSON.stringify(entry).includes("Кузнецова О.Д."));
	});

	it("3. Мандат 8i и 8e: схема 025/у помечена как Legacy Hospital Bloat с опциональными комиссионными полями", () => {
		const sharedIndexPath = path.join(
			repoRoot,
			"packages/shared/src/index.ts",
		);
		const sharedIndexContent = fs.readFileSync(sharedIndexPath, "utf-8");

		assert.ok(
			sharedIndexContent.includes("LEGACY / HOSPITAL BLOAT: В частной стоматологии используется исключительно Форма 043/у"),
			"Схема outpatientMedicalCard025uPayloadSchema обязана содержать предупреждение о Мандате 8i",
		);

		// Валидация схемы: поля комиссий теперь необязательны и дефолтятся в []
		const minimal025u = {
			formNumber: "025/у" as const,
			sourceOrderReference: "Приказ Минздрава России от 13.05.2025 N 274н" as const,
			medicalOrganizationName: "ООО Стоматология",
			medicalCardNumber: "СТ-1",
			openedAt: "2026-01-01",
			periodStart: "2026-01-01",
			periodEnd: "2026-01-02",
			sourceVisitIds: ["visit-1"],
			patientFullName: "Иванов И.И.",
			patientBirthDate: "1990-01-01",
			patientSexCode: "1",
			registrationUrbanRuralCode: "1",
			stayUrbanRuralCode: "1",
			omsIssuedAt: "2020-01-01",
			chronicDispensaryRegister: [],
			finalDiagnoses: [{
				date: "2026-01-01",
				diagnosis: "Кариес эмали",
				icd10Code: "K02.1",
				firstOrRepeat: "first" as const,
				doctorFullName: "Врач В.В.",
			}],
			specialistVisitRecords: [{
				sourceVisitId: "visit-1",
				visitDate: "2026-01-01",
				doctorFullName: "Врач В.В.",
				firstOrRepeat: "first" as const,
				complaints: "Жалобы на боль",
				anamnesis: "Боли в течение 2 дней",
				objectiveData: "Кариозная полость",
				primaryDiagnosis: "Кариес эмали",
				primaryDiagnosisIcd10: "K02.1",
				orders: "Рентгенография",
				treatmentProvided: "Препарирование и пломбирование",
				informedConsentOrRefusal: "ИДС подписано",
				clinicalToothRows: [{
					toothOrArea: "16",
					surfaces: ["occlusal" as const],
					status: "completed" as const,
					diagnosisOrFinding: "Кариес эмали",
					indication: "Лечение кариеса",
					plannedAction: "Пломбирование",
				}],
			}],
			dynamicObservationRecords: [],
			stageEpicrisisRecords: [],
			dispensaryObservationEntries: [],
			hospitalizationRows: [],
			ambulatorySurgeryRows: [],
			xrayDoseRows: [],
			functionalResults: [],
			laboratoryResults: [],
			preparedFromSignedMedicalRecords: true as const,
			officialForm274nChecked: true as const,
			thirdPartyDataChecked: true as const,
			// departmentHeadConsultations и medicalCommissionRecords НЕ ПЕРЕДАНЫ
		};

		const parsed = outpatientMedicalCard025uPayloadSchema.safeParse(minimal025u);
		assert.ok(
			parsed.success,
			`Схема 025/у должна парситься без принудительного заполнения госпитальных комиссий: ${parsed.error?.message}`,
		);
		assert.deepStrictEqual(parsed.data.departmentHeadConsultations, []);
		assert.deepStrictEqual(parsed.data.medicalCommissionRecords, []);
	});
});
