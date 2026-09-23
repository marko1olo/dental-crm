/**
 * ============================================================================
 * UNIT TESTS: HUMANIZED RUSSIAN ERRORS & DANGER GUARD (MANDATES 8e, 8v, 8n)
 * ============================================================================
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	getDangerousActionDefinition,
	isRoutineClinicalAction,
	requiresDangerConfirmation,
	ROUTINE_CLINICAL_ACTIONS,
} from "../foolproofDangerGuard";
import { humanizeRussianError } from "../humanizeRussianError";

describe("HUMANIZE RUSSIAN ERROR & DANGER GUARD SANITY (WAVE 295)", () => {
	describe("1. Ликвидация крафт-пакетного заражения (Мандат 8v)", () => {
		it("Истекший JWT токен ('jwt expired') возвращает ошибку сессии, а НЕ крафт-пакет", () => {
			const err = new Error("jwt expired");
			const humanized = humanizeRussianError(err);

			assert.equal(humanized.titleRu, "Сессия сотрудника истекла");
			assert.ok(!humanized.titleRu.includes("крафт-пакет"));
			assert.ok(!humanized.descriptionRu.includes("крафт-пакет"));
			assert.ok(!humanized.actionAdviceRu.includes("стерилизац"));
			assert.ok(humanized.actionAdviceRu.includes("PIN-код"));
		});

		it("Истекший токен сессии ('TokenExpiredError: token expired') не путается с крафт-пакетом", () => {
			const err = new Error("TokenExpiredError: token expired");
			const humanized = humanizeRussianError(err);

			assert.equal(humanized.titleRu, "Сессия сотрудника истекла");
			assert.ok(!humanized.titleRu.includes("крафт"));
		});

		it("Сообщение 'session expired' возвращает истечение сессии", () => {
			const err = new Error("session expired");
			const humanized = humanizeRussianError(err);

			assert.equal(humanized.titleRu, "Сессия сотрудника истекла");
		});

		it("Истекший промокод или скидка ('discount coupon expired') возвращает ошибку скидки", () => {
			const err = new Error("discount coupon expired");
			const humanized = humanizeRussianError(err);

			assert.equal(humanized.titleRu, "Срок действия скидки или промокода истёк");
			assert.ok(!humanized.titleRu.includes("крафт-пакет"));
			assert.ok(humanized.actionAdviceRu.includes("Мандат 8e"));
		});

		it("Кириллическая ошибка 'Скидка просрочена' обрабатывается как скидка", () => {
			const err = new Error("Скидка просрочена администратором");
			const humanized = humanizeRussianError(err);

			assert.equal(humanized.titleRu, "Срок действия скидки или промокода истёк");
			assert.ok(!humanized.titleRu.includes("крафт-пакет"));
		});

		it("Слово 'брак' само по себе НЕ вызывает ложную блокировку крафт-пакета", () => {
			const err = new Error("Брак поставки расходных материалов");
			const humanized = humanizeRussianError(err);

			assert.notEqual(humanized.titleRu, "Использование крафт-пакета заблокировано СанПиН");
			assert.ok(!humanized.titleRu.includes("крафт-пакет"));
		});

		it("Брак по наряду ЗТЛ квалифицируется как дефект лабораторного изделия", () => {
			const err = new Error("Обнаружен брак в наряде ЗТЛ по коронке");
			const humanized = humanizeRussianError(err);

			assert.equal(humanized.titleRu, "Зафиксирован дефект лабораторного изделия");
			assert.ok(humanized.actionAdviceRu.includes("гарантийной переделки"));
		});

		it("Крафт-пакетная ошибка срабатывает ТОЛЬКО при явном указании kraft/стерилизац", () => {
			const kraftErr = new Error("kraft package expired");
			const humanizedKraft = humanizeRussianError(kraftErr);
			assert.equal(humanizedKraft.titleRu, "Использование крафт-пакета заблокировано СанПиН");

			const sterilErr = new Error("Срок стерилизации пакета истёк");
			const humanizedSteril = humanizeRussianError(sterilErr);
			assert.equal(humanizedSteril.titleRu, "Использование крафт-пакета заблокировано СанПиН");

			const breachErr = new Error("SanPiN breach of kraft seal");
			const humanizedBreach = humanizeRussianError(breachErr);
			assert.equal(humanizedBreach.titleRu, "Использование крафт-пакета заблокировано СанПиН");
		});

		it("Истечение срока предварительной сметы не блокирует приём (Мандат 8e)", () => {
			const err = new Error("treatment_plan estimate expired");
			const humanized = humanizeRussianError(err);

			assert.equal(humanized.titleRu, "Срок действия предварительной сметы истёк");
			assert.ok(humanized.actionAdviceRu.includes("не блокируются"));
		});
	});

	describe("2. Автономия врача и отсутствие палок в колёса (Мандат 8e)", () => {
		it("Рутинные действия персонала не требуют опасных блокировок", () => {
			for (const action of ROUTINE_CLINICAL_ACTIONS) {
				assert.equal(
					requiresDangerConfirmation(action),
					false,
					`Action ${action} should not require danger confirmation`,
				);
				assert.equal(
					isRoutineClinicalAction(action),
					true,
					`Action ${action} should be recognized as routine clinical action`,
				);
			}
		});

		it("Действительно опасные операции сохраняют регламентные предупреждения", () => {
			assert.equal(requiresDangerConfirmation("delete_tooth"), true);
			assert.equal(requiresDangerConfirmation("void_receipt"), true);
			assert.equal(requiresDangerConfirmation("breach_kraft_batch"), true);
			assert.equal(requiresDangerConfirmation("cancel_appointment"), true);

			const toothDef = getDangerousActionDefinition("delete_tooth");
			assert.equal(toothDef.dangerSeverity, "critical");
			assert.equal(toothDef.requiresExplicitCheckbox, true);
		});
	});
});
