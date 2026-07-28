/**
 * Отрицательная выплата врачу: слова с числами вместо красного числа.
 *
 * ЧТО БЫЛО ПЛОХО ДЛЯ КЛИНИКИ
 *
 * 1. У строки врача объяснение формально было, но без единого числа:
 *    «Выплата отрицательная: материалы дороже начисленного процента. Это долг
 *    врача клинике, а не ноль — обнулять его нельзя.» (`doctorPayouts.ts`,
 *    `payoutRowNote`). Владелец не может объяснить врачу минус по такому тексту:
 *    он не видит ни начисленного, ни удержанного, ни ставки, ни процента
 *    удержания. А единственное указание — «обнулять его нельзя» — обращено к
 *    программисту: владелец ничего не обнуляет.
 *
 * 2. У ИТОГА по клинике объяснения не было вовсе: крупное красное «−196,73 ₽»
 *    под подписью «к выплате всего» и ни одного слова рядом. Само число при
 *    этом — сальдо встречных величин: 203,27 ₽, которые клиника отдаёт одному
 *    врачу, плюс 400 ₽, которые другой должен клинике. Заплатить −196,73 ₽
 *    невозможно, а зачесть долг одного врача из зарплаты другого нельзя ни по
 *    договору, ни в бухгалтерии. Оба настоящих числа были скрыты внутри одного и
 *    восстанавливались только ручным сложением строк таблицы.
 *
 * ПОЧЕМУ ТЕКСТ СОБИРАЕТСЯ НА СЕРВЕРЕ
 * Экран печатает `row.note` и `limitations` как есть
 * (`apps/web/src/pages/DoctorPayoutDashboard.tsx`), поэтому объяснение денег
 * живёт рядом с расчётом денег и не может быть потеряно при вёрстке. Здесь же
 * считаются и сами числа — через decimal.js, а не в браузере: накопление рублей
 * в двоичном float даёт хвост. Замерено в Node на числах этого расчёта:
 * `550.17 - 746.9` = −196.73000000000002 и `203.27 + (-400) + (-0.01)` =
 * −196.73999999999998. Для зарплатной ведомости этого достаточно, чтобы копейка
 * не сошлась. (Пара `203.27 + (-400)` при этом складывается точно — трап
 * проявляется не на каждом слагаемом, поэтому его нельзя ловить на глаз.)
 *
 * ПОЧЕМУ ОТДЕЛЬНЫЙ ФАЙЛ, А НЕ ПРАВКА `payoutRowNote`
 * Правильное место для этого текста — `payoutRowNote` в `doctorPayouts.ts`.
 * На момент правки этот файл держал другой инженер (незакоммиченная правка
 * охвата «только свои» в `buildPeriodRevenueQuery`), и по правилу границ он не
 * правится и не коммитится. Поэтому объяснение собрано отдельным шагом над
 * готовым отчётом, а вызывается из маршрута. ДОЛГ: когда `doctorPayouts.ts`
 * освободится, `negativeRowExplanation` переносится внутрь `payoutRowNote`, а
 * `SUPERSEDED_NEGATIVE_SENTENCE` вместе с этим шагом исчезает.
 *
 * ПРАВИЛО ЧЕТЫРЁХ. Пояснение появляется ТОЛЬКО у строк с отрицательной выплатой
 * и только у отчёта, где долг есть. Клиника без долгов не видит ни одного нового
 * слова: таблица из восьми врачей не должна превращаться в стену текста.
 */

import { Decimal } from "decimal.js";
import type { DoctorPayoutReport, DoctorPayoutRow, DoctorPayoutTotals } from "./doctorPayouts.js";

/**
 * Итог, разложенный на два денежных события.
 *
 * «К выплате всего» складывает встречные величины, поэтому одного числа мало:
 * клиника платит `payoutDueRub` и отдельно получает `debtToClinicRub`. Числа
 * считаются здесь и через decimal.js, а не в браузере, потому что это деньги:
 * накопление рублей в двоичном float даёт хвост (замер — в шапке файла).
 */
