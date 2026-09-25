import {
	type Kopecks,
	sumKopecks,
} from "@dental/shared";
import {
	CANCELLED_ITEM_STATUS,
	PAID_PAYMENT_STATUS,
	type ChargeLineInput,
	type TreatmentChargeRow,
	type SplitTenderItem,
	type PaymentRow,
	type PatientDebtFilterOptions,
	chargeLineKopecks,
	validateSplitPaymentRow,
	matchesOrganization,
	toKopecks,
	MoneyPrecisionError,
	assertKopecks,
} from "./patientDebtCore.js";

/**
 * patientDebtLedger.ts — Сальдо пациента и приёма, запросы баланса и сплит-тендеры.
 * Выделено из patientDebt.ts с сохранением 100% обратной совместимости.
 */

/**
 * Сальдо одного пациента. Первичная величина: пять ответов ниже — её чтения.
 *
 * Область здесь — пациент целиком, поэтому позиции и оплаты берутся независимо
 * от того, привязаны они к приёму или нет. Для вопроса про ОДИН приём есть своя
 * первичная величина — `VisitLedger`, та же арифметика с другим ключом отбора.
 */
export interface PatientLedger {
	readonly patientId: string;
	/** Идентификатор организации/клиники (мультитенантность). */
	readonly organizationId?: string | null | undefined;
	/** Назначено: сумма строк позиций, кроме отменённых. */
	readonly chargedKopecks: Kopecks;
	/** Оплачено: сумма платежей в статусе `paid`. */
	readonly paidKopecks: Kopecks;
	/**
	 * Назначено − оплачено. Больше нуля — должен пациент, меньше — должна
	 * клиника.
	 *
	 * Знак взят у канона (`receivables`), а НЕ у `domainStateHydration`, где он
	 * обратный. Причина: канон отвечает на вопрос, который задаёт оператор —
	 * «сколько ОН должен», а не «какое у него сальдо». Обе конвенции сегодня
	 * живут в дереве одновременно и нигде не описаны; здесь она названа.
	 */
	readonly balanceKopecks: Kopecks;
}

/**
 * Сальдо по каждому пациенту, встречающемуся ХОТЯ БЫ в одной из двух таблиц.
 *
 * Объединение, а не соединение по позициям лечения: пациент, заплативший вперёд
 * до любых назначений, в позициях не встречается вовсе, и по одной таблице его
 * переплату не увидеть. Ровно на этом отчёт дебиторки терял переплативших, пока
 * в нём не появилось объединение множеств ключей.
 *
 * При указании options.organizationId исключается перекрестный зачет долгов
 * разных клиник (мультитенантная изоляция).
 */
export function buildPatientLedgers(
	charges: readonly TreatmentChargeRow[],
	payments: readonly PaymentRow[],
	options?: PatientDebtFilterOptions,
): Map<string, PatientLedger> {
	const filterOrg = options?.organizationId;

	const chargeLines = new Map<string, Kopecks[]>();
	for (const row of charges) {
		if (filterOrg && !matchesOrganization(row.organizationId, filterOrg)) continue;
		if (row.status === CANCELLED_ITEM_STATUS) continue;
		const lines = chargeLines.get(row.patientId) ?? [];
		lines.push(chargeLineKopecks(row));
		chargeLines.set(row.patientId, lines);
	}

	const paymentLines = new Map<string, Kopecks[]>();
	for (const row of payments) {
		if (filterOrg && !matchesOrganization(row.organizationId, filterOrg)) continue;
		if (row.status !== PAID_PAYMENT_STATUS) continue;
		const lines = paymentLines.get(row.patientId) ?? [];
		lines.push(validateSplitPaymentRow(row));
		paymentLines.set(row.patientId, lines);
	}

	const ledgers = new Map<string, PatientLedger>();
	for (const patientId of new Set<string>([
		...chargeLines.keys(),
		...paymentLines.keys(),
	])) {
		// sumKopecks из общего модуля: он проверяет целость каждого слагаемого,
		// поэтому испорченная сумма падает на сложении, а не расползается в итог.
		const chargedKopecks = sumKopecks(chargeLines.get(patientId) ?? []);
		const paidKopecks = sumKopecks(paymentLines.get(patientId) ?? []);
		ledgers.set(patientId, {
			patientId,
			organizationId: filterOrg ?? undefined,
			chargedKopecks,
			paidKopecks,
			balanceKopecks: chargedKopecks - paidKopecks,
		});
	}
	return ledgers;
}

