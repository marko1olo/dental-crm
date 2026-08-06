import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import {
	commitNoteFormVisit,
	forgetNoteFormVisit,
	imagingWriteTarget,
	NIL_UUID,
	peekNoteFormForeignVisit,
	realVisitFieldId,
} from "./visitIdentity";

/**
 * ЧТО ОХРАНЯЕТ ЭТОТ ФАЙЛ. Вкладка «Рентгены и Диагностика» экрана «Приём» пишет
 * снимок, заключение и найденные ИИ состояния зубов в карту
 * patientStore.selectedPatientId — то есть того пациента, что открыт в разделе
 * «Пациенты», а не того, у кого идёт приём. Врач, заглянувший перед приёмом в
 * чужую карточку, кладёт снимок пациента приёма в чужую карту, и заметить это на
 * экране было нечем.
 *
 * Запуск: из apps/web
 *   node --import tsx --test src/components/visit/visitIdentity.test.ts
 */

describe("идентификатор приёма", () => {
	it("читается без мусора", () => {
		assert.equal(realVisitFieldId("  приём-1  "), "приём-1");
		assert.equal(realVisitFieldId(NIL_UUID), null);
		assert.equal(realVisitFieldId(""), null);
		assert.equal(realVisitFieldId("   "), null);
		assert.equal(realVisitFieldId(undefined), null);
		assert.equal(realVisitFieldId(null), null);
		assert.equal(realVisitFieldId(42), null);
	});
});

describe("в чью карту ляжет снимок", () => {
	it("выбран пациент приёма — запись идёт туда, куда врач думает", () => {
		assert.equal(imagingWriteTarget("пациент-А", "пациент-А"), "visit-patient");
		assert.equal(
			imagingWriteTarget(" пациент-А ", "пациент-А"),
			"visit-patient",
		);
	});

	it("выбран другой пациент — снимок уйдёт в чужую карту", () => {
		assert.equal(
			imagingWriteTarget("пациент-Б", "пациент-А"),
			"another-patient",
		);
	});

	it("пациент не выбран — разбор будет, записи в карту не будет", () => {
		assert.equal(imagingWriteTarget(null, "пациент-А"), "nobody");
		assert.equal(imagingWriteTarget("", "пациент-А"), "nobody");
		assert.equal(imagingWriteTarget("   ", "пациент-А"), "nobody");
	});

	it("приём не открыт — сравнивать не с кем", () => {
		assert.equal(imagingWriteTarget("пациент-Б", null), "no-visit");
		// Заготовка приёма с нулевым UUID приёмом не считается.
		assert.equal(imagingWriteTarget("пациент-Б", NIL_UUID), "no-visit");
		assert.equal(imagingWriteTarget(null, null), "no-visit");
	});
});

/**
 * Форма записи приёма при смене приёма НЕ перечитывается: врач набрал жалобы,
 * осмотр и диагноз пациента А, не сохранил, открылся приём пациента Б — поля
 * остались с текстом А, а кнопка «Сохранить» писала его в карту пациента Б.
 * Здесь проверяется, что расхождение распознаётся и не «рассасывается» само.
 */
describe("к какому приёму относится текст в полях ЭМК", () => {
	beforeEach(() => {
		forgetNoteFormVisit();
	});

	/** Один проход панели: рендер читает вердикт, эффект передвигает якорь. */
	const pass = (openVisitId: string | null, dirty: boolean) => {
		const verdict = peekNoteFormForeignVisit(openVisitId, dirty);
		commitNoteFormVisit(openVisitId, dirty);
		return verdict;
	};

	it("первый приём за сеанс чужим не считается", () => {
		assert.equal(pass("приём-А", false), null);
		// И правка этого же приёма — тоже своя.
		assert.equal(pass("приём-А", true), null);
	});

	it("незаписанный текст прошлого приёма распознаётся как чужой", () => {
		pass("приём-А", true);
		assert.equal(peekNoteFormForeignVisit("приём-Б", true), "приём-А");
	});

	it("вердикт держится, пока расхождение не разобрано — в том числе после ухода на другую вкладку", () => {
		pass("приём-А", true);
		// Панель перерисовывается много раз, вкладка размонтируется и возвращается:
		// вердикт обязан остаться тем же, иначе чужой текст снова можно сохранить.
		assert.equal(pass("приём-Б", true), "приём-А");
		assert.equal(pass("приём-Б", true), "приём-А");
		assert.equal(peekNoteFormForeignVisit("приём-Б", true), "приём-А");
	});

	it("после показа записи открытого приёма расхождение снято", () => {
		pass("приём-А", true);
		assert.equal(pass("приём-Б", true), "приём-А");
		// Врач нажал «Показать запись открытого приёма»: поля совпали с приёмом Б.
		assert.equal(pass("приём-Б", false), null);
		// И дальше правки приёма Б — свои.
		assert.equal(pass("приём-Б", true), null);
	});

	it("смена приёма без набранного текста ничего не запирает", () => {
		pass("приём-А", false);
		assert.equal(pass("приём-Б", false), null);
		assert.equal(pass("приём-Б", true), null);
	});

	it("неизвестный приём не отнимает у врача набранный текст", () => {
		// Обновление дашборда и заготовка с нулевым UUID дают пустой
		// идентификатор. Считать это сменой пациента нельзя: панель заперла бы
		// сохранение на ровном месте, а якорь уехал бы в никуда.
		pass("приём-А", true);
		assert.equal(pass(null, true), null);
		assert.equal(pass(realVisitFieldId(NIL_UUID), true), null);
		// Приём вернулся тем же — текст по-прежнему свой.
		assert.equal(pass("приём-А", true), null);
	});
});
