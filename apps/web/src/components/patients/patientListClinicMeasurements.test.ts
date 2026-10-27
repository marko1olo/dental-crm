import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
	featureDistinguishes,
	patientListFeatureSalience,
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

function measuredDemoClinic(): MeasuredInsight[] {
	return [
		...repeat(12, { nextBestAction: MISSING_DOCUMENTS, riskLevel: "watch" }),
		...repeat(2, { nextBestAction: LINK_PAYMENT, riskLevel: "high" }),
	];
}

function measuredSingleChairClinic(): MeasuredInsight[] {
	return [
		...repeat(2, { nextBestAction: MISSING_DOCUMENTS, riskLevel: "watch" }),
		...repeat(1, { nextBestAction: CHECK_IMAGE, riskLevel: "high" }),
	];
}

describe("замер: «Демо-клиника для снимков», 14 пациентов, 12 с одним признаком", () => {
	const insights = measuredDemoClinic();
	const salience = patientListFeatureSalience({ insights, riskLabels });

	test("преобладающая метка риска — «контроль» у 12 из 14", () => {
		assert.deepEqual(salience.prevailingRiskLevel, { count: 12, total: 14, value: "watch" });
	});

	test("преобладающее действие — «Закрыть недостающие документы» у 12 из 14", () => {
		assert.deepEqual(salience.prevailingNextAction, { count: 12, total: 14, value: MISSING_DOCUMENTS });
	});

	test("метку и надпись сохраняют ровно 2 строки из 14, остальные 12 чисты", () => {
		const withRiskLabel = insights.filter((i) => featureDistinguishes(i.riskLevel, salience.prevailingRiskLevel));
		const withNextAction = insights.filter((i) => featureDistinguishes(i.nextBestAction, salience.prevailingNextAction));
		assert.equal(withRiskLabel.length, 2);
		assert.equal(withNextAction.length, 2);
		assert.equal(insights.length - withRiskLabel.length, 12);
	});

	test("факт уровня клиники назван числом и вынесен в две строки над списком", () => {
		assert.equal(salience.notices.length, 2);
		assert.ok(salience.notices[0]?.includes("Метка «контроль» стоит у 12 из 14 пациентов клиники"));
		assert.ok(salience.notices[1]?.includes(`Действие «${MISSING_DOCUMENTS}» повторяется у 12 из 14`));
	});
});

describe("замер: «Стоматология, 1 кабинет», 3 пациента — правило работает и на трёх", () => {
	const insights = measuredSingleChairClinic();
	const salience = patientListFeatureSalience({ insights, riskLabels });

	test("преобладающее считается по своей клинике, а не по всей базе", () => {
		assert.deepEqual(salience.prevailingRiskLevel, { count: 2, total: 3, value: "watch" });
		assert.deepEqual(salience.prevailingNextAction, { count: 2, total: 3, value: MISSING_DOCUMENTS });
	});

	test("отмечен ровно тот один, у кого снимок на проверке", () => {
		const marked = insights.filter((i) => featureDistinguishes(i.nextBestAction, salience.prevailingNextAction));
		assert.equal(marked.length, 1);
		assert.equal(marked[0]?.nextBestAction, CHECK_IMAGE);
	});
});

describe("клиника с заполненными документами: признак снова начинает различать", () => {
	const insights: MeasuredInsight[] = [
		...repeat(12, { nextBestAction: "План без срочных действий", riskLevel: "low" }),
		...repeat(3, { nextBestAction: "Проверить и подписать ЭМК", riskLevel: "high" }),
		...repeat(2, { nextBestAction: CHECK_IMAGE, riskLevel: "watch" }),
	];
	const salience = patientListFeatureSalience({ insights, riskLabels });

	test("преобладающей становится «спокойно»", () => {
		assert.deepEqual(salience.prevailingRiskLevel, { count: 12, total: 17, value: "low" });
	});

	test("метку получают ровно те 5, у кого состояние другое", () => {
		const marked = insights.filter((i) => featureDistinguishes(i.riskLevel, salience.prevailingRiskLevel));
		assert.equal(marked.length, 5);
	});
});