/** Сальдо одного пациента, когда строки ещё не отфильтрованы по нему. */
export function buildPatientLedger(
	patientId: string,
	charges: readonly TreatmentChargeRow[],
	payments: readonly PaymentRow[],
	options?: PatientDebtFilterOptions,
): PatientLedger {
	return (
		buildPatientLedgers(
			charges.filter((row) => row.patientId === patientId),
			payments.filter((row) => row.patientId === patientId),
			options,
		).get(patientId) ?? {
			patientId,
			organizationId: options?.organizationId ?? undefined,
			chargedKopecks: 0,
			paidKopecks: 0,
			balanceKopecks: 0,
		}
	);
}

/* ═════════════════════════════════════════════════════════════════════════
 * ШЕСТЬ ОТВЕТОВ НА ШЕСТЬ ВОПРОСОВ ОПЕРАТОРА — ПРО ПАЦИЕНТА И ПРО КЛИНИКУ
 *
 * Функций ровно столько, сколько РАЗНЫХ вопросов задаёт оператор, и каждое имя
 * отвечает на свой вопрос. Девять расчётов до этого модуля отвечали на эти же
 * вопросы, но их имена этого не сообщали: три разных величины назывались
 * словом «долг».
 *
 * ШЕСТОЙ ОТВЕТ (`patientAccountBalanceKopecks`) добавлен 2026-07-29 при переезде
 * картотеки (`db/patientsQuery.ts`, где стояла константа `balanceRub: 0`). Он не
 * новая формула, а то же сальдо со знаком, который требует общий контракт поля
 * `Patient.balanceRub` — обратным к канону; причина и доказательство «это не
 * третий расчёт» стоят у самой функции.
 *
 * Шестой и седьмой вопрос — про ОДИН ПРИЁМ (`VisitLedger`,
 * `visitOutstandingKopecks`, `visitOverpaidKopecks`) — стоят ниже отдельной
 * секцией: у них другая область отбора, а не другая формула. Тот вопрос, который
 * `.agents/lead/recon-debt-formula-sprawl.md` называет шестой величиной («к
 * оплате пациентом после страховки», веб), здесь по-прежнему НЕ отвечен: сервер
 * данных договора ДМС в сводку не отдаёт вовсе.
 * ═════════════════════════════════════════════════════════════════════════ */

/**
 * «Сколько ЭТОТ пациент должен клинике?»
 *
 * Ноль, если рассчитался ровно ИЛИ переплатил: долг не бывает отрицательным, и
 * контракт это требует (`patientInsight.balanceDueRub` —
 * `nonNegativeMoneyRubSchema`). Цена такого зажима — переплата в этом ответе
 * безымянна, поэтому рядом обязан стоять `clinicOwesPatientKopecks`, иначе
 * «ноль» означает сразу две разные ситуации.
 */
export function patientOwesClinicKopecks(ledger: PatientLedger): Kopecks {
	return Math.max(0, ledger.balanceKopecks);
}

/**
 * «Сколько клиника должна ЭТОМУ пациенту?»
 *
 * Величина, которой до отчёта дебиторки не существовало ни на одном экране:
 * переплативший пациент отбрасывался фильтром долга, а его деньги молча гасили
 * чей-то чужой долг на главном экране. На живых данных таких пациентов двое, по
 * 800,00 ₽ каждый.
 */
export function clinicOwesPatientKopecks(ledger: PatientLedger): Kopecks {
	return Math.max(0, -ledger.balanceKopecks);
}

