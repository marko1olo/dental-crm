import {
	formatKopecksRu,
	type Kopecks,
	sumKopecks,
} from "@dental/shared";
import {
	DEFAULT_SIGNIFICANCE_KOPECKS,
	MoneyPrecisionError,
	assertKopecks,
} from "./patientDebtCore.js";
import {
	type PatientLedger,
	clinicOwesPatientKopecks,
	patientOwesClinicKopecks,
} from "./patientDebtLedger.js";

/**
 * patientDebtClinicTotals.ts — Итоги дебиторки и возвратов по всей клинике и сверка экранов.
 * Выделено из patientDebt.ts с сохранением 100% обратной совместимости.
 */

/** Порог значимости: суммы меньше него в итоги клиники не идут. */
export interface ClinicTotalsOptions {
	/**
	 * По умолчанию 100 копеек = 1 ₽, как у канона. Ноль означает «без фильтра»:
	 * так итог сходится с бухгалтерией до копейки.
	 */
	readonly significanceKopecks?: Kopecks;
}

/**
 * Три итога клиники, посчитанные ОДНИМ проходом.
 *
 * Возвращаются вместе намеренно: как только их считают в разных местах, они
 * расходятся — это и есть история этого файла. Экран, показывающий «долг»,
 * обязан иметь под рукой и переплаты, иначе его число необъяснимо.
 */
export interface ClinicDebtTotals {
	/**
	 * «Сколько должны пациенты, попавшие в СПИСОК для звонков?» — ≥ 0, С ПОРОГОМ.
	 *
	 * Это число отчёта дебиторки, и порог из него не убран намеренно: список
	 * должников — инструмент обзвона, и строка на 50 копеек в нём — шум. Но именно
	 * поэтому это НЕ вся дебиторка; полная стоит рядом (`fullReceivableKopecks`), и
	 * подменять одну другой нельзя ни в какую сторону.
	 */
	readonly receivableKopecks: Kopecks;
	/** «Сколько клиника должна вернуть тем, кто в списке переплативших?» — ≥ 0, с порогом. */
	readonly refundLiabilityKopecks: Kopecks;
	/**
	 * Долги НИЖЕ порога: в список для звонков не попали, деньгами быть не перестали.
	 *
	 * Величина заведена не для полноты картины, а потому что без неё порог утекал в
	 * итоги клиники молча. Замер живой демо-клиники `d0000000-…-d001` 2026-07-29,
	 * уже после приведения цен к прайсу: пациент `…0106` назначено 7 200,50,
	 * оплачено 7 200,00 — долг РОВНО 0,50 ₽, то есть ниже порога 1 ₽. Его карточка
	 * этот долг показывает (карточка порога не имеет), отчёт дебиторки — нет, и
	 * сквозная сверка объявила расхождение двух экранов на 50 копеек, потому что
	 * сравнивала отфильтрованную величину с неотфильтрованной.
	 */
	readonly subThresholdReceivableKopecks: Kopecks;
	/** Переплаты ниже порога — тот же случай со стороны возврата. */
	readonly subThresholdRefundKopecks: Kopecks;
	/**
	 * «Сколько всего должны пациенты?» — ПОЛНАЯ дебиторка, порог не применялся.
	 *
	 * Это сумма долгов ВСЕХ пациентов, то есть ровно то, что показывают карточки
	 * пациентов на главном экране (`sampleData.ts`, `patientInsight.balanceDueRub`
	 * через `patientOwesClinicKopecks`): у карточки порога нет и быть не может —
	 * пациент, задолжавший 50 копеек, должен видеть 50 копеек.
	 */
	readonly fullReceivableKopecks: Kopecks;
	/** «Сколько всего клиника должна вернуть?» — без порога. */
	readonly fullRefundLiabilityKopecks: Kopecks;
	/**
	 * «Сколько клиника ещё не собрала, нетто?» = ПОЛНАЯ дебиторка − ПОЛНЫЕ возвраты.
	 *
	 * Именно это число показывает главный экран под словом «долг», и оно обязано
	 * сходиться с `Σ назначено − Σ оплачено` по всей клинике до копейки.
	 *
	 * ЗДЕСЬ БЫЛА ПОТЕРЯ, И ОНА НАЗВАНА ЧИСЛОМ. Стояло
	 * `receivableKopecks − refundLiabilityKopecks`, то есть итог собирался из
	 * ОТФИЛЬТРОВАННЫХ ПОРОГОМ сторон, а порог — шумовой фильтр СПИСКА, а не
	 * свойство денег. На живой демо-клинике `d0000000-…-d001` (замер 2026-07-29
	 * после приведения цен к прайсу) это давало 51 402,98 ₽ против 51 403,48 ₽ у
	 * главного экрана: ровно те 50 копеек долга пациента `…0106`, которые порог
	 * выкинул из списка и вместе со списком — из итога клиники. Для клиники это
	 * значит дырка в 50 копеек между «не собрано» и кассовой арифметикой
	 * «назначено − оплачено», которую бухгалтеру нечем объяснить: она не видна ни в
	 * одной строке отчёта, потому что строку и убрали.
	 *
	 * Итог СО ЗНАКОМ: если переплаты превысят долги, клиника должна больше, чем ей
	 * должны, и `Math.max(0, …)` вокруг итога (как в `buildBillingSummary`)
	 * превратил бы этот факт в безобидный ноль.
	 */
	readonly netUncollectedKopecks: Kopecks;
	/** Сколько пациентов в списке для звонков. */
	readonly debtorCount: number;
	/** Сколько пациентов в списке на возврат. */
	readonly overpaidCount: number;
	/** Сколько должников порог из списка выкинул. Ноль — фильтр ничего не унёс. */
	readonly subThresholdDebtorCount: number;
	/** Сколько переплативших порог из списка выкинул. */
	readonly subThresholdOverpaidCount: number;
	/** Порог, с которым посчитаны итоги. В отчёте его надо показывать. */
	readonly significanceKopecks: Kopecks;
}