export type PayoutSignSplit = {
	/** Сколько клиника отдаёт врачам: сумма только положительных выплат. */
	readonly payoutDueRub: number;
	/** Сколько врачи должны клинике: сумма отрицательных выплат по модулю. */
	readonly debtToClinicRub: number;
	readonly doctorsDue: number;
	readonly doctorsInDebt: number;
};

/**
 * Отчёт с разложенным итогом. Тип расширяет `DoctorPayoutReport` структурно, а
 * не правкой его объявления: файл с объявлением занят другим инженером.
 */
export type ExplainedDoctorPayoutReport = Omit<DoctorPayoutReport, "totals"> & {
	readonly totals: DoctorPayoutTotals & PayoutSignSplit;
};

/**
 * Фразы, которые этот модуль заменяет своей — с числами и действием.
 *
 * Обе приходят из `payoutRowNote` (`doctorPayouts.ts`) и вырезаются ТОЛЬКО из
 * строк с отрицательной выплатой; у остальных строк текст остаётся прежним.
 *
 * Первая — единственное, что раньше говорилось про минус: без чисел, и с
 * указанием «обнулять его нельзя», обращённым к программисту, а не к владельцу.
 * Вторая — общая для всех посчитанных строк, и рядом с разбором по числам она
 * повторяет уже сказанное («начислено 100 ₽ — это 10 % от кассы 1 000 ₽»),
 * оставаясь висеть в конце абзаца необязательным хвостом. То же самое экран и
 * так печатает в `methodNote` под таблицей.
 *
 * Совпадение фраз закреплено тестом (`payoutNegativeExplain.test.ts`): если их
 * текст в `doctorPayouts.ts` изменят, тест упадёт, а не тихо оставит на экране
 * дубль.
 */
export const SUPERSEDED_NEGATIVE_SENTENCE =
	"Выплата отрицательная: материалы дороже начисленного процента. " +
	"Это долг врача клинике, а не ноль — обнулять его нельзя.";

/** Общая первая фраза посчитанной строки. Для минуса её заменяет разбор по числам. */
export const SUPERSEDED_METHOD_SENTENCE =
	"Начислено процентом от кассы, затем удержана доля себестоимости материалов.";

/** Копейки: округление половины вверх, как в бухгалтерии. */
function roundMoney(value: Decimal): number {
	return value.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
}

/**
 * Деньги словами ровно так же, как их печатает экран.
 *
 * Повторяет `money()` из `apps/web/src/AppHelpers.tsx`: копейки показываются
 * только когда они есть. Иначе в одной строке экрана окажется «500 ₽» в ячейке и
 * «500,00 ₽» в пояснении к ней, и владелец решит, что это два разных числа.
 * Голый `toLocaleString` без этого правила уже стоил проекту дефекта в печатных
 * формах («600,6 руб.» вместо «600,60 руб.»).
 */
function moneyRub(valueRub: number): string {
	const safe = Number.isFinite(valueRub) ? valueRub : 0;
	const fractionDigits = Math.round(safe * 100) % 100 === 0 ? 0 : 2;
	return `${safe.toLocaleString("ru-RU", {
		minimumFractionDigits: fractionDigits,
		maximumFractionDigits: fractionDigits,
	})} ₽`;
}

/**
 * Процент в русском тексте: запятая, а не точка. «30.5 %» читается как опечатка
 * или как чужой формат числа, а рядом стоят деньги — доверие к ним общее.
 */
function percentText(value: number, maximumFractionDigits = 2): string {
	return `${value.toLocaleString("ru-RU", { maximumFractionDigits })} %`;
}

/**
 * Склонение счётного слова «врач»: 1 врач, 2 врача, 5 врачей.
 *
 * Своё, а не `countLabel` из веба: это серверный текст, и тянуть в API модуль
 * интерфейса нельзя. «400 ₽ должны клинике 1 врачей» читается как ошибка
 * программы, после чего к соседним суммам доверия нет.
 */