/**
 * «Плюс или минус у ЭТОГО пациента на счету, и на сколько?»
 *
 * СЕДЬМАЯ величина этого дома, и заведена она не для удобства, а потому что
 * оператор действительно задаёт этот вопрос отдельно: в карточке пациента стоит
 * ОДНО число со знаком, и по нему администратор решает, звонить о долге или
 * возвращать переплату. Два ответа выше («сколько должен» и «сколько ему должны»)
 * в это поле не помещаются: их два, а поле одно.
 *
 * ЗНАК ЗДЕСЬ ОБРАТНЫЙ КАНОНУ, И ЭТО НЕ ОПЕЧАТКА. Поле `Patient.balanceRub`
 * объявлено в общем контракте со знаком, и его собственный комментарий называет
 * конвенцию дословно: «Баланс пациента: оплачено минус запланировано.
 * Отрицательное значение — долг» (`packages/shared/src/index.ts`,
 * `patientSchema`). ЗДЕСЬ СТОЯЛО УТВЕРЖДЕНИЕ, КОТОРОЕ БЫЛО ЛОЖНЫМ И ТОГДА:
 * «ту же конвенцию уже используют ДВА живых производителя этого поля —
 * `db/domainStateHydration.ts` и `treatment/TreatmentPlanBuilder.ts`». Второй
 * живым не был никогда: у него был НОЛЬ импортёров, то есть в поле он не писал
 * ни разу; удалён 2026-08-05 вместе с дословной копией `full_treatment_plan.ts`.
 * Первого в дереве тоже больше нет — ни в рабочем каталоге, ни в индексе git
 * (проверено `git ls-files`), от него остался только осиротевший
 * `dist/db/domainStateHydration.js`. Живой производитель `Patient.balanceRub`
 * сегодня ОДИН: `db/patientsQuery.ts`, и он берёт значение отсюда же
 * (`patientAccountBalanceKopecks`).
 *
 * Знак от этого не меняется: его задаёт КОНТРАКТ поля, а не тот, кто в поле
 * пишет. Отдать в него канонический знак значило бы перевернуть карточку каждому
 * пациенту: должник выглядел бы переплатившим. Замер 2026-07-29 на клинике
 * `d0000000-…-d001` остаётся историческим свидетельством той же конвенции:
 * гидратация отдавала `0103 = −26 500`, `0100 = +800`, то есть минус — это долг.
 *
 * НОВОЙ АРИФМЕТИКИ ЗДЕСЬ НЕТ, и это проверяемо, а не заявлено: для ЛЮБОГО сальдо
 * значение равно `clinicOwesPatientKopecks − patientOwesClinicKopecks`, то есть
 * это те же два ответа выше, а не третий расчёт. Тест на это стоит в
 * `patientDebt.test.ts` и гоняется по всем живым сальдо, а не по одному примеру.
 *
 * ЧЕМ ОТЛИЧАЕТСЯ ОТ ПРЕЖНЕГО ПРОИЗВОДИТЕЛЯ: у `domainStateHydration` тот же знак,
 * но снаружи стоит `Math.round` до ЦЕЛОГО РУБЛЯ, а он несимметричен по знаку
 * (`Math.round(-49899.5) = -49899` при `Math.round(49899.5) = 49900`): должнику
 * 50 копеек прощают, переплатившему приписывают. Здесь копейки целые и точные,
 * округлять нечего.
 *
 * ПОЧЕМУ НЕ `-ledger.balanceKopecks`, ХОТЯ ЭТО КОРОЧЕ. Унарный минус на нуле даёт
 * ОТРИЦАТЕЛЬНЫЙ НОЛЬ, и он не безобиден: `Object.is(-0, 0) === false`, то есть
 * сравнение сальдо с нулём внезапно ложно, а `(-0).toLocaleString("ru-RU")`
 * печатает «-0» — рассчитавшийся до копейки пациент получил бы в карточке «−0 ₽».
 * Так и печатают деньги и в этом дереве (`sampleData.ts`, чипы карточки и
 * подсказка администратору). Поймано тестом при первом же прогоне: `assert.
 * strictEqual(-0, 0)` падает. Разность двух неотрицательных сумм такого нуля не
 * даёт никогда, и записана она ровно теми словами, которыми конвенцию объявил
 * контракт: «оплачено минус запланировано».
 */
