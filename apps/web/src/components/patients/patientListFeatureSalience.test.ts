/**
 * Прогон правила «признак рисуется, только если отличает».
 *
 * ЗАЧЕМ ПРОГОН, А НЕ ЧТЕНИЕ КОДА. Дефект, который правило закрывает, был не в
 * коде, а в распределении данных: одна и та же надпись стояла у 12 пациентов из
 * 14 в большой клинике и у 2 из 3 в маленькой, а цветная полоса слева — у ВСЕХ
 * строк обеих клиник без исключения. Такое ловится только подсчётом, и сломать
 * правило можно одной перевёрнутой сравнением строкой, ничего не сломав в типах.
 *
 * ЗАПУСК: npx tsx --test apps/web/src/components/patients/patientListFeatureSalience.test.ts
 *
 * Раскладки ниже — не выдумка для удобства теста, а замер живой PostgreSQL 18 на
 * 2026-07-29 по цепочке hydrateDomainStateFromDb -> buildDashboard, отдельно по
 * каждой организации базы:
 *
 *   «Демо-клиника для снимков» — 14 пациентов: watch 12, high 2; действие
 *   «Закрыть недостающие документы» у 12, «Связать оплату, акт и документы» у 2;
 *   «Стоматология, 1 кабинет» — 3 пациента: watch 2, high 1; действие
 *   «Закрыть недостающие документы» у 2, «Проверить снимок…» у 1.
 *
 * СЧИТАТЬ НАДО ПО КЛИНИКЕ, А НЕ ПО БАЗЕ. Сумма «14 из 17» по двум организациям
 * на экране не встречается никогда: сводка приходит на одну организацию, и
 * преобладающее значение у каждой своё. Разбор участка называл именно сумму по
 * базе — на распределение внутри клиники она не отвечает.
 *
 * Причина одинаковых признаков — в данных: `generated_documents` содержит 4
 * строки, все `patient_intake_questionnaire`; трёх обязательных видов — 0 строк;
 * `communication_tasks`, `clinical_tasks`, `patient_task_tickets` — по 0 строк.
 * Отсюда у всех 17 пациентов обеих клиник `missingDocumentKinds.length = 3` и
 * `openTasks = 0`, то есть ветка `low` («спокойно») недостижима ни для кого.
 */

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
	featureDistinguishes,
	patientListFeatureSalience,
	prevailingFeature,
} from "./patientListFeatureSalience.js";

type RiskLevel = "low" | "watch" | "high";

const riskLabels: Record<RiskLevel, string> = {
	high: "срочно",
	low: "спокойно",
	watch: "контроль",
};

const MISSING_DOCUMENTS = "Закрыть недостающие документы";
const LINK_PAYMENT = "Связать оплату, акт и документы";
const CHECK_IMAGE = "Проверить снимок перед переносом в ЭМК";

type MeasuredInsight = { nextBestAction: string; riskLevel: RiskLevel };

function repeat(count: number, row: MeasuredInsight): MeasuredInsight[] {
	return Array.from({ length: count }, () => ({ ...row }));
}

/** «Демо-клиника для снимков», 14 пациентов: 12 «контроль» + 2 «срочно» с остатком. */
function measuredDemoClinic(): MeasuredInsight[] {
	return [
		...repeat(12, { nextBestAction: MISSING_DOCUMENTS, riskLevel: "watch" }),
		...repeat(2, { nextBestAction: LINK_PAYMENT, riskLevel: "high" }),
	];
}

/** «Стоматология, 1 кабинет», 3 пациента: 2 «контроль» + 1 «срочно» со снимком. */
function measuredSingleChairClinic(): MeasuredInsight[] {
	return [
		...repeat(2, { nextBestAction: MISSING_DOCUMENTS, riskLevel: "watch" }),
		...repeat(1, { nextBestAction: CHECK_IMAGE, riskLevel: "high" }),
	];
}

describe("преобладающее значение признака", () => {
	test("большинство считается, а не просто самое частое", () => {
		assert.deepEqual(prevailingFeature(["watch", "watch", "high"]), {
			count: 2,
			total: 3,
			value: "watch",
		});
	});

	test("самое частое без большинства преобладающим не считается", () => {
		// 4/3/3: прятать самую большую группу нельзя — она не норма.
		const values = ["a", "a", "a", "a", "b", "b", "b", "c", "c", "c"];
		assert.equal(prevailingFeature(values), null);
	});

	test("ничья большинством не бывает", () => {
		assert.equal(prevailingFeature(["watch", "high"]), null);
	});

	test("пустая клиника не даёт преобладающего значения", () => {
		assert.equal(prevailingFeature([]), null);
	});

	test("один пациент — его признак и есть преобладающий", () => {
		assert.deepEqual(prevailingFeature(["watch"]), {
			count: 1,
			total: 1,
			value: "watch",
		});
	});
});