/**
 * Итоги по клинике из сальдо всех пациентов.
 *
 * Порог применяется К СТОРОНАМ ОТДЕЛЬНО, ровно как у канона: пациент с долгом в
 * 50 копеек не попадает ни в СПИСОК должников, ни в список на возврат. Это
 * шумовой фильтр, и его наличие обязано быть видно в ответе — поэтому
 * `significanceKopecks` возвращается вместе с числами, а не остаётся внутри.
 *
 * ЧЕГО ПОРОГ НЕ ИМЕЕТ ПРАВА ДЕЛАТЬ — уносить деньги из ИТОГА. Отброшенные им
 * суммы возвращаются отдельными числами (`subThreshold*`), полная дебиторка и
 * полный возврат считаются без него, а `netUncollectedKopecks` собирается из
 * полных сторон. Иначе фильтр списка молча меняет итог клиники: измеренная
 * потеря — 50 копеек на живой демо-клинике, разбор у поля `netUncollectedKopecks`.
 * Проверяется это не словом, а свойством: при любом пороге (0, 1 ₽, 100 ₽) итог
 * на одних и тех же сальдо обязан быть ОДИН И ТОТ ЖЕ (`patientDebt.test.ts`).
 *
 * Принимает и `Map`, и любой перебор сальдо. Это НЕ удобство, а закрытая
 * ловушка, на которую я сам наступил при первом прогоне тестов:
 * `buildPatientLedgers` возвращает `Map`, а `for (… of map)` перебирает ПАРЫ
 * `[ключ, значение]`, не значения. С сигнатурой `Iterable<PatientLedger>` такой
 * вызов не падал — он тихо возвращал НУЛИ по всем трём итогам, то есть «долгов в
 * клинике нет». Ровно тот класс дефекта, ради которого этот файл написан, и
 * обнаружил его тест, а не типизация: `tsx` типы не проверяет. Поэтому здесь два
 * рубежа — `Map` разворачивается явно, а форма каждого сальдо проверяется.
 */
export function clinicDebtTotals(
	ledgers: Iterable<PatientLedger> | ReadonlyMap<string, PatientLedger>,
	options: ClinicTotalsOptions = {},
): ClinicDebtTotals {
	const significanceKopecks = Math.max(
		0,
		options.significanceKopecks ?? DEFAULT_SIGNIFICANCE_KOPECKS,
	);
	assertKopecks(significanceKopecks, "порог значимости");

	const debts: Kopecks[] = [];
	const refunds: Kopecks[] = [];
	/*
	 * Отброшенное порогом НЕ выбрасывается, а складывается отдельно. Раньше эти две
	 * корзины отсутствовали, и деньги из них исчезали вместе со строкой списка.
	 */
	const subThresholdDebts: Kopecks[] = [];
	const subThresholdRefunds: Kopecks[] = [];

	const rows =
		ledgers instanceof Map
			? ledgers.values()
			: (ledgers as Iterable<PatientLedger>);
	for (const ledger of rows) {
		assertLedgerShape(ledger);
		const owed = patientOwesClinicKopecks(ledger);
		if (owed > 0) {
			(owed >= significanceKopecks ? debts : subThresholdDebts).push(owed);
			continue;
		}
		const refund = clinicOwesPatientKopecks(ledger);
		if (refund > 0) {
			(refund >= significanceKopecks ? refunds : subThresholdRefunds).push(
				refund,
			);
		}
	}

	const receivableKopecks = sumKopecks(debts);
	const refundLiabilityKopecks = sumKopecks(refunds);
	const subThresholdReceivableKopecks = sumKopecks(subThresholdDebts);
	const subThresholdRefundKopecks = sumKopecks(subThresholdRefunds);
	const fullReceivableKopecks =
		receivableKopecks + subThresholdReceivableKopecks;
	const fullRefundLiabilityKopecks =
		refundLiabilityKopecks + subThresholdRefundKopecks;

	return {
		receivableKopecks,
		refundLiabilityKopecks,
		subThresholdReceivableKopecks,
		subThresholdRefundKopecks,
		fullReceivableKopecks,
		fullRefundLiabilityKopecks,
		// Порог сюда не входит: итог клиники обязан равняться Σ сальдо всех
		// пациентов, то есть «назначено − оплачено» по клинике до копейки.
		netUncollectedKopecks: fullReceivableKopecks - fullRefundLiabilityKopecks,
		debtorCount: debts.length,
		overpaidCount: refunds.length,
		subThresholdDebtorCount: subThresholdDebts.length,
		subThresholdOverpaidCount: subThresholdRefunds.length,
		significanceKopecks,
	};
}