export function patientAccountBalanceKopecks(ledger: PatientLedger): Kopecks {
	return ledger.paidKopecks - ledger.chargedKopecks;
}


/* ═════════════════════════════════════════════════════════════════════════
 * ЕЩЁ ДВА ВОПРОСА — ПРО ОДИН ПРИЁМ, А НЕ ПРО ПАЦИЕНТА И НЕ ПРО КЛИНИКУ
 *
 * «Сколько осталось получить ПО ЭТОМУ ПРИЁМУ?» и «Сколько по ЭТОМУ приёму
 * заплачено сверх назначенного?». Это ДРУГИЕ вопросы, чем пять выше: там область
 * — пациент и клиника, здесь — один приём. Тот же пациент за год приходит
 * двадцать раз, и «он должен 26 500» не отвечает администратору, закрывающему
 * приём, ни да, ни нет.
 *
 * НОВОЙ ФОРМУЛЫ ЗДЕСЬ НЕТ, И ЭТО ПРОВЕРЯЕМО. Первичная величина та же —
 * `назначено − оплачено`; строка позиции считается тем же `chargeLineKopecks`,
 * отменённые отбрасываются той же `CANCELLED_ITEM_STATUS`, оплаты отбираются тем
 * же `PAID_PAYMENT_STATUS`, сложение — тем же `sumKopecks`. Меняется РОВНО ОДНО:
 * ключ отбора строк. Что это не разошедшаяся копия, а та же величина в другой
 * области, закреплено тестом «сальдо приёма совпадает с сальдо пациента, когда
 * у пациента один приём и все его строки к нему привязаны»
 * (`patientDebt.test.ts`).
 *
 * ПОЧЕМУ НЕ ПЕРЕИСПОЛЬЗОВАН `buildPatientLedgers` С ДРУГИМ КЛЮЧОМ. Он группирует
 * по пациенту, и вынести из него общий сборщик значило бы переписать функцию, на
 * которой стоит канон и 49 проверок. Здесь повторён цикл, а не арифметика; цена
 * — восемь строк перебора, выигрыш — канон не тронут.
 *
 * ЧЕГО ЭТОТ ОТВЕТ НЕ ЗНАЕТ, И ЭТО НАДО ГОВОРИТЬ ВСЛУХ. Он видит только то, что
 * привязано к приёму. Оплата, принятая без приёма (`payments.visit_id` = null —
 * маршрут это разрешает: `db/billingQuery.ts`, `visitId: input.visitId || null`),
 * в сальдо приёма не попадёт, и приём покажет остаток, которого пациент уже не
 * должен. Поэтому наружу вместе с суммой уходят СЧЁТЧИКИ строк: «остаток 26 500,
 * позиций 1, оплат 0» отличимо от «остаток 26 500, позиций 1, оплат 1». Вопрос
 * «должен ли пациент вообще» остаётся за `patientOwesClinicKopecks`, и подменять
 * один ответ другим нельзя ни в ту, ни в другую сторону.
 * ═════════════════════════════════════════════════════════════════════════ */

/**
 * Сальдо ОДНОГО приёма. Первичная величина для обоих ответов ниже.
 *
 * Счётчики строк — часть ответа, а не отладка: без них ноль неотличим от
 * незнания, а именно на этом различии стоит галочка «оплата связана» в карточке
 * закрытия приёма.
 */
