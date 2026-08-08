import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { describe, test } from "node:test";
import type {
	GeneratedDocument,
	MigrationReconciliationReport,
	Patient,
} from "@dental/shared";
import { formatKopecksRu, parseKopecks } from "@dental/shared";
import { renderDocumentHtml } from "../documents/renderDocument.js";
import { reconciliationReportCsv } from "../migration/reconcile.js";
import { sourceMoneyTotalFromRows } from "../migration/sourceMoney.js";
import { normalizeMoneyValue } from "../migration/valueNormalize.js";

/**
 * «НЕ ОПРЕДЕЛЯЕТСЯ» НЕ ИМЕЕТ ПРАВА ПЕЧАТАТЬСЯ НУЛЁМ.
 *
 * Класс дефекта один: `?? 0` / `|| 0` / `Number(x) || 0` на значении, которого
 * НЕТ. Отсутствие превращается в ноль, ноль от измеренного нуля не отличается
 * ничем, и дальше он печатается клинике, уходит в акт, участвует в сравнении или
 * в решении. Складывать счётчики через `?? 0` при этом законно: «нет платежей»
 * действительно равно «0 ₽ сумма». Разница не в записи, а в том, что означало
 * отсутствие.
 *
 * Здесь закреплены три места, где подставленный ноль печатался как факт.
 *
 * ЧТО ИМЕННО ИЗМЕРЕНО, а не заявлено. Тест, который прошёл бы и до правки, ничего
 * не охраняет, поэтому каждая из трёх правок была ВРЕМЕННО возвращена к прежнему
 * выражению, прогон повторён, и записан его настоящий код выхода (без конвейера:
 * `node --import tsx --test src/tests/unknownIsNotZero.test.ts > /tmp/x.log 2>&1;
 * echo $?`). Замеры 2026-07-29, из apps/api:
 *
 *   * целиком, после правок — выход 0, 8 из 8;
 *   * `sourceMoney.ts`: возврат к `totalKopecks` без проверки нечитаемых клеток —
 *     выход 1, падают «одно нечитаемое значение делает сумму источника
 *     неопределимой» и «колонка суммы не заполнена нигде»;
 *   * `reconcile.ts`: возврат условия раздела к `report.sourceMoneyTotalRub !==
 *     null` — выход 1, падает «неопределимая сумма источника не уносит из акта
 *     измеренное „Загружено“»;
 *   * `renderDocument.ts`: возврат `remainingKopecksOrNull` к `?? 0` — выход 1,
 *     падает «неизвестная сумма плана не печатается ни нулём, ни „План полностью
 *     оплачен“».
 *
 * Обратная сторона проверена тем же прогоном: утверждения о ИЗВЕСТНЫХ суммах
 * (10 000 руб. в графике, все три суммы в акте) остаются зелёными, и «Оплачено:
 * 0 руб.» — измеренный ноль — намеренно не тронуто. Сторож, краснеющий на верном
 * документе, будет выключен вместе с настоящим сигналом.
 */

/* ------------------------------------------------------------------ *
 * 1. Сумма платежей источника в переносе (migration/sourceMoney.ts)
 * ------------------------------------------------------------------ */

describe("сумма платежей источника: нечитаемое значение не становится нулём", () => {
	/**
	 * Три строки платежей, у одной в колонке суммы лежит не сумма.
	 *
	 * «Оплата по договору» — это ровно то, что встречается в выгрузках чужих
	 * систем: колонку суммы там используют и как комментарий.
	 */
	const rowsWithUnreadableAmount = [
		["01.02.2026", "1 500,50"],
		["02.02.2026", "оплата по договору"],
		["03.02.2026", "2 000"],
	];

	test("одно нечитаемое значение делает сумму источника неопределимой", () => {
		const measured = sourceMoneyTotalFromRows(rowsWithUnreadableAmount, 1);

		assert.equal(
			measured.totalKopecks,
			null,
			"Сумма источника посчитана при нечитаемом значении в колонке суммы. Тогда сверка получит число, " +
				"выдаст его за независимую точку отсчёта и напечатает в акте переноса «разобрана полностью, " +
				"копейка в копейку» про перенос, где часть денег не разобралась вовсе.",
		);
		assert.equal(
			measured.unreadableCells,
			1,
			"Нечитаемые значения не посчитаны — оператору нечего показать.",
		);
		assert.equal(
			measured.parsedCells,
			2,
			"Разобранные значения посчитаны неверно.",
		);

		/*
		 * ЧТО ИМЕННО ПЕЧАТАЛОСЬ ДО ПРАВКИ, на этих же самых строках. Прежнее
		 * выражение — `sum + (parsedAmount.value ?? 0)`. Оно живо здесь как
		 * измерение, а не как пересказ: 350 050 копеек = 3 500,50 ₽ уходили в сверку
		 * как «сумма источника», хотя третья строка не сосчитана вообще. Если этот
		 * расчёт когда-нибудь совпадёт с честным, значит правило снова снято.
		 */
		const substitutedZeroTotal = rowsWithUnreadableAmount.reduce(
			(sum, row) => sum + (normalizeMoneyValue(row[1] ?? "").value ?? 0),
			0,
		);
		assert.equal(
			substitutedZeroTotal,
			350050,
			"Прежнее выражение изменилось — перепроверьте измерение.",
		);
		assert.notEqual(
			measured.totalKopecks,
			substitutedZeroTotal,
			"Честная сумма совпала с подставленным нулём: правило снято.",
		);
	});

	test("все значения читаемы — сумма точна до копейки", () => {
		const measured = sourceMoneyTotalFromRows(
			[
				["01.02.2026", "1 500,50"],
				["03.02.2026", "2 000"],
			],
			1,
		);
		assert.equal(
			measured.totalKopecks,
			350050,
			"Сумма читаемых значений посчитана неточно.",
		);
		assert.equal(measured.unreadableCells, 0);
	});

	test("колонка суммы не заполнена нигде — это тоже «не определяется», а не ноль", () => {
		const measured = sourceMoneyTotalFromRows(
			[
				["01.02.2026", ""],
				["02.02.2026", "н/д"],
			],
			1,
		);
		assert.equal(
			measured.totalKopecks,
			null,
			"Пустая колонка суммы дала 0. В акте это читается как «в источнике денег на ноль рублей», " +
				"хотя сумму никто не считал: складывать было нечего.",
		);
		assert.equal(
			measured.unreadableCells,
			0,
			"Пустая клетка — не нечитаемое значение: источник прямо говорит, что суммы нет.",
		);
	});
});

