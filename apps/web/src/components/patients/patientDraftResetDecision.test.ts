import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { shouldResetPatientDraftState } from "./patientDraftResetDecision.js";

/**
 * Подтверждение записи карточки пациента.
 *
 * ЧТО ЗДЕСЬ ОХРАНЯЕТСЯ. Сброс черновика завязан на `updatedAt`, и это верно для
 * чужих изменений. Но своё собственное сохранение тоже двигает `updatedAt`, и на
 * нём сброс гасил только что выставленное «Сохранено» — регистратор не получал
 * ни одного признака, что карточка записана. Проверка ниже краснеет, если
 * различение своего и чужого изменения снова пропадёт.
 *
 * ЗАПУСК: cd apps/web && npx tsx --import ./testCssStub.mjs --test src/components/patients/patientDraftResetDecision.test.ts
 */
describe("сброс черновика карточки пациента", () => {
	test("отклик своего сохранения НЕ гасит подтверждение записи", () => {
		assert.equal(
			shouldResetPatientDraftState({
				incomingUpdatedAt: "2026-07-29T04:20:00.000Z",
				savedByThisScreenUpdatedAt: "2026-07-29T04:20:00.000Z",
			}),
			false,
			"Сброс сработал на нашем же сохранении: плашка «Сохранено» погаснет в том же кадре, " +
				"и регистратор не увидит подтверждения записи.",
		);
	});

	test("чужое изменение карточки сбрасывает черновик, как и раньше", () => {
		assert.equal(
			shouldResetPatientDraftState({
				incomingUpdatedAt: "2026-07-29T04:25:00.000Z",
				savedByThisScreenUpdatedAt: "2026-07-29T04:20:00.000Z",
			}),
			true,
			"Карточку поправили в другом месте, а черновик остался прежним: следующее сохранение " +
				"затрёт чужую правку данными, набранными до неё.",
		);
	});

	test("до первого своего сохранения сбрасывается всё", () => {
		assert.equal(
			shouldResetPatientDraftState({
				incomingUpdatedAt: "2026-07-29T04:20:00.000Z",
				savedByThisScreenUpdatedAt: null,
			}),
			true,
			"Своего сохранения ещё не было — значит изменение чужое, и черновик обязан обновиться.",
		);
	});

	test("смена пациента без отметки времени сбрасывает черновик", () => {
		for (const incomingUpdatedAt of [null, undefined, ""]) {
			assert.equal(
				shouldResetPatientDraftState({
					incomingUpdatedAt,
					savedByThisScreenUpdatedAt: "2026-07-29T04:20:00.000Z",
				}),
				true,
				`Отметки нет (${JSON.stringify(incomingUpdatedAt)}), сравнивать не с чем — сброс обязателен, ` +
					"иначе в карточке нового пациента останется черновик предыдущего.",
			);
		}
	});

	/*
	 * САМОПРОВЕРКА ОТ ВЫРОЖДЕНИЯ. Функция, всегда возвращающая false, прошла бы
	 * первый тест; всегда возвращающая true — три остальных. Здесь проверяется,
	 * что оба ответа вообще встречаются, то есть решение принимается, а не
	 * подменено константой.
	 */
	test("решение не выродилось в константу", () => {
		const answers = new Set([
			shouldResetPatientDraftState({
				incomingUpdatedAt: "A",
				savedByThisScreenUpdatedAt: "A",
			}),
			shouldResetPatientDraftState({
				incomingUpdatedAt: "A",
				savedByThisScreenUpdatedAt: "B",
			}),
		]);
		assert.deepEqual(
			[...answers].sort(),
			[false, true],
			"Функция отвечает одинаково на разные случаи.",
		);
	});
});