function doctorsText(count: number): string {
	const mod100 = count % 100;
	const mod10 = count % 10;
	if (mod100 >= 11 && mod100 <= 14) return `${count} врачей`;
	if (mod10 === 1) return `${count} врач`;
	if (mod10 >= 2 && mod10 <= 4) return `${count} врача`;
	return `${count} врачей`;
}

/**
 * Итог, разложенный по знаку выплаты.
 *
 * Ровный ноль не попадает ни в одну из групп сознательно: врач с нулевой
 * выплатой ничего не получает и никому не должен, и записывать его в «к выплате
 * 0 врачам» значило бы соврать в счётчике.
 */
export function splitPayoutsBySign(rows: readonly DoctorPayoutRow[]): PayoutSignSplit {
	let due = new Decimal(0);
	let debt = new Decimal(0);
	let doctorsDue = 0;
	let doctorsInDebt = 0;

	for (const row of rows) {
		if (row.state !== "computed" || row.payoutRub === null) continue;
		if (row.payoutRub < 0) {
			debt = debt.plus(new Decimal(row.payoutRub).negated());
			doctorsInDebt += 1;
		} else if (row.payoutRub > 0) {
			due = due.plus(row.payoutRub);
			doctorsDue += 1;
		}
	}

	return {
		payoutDueRub: roundMoney(due),
		debtToClinicRub: roundMoney(debt),
		doctorsDue,
		doctorsInDebt,
	};
}

/**
 * Почему у этого врача вышло меньше нуля: числами, диагнозом и действием.
 *
 * Порядок фраз один и тот же и выбран не по вкусу: что произошло → числами
 * почему → похоже ли это на ошибку настройки → что можно проверить самому.
 * Важное стоит первым, потому что этот текст читают в конце месяца, когда врач
 * уже увидел красное число.
 *
 * Возвращает null, когда объяснять нечего. Положительная строка не получает ни
 * одного лишнего слова.
 */