/* ------------------------------------------------------------------ *
 * 2. Акт сверки переноса (migration/reconcile.ts)
 * ------------------------------------------------------------------ */

describe("акт сверки переноса печатает «не определяется», а не молчит", () => {
	function reportWith(
		sourceMoneyTotalRub: number | null,
		loadedMoneyTotalRub: number | null,
		quarantinedMoneyTotalRub: number | null,
	): MigrationReconciliationReport {
		return {
			runId: randomUUID(),
			generatedAt: "2026-07-29T09:00:00.000Z",
			balanced: true,
			checks: [
				{
					code: "row_conservation",
					title: "Каждая строка учтена ровно в одном исходе",
					expected: 3,
					actual: 3,
					passed: true,
					detail: "3 строки распределены.",
				},
			],
			entityBreakdown: [
				{
					entityKind: "payment",
					sourceRows: 3,
					created: 3,
					updated: 0,
					duplicates: 0,
					quarantined: 0,
					skipped: 0,
				},
			],
			sourceMoneyTotalRub,
			loadedMoneyTotalRub,
			quarantinedMoneyTotalRub,
		};
	}

	function moneyLine(csv: string, label: string): string | undefined {
		return csv.split("\r\n").find((line) => line.startsWith(`${label};`));
	}

	/**
	 * Ожидаемая денежная клетка акта.
	 *
	 * formatKopecksRu ставит неразрывные пробелы («24 901,50 ₽»), а cell() в
	 * reconcile.ts прогоняет значение через `replace(/\s+/g, " ")` — в CSV они
	 * становятся обычными. Поэтому ожидание строится тем же денежным
	 * форматировщиком и той же нормализацией, а не переписанной вручную строкой:
	 * иначе тест охранял бы вид пробела, а не сумму.
	 */
	function expectedMoneyCell(rub: number): string {
		return formatKopecksRu(parseKopecks(rub)).replace(/\s+/g, " ");
	}

	test("неопределимая сумма источника не уносит из акта измеренное «Загружено»", () => {
		const csv = reconciliationReportCsv(reportWith(null, 24901.5, 0));

		assert.equal(
			moneyLine(csv, "Сумма в источнике"),
			"Сумма в источнике;не определяется",
			"Сумма источника, которую не удалось определить, напечатана не словами. Пустая клетка в CSV " +
				"неотличима от нуля, а отсутствие строки читается как «вопрос не возникал».",
		);

		/*
		 * Это и есть главная потеря прежней редакции: весь денежный раздел стоял под
		 * `if (report.sourceMoneyTotalRub !== null)`, поэтому вместе с неопределимой
		 * суммой источника из акта исчезали ИЗМЕРЕННЫЕ «Загружено» и «В карантине».
		 * Клиника подписывала акт о переносе, где про деньги не сказано ничего.
		 */
		assert.equal(
			moneyLine(csv, "Загружено"),
			`Загружено;${expectedMoneyCell(24901.5)}`,
			"Измеренная загруженная сумма пропала из акта или напечатана не денежной записью.",
		);
		assert.equal(
			moneyLine(csv, "В карантине"),
			`В карантине;${expectedMoneyCell(0)}`,
			"Изолированная сумма пропала из акта.",
		);

		const explanation = moneyLine(
			csv,
			"Почему сумма в источнике не определяется",
		);
		assert.ok(
			explanation?.includes("НЕ ВЫПОЛНЯЛАСЬ"),
			"Акт не говорит, что проверка полноты денег не выполнялась. Без этой строки «Итог: СОШЛОСЬ» " +
				"читается как доказательство переноса денег, которого никто не получал.",
		);
	});

	test("все три суммы известны — печатаются как раньше", () => {
		const csv = reconciliationReportCsv(reportWith(24901.5, 24901.5, 0));
		assert.equal(
			moneyLine(csv, "Сумма в источнике"),
			`Сумма в источнике;${expectedMoneyCell(24901.5)}`,
		);
		assert.equal(
			moneyLine(csv, "Почему сумма в источнике не определяется"),
			undefined,
			"Объяснение про неопределимую сумму напечатано там, где сумма определена.",
		);
	});

	test("платежей в переносе не было — денежного раздела нет вовсе", () => {
		const csv = reconciliationReportCsv(reportWith(null, null, null));
		assert.equal(moneyLine(csv, "Загружено"), undefined);
		assert.ok(
			!csv.includes("Деньги;Значение"),
			"Денежный раздел напечатан там, где ни одной суммы нет.",
		);
	});
});

