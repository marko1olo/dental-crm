/**
 * wave115BloatExtermination.test.ts — Unit-тесты искоренения госпитального блоата,
 * 24-часовых замков на дневники врачей и процедурных моков (Wave 115, Mandates 8a–8q).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as bankEngine from "../../payments/bankInstallmentEngine.js";
import { renderForm003vuHtml } from "@dental/shared";

describe("Wave 115: Bloat & CMO Lock Exterminator (Mandates 8a–8q)", () => {
	const __filename = fileURLToPath(import.meta.url);
	const __dirname = path.dirname(__filename);
	const repoRoot = path.resolve(__dirname, "../../../../../..");

	it("1. Искоренение фиктивной формы 003-В/у в пользу стоматологической выписки 043/у", () => {
		// 1.1 UI форма MedicalCardExtract003vuForm.tsx
		const formFilePath = path.join(
			repoRoot,
			"apps/web/src/components/documents/forms/MedicalCardExtract003vuForm.tsx",
		);
		const formContent = fs.readFileSync(formFilePath, "utf-8");
		assert.ok(
			!formContent.includes("Форма № 003-В/у"),
			"MedicalCardExtract003vuForm не должна содержать упоминания нестоматологической Формы № 003-В/у",
		);
		assert.ok(
			formContent.includes("Выписка из медицинской карты стоматологического пациента (Форма 043/у)"),
			"MedicalCardExtract003vuForm обязана содержать легитимный стоматологический заголовок Выписка (Форма 043/у)",
		);

		// 1.2 Backend query-конфиг documentQuery.ts
		const docQueryPath = path.join(repoRoot, "apps/api/src/db/documentQuery.ts");
		const docQueryContent = fs.readFileSync(docQueryPath, "utf-8");
		assert.ok(
			!docQueryContent.includes("003-В/у"),
			"documentQuery.ts не должен содержать устаревшее обозначение 003-В/у",
		);
		assert.ok(
			docQueryContent.includes('medical_record_extract: "Выписка из медицинской карты стоматологического пациента (043/у)"'),
			"documentQuery.ts обязан возвращать легитимное наименование выписки стоматологической карты 043/у",
		);

		// 1.3 HTML-рендерер выписки renderForm003vuHtml
		const samplePayload = {
			clinicLegalName: 'ООО "ДЕНТЕ СТОМАТОЛОГИЯ"',
			extractRegistrationNumber: "ВЫП-115/2026",
			patientFullName: "Иванов Петр Сергеевич",
			patientSex: "male" as const,
			treatmentStagesTimeline: [],
		};
		const renderedHtml = renderForm003vuHtml(samplePayload as any);
		assert.ok(
			!renderedHtml.includes("003-В/у"),
			"Сгенерированный HTML выписки не должен содержать фиктивное обозначение 003-В/у",
		);
		assert.ok(
			renderedHtml.includes("ФОРМА № 043/у"),
			"HTML выписки обязан содержать ФОРМА № 043/у",
		);
		assert.ok(
			renderedHtml.includes("ВЫПИСКА ИЗ МЕДИЦИНСКОЙ КАРТЫ СТОМАТОЛОГИЧЕСКОГО ПАЦИЕНТА"),
			"HTML выписки обязан содержать заголовок ВЫПИСКА ИЗ МЕДИЦИНСКОЙ КАРТЫ СТОМАТОЛОГИЧЕСКОГО ПАЦИЕНТА",
		);
	});

	it("2. Полная ликвидация функции-симулятора simulateBankApproval (Мандаты 8b, 8c, 8k)", () => {
		const bankEnginePath = path.join(
			repoRoot,
			"apps/web/src/components/payments/bankInstallmentEngine.ts",
		);
		const bankEngineContent = fs.readFileSync(bankEnginePath, "utf-8");

		assert.ok(
			!bankEngineContent.includes("simulateBankApproval"),
			"Файл bankInstallmentEngine.ts не должен содержать процедурный симулятор simulateBankApproval",
		);
		assert.strictEqual(
			(bankEngine as any).simulateBankApproval,
			undefined,
			"Экспорт simulateBankApproval обязан отсутствовать в рантайме",
		);
	});

	it("3. Мандат 8e: Автономия врача и ликвидация 24-часовых замков в lock-status", () => {
		const outpatientRoutesPath = path.join(
			repoRoot,
			"apps/api/src/routes/outpatient.ts",
		);
		const routesContent = fs.readFileSync(outpatientRoutesPath, "utf-8");

		// Проверка маршрута lock-status на автономию врача
		assert.ok(
			routesContent.includes("/api/outpatient/verify/visit/:visitId/lock-status"),
			"Эндпоинт проверки lock-status обязан присутствовать",
		);
		assert.ok(
			routesContent.includes("isDoctorOrPrivileged ? false : (isDeadlineExpired || isApproved)"),
			"Для врача и привилегированных ролей замок всегда отключен (false)",
		);
		assert.ok(
			routesContent.includes("isAttendingDoctor || isDirectorOrCmo"),
			"Врач или руководство исключены из блокировки дневника",
		);

		// Проверка смягчения очереди верификации (рекомендательный аудит)
		assert.ok(
			routesContent.includes("advisoryNotice"),
			"Очередь начмеда обязана сопровождаться пояснением о рекомендательном характере аудита",
		);
		assert.ok(
			routesContent.includes('doctorAccess: "unrestricted"'),
			"Очередь начмеда обязана подтверждать неограниченный доступ врача к дневнику",
		);

		// Проверка схемы БД
		const schemaPath = path.join(
			repoRoot,
			"apps/api/src/db/schema/outpatientCore.ts",
		);
		const schemaContent = fs.readFileSync(schemaPath, "utf-8");
		assert.ok(
			schemaContent.includes("Мандат 8e (п. 4): В частной стоматологии нет начмедов"),
			"Схема outpatientCore обязана фиксировать Мандат 8e и запрет на блокировку врача",
		);
	});

	it("4. Вычистка госпитальной формы 025/у из хуков в пользу стоматологической 043/у", () => {
		const targetHooks = [
			"apps/web/src/hooks/domains/useDocumentPayloads.ts",
			"apps/web/src/hooks/domains/useDocumentWorkflowModule.ts",
			"apps/web/src/hooks/domains/usePatientIntakeLogic.ts",
		];

		for (const relPath of targetHooks) {
			const fullPath = path.join(repoRoot, relPath);
			const content = fs.readFileSync(fullPath, "utf-8");

			assert.ok(
				!content.includes("карта 025/у собрана из подписанных медицинских записей"),
				`Файл ${relPath} не должен содержать формулировку карты 025/у`,
			);
			assert.ok(
				content.includes("стоматологическая карта 043/у собрана из подписанных медицинских записей"),
				`Файл ${relPath} обязан ссылаться на стоматологическую карту 043/у`,
			);
		}
	});
});