export function negativeRowExplanation(row: DoctorPayoutRow): string | null {
	if (row.state !== "computed") return null;
	if (row.payoutRub === null || row.payoutRub >= 0) return null;
	/*
	 * Ветка недостижима при отрицательной выплате: `computeDoctorPayout` считает
	 * `payoutRub` только вместе с `accruedRub` и `withheldMaterialRub`. Она
	 * оставлена, чтобы сужение типов было честным и чтобы правка формулы не
	 * напечатала врачу «null ₽» вместо суммы.
	 */
	if (row.accruedRub === null || row.withheldMaterialRub === null) return null;

	const debtRub = roundMoney(new Decimal(row.payoutRub).negated());
	const parts: string[] = [];

	// 1. Что произошло и из каких чисел это вышло.
	const accruedClause =
		row.commissionPct === null
			? `начислено ${moneyRub(row.accruedRub)} от кассы ${moneyRub(row.revenueRub)}`
			: `начислено ${moneyRub(row.accruedRub)} — это ${percentText(row.commissionPct)} от кассы ${moneyRub(
					row.revenueRub,
				)}`;
	const withheldClause =
		row.materialDeductionPct === null
			? `удержано ${moneyRub(row.withheldMaterialRub)} за материалы себестоимостью ${moneyRub(row.materialCostRub)}`
			: `удержано ${moneyRub(row.withheldMaterialRub)} — это ${percentText(
					row.materialDeductionPct,
				)} себестоимости материалов ${moneyRub(row.materialCostRub)}`;

	parts.push(
		`Выплаты за период нет: получился долг врача клинике ${moneyRub(debtRub)}. Считалось так: ${accruedClause}, ` +
			`${withheldClause}. ${moneyRub(row.accruedRub)} минус ${moneyRub(row.withheldMaterialRub)} = ` +
			`${moneyRub(row.payoutRub)} — число отрицательное, и обнулять его нельзя: клиника потеряет эти деньги.`,
	);

	// 2. Порог безубыточности. Он выводится из двух процентов, а не назначается:
	//    выплата уходит в минус, когда себестоимость превышает касса × ставка /
	//    удержание. Владелец по этому числу сразу видит, насколько велик промах.
	if (
		row.commissionPct !== null &&
		row.materialDeductionPct !== null &&
		row.materialDeductionPct > 0 &&
		row.revenueRub > 0
	) {
		const breakEvenRub = roundMoney(
			new Decimal(row.revenueRub).times(row.commissionPct).div(row.materialDeductionPct),
		);
		const breakEvenSharePct = new Decimal(row.commissionPct).div(row.materialDeductionPct).times(100).toNumber();
		const actualSharePct = new Decimal(row.materialCostRub).div(row.revenueRub).times(100).toNumber();
		parts.push(
			`Порог: при ставке ${percentText(row.commissionPct)} и удержании ${percentText(
				row.materialDeductionPct,
			)} выплата остаётся положительной, пока материалы за период дешевле ${moneyRub(breakEvenRub)} — ` +
				`это ${percentText(breakEvenSharePct, 1)} кассы врача. Списано на ${moneyRub(row.materialCostRub)}, ` +
				`то есть ${percentText(actualSharePct, 1)} кассы.`,
		);
	}

	/*
	 * 3. Диагноз настройки — только при удержании 100 %, и это не догадка.
	 *    Писателей `doctor_commissions` в рабочем коде ровно два:
	 *    `routes/diary.ts` при первом подписании приёма врачом пишет
	 *    `commission_pct: "30.00"` вместе с `material_cost_deduction_pct:
	 *    "100.00"`, а `routes/workspaceProfile.ts` (мастер первичной настройки)
	 *    процент удержания не пишет вовсе, поэтому там срабатывает DEFAULT '0'
	 *    (`db/schema.ts`). Значит 100 % может появиться только от подписания
	 *    приёма — клиника этого значения не выбирала.
	 *
	 *    Куда идти менять — сказано честно: маршрута записи `doctor_commissions`
	 *    в API нет ни одного, и экрана для этих двух процентов в интерфейсе тоже
	 *    нет. Фраза «измените ставку в настройках» была бы ложью, а текст,
	 *    отправляющий владельца в ненайденное место, хуже молчания.
	 */
	if (row.materialDeductionPct === 100) {
		parts.push(
			"Удержание 100 % себестоимости клиника не выбирала: его вписывает сама система, когда врач впервые " +
				"подписывает приём и строки ставки у него ещё нет. Ни ставку, ни процент удержания в интерфейсе пока " +
				"изменить нельзя — экрана для них нет: если договорённость с врачом другая (процент считается после " +
				"вычета материалов либо удерживается только часть себестоимости), скажите администратору системы, " +
				"иначе расчёт будет неверным каждый месяц.",
		);
	}

	// 4. Что владелец может проверить сам сегодня. Оба места существуют в
	//    интерфейсе: экран «Склад», поле «Цена за единицу (₽)» и блок «Правила
	//    списания» (`apps/web/src/components/InventoryView.tsx`).
	parts.push(
		"Что можно проверить самому, на экране «Склад»: цену за единицу у списанных позиций и количество материала " +
			"в правилах списания на услугу. Завышенная цена позиции или завышенное количество в правиле дают такой же " +
			"минус, как неверная ставка. Разговор с врачом — после этой проверки, а не до неё.",
	);

	return parts.join(" ");
}

/**
 * Почему итог по клинике вышел таким, каким вышел.
 *
 * Возвращает null, когда объяснять нечего: долгов нет — экран не меняется ни на
 * слово.
 */