export interface VisitLedger {
	readonly visitId: string;
	/** Идентификатор организации/клиники (мультитенантность). */
	readonly organizationId?: string | null | undefined;
	/** Назначено по приёму: сумма строк позиций, кроме отменённых. */
	readonly chargedKopecks: Kopecks;
	/** Оплачено по приёму: сумма платежей в статусе `paid`. */
	readonly paidKopecks: Kopecks;
	/** Назначено − оплачено. Знак тот же, что у `PatientLedger`. */
	readonly balanceKopecks: Kopecks;
	/** Всего позиций приёма, включая отменённые. */
	readonly chargeRowCount: number;
	/** Из них попавших в назначенное. */
	readonly billedLineCount: number;
	/** Всего платежей приёма, включая неоплаченные. */
	readonly paymentRowCount: number;
	/** Из них попавших в оплаченное. */
	readonly paidPaymentCount: number;
	/**
	 * Есть ли по приёму ХОТЬ ОДНА строка денег — в любом статусе.
	 *
	 * `false` означает «ответа нет», а не «остаток ноль». Различие не
	 * стилистическое: приём, к которому ещё не завели ни позиций, ни оплат, и
	 * приём, оплаченный до копейки, для администратора — разные состояния, и
	 * закрытая по незнанию галочка хуже незакрытой.
	 *
	 * Отменённые позиции и неоплаченные платежи считаются ЗДЕСЬ намеренно: их
	 * наличие доказывает, что деньги приёма кто-то заводил. Приём с единственной
	 * отменённой позицией назначил ноль ИЗМЕРЕННО, а не по незнанию.
	 */
	readonly hasRecords: boolean;
}

/**
 * Сальдо приёма из строк, ещё не отфильтрованных по нему.
 *
 * Пустой идентификатор — отказ, а не «ничего не нашлось»: строки с
 * `visitId = null` не совпали бы с ним ни разу, и вызывающий получил бы
 * уверенный ноль по приёму, которого не назвал.
 *
 * При указании options.organizationId исключается перекрестный зачет долгов
 * разных клиник (мультитенантная изоляция).
 */
export function buildVisitLedger(
	visitId: string,
	charges: readonly TreatmentChargeRow[],
	payments: readonly PaymentRow[],
	options?: PatientDebtFilterOptions,
): VisitLedger {
	if (typeof visitId !== "string" || visitId.trim() === "") {
		throw new MoneyPrecisionError(
			"приём",
			visitId,
			"сальдо приёма нельзя собрать по пустому идентификатору: ни одна строка с visit_id = null с ним не совпадёт, и ответом стал бы уверенный ноль",
		);
	}

	const filterOrg = options?.organizationId;

	const chargeLines: Kopecks[] = [];
	let chargeRowCount = 0;
	for (const row of charges) {
		if (row.visitId !== visitId) continue;
		if (filterOrg && !matchesOrganization(row.organizationId, filterOrg)) continue;
		chargeRowCount += 1;
		if (row.status === CANCELLED_ITEM_STATUS) continue;
		chargeLines.push(chargeLineKopecks(row));
	}

	const paymentLines: Kopecks[] = [];
	let paymentRowCount = 0;
	for (const row of payments) {
		if (row.visitId !== visitId) continue;
		if (filterOrg && !matchesOrganization(row.organizationId, filterOrg)) continue;
		paymentRowCount += 1;
		if (row.status !== PAID_PAYMENT_STATUS) continue;
		paymentLines.push(validateSplitPaymentRow(row));
	}

	const chargedKopecks = sumKopecks(chargeLines);
	const paidKopecks = sumKopecks(paymentLines);
	return {
		visitId,
		organizationId: filterOrg ?? undefined,
		chargedKopecks,
		paidKopecks,
		balanceKopecks: chargedKopecks - paidKopecks,
		chargeRowCount,
		billedLineCount: chargeLines.length,
		paymentRowCount,
		paidPaymentCount: paymentLines.length,
		hasRecords: chargeRowCount > 0 || paymentRowCount > 0,
	};
}

/**
 * Структура детальной разбивки сплит-платежей по видам оплаты.
 */
export interface SplitPaymentMethodBreakdown {
	readonly cashKopecks: Kopecks;
	readonly cardKopecks: Kopecks;
	readonly sbpKopecks: Kopecks;
	readonly advanceKopecks: Kopecks;
	readonly familyDepositKopecks: Kopecks;
	readonly creditKopecks: Kopecks;
	readonly certificateKopecks: Kopecks;
	readonly dmsKopecks: Kopecks;
	readonly otherKopecks: Kopecks;
	readonly totalKopecks: Kopecks;
}