describe("рисовать ли признак в строке", () => {
	test("совпал с преобладающим — не рисуется", () => {
		assert.equal(
			featureDistinguishes("watch", { count: 14, total: 17, value: "watch" }),
			false,
		);
	});

	test("отличается от преобладающего — рисуется", () => {
		assert.equal(
			featureDistinguishes("high", { count: 14, total: 17, value: "watch" }),
			true,
		);
	});

	test("преобладающего нет — рисуется, различает по определению", () => {
		assert.equal(featureDistinguishes("watch", null), true);
	});
});

describe("замер: «Демо-клиника для снимков», 14 пациентов, 12 с одним признаком", () => {
	const insights = measuredDemoClinic();
	const salience = patientListFeatureSalience({ insights, riskLabels });

	test("преобладающая метка риска — «контроль» у 12 из 14", () => {
		assert.deepEqual(salience.prevailingRiskLevel, {
			count: 12,
			total: 14,
			value: "watch",
		});
	});

	test("преобладающее действие — «Закрыть недостающие документы» у 12 из 14", () => {
		assert.deepEqual(salience.prevailingNextAction, {
			count: 12,
			total: 14,
			value: MISSING_DOCUMENTS,
		});
	});

	test("метку и надпись сохраняют ровно 2 строки из 14, остальные 12 чисты", () => {
		const withRiskLabel = insights.filter((insight) =>
			featureDistinguishes(insight.riskLevel, salience.prevailingRiskLevel),
		);
		const withNextAction = insights.filter((insight) =>
			featureDistinguishes(
				insight.nextBestAction,
				salience.prevailingNextAction,
			),
		);
		assert.equal(withRiskLabel.length, 2);
		assert.equal(withNextAction.length, 2);
		// Полоса слева идёт от того же решения: до правки цветная стояла у всех 14.
		assert.equal(insights.length - withRiskLabel.length, 12);
	});

	test("факт уровня клиники назван числом и вынесен в две строки над списком", () => {
		assert.equal(salience.notices.length, 2);
		assert.ok(
			salience.notices[0]?.includes(
				"Метка «контроль» стоит у 12 из 14 пациентов клиники",
			),
		);
		assert.ok(
			salience.notices[1]?.includes(
				`Действие «${MISSING_DOCUMENTS}» повторяется у 12 из 14`,
			),
		);
	});
});

describe("замер: «Стоматология, 1 кабинет», 3 пациента — правило работает и на трёх", () => {
	const insights = measuredSingleChairClinic();
	const salience = patientListFeatureSalience({ insights, riskLabels });

	test("преобладающее считается по своей клинике, а не по всей базе", () => {
		assert.deepEqual(salience.prevailingRiskLevel, {
			count: 2,
			total: 3,
			value: "watch",
		});
		assert.deepEqual(salience.prevailingNextAction, {
			count: 2,
			total: 3,
			value: MISSING_DOCUMENTS,
		});
	});

	test("отмечен ровно тот один, у кого снимок на проверке", () => {
		const marked = insights.filter((insight) =>
			featureDistinguishes(
				insight.nextBestAction,
				salience.prevailingNextAction,
			),
		);
		assert.equal(marked.length, 1);
		assert.equal(marked[0]?.nextBestAction, CHECK_IMAGE);
	});
});

describe("клиника с заполненными документами: признак снова начинает различать", () => {
	/*
	 * То же правило на другом распределении: 12 «спокойно», 3 «срочно», 2
	 * «контроль». Ни строки кода не меняется — преобладающим становится
	 * «спокойно», и метку получают те 5, у кого есть чем заняться. Это и есть
	 * ответ на «порог не зашит»: он пересчитывается по данным клиники.
	 */
	const insights: MeasuredInsight[] = [
		...repeat(12, {
			nextBestAction: "План без срочных действий",
			riskLevel: "low",
		}),
		...repeat(3, {
			nextBestAction: "Проверить и подписать ЭМК",
			riskLevel: "high",
		}),
		...repeat(2, { nextBestAction: CHECK_IMAGE, riskLevel: "watch" }),
	];
	const salience = patientListFeatureSalience({ insights, riskLabels });

	test("преобладающей становится «спокойно»", () => {
		assert.deepEqual(salience.prevailingRiskLevel, {
			count: 12,
			total: 17,
			value: "low",
		});
	});

	test("метку получают ровно те 5, у кого состояние другое", () => {
		const marked = insights.filter((insight) =>
			featureDistinguishes(insight.riskLevel, salience.prevailingRiskLevel),
		);
		assert.equal(marked.length, 5);
	});
});
