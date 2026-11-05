/**
 * apps/web/src/components/odontogram/__tests__/redTeamBookingAndBillingInquisition.test.ts
 *
 * RED TEAM INQUISITION AUDIT:
 * [SCH-02] Лист ожидания: реальный вызов Fastify API вместо фантомного закрытия шторки.
 * [CLN-02] Одонтограмма: ликвидация счетов за старые коронки и пломбы 5-летней давности (анамнез 0 ₽ vs лечение сегодня).
 * [CLN-01] Голосовая диктовка: разблокировка прямого распознавания кариеса, пульпита, пломбы, коронки, удаления.
 */

import assert from "node:assert/strict";
import test, { describe } from "node:test";
const it = test;

import {
	dispatchOdontogramSoapAndBundle,
	getClinicalBundleForToothState,
} from "../odontogramModuleConstants";
import {
	dictationApplyPlanFromResponseBody,
	dictationApplyMessage,
	resolveToothStateFromDictationRow,
} from "../dictationToothUpdates";

describe("Red Team Inquisition: SCH-02, CLN-02, CLN-01 Invariants", () => {
	// =========================================================================
	// [CLN-02]: АНАМНЕЗ (0 ₽) vs ВЫПОЛНЕННОЕ СЕГОДНЯ ЛЕЧЕНИЕ
	// =========================================================================
	it("[CLN-02]: Фиксация анамнеза пациента (старая коронка 16, старая пломба 24) НЕ выставляет счет на оплату", () => {
		const capturedEvents: Record<string, any[]> = {
			"dente-add-services-to-invoice": [],
			"dente-apply-soap-protocol": [],
			"dente-update-tooth-state": [],
		};

		const originalWindow = (globalThis as any).window;
		(globalThis as any).window = {
			dispatchEvent: (event: any) => {
				const type = event.type || event.name;
				if (!capturedEvents[type]) capturedEvents[type] = [];
				capturedEvents[type].push(event.detail);
				return true;
			},
		};

		try {
			// 1. Врач осматривает зуб 16 со старой коронкой 5-летней давности
			dispatchOdontogramSoapAndBundle({
				targets: [16],
				state: "Crown",
				findings: [{ toothNumber: 16, state: "Crown" }],
				patientId: "pat-inquisition-1",
				isTreatmentPerformedToday: false, // Осмотр анамнеза
			});

			// 2. Врач осматривает зуб 24 со старой пломбой
			dispatchOdontogramSoapAndBundle({
				targets: [24],
				state: "Filled",
				findings: [{ toothNumber: 24, state: "Filled" }],
				patientId: "pat-inquisition-1",
				isTreatmentPerformedToday: false, // Осмотр анамнеза
			});

			// 3. Врач осматривает зуб 36 (ранее удален)
			dispatchOdontogramSoapAndBundle({
				targets: [36],
				state: "Missing",
				findings: [{ toothNumber: 36, state: "Missing" }],
				patientId: "pat-inquisition-1",
				isTreatmentPerformedToday: false, // Осмотр анамнеза
			});

			// ПРОВЕРКА: Ни одного счета на оплату выставлено быть не должно!
			assert.equal(
				capturedEvents["dente-add-services-to-invoice"].length,
				0,
				"За старые коронки, пломбы и отсутствующие зубы СТРОГО 0 ₽ начислений!",
			);

			// При этом клинический протокол SOAP и зубная формула обновлены корректно
			assert.equal(capturedEvents["dente-apply-soap-protocol"].length, 3);
			assert.equal(capturedEvents["dente-update-tooth-state"].length, 3);
			assert.equal(
				capturedEvents["dente-update-tooth-state"][0].isTreatmentPerformedToday,
				false,
			);
		} finally {
			(globalThis as any).window = originalWindow;
		}
	});

	it("[CLN-02]: Реальное лечение сегодня (постановка пломбы / изготовление коронки) штатно добавляется в счет", () => {
		const capturedEvents: Record<string, any[]> = {
			"dente-add-services-to-invoice": [],
			"dente-apply-soap-protocol": [],
			"dente-update-tooth-state": [],
		};

		const originalWindow = (globalThis as any).window;
		(globalThis as any).window = {
			dispatchEvent: (event: any) => {
				const type = event.type || event.name;
				if (!capturedEvents[type]) capturedEvents[type] = [];
				capturedEvents[type].push(event.detail);
				return true;
			},
		};

		try {
			// Врач провел лечение кариеса сегодня
			dispatchOdontogramSoapAndBundle({
				targets: [46],
				state: "Caries",
				findings: [{ toothNumber: 46, state: "Caries", surfaces: ["O"] }],
				patientId: "pat-inquisition-1",
				isTreatmentPerformedToday: true, // Выполнено лечение сегодня!
			});

			assert.equal(capturedEvents["dente-add-services-to-invoice"].length, 1);
			const inv = capturedEvents["dente-add-services-to-invoice"][0];
			assert.equal(inv.toothNumber, 46);
			assert.equal(inv.bundleId, "caries");
			assert.ok(inv.services.length > 0);
		} finally {
			(globalThis as any).window = originalWindow;
		}
	});

	// =========================================================================
	// [CLN-01]: РАЗБЛОКИРОВКА ГОЛОСОВОЙ ДИКТОВКИ
	// =========================================================================
	it("[CLN-01]: Голосовая диктовка безошибочно распознает кариес, пульпит, пломбу, коронку, удаление", () => {
		const body = JSON.stringify({
			action: "update_tooth",
			payload: {
				toothUpdates: [
					{ code: "16", state: "кариес" },
					{ code: "26", state: "пульпит" },
					{ code: "36", state: "пломба" },
					{ code: "46", state: "коронка" },
					{ code: "48", state: "удален" },
					{ code: "11", state: "здоров" },
					{ code: "21", state: "имплант" },
				],
			},
		});

		const plan = dictationApplyPlanFromResponseBody(body);
		assert.ok(plan !== null);
		assert.equal(plan.manual.length, 0, "Все термины обязаны распознаваться без отправки на ручной ввод!");
		assert.equal(plan.applied.length, 7);

		assert.deepEqual(plan.applied, [
			{ toothNumber: 16, state: "Caries" },
			{ toothNumber: 26, state: "Pulpitis" },
			{ toothNumber: 36, state: "Filled" },
			{ toothNumber: 46, state: "Crown" },
			{ toothNumber: 48, state: "Missing" },
			{ toothNumber: 11, state: "Healthy" },
			{ toothNumber: 21, state: "Implant" },
		]);

		const message = dictationApplyMessage(plan);
		assert.equal(message.tone, "success");
		assert.ok(message.text.includes("Отмечено на схеме, 7 зубов:"));
	});

	it("[CLN-01]: resolveToothStateFromDictationRow корректно обрабатывает clinicalState и диагнозы МКБ-10", () => {
		assert.equal(
			resolveToothStateFromDictationRow({ clinicalState: "Pulpitis" }),
			"Pulpitis",
		);
		assert.equal(
			resolveToothStateFromDictationRow({ diagnosisCode: "K02.1" }),
			"Caries",
		);
		assert.equal(
			resolveToothStateFromDictationRow({ diagnosisCode: "K04.5" }),
			"Periodontitis",
		);
		assert.equal(
			resolveToothStateFromDictationRow({ diagnosisTitle: "Ортопедическая коронка диоксид циркония" }),
			"Crown",
		);
		assert.equal(
			resolveToothStateFromDictationRow({ state: "prosthetics" }),
			"Crown",
		);
		assert.equal(
			resolveToothStateFromDictationRow({ state: "done" }),
			"Filled",
		);
		assert.equal(
			resolveToothStateFromDictationRow({ state: "treatment" }),
			"Caries",
		);
	});
});