/**
 * Агрегирует сплит-оплаты по видам оплат с точностью до 1 копейки (Мандат 8a).
 */
export function aggregateSplitTenders(
	payments: readonly PaymentRow[],
	options?: PatientDebtFilterOptions,
): SplitPaymentMethodBreakdown {
	let cashKopecks = 0;
	let cardKopecks = 0;
	let sbpKopecks = 0;
	let advanceKopecks = 0;
	let familyDepositKopecks = 0;
	let creditKopecks = 0;
	let certificateKopecks = 0;
	let dmsKopecks = 0;
	let otherKopecks = 0;

	for (const row of payments) {
		if (options?.organizationId && !matchesOrganization(row.organizationId, options.organizationId)) {
			continue;
		}
		if (row.status !== PAID_PAYMENT_STATUS) continue;
		const totalKop = validateSplitPaymentRow(row);
		if (row.splitTenders && row.splitTenders.length > 0) {
			for (const tender of row.splitTenders) {
				const kop = tender.amountKopecks !== undefined
					? tender.amountKopecks
					: toKopecks(tender.amountRub ?? 0);
				switch (tender.kind.toLowerCase()) {
					case "cash":
						cashKopecks += kop;
						break;
					case "card":
						cardKopecks += kop;
						break;
					case "sbp":
						sbpKopecks += kop;
						break;
					case "advance":
					case "advance_deposit":
						advanceKopecks += kop;
						break;
					case "family_deposit":
						familyDepositKopecks += kop;
						break;
					case "credit":
						creditKopecks += kop;
						break;
					case "certificate":
					case "certificate_or_bonus":
						certificateKopecks += kop;
						break;
					case "dms":
					case "dms_insurance":
						dmsKopecks += kop;
						break;
					default:
						otherKopecks += kop;
						break;
				}
			}
		} else {
			otherKopecks += totalKop;
		}
	}

	const totalKopecks =
		cashKopecks +
		cardKopecks +
		sbpKopecks +
		advanceKopecks +
		familyDepositKopecks +
		creditKopecks +
		certificateKopecks +
		dmsKopecks +
		otherKopecks;

	return {
		cashKopecks,
		cardKopecks,
		sbpKopecks,
		advanceKopecks,
		familyDepositKopecks,
		creditKopecks,
		certificateKopecks,
		dmsKopecks,
		otherKopecks,
		totalKopecks,
	};
}

/**
 * «Сколько осталось получить ПО ЭТОМУ ПРИЁМУ?»
 *
 * `null` — «ответа нет»: по приёму не заведено ни позиций, ни оплат. Тип
 * возврата назван так СПЕЦИАЛЬНО: `Kopecks | null` заставляет вызывающего
 * написать ветку незнания, тогда как ноль он подставил бы молча. Именно молчаливый
 * ноль и есть тот дефект, из-за которого в карточке закрытия приёма стоял остаток
 * по всей клинике.
 */
export function visitOutstandingKopecks(ledger: VisitLedger): Kopecks | null {
	if (!ledger.hasRecords) return null;
	return Math.max(0, ledger.balanceKopecks);
}

/**
 * «Сколько по ЭТОМУ приёму заплачено сверх назначенного?»
 *
 * Отдельный ответ по той же причине, по которой рядом с
 * `patientOwesClinicKopecks` стоит `clinicOwesPatientKopecks`: остаток зажат в
 * ноль, поэтому без этой величины «ноль» означал бы сразу и «рассчитались
 * ровно», и «переплатили». На живой базе такой приём есть — назначено 6 400,00,
 * получено 7 200,00 (приём `…-000000000400`, замер 2026-07-29).
 */
export function visitOverpaidKopecks(ledger: VisitLedger): Kopecks | null {
	if (!ledger.hasRecords) return null;
	return Math.max(0, -ledger.balanceKopecks);
}