export function negativeTotalsExplanation(input: {
	readonly totals: DoctorPayoutTotals;
	readonly split: PayoutSignSplit;
	readonly scope: "all" | "own";
}): string | null {
	const { totals, split, scope } = input;
	if (split.debtToClinicRub <= 0) return null;

	/*
	 * Охват «только свои»: врач видит одну строку, и полное объяснение с числами
	 * стоит прямо над плитками — это её `note`. Повторять числа здесь значило бы
	 * напечатать их дважды подряд. Поэтому сказано только то, чего в строке нет:
	 * что означает красное число в плитке и чем оно НЕ является.
	 */
	if (scope === "own") {
		return (
			"Отрицательное число в плитке — это не сумма, которую с вас требуют доплатить из своих, " +
			`а долг за материалы, посчитанный по формуле выше: ${moneyRub(split.debtToClinicRub)}. ` +
			"Пока не проверены цены склада, количество материала в правилах списания и сама ставка, " +
			"считать это число окончательным нельзя."
		);
	}

	// Долг есть, а к выплате нет ни одного врача: итог — это и есть общий долг,
	// складывать нечего, но подпись «к выплате всего» всё равно неверна.
	if (split.doctorsDue === 0) {
		return (
			`Подпись «к выплате всего» здесь неверна: к выплате нет ни одного врача, а ${moneyRub(
				split.debtToClinicRub,
			)} — это долг врачей клинике за материалы (${doctorsText(split.doctorsInDebt)}). ` +
			"Это не сумма, которую клиника кому-то платит. Почему минус вышел у конкретного врача — " +
			"сказано в пояснении к его строке."
		);
	}

	const balanceClause =
		totals.payoutRub < 0
			? `Выплатить ${moneyRub(totals.payoutRub)} невозможно, а зачесть долг одного врача из зарплаты другого ` +
				"нельзя ни по договору, ни в бухгалтерии"
			: `Число в плитке (${moneyRub(totals.payoutRub)}) — это разница между ними, а не деньги, которые кто-то ` +
				"получит: зачесть долг одного врача из зарплаты другого нельзя ни по договору, ни в бухгалтерии";

	return (
		"Плитка «к выплате всего» показывает сальдо, а не сумму к выплате: в ней сложены встречные величины. " +
		`Клиника отдаёт врачам ${moneyRub(split.payoutDueRub)} (${doctorsText(split.doctorsDue)}), и отдельно ` +
		`${moneyRub(split.debtToClinicRub)} врачи должны клинике за материалы (${doctorsText(split.doctorsInDebt)}). ` +
		`${balanceClause}: считайте эти два числа отдельно. Почему минус вышел у конкретного врача — сказано ` +
		"в пояснении к его строке."
	);
}

/** Текст строки без фраз, которые этот модуль заменяет своими. */
function withoutSupersededSentences(note: string): string {
	let rest = note;
	for (const sentence of [SUPERSEDED_NEGATIVE_SENTENCE, SUPERSEDED_METHOD_SENTENCE]) {
		rest = rest.split(sentence).join(" ");
	}
	return rest.replace(/\s{2,}/g, " ").trim();
}

/**
 * Объяснение отрицательной выплаты поверх готового расчёта.
 *
 * Отчёт не меняется ни одним числом: суммы считает `doctorPayouts`, здесь
 * добавляются только слова и разложенный по знаку итог. Клиника без долгов
 * получает отчёт, неотличимый от прежнего.
 */
export function explainNegativePayouts(
	report: DoctorPayoutReport,
	options: { readonly scope: "all" | "own" },
): ExplainedDoctorPayoutReport {
	const split = splitPayoutsBySign(report.rows);

	const rows = report.rows.map((row) => {
		const explanation = negativeRowExplanation(row);
		if (!explanation) return row;
		const rest = withoutSupersededSentences(row.note);
		return { ...row, note: rest ? `${explanation} ${rest}` : explanation };
	});

	const totalsNote = negativeTotalsExplanation({
		totals: report.totals,
		split,
		scope: options.scope,
	});

	return {
		...report,
		rows,
		totals: { ...report.totals, ...split },
		// Первым в списке: это утверждение о деньгах всей клиники, а остальные
		// ограничения расчёта — про то, чего он не умеет.
		limitations: totalsNote ? [totalsNote, ...report.limitations] : report.limitations,
	};
}
