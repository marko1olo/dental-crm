/**
 * wave116BloatPurification.test.ts — Unit-тесты ликвидации госпитального блоата из схемы 025/у,
 * гармонизации формулировок внутреннего контроля качества и очистки хардкода ВК (Wave 116, Mandates 8a–8q).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { dentalMedicalCard043uPayloadSchema } from "@dental/shared";
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

	it("3. Мандат 8i и 8s: схема 025/у полностью ликвидирована в пользу Формы 043/у Минздрава РФ", () => {
		const sharedIndexPath = path.join(
			repoRoot,
			"packages/shared/src/index.ts",
		);
		const sharedIndexContent = fs.readFileSync(sharedIndexPath, "utf-8");

		assert.ok(
			!sharedIndexContent.includes("export const outpatientMedicalCard025uPayloadSchema"),
			"outpatientMedicalCard025uPayloadSchema должна быть полностью ликвидирована из packages/shared",
		);
		assert.ok(
			sharedIndexContent.includes("ФОРМА 025/у ЛИКВИДИРОВАНА (МАНДАТЫ 8i, 8s)"),
			"packages/shared должен фиксировать ликвидацию Формы 025/у",
		);

		// Проверяем каноническую амбулаторную стоматологическую схему Формы 043/у
		const minimal043u = {
			formNumber: "043/у" as const,
			organization: {
				fullName: "ООО Стоматология",
				shortName: "ООО Стоматология",
				address: null,
				phone: null,
				ogrn: null,
				inn: null,
				licenseNumber: null,
				licenseIssueDate: null,
				licenseAuthority: null,
			},
			patient: {
				fullName: "Иванов И.И.",
				medicalCardNumber: "СТ-1",
				birthDate: null,
				sex: null,
				phone: null,
				address: null,
				documentSeriesNumber: null,
				snils: null,
			},
			doctor: {
				fullName: "Врач В.В.",
				specialty: null,
				position: null,
			},
			visitDate: "2026-01-01",
			complaint: "Жалобы на боль в зубе",
			anamnesis: "Соматически здоров",
			objectiveStatus: "Кариозная полость",
			diagnosisText: "Кариес эмали",
			diagnosisIcd10: "K02.1",
			clinicalToothRows: [
				{
					toothOrArea: "16",
					surfaces: ["occlusal" as const],
					status: "completed" as const,
					diagnosisOrFinding: "Кариес эмали",
					indication: "Лечение кариеса",
					plannedAction: "Пломбирование",
				},
			],
		};

		const parsed = dentalMedicalCard043uPayloadSchema.safeParse(minimal043u);
		assert.ok(
			parsed.success,
			`Каноническая стоматологическая схема 043/у должна валидироваться без стационарного блоата: ${parsed.error?.message}`,
		);
	});
});