/* ------------------------------------------------------------------ *
 * 3. График рассрочки на руки пациенту (documents/renderDocument.ts)
 * ------------------------------------------------------------------ */

describe("график рассрочки не объявляет план оплаченным, когда сумма не определяется", () => {
	const organizationId = randomUUID();
	const patientId = randomUUID();

	const patient = {
		id: patientId,
		organizationId,
		status: "active",
		fullName: "Иванов Иван Иванович",
		birthDate: "1990-01-01",
		phone: "+7 900 000-00-00",
		email: null,
		notes: null,
		administrativeProfile: null,
		balanceRub: 0,
		createdAt: "2026-01-10T08:00:00.000Z",
		updatedAt: "2026-03-14T08:00:00.000Z",
	} as Patient;

	/**
	 * Документ БЕЗ суммы и без позиций плана лечения: treatmentPlanTotalKopecks
	 * честно отвечает null. Ровно это состояние и печаталось нулём.
	 */
	function scheduleDocument(totalAmountRub: number | null): GeneratedDocument {
		return {
			id: randomUUID(),
			organizationId,
			patientId,
			visitId: null,
			kind: "installment_payment_schedule",
			title: "График рассрочки",
			status: "draft",
			issuedAt: null,
			totalAmountRub,
			payload: null,
		} as GeneratedDocument;
	}

	/**
	 * Пробелы сводятся к обычным осознанно: в печатной форме разряды разделены
	 * неразрывным пробелом (toLocaleString("ru-RU")), и утверждение о сумме не
	 * должно превращаться в утверждение о коде пробела.
	 */
	function normalized(html: string): string {
		return html.replace(/\s+/g, " ");
	}

	test("неизвестная сумма плана не печатается ни нулём, ни «План полностью оплачен»", () => {
		const html = normalized(
			renderDocumentHtml(scheduleDocument(null), patient, {}),
		);

		assert.ok(
			!html.includes("План полностью оплачен"),
			"Пациент получает график, где сказано «План полностью оплачен — 0 руб.», хотя стоимость плана " +
				"неизвестна и оплат по нему нет. Для денежного документа это заявление клиники о том, что " +
				"она ничего не выставляет.",
		);
		assert.ok(
			html.includes("Сумма плана не определяется"),
			"График молчит о том, что сумма не определена: строка обязана называть причину, а не показывать ноль.",
		);

		/*
		 * Строка «Остаток» проверяется целиком, вместе с ярлыком. Соседняя строка
		 * «Оплачено» печатает «0 руб.» законно — по документу действительно не
		 * заплатили ни рубля, это измеренный ноль. Дефект был именно в том, что
		 * «Общая сумма плана» печаталась как «не указана», а «Остаток» под ней — как
		 * «0 руб.»: один и тот же документ одновременно не знал суммы и утверждал,
		 * что должны ноль.
		 */
		assert.ok(
			html.includes("<tr><th>Остаток</th><td>не указана</td>"),
			"Остаток по плану с неизвестной суммой напечатан не как «не указана».",
		);
		assert.ok(
			!html.includes("<tr><th>Остаток</th><td>0 руб.</td>"),
			"Остаток печатается нулём при неизвестной сумме плана: пациент читает «доплачивать нечего».",
		);
	});

	test("известная сумма плана печатается и делится на платежи как раньше", () => {
		const html = normalized(
			renderDocumentHtml(scheduleDocument(10000), patient, {}),
		);

		assert.ok(
			html.includes("<tr><th>Остаток</th><td>10 000 руб.</td>"),
			"Известный остаток перестал печататься — правка задела верный путь.",
		);
		assert.ok(
			!html.includes("Сумма плана не определяется"),
			"Известная сумма объявлена неопределимой — сторож краснеет на верном документе.",
		);
		assert.ok(
			html.includes("<td>5 000 руб.</td>"),
			"Остаток перестал делиться на два платежа: 10 000 руб. без оплат — это 5 000 + 5 000.",
		);
	});
});