/**
 * Сальдо обязано быть сальдо, а не парой `[ключ, значение]` и не `undefined`.
 *
 * Без этой проверки неверная форма даёт `Math.max(0, NaN) = NaN`, `NaN >= порог`
 * = `false`, и итог получается НОЛЬ — то есть «клиника ничего никому не должна».
 * Молчаливый ноль на деньгах хуже исключения.
 */
function assertLedgerShape(ledger: PatientLedger): void {
	if (
		ledger === null ||
		typeof ledger !== "object" ||
		!Number.isSafeInteger((ledger as PatientLedger).balanceKopecks)
	) {
		throw new MoneyPrecisionError(
			"сальдо пациента",
			ledger,
			"ожидался объект PatientLedger с целым balanceKopecks; перебор Map даёт пары [ключ, значение], передавайте map.values() или сам map",
		);
	}
}

/**
 * Готовое объяснение расхождения двух экранов — словами и с копейками.
 *
 * Существует затем, чтобы оператор, видящий на одном экране одно число, а на
 * другом другое, читал ПРИЧИНУ, а не догадывался. Печать суммы — общая
 * `formatKopecksRu` (неразрывные пробелы, типографский минус, знак рубля), своего
 * форматирования денег здесь нет.
 */
export function explainDebtTotals(totals: ClinicDebtTotals): string {
	const belowThreshold = explainSubThreshold(totals);

	if (totals.fullRefundLiabilityKopecks === 0 && belowThreshold === "") {
		return (
			`Пациенты должны клинике ${formatKopecksRu(totals.receivableKopecks)} ` +
			`(${totals.debtorCount} чел.). Переплат нет, поэтому «не собрано, нетто» — та же сумма.`
		);
	}
	/*
	 * АРИФМЕТИКА В ЭТОЙ СТРОКЕ ОБЯЗАНА СХОДИТЬСЯ ГЛАЗАМИ. Поэтому вычитание
	 * печатается ПОЛНЫМИ величинами: пока итог собирался из отфильтрованных сторон,
	 * оператор читал «53 001,49 − 1 598,51 = 51 402,98», а главный экран показывал
	 * 51 403,48 — и объяснение расхождения само становилось его источником.
	 */
	return (
		`Пациенты должны клинике ${formatKopecksRu(totals.fullReceivableKopecks)} ` +
		`(${totals.debtorCount + totals.subThresholdDebtorCount} чел.). Клиника должна вернуть ` +
		`${formatKopecksRu(totals.fullRefundLiabilityKopecks)} ` +
		`(${totals.overpaidCount + totals.subThresholdOverpaidCount} чел.). ` +
		`Не собрано, нетто: ${formatKopecksRu(totals.fullReceivableKopecks)} − ` +
		`${formatKopecksRu(totals.fullRefundLiabilityKopecks)} = ` +
		`${formatKopecksRu(totals.netUncollectedKopecks)}. Это две РАЗНЫЕ величины, и ` +
		`переплату одного пациента нельзя зачитывать в долг другого.${belowThreshold}`
	);
}

/**
 * Что порог унёс из СПИСКОВ — словами и копейками. Пустая строка, если ничего.
 *
 * Отдельным предложением, а не сноской: пока этой фразы не было, отчёт печатал
 * одну сумму, карточки пациентов — другую, и разница в 50 копеек не имела причины
 * ни на одном экране. Причина обязана называться причиной, иначе следующий
 * читатель объявит расхождение дефектом расчёта и пойдёт «чинить» верные числа.
 */
function explainSubThreshold(totals: ClinicDebtTotals): string {
	const parts: string[] = [];
	if (totals.subThresholdReceivableKopecks > 0) {
		parts.push(
			`долги на ${formatKopecksRu(totals.subThresholdReceivableKopecks)} ` +
				`(${totals.subThresholdDebtorCount} чел.)`,
		);
	}
	if (totals.subThresholdRefundKopecks > 0) {
		parts.push(
			`переплаты на ${formatKopecksRu(totals.subThresholdRefundKopecks)} ` +
				`(${totals.subThresholdOverpaidCount} чел.)`,
		);
	}
	if (parts.length === 0) return "";
	return (
		` Ниже порога значимости ${formatKopecksRu(totals.significanceKopecks)} остались ` +
		`${parts.join(" и ")}: в списки для звонков и возвратов они не попадают как шум, ` +
		`но в «не собрано, нетто» входят полностью — иначе итог клиники разошёлся бы с ` +
		`«назначено − оплачено» ровно на эту сумму.`
	);
}

