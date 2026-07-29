/**
 * РАЗВЕДКА ЦЕПОЧКИ: запись -> приём -> выполненные услуги -> сумма -> оплата ->
 * долг -> отчёты. ТОЛЬКО ЧТЕНИЕ: ни одной вставки, ни одного UPDATE, ни одного
 * DELETE. Скрипт поднимает приложение в СВОЁМ процессе (app.inject), потому что
 * общий сервер разработки на 4100 отдаёт устаревший код.
 *
 * ЗАПУСК (cwd apps/api):
 *   node --import tsx src/tests/routes/chainReconProof.ts
 *
 * Не тест: имя без `.test.ts`, `npm test` его не подхватывает. Каталог src/tests
 * исключён из tsconfig, поэтому файл не участвует в общем typecheck.
 */

import { sql } from "drizzle-orm";
import Fastify from "fastify";
import type { FastifyInstance } from "fastify";
import { db, pool } from "../../db/client.js";
import {
	appointments,
	organizations,
	patients,
	payments,
	serviceCatalogItems,
	treatmentItems,
	users,
	visits,
} from "../../db/schema.js";
import {
	buildPatientLedgers,
	clinicDebtTotals,
	explainDebtTotals,
	rublesFromKopecks,
} from "../../money/patientDebt.js";
import { registerDashboardRoutes } from "../../routes/dashboard.js";
import { registerReportRoutes } from "../../routes/reports.js";
import { registerVisitRoutes } from "../../routes/visits.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { getRequestIdentity } from "../../security/identity.js";
import { fixtureUuid, purgeFixtureOrganizations } from "../support/fixtureOrganizations.js";
import { signToken } from "../../utils/cryptoHelper.js";

function money(value: unknown): number {
	return Math.round(Number(value ?? 0) * 100) / 100;
}

/*
 * ═══════════════════════════════════════════════════════════════════════════
 * СЧЁТЧИК СОДЕРЖАТЕЛЬНОСТИ: ПОЧЕМУ ОН ЗДЕСЬ ПОЯВИЛСЯ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ЗАМЕР 2026-07-29 по живой базе `dental_crm`. В базе две клиники:
 *
 *   «Демо-клиника для снимков» — 14 пациентов, 27 записей, 10 приёмов,
 *                                10 позиций лечения, 8 оплат;
 *   «Стоматология, 1 кабинет»  — 3 пациента и НОЛЬ всего остального:
 *                                0 записей, 0 приёмов, 0 визитов, 0 оплат,
 *                                0 счетов, 0 планов, 0 позиций лечения,
 *                                0 позиций одонтограммы, 0 дневников.
 *
 * До этой правки файл печатал по второй клинике благополучную картину: три
 * сверки вида «назначено дашборд=0 vs SQL=0» плюс десяток строк отчётов с
 * нулями — и ни слова о том, что сверять было нечего. Хуже: НИ ОДНА из этих
 * строк не была сравнением, файл печатал два числа рядом и шёл дальше. Поэтому
 * по второй клинике он оставался зелёным ПРИ ЛЮБОМ состоянии кода. Клиника
 * платила за прогон уверенностью, которой у неё нет, — ровно та болезнь, которую
 * сквозные сценарии и заведены ловить.
 *
 * ПОЧЕМУ СЧИТАЕТСЯ «СОДЕРЖАТЕЛЬНОСТЬ», А НЕ ЧИСЛО ПРОЙДЕННЫХ. Сравнение нуля с
 * нулём проходит и на верном коде, и на коде, который вообще ничего не считает,
 * поэтому в графу «сошлось» ему нельзя: иначе один пустой клиент раздувает
 * счётчик успеха и прячет потерю проверок. Такое утверждение здесь НЕ считается
 * пройденным вовсе — оно уходит в отдельную графу и печатается по имени.
 *
 * ЧТО ДЕЛАЕТ УТВЕРЖДЕНИЕ СОДЕРЖАТЕЛЬНЫМ — решает не сравниваемая пара, а явно
 * названная величина, на которой утверждение СТОИТ. Для сверки сумм это сами
 * суммы; для утверждения «чужих строк в отчёте нет» — размер набора, который МОГ
 * бы протечь. Второй случай важен: `false === false` на пустом наборе не
 * доказывает изоляцию, он доказывает пустоту.
 *
 * ПОРОГ С ЗАПАСОМ ЗДЕСЬ НЕ СТАВИТСЯ. В этом же дереве датчик охвата слоя доступа
 * считался и НЕ сверялся, и урезание охвата с 106 функций до 26 проходило при
 * семи зелёных проверках из восьми (коммит 115aa6595). Поэтому число
 * содержательных утверждений печатается ЧИСЛОМ рядом с общим, а граница
 * «содержательно / вырождено» проходит по нулю, а не по проценту.
 */

/** Величина, на которой стоит утверждение: сумма, счётчик или размер набора. */
type Magnitude = number | readonly unknown[] | null | undefined;

function magnitudeOf(value: Magnitude): number {
	if (value === null || value === undefined) return 0;
	if (typeof value === "number") return Number.isFinite(value) ? Math.abs(value) : 0;
	return value.length;
}

interface Claim {
	/** Клиника, о которой утверждение. Пустая клиника — не повод молчать. */
	readonly clinic: string;
	readonly label: string;
	readonly ok: boolean;
	/** Ложь — сравнивался ноль с нулём: подтверждать такому нечего. */
	readonly substantive: boolean;
	readonly actual: unknown;
	readonly expected: unknown;
	/** Наибольшая из названных величин. Ноль — стоять не на чем. */
	readonly weight: number;
}

/**
 * Приговор одному утверждению — ЧИСТАЯ функция: ничего не печатает, никуда не
 * пишет, в базу не смотрит.
 *
 * Отделена от `same` намеренно. Датчик содержательности обязан срабатывать при
 * ЗАДАННЫХ входных данных, а не когда повезёт с тем, что сейчас лежит в живой
 * базе: проверка, зависящая от текущего содержимого клиники, бывает зелёной на
 * возвращённом дефекте. Чистую функцию можно прогнать на выдуманном нуле и на
 * выдуманной сумме в том же процессе — этим и занимается
 * `proveSubstanceSensorFires`.
 */
function judge(
	clinic: string,
	label: string,
	actual: unknown,
	expected: unknown,
	substance: readonly Magnitude[],
): Claim {
	let weight = 0;
	for (const value of substance) weight = Math.max(weight, magnitudeOf(value));
	return {
		clinic,
		label,
		ok: JSON.stringify(actual) === JSON.stringify(expected),
		substantive: weight > 0,
		actual,
		expected,
		weight,
	};
}

/** Все утверждения прогона по порядку. Итог считается по этому списку. */
const claims: Claim[] = [];

/**
 * Сверка с явным ответом на вопрос «а было ли что сверять».
 *
 * `substance` обязателен и значения по умолчанию не имеет: молчаливое «возьму
 * сравниваемую пару» — это ровно тот оплаченный вперёд молчаливый слот, из-за
 * которого урезание охвата проходит незамеченным.
 */
function same(
	clinic: string,
	label: string,
	actual: unknown,
	expected: unknown,
	substance: readonly Magnitude[],
): Claim {
	const claim = judge(clinic, label, actual, expected, substance);
	claims.push(claim);
	if (!claim.substantive) {
		console.log(
			`ПУСТО  ${label}: ${JSON.stringify(claim.actual)} против ${JSON.stringify(claim.expected)} — ` +
				"обе стороны нулевые, сравнение НЕ подтверждает ничего и в пройденные не идёт",
		);
	} else {
		console.log(
			`${claim.ok ? "ОК    " : "ПРОВАЛ"} ${label}: получено ${JSON.stringify(claim.actual)}, ` +
				`ожидалось ${JSON.stringify(claim.expected)} (на величине ${claim.weight})`,
		);
	}
	return claim;
}

/**
 * ПРОВЕРКА САМОГО ДАТЧИКА — на выдуманных числах, без единого обращения к базе.
 *
 * Проверка, которая опирается на текущее содержимое живой клиники, бывает
 * зелёной на возвращённом дефекте. Здесь входные данные заданы прямо в коде:
 * датчик обязан назвать вырождением ноль против нуля и пустоту против пустоты
 * при любом состоянии базы, времени суток и наборе клиник.
 *
 * Возвращает список претензий. Пустой список — датчик работает.
 */
function proveSubstanceSensorFires(): string[] {
	const complaints: string[] = [];

	const zeroAgainstZero = judge("датчик", "ноль против нуля", 0, 0, [0, 0]);
	if (zeroAgainstZero.substantive) complaints.push("датчик счёл содержательным сравнение нуля с нулём");
	if (!zeroAgainstZero.ok) complaints.push("датчик не увидел равенства нуля и нуля");

	const emptyAgainstEmpty = judge("датчик", "пусто против пусто", [], [], [[], []]);
	if (emptyAgainstEmpty.substantive) complaints.push("датчик счёл содержательным сравнение двух пустых наборов");

	const missingValue = judge("датчик", "величина не пришла", null, null, [null, undefined]);
	if (missingValue.substantive) complaints.push("датчик счёл содержательной непришедшую величину");

	const realMoney = judge("датчик", "сумма против суммы", 9200, 9200, [9200]);
	if (!realMoney.substantive) complaints.push("датчик счёл вырожденным сравнение ненулевых сумм");

	const overpayment = judge("датчик", "переплата против переплаты", -800, -800, [-800]);
	if (!overpayment.substantive) complaints.push("датчик потерял содержательность на отрицательной сумме");

	const isolationOnRealSet = judge("датчик", "чужих строк нет", false, false, [7]);
	if (!isolationOnRealSet.substantive) complaints.push("датчик счёл вырожденной изоляцию на непустом наборе");

	const isolationOnEmptySet = judge("датчик", "чужих строк нет", false, false, [0]);
	if (isolationOnEmptySet.substantive) complaints.push("датчик счёл доказанной изоляцию на пустом наборе");

	const mismatch = judge("датчик", "суммы разошлись", 9200, 9100, [9200]);
	if (mismatch.ok) complaints.push("датчик не заметил расхождения сумм");
	if (!mismatch.substantive) complaints.push("датчик потерял содержательность на расхождении");

	return complaints;
}

/**
 * Итог по содержательности. Отдельной функцией, чтобы число считалось ОДИН раз и
 * из одного места: два независимых подсчёта — это два разных ответа.
 */
function substanceSummary(rows: readonly Claim[]): {
	readonly total: number;
	readonly substantive: number;
	readonly degenerate: readonly Claim[];
	readonly failed: readonly Claim[];
} {
	const substantiveRows = rows.filter((row) => row.substantive);
	return {
		total: rows.length,
		substantive: substantiveRows.length,
		degenerate: rows.filter((row) => !row.substantive),
		failed: substantiveRows.filter((row) => !row.ok),
	};
}

async function buildApp(): Promise<FastifyInstance> {
	const app = Fastify();
	app.addHook("onRequest", async (request) => {
		getRequestIdentity(request);
	});
	await registerDashboardRoutes(app);
	await registerReportRoutes(app);
	await app.ready();
	return app;
}

async function rows(label: string, query: ReturnType<typeof sql>): Promise<Record<string, unknown>[]> {
	const result = await db.execute(query);
	const data = result.rows as Record<string, unknown>[];
	console.log(`\n--- ${label} ---`);
	if (data.length === 0) console.log("(пусто)");
	for (const row of data) console.log(JSON.stringify(row));
	return data;
}

/*
 * ═══════════════════════════════════════════════════════════════════════════
 * СВОЯ КЛИНИКА С ЖИВОЙ ЦЕПОЧКОЙ: ЗАЧЕМ ОНА ЗДЕСЬ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Счётчик содержательности честно печатает «12 из 36», но сам по себе он ничего
 * не гарантирует: данные в живой базе могут снова опустеть, и тогда вернётся
 * молчаливый зелёный — уже с пометкой, но всё равно без доказательства. Поэтому
 * сценарий перестаёт зависеть от того, что кто-то когда-то насеял в живые
 * клиники, и приносит свои данные: запись → приём → позиция лечения → оплата →
 * долг → отчёты, все суммы известны заранее.
 *
 * ПОЧЕМУ НЕ В ЖИВУЮ КЛИНИКУ. «Демо-клиника для снимков» держит 10 позиций
 * лечения и 8 оплат, на которые опираются другие прогоны и снимки; дописать в
 * неё свои строки — сломать чужие ожидания. «Стоматология, 1 кабинет» — рабочая
 * клиника, её данные не мои. Идентификаторы берутся через `fixtureUuid` из имени
 * ЭТОГО файла, поэтому пересечься блоком с другим тестом нельзя: для этого
 * пришлось бы совпасть именем файла (разбор — tests/support/fixtureOrganizations.ts).
 *
 * УБОРКА НА ВХОДЕ И НА ВЫХОДЕ. Прогон, убитый снаружи (Ctrl+C, закрытая труба
 * вида `| head`), до `finally` не доходит и оставляет свои строки в живой базе.
 * Следующий прогон обязан начинать с чистого места, а не наследовать чужой
 * мусор, поэтому уборка идёт и перед посевом.
 *
 * ЧИСЛА ВЫБРАНЫ ТАК, ЧТОБЫ КАЖДОЕ ЗВЕНО БЫЛО НЕНУЛЕВЫМ И ПРОВЕРЯЕМЫМ:
 *
 *   пациент     назначено            оплачено   сальдо
 *   Долгов      5000×2−800 + 800     4000+1000  +5000  ← должник
 *               = 10 000             = 5000
 *   Переплатова 5000                 5800       −800   ← клиника должна ему
 *   Ровнова     5000−500 + 5000      4500       +5000  ← должник, есть незакрытая
 *               = 9 500                                  позиция в статусе proposed
 *
 *   назначено всего            24 500
 *   оплачено (только paid)     15 300
 *   предоплата (planned)        2 500  ← деньгами ещё не является
 *   оплата без визита           1 000  ← к врачу отнести нечем
 *   отменённая позиция          5 000  ← в назначенное не входит по канону
 *
 *   дебиторка по канону        10 000  (5000 + 5000, переплата НЕ вычитается)
 *   возврат по канону             800
 *   не собрано, нетто           9 200  (10 000 − 800) — это и есть число
 *                                       главного экрана
 *
 * Эти три величины РАЗНЫЕ, и именно на них расходились девять формул долга в
 * этом дереве (разбор — money/patientDebt.ts). На пустой клинике все три равны
 * нулю, поэтому их расхождение там не проверяется вообще: ровно то, ради чего
 * нужна своя клиника с деньгами.
 */

/** Пространство фикстур выводится из имени файла, а не назначается вручную. */
const FIXTURE_NAMESPACE = "chainReconProof";

const FIXTURE_ORGANIZATION_ID = fixtureUuid(FIXTURE_NAMESPACE, 1);
const FIXTURE_ORGANIZATION_NAME = "Сверка цепочки — клиника с живой цепочкой";
const FIXTURE_DOCTOR_ID = fixtureUuid(FIXTURE_NAMESPACE, 11);
const FIXTURE_OWNER_ID = fixtureUuid(FIXTURE_NAMESPACE, 12);
const FIXTURE_DEBTOR_ID = fixtureUuid(FIXTURE_NAMESPACE, 21);
const FIXTURE_OVERPAID_ID = fixtureUuid(FIXTURE_NAMESPACE, 22);
const FIXTURE_EVEN_ID = fixtureUuid(FIXTURE_NAMESPACE, 23);
const FIXTURE_SERVICE_TAXED_ID = fixtureUuid(FIXTURE_NAMESPACE, 31);
const FIXTURE_SERVICE_PLAIN_ID = fixtureUuid(FIXTURE_NAMESPACE, 32);

/**
 * Суммы посева. Вынесены в константы, потому что каждая участвует и в записи, и
 * в ожидании: разъехаться им нельзя.
 */
const FIXTURE_UNIT_PRICE = 5000;
const FIXTURE_PLAIN_PRICE = 800;
const FIXTURE_DISCOUNT_TWO_UNITS = 800;
const FIXTURE_DISCOUNT_ONE_UNIT = 500;
const FIXTURE_CANCELLED_LINE = 5000;
const FIXTURE_PLANNED_TOTAL = 24_500;
const FIXTURE_PAID_TOTAL = 15_300;
const FIXTURE_ADVANCE_PLANNED = 2_500;
const FIXTURE_PAID_WITHOUT_VISIT = 1_000;
const FIXTURE_RECEIVABLE = 10_000;
const FIXTURE_REFUND = 800;

/**
 * ПЕРИОД ОТЧЁТОВ — СКОЛЬЗЯЩЕЕ ОКНО, А НЕ ЗАШИТЫЙ 2026 ГОД.
 *
 * Здесь стояло `from=2026-01-01&to=2026-12-31` во всех трёх запросах. Такое
 * окно перестаёт содержать данные посева в первый день 2027 года, и утверждения
 * молча становятся вырожденными — то есть проверка была бы зелёной только часть
 * времени, а это ровно тот класс слабой проверки, который в этом дереве уже
 * ловили. Окно шириной 365 суток (маршрут отвергает шире 400,
 * routes/reports.ts MAX_PERIOD_DAYS) всегда накрывает и посев, и ближайшее
 * расписание.
 */
const REPORT_PERIOD_FROM = new Date(Date.now() - 330 * 86_400_000).toISOString();
const REPORT_PERIOD_TO = new Date(Date.now() + 35 * 86_400_000).toISOString();

/** Приём и визит — двое суток назад: срок долга получается определённым. */
const FIXTURE_VISIT_AT = new Date(Date.now() - 2 * 86_400_000);
/** Оплата — сутки назад: внутри периода при любой дате прогона. */
const FIXTURE_PAID_AT = new Date(Date.now() - 86_400_000);

/**
 * Посев цепочки целиком. Идентификаторы заданы явно, поэтому повторный прогон
 * после уборки даёт побитово те же строки.
 */
async function seedFixtureChain(): Promise<void> {
	await db.insert(organizations).values({ id: FIXTURE_ORGANIZATION_ID, name: FIXTURE_ORGANIZATION_NAME });
	await db.insert(users).values([
		{ id: FIXTURE_DOCTOR_ID, organizationId: FIXTURE_ORGANIZATION_ID, fullName: "Иванов Пётр Сергеевич", role: "doctor" },
		{ id: FIXTURE_OWNER_ID, organizationId: FIXTURE_ORGANIZATION_ID, fullName: "Петрова Анна Ильинична", role: "owner" },
	]);
	await db.insert(patients).values([
		{ id: FIXTURE_DEBTOR_ID, organizationId: FIXTURE_ORGANIZATION_ID, fullName: "Долгов Артём Юрьевич" },
		{ id: FIXTURE_OVERPAID_ID, organizationId: FIXTURE_ORGANIZATION_ID, fullName: "Переплатова Мария Львовна" },
		{ id: FIXTURE_EVEN_ID, organizationId: FIXTURE_ORGANIZATION_ID, fullName: "Ровнова Ольга Дмитриевна" },
	]);
	await db.insert(serviceCatalogItems).values([
		{
			id: FIXTURE_SERVICE_TAXED_ID,
			organizationId: FIXTURE_ORGANIZATION_ID,
			code: "CHAIN-RECON-1",
			title: "Лечение кариеса, сверка цепочки",
			category: "therapy",
			basePriceRub: FIXTURE_UNIT_PRICE,
			priceRub: FIXTURE_UNIT_PRICE,
			taxDeductible: true,
		},
		{
			id: FIXTURE_SERVICE_PLAIN_ID,
			organizationId: FIXTURE_ORGANIZATION_ID,
			code: "CHAIN-RECON-2",
			title: "Прицельный снимок, сверка цепочки",
			category: "imaging",
			basePriceRub: FIXTURE_PLAIN_PRICE,
			priceRub: FIXTURE_PLAIN_PRICE,
			// Не входит в справку для налогового вычета — так проверяется, что
			// дашборд считает к вычету НЕ всё назначенное подряд.
			taxDeductible: false,
		},
	]);

	const appointmentFor = (slot: number, patientId: string, status: "completed" | "cancelled") => ({
		id: fixtureUuid(FIXTURE_NAMESPACE, slot),
		organizationId: FIXTURE_ORGANIZATION_ID,
		patientId,
		doctorUserId: FIXTURE_DOCTOR_ID,
		status,
		startsAt: FIXTURE_VISIT_AT,
		endsAt: new Date(FIXTURE_VISIT_AT.getTime() + 3_600_000),
	});
	await db.insert(appointments).values([
		appointmentFor(41, FIXTURE_DEBTOR_ID, "completed"),
		appointmentFor(42, FIXTURE_OVERPAID_ID, "completed"),
		appointmentFor(43, FIXTURE_EVEN_ID, "completed"),
		// Отменённая запись без приёма: в выручку не идёт, в загрузку врача идёт.
		appointmentFor(44, FIXTURE_DEBTOR_ID, "cancelled"),
	]);

	const visitFor = (slot: number, patientId: string, appointmentSlot: number | null, status: "signed" | "draft") => ({
		id: fixtureUuid(FIXTURE_NAMESPACE, slot),
		organizationId: FIXTURE_ORGANIZATION_ID,
		patientId,
		appointmentId: appointmentSlot === null ? null : fixtureUuid(FIXTURE_NAMESPACE, appointmentSlot),
		status,
		createdAt: FIXTURE_VISIT_AT,
		updatedAt: FIXTURE_VISIT_AT,
		signedAt: status === "signed" ? FIXTURE_VISIT_AT : null,
	});
	await db.insert(visits).values([
		visitFor(51, FIXTURE_DEBTOR_ID, 41, "signed"),
		visitFor(52, FIXTURE_OVERPAID_ID, 42, "signed"),
		visitFor(53, FIXTURE_EVEN_ID, 43, "signed"),
		// Черновик без записи (пациент пришёл без расписания): на нём проверяется,
		// что автосохранение карты приёма вообще работает, а не только отказывает.
		visitFor(54, FIXTURE_DEBTOR_ID, null, "draft"),
	]);

	const itemFor = (options: {
		slot: number;
		patientId: string;
		visitSlot: number;
		serviceId: string;
		title: string;
		quantity: string;
		unitPriceRub: number;
		discountRub: number;
		status: "completed" | "cancelled" | "proposed";
	}) => ({
		id: fixtureUuid(FIXTURE_NAMESPACE, options.slot),
		organizationId: FIXTURE_ORGANIZATION_ID,
		patientId: options.patientId,
		visitId: fixtureUuid(FIXTURE_NAMESPACE, options.visitSlot),
		serviceId: options.serviceId,
		title: options.title,
		quantity: options.quantity,
		unitPriceRub: options.unitPriceRub,
		discountRub: options.discountRub,
		priceRub: Math.max(0, options.unitPriceRub * Number(options.quantity) - options.discountRub),
		status: options.status,
	});
	await db.insert(treatmentItems).values([
		itemFor({
			slot: 61,
			patientId: FIXTURE_DEBTOR_ID,
			visitSlot: 51,
			serviceId: FIXTURE_SERVICE_TAXED_ID,
			title: "Лечение кариеса, сверка цепочки",
			// Количество 2 со скидкой строки: именно здесь расходятся
			// «цена×кол-во − скидка» и «(цена − скидка)×кол-во» — на 800 ₽.
			quantity: "2",
			unitPriceRub: FIXTURE_UNIT_PRICE,
			discountRub: FIXTURE_DISCOUNT_TWO_UNITS,
			status: "completed",
		}),
		itemFor({
			slot: 62,
			patientId: FIXTURE_DEBTOR_ID,
			visitSlot: 51,
			serviceId: FIXTURE_SERVICE_PLAIN_ID,
			title: "Прицельный снимок, сверка цепочки",
			quantity: "1",
			unitPriceRub: FIXTURE_PLAIN_PRICE,
			discountRub: 0,
			status: "completed",
		}),
		itemFor({
			slot: 63,
			patientId: FIXTURE_OVERPAID_ID,
			visitSlot: 52,
			serviceId: FIXTURE_SERVICE_TAXED_ID,
			title: "Лечение кариеса, сверка цепочки",
			quantity: "1",
			unitPriceRub: FIXTURE_UNIT_PRICE,
			discountRub: 0,
			status: "completed",
		}),
		itemFor({
			slot: 64,
			patientId: FIXTURE_EVEN_ID,
			visitSlot: 53,
			serviceId: FIXTURE_SERVICE_TAXED_ID,
			title: "Профгигиена, сверка цепочки",
			quantity: "1",
			unitPriceRub: FIXTURE_UNIT_PRICE,
			discountRub: FIXTURE_DISCOUNT_ONE_UNIT,
			status: "completed",
		}),
		itemFor({
			slot: 65,
			patientId: FIXTURE_DEBTOR_ID,
			visitSlot: 51,
			serviceId: FIXTURE_SERVICE_TAXED_ID,
			title: "Отменённая позиция, сверка цепочки",
			quantity: "1",
			unitPriceRub: FIXTURE_CANCELLED_LINE,
			discountRub: 0,
			status: "cancelled",
		}),
		itemFor({
			slot: 66,
			patientId: FIXTURE_EVEN_ID,
			visitSlot: 53,
			serviceId: FIXTURE_SERVICE_TAXED_ID,
			title: "Предложенное лечение, сверка цепочки",
			quantity: "1",
			unitPriceRub: FIXTURE_UNIT_PRICE,
			discountRub: 0,
			status: "proposed",
		}),
	]);

	await db.insert(payments).values([
		{
			id: fixtureUuid(FIXTURE_NAMESPACE, 71),
			organizationId: FIXTURE_ORGANIZATION_ID,
			patientId: FIXTURE_DEBTOR_ID,
			visitId: fixtureUuid(FIXTURE_NAMESPACE, 51),
			amountRub: 4000,
			status: "paid",
			paidAt: FIXTURE_PAID_AT,
		},
		{
			// Оплата без визита: отнести её к врачу нечем, уходит в «не отнесено».
			id: fixtureUuid(FIXTURE_NAMESPACE, 72),
			organizationId: FIXTURE_ORGANIZATION_ID,
			patientId: FIXTURE_DEBTOR_ID,
			amountRub: FIXTURE_PAID_WITHOUT_VISIT,
			status: "paid",
			paidAt: FIXTURE_PAID_AT,
		},
		{
			id: fixtureUuid(FIXTURE_NAMESPACE, 73),
			organizationId: FIXTURE_ORGANIZATION_ID,
			patientId: FIXTURE_OVERPAID_ID,
			visitId: fixtureUuid(FIXTURE_NAMESPACE, 52),
			amountRub: 5800,
			status: "paid",
			paidAt: FIXTURE_PAID_AT,
		},
		{
			id: fixtureUuid(FIXTURE_NAMESPACE, 74),
			organizationId: FIXTURE_ORGANIZATION_ID,
			patientId: FIXTURE_EVEN_ID,
			visitId: fixtureUuid(FIXTURE_NAMESPACE, 53),
			amountRub: 4500,
			status: "paid",
			paidAt: FIXTURE_PAID_AT,
		},
		{
			// Запланированная предоплата: деньгами ещё не является и долг не гасит.
			id: fixtureUuid(FIXTURE_NAMESPACE, 75),
			organizationId: FIXTURE_ORGANIZATION_ID,
			patientId: FIXTURE_DEBTOR_ID,
			visitId: fixtureUuid(FIXTURE_NAMESPACE, 51),
			amountRub: FIXTURE_ADVANCE_PLANNED,
			status: "planned",
			paidAt: FIXTURE_PAID_AT,
		},
	]);

	console.log(
		`Посев цепочки: клиника «${FIXTURE_ORGANIZATION_NAME}» ${FIXTURE_ORGANIZATION_ID} — ` +
			"3 пациента, 4 записи, 4 приёма, 6 позиций лечения, 5 оплат.",
	);
}

/**
 * Долг по КАНОНУ проекта, а не десятой формулой.
 *
 * Считает `money/patientDebt.ts` — единственный дом этого вопроса; девять
 * расходившихся формул сведены туда коммитом 8062e6d55. Здесь только чтение
 * строк и вызов канона: своей арифметики денег в этом файле нет.
 *
 * Суммы читаются ТЕКСТОМ колонки `numeric`, а не числом: канон отвергает
 * значения, которые уже потеряли точность в плавающей точке, и это его работа —
 * узнать о грязи, а не подтвердить её своей подписью.
 */
async function canonDebt(organizationId: string): Promise<{
	receivableRub: number;
	refundRub: number;
	netUncollectedRub: number;
	debtorCount: number;
	overpaidCount: number;
	chargedRub: number;
	explanation: string;
}> {
	const chargeRows = (
		await db.execute(sql`
			select patient_id::text as patient_id, status::text as status,
			       unit_price_rub::text as unit_price_rub, quantity::text as quantity,
			       discount_rub::text as discount_rub
			  from treatment_items where organization_id = ${organizationId}
		`)
	).rows as { patient_id: string; status: string; unit_price_rub: string; quantity: string; discount_rub: string }[];
	const paymentRows = (
		await db.execute(sql`
			select patient_id::text as patient_id, status::text as status, amount_rub::text as amount_rub
			  from payments where organization_id = ${organizationId}
		`)
	).rows as { patient_id: string; status: string; amount_rub: string }[];

	const ledgers = buildPatientLedgers(
		chargeRows.map((row) => ({
			patientId: row.patient_id,
			status: row.status,
			unitPriceRub: row.unit_price_rub,
			quantity: row.quantity,
			discountRub: row.discount_rub,
		})),
		paymentRows.map((row) => ({ patientId: row.patient_id, status: row.status, amountRub: row.amount_rub })),
	);
	const totals = clinicDebtTotals(ledgers);
	let chargedKopecks = 0;
	for (const ledger of ledgers.values()) chargedKopecks += ledger.chargedKopecks;

	return {
		receivableRub: rublesFromKopecks(totals.receivableKopecks),
		refundRub: rublesFromKopecks(totals.refundLiabilityKopecks),
		netUncollectedRub: rublesFromKopecks(totals.netUncollectedKopecks),
		debtorCount: totals.debtorCount,
		overpaidCount: totals.overpaidCount,
		chargedRub: rublesFromKopecks(chargedKopecks),
		explanation: explainDebtTotals(totals),
	};
}

async function main(): Promise<void> {
	process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";

	console.log("=== ШАГ 0. ОБЪЁМ ДАННЫХ ЦЕПОЧКИ ===");
	await rows(
		"строки таблиц звеньев",
		sql`select
			(select count(*)::int from organizations) as organizations,
			(select count(*)::int from patients) as patients,
			(select count(*)::int from appointments) as appointments,
			(select count(*)::int from visits) as visits,
			(select count(*)::int from visits where appointment_id is not null) as visits_with_appointment,
			(select count(*)::int from visit_diaries) as visit_diaries,
			(select count(*)::int from treatment_items) as treatment_items,
			(select count(*)::int from treatment_plans) as treatment_plans,
			(select count(*)::int from treatment_plan_items_new) as plan_items_new,
			(select count(*)::int from payments) as payments,
			(select count(*)::int from generated_documents) as documents,
			(select count(*)::int from cash_ledger) as cash_ledger`,
	);

	await rows(
		"позиции лечения по статусу и связи с приёмом",
		sql`select status::text as status,
		       count(*)::int as items,
		       count(*) filter (where visit_id is null)::int as without_visit,
		       count(*) filter (where quantity <> round(quantity))::int as fractional_quantity,
		       sum(greatest(unit_price_rub * greatest(quantity, 1) - discount_rub, 0))::numeric(12,2) as planned_sql,
		       sum(price_rub)::numeric(12,2) as price_rub_column
		  from treatment_items
		 group by status
		 order by status`,
	);

	await rows(
		"платежи по статусу и способу, связь с приёмом",
		sql`select status::text as status, method::text as method,
		       count(*)::int as n,
		       count(*) filter (where visit_id is null)::int as without_visit,
		       sum(amount_rub)::numeric(12,2) as amount_rub
		  from payments
		 group by status, method
		 order by status, method`,
	);

	await rows(
		"приёмы по статусу",
		sql`select status::text as status, count(*)::int as n from appointments group by status order by status`,
	);
	await rows(
		"визиты по статусу",
		sql`select status::text as status, count(*)::int as n from visits group by status order by status`,
	);

	console.log("\n=== ШАГ 1. РАЗРЫВ «ПИШЕМ В ОДНУ ТАБЛИЦУ, ЧИТАЕМ ИЗ ДРУГОЙ» ===");
	await rows(
		"план из odontogram (treatment_plan_items_new) против денежной таблицы (treatment_items)",
		sql`select
			(select count(*)::int from treatment_plan_items_new) as plan_items_new,
			(select count(*)::int from treatment_plan_items_new where organization_id is null) as plan_items_new_without_org,
			(select coalesce(sum(greatest(price * quantity - discount, 0)), 0)::numeric(12,2) from treatment_plan_items_new) as plan_items_new_sum,
			(select count(*)::int from treatment_items) as treatment_items,
			(select coalesce(sum(greatest(unit_price_rub * greatest(quantity,1) - discount_rub, 0)), 0)::numeric(12,2) from treatment_items) as treatment_items_sum`,
	);
	await rows(
		"строки «Выполнено:» в тексте плана приёма — читаемы человеком, не программой",
		sql`select count(*)::int as visits_with_done_text
		      from visits
		     where treatment_plan like '%Выполнено:%'`,
	);

	console.log("\n=== ШАГ 2. СВЕРКА ДЕНЕГ ПО КАЖДОЙ КЛИНИКЕ ===");
	const orgs = (await db.execute(sql`select id::text as id, name from organizations order by name`))
		.rows as { id: string; name: string }[];

	const app = await buildApp();
	try {
		for (const org of orgs) {
			console.log(`\n########## КЛИНИКА «${org.name}» (${org.id}) ##########`);

			// Независимый SQL: три разные формулы «назначено».
			const totals = (
				await db.execute(sql`
					select
					  (select coalesce(sum(greatest(unit_price_rub * greatest(quantity,1) - discount_rub, 0)),0)::numeric(12,2)
					     from treatment_items where organization_id = ${org.id} and status <> 'cancelled') as planned_sql_greatest,
					  (select coalesce(sum(greatest(unit_price_rub * round(greatest(quantity,1)) - discount_rub, 0)),0)::numeric(12,2)
					     from treatment_items where organization_id = ${org.id} and status <> 'cancelled') as planned_dashboard_rounded,
					  (select coalesce(sum(greatest(unit_price_rub * greatest(quantity,1) - discount_rub, 0)),0)::numeric(12,2)
					     from treatment_items where organization_id = ${org.id} and status = 'completed') as planned_completed_only,
					  (select coalesce(sum(amount_rub),0)::numeric(12,2)
					     from payments where organization_id = ${org.id} and status = 'paid') as paid_sql,
					  (select coalesce(sum(amount_rub),0)::numeric(12,2)
					     from payments where organization_id = ${org.id} and status = 'planned') as advance_planned_sql,
					  (select coalesce(sum(amount_rub),0)::numeric(12,2)
					     from payments where organization_id = ${org.id} and status = 'paid' and visit_id is null) as paid_without_visit,
					  (select coalesce(sum(amount_rub),0)::numeric(12,2)
					     from payments p where p.organization_id = ${org.id} and p.status = 'paid'
					       and exists (select 1 from visits v join appointments a on a.id = v.appointment_id
					                    where v.id = p.visit_id and a.doctor_user_id is not null)) as paid_attributable_to_doctor
				`)
			).rows[0] as Record<string, unknown>;
			console.log(`SQL напрямую: ${JSON.stringify(totals)}`);

			const clinicToken = signToken({ organizationId: org.id }, authTokenSecret());
			const staffToken = signToken(
				{ organizationId: org.id, userId: "00000000-0000-0000-0000-000000000000", role: "owner" },
				authTokenSecret(),
			);

			/**
			 * Долг главного экрана, вынесенный из блока дашборда: ниже он сверяется с
			 * дебиторкой отчёта, и разница между ними обязана равняться переплатам —
			 * это то самое расхождение двух экранов, из-за которого администратор
			 * называл пациенту сумму, которой нет на главном экране.
			 */
			let dashboardDueRub: number | null = null;

			const dashboardResponse = await app.inject({
				method: "GET",
				url: "/api/dashboard",
				headers: { "x-dente-clinic-token": clinicToken },
			});
			if (dashboardResponse.statusCode !== 200) {
				console.log(`ПРОВАЛ /api/dashboard HTTP ${dashboardResponse.statusCode}: ${dashboardResponse.body.slice(0, 300)}`);
			} else {
				const dashboard = JSON.parse(dashboardResponse.body);
				console.log(`/api/dashboard billingSummary: ${JSON.stringify(dashboard.billingSummary)}`);
				console.log(
					`/api/dashboard activeVisit: id=${dashboard.activeVisit?.id} пациент=${dashboard.activeVisit?.patientId} ` +
						`статус=${dashboard.activeVisit?.status} запись=${dashboard.activeVisit?.appointmentId}`,
				);
				console.log(
					`/api/dashboard коллекции: позиций плана ${dashboard.treatmentPlanItems?.length ?? "нет"}, ` +
						`оплат ${dashboard.payments?.length ?? "нет"}, приёмов ${dashboard.appointments?.length ?? "нет"}, ` +
						`пациентов ${dashboard.patients?.length ?? "нет"}, прайс ${dashboard.serviceCatalog?.length ?? "нет"}`,
				);
				/*
				 * ОТСЮДА И НИЖЕ ЧИСЛА СРАВНИВАЮТСЯ, А НЕ ПЕЧАТАЮТСЯ РЯДОМ.
				 *
				 * Раньше здесь стояли три строки «СВЕРКА: … vs …»: два числа в одной
				 * строке и ни одного сравнения. На пустой клинике они печатали
				 * «0 vs 0» и выглядели подтверждением; на непустой они бы разошлись
				 * молча. Ожидание берётся из независимого SQL, а не зашивается
				 * числом: утверждение, зашитое под сегодняшние данные, краснеет в
				 * день, когда данные меняются, и его выключают.
				 */
				const summary = dashboard.billingSummary ?? {};
				same(
					org.name,
					"назначено дашборд = SQL по позициям (количество округлено, как считает дашборд)",
					money(summary.totalPlannedRub),
					money(totals.planned_dashboard_rounded),
					[money(summary.totalPlannedRub), money(totals.planned_dashboard_rounded)],
				);
				same(
					org.name,
					"оплачено дашборд = SQL по оплатам в статусе paid",
					money(summary.totalPaidRub),
					money(totals.paid_sql),
					[money(summary.totalPaidRub), money(totals.paid_sql)],
				);
				/*
				 * Долг главного экрана — НЕТТО ПО КЛИНИКЕ с зажимом в нуле
				 * (sampleData.ts, buildBillingSummary: `Math.max(0, назначено −
				 * оплачено)`). Это законная величина «сколько ещё не собрано», но она
				 * НЕ равна дебиторке: переплата одного пациента гасит долг другого.
				 * Разбор — money/patientDebt.ts. Здесь сверяется именно та формула,
				 * которую экран считает, иначе утверждение краснело бы на верном коде.
				 */
				const netUncollected = money(
					Math.max(0, money(totals.planned_dashboard_rounded) - money(totals.paid_sql)),
				);
				same(
					org.name,
					"долг дашборд = назначено − оплачено, зажатое нулём (нетто по клинике)",
					money(summary.totalDueRub),
					netUncollected,
					[money(summary.totalDueRub), netUncollected],
				);
				dashboardDueRub = money(summary.totalDueRub);
				console.log(
					`справка: сумма только по completed=${money(totals.planned_completed_only)} — ` +
						"дашборд в totalDueRub её НЕ использует, берёт все не отменённые.",
				);
				const insights = dashboard.patientInsights ?? [];
				const insightDebt = money(
					insights.reduce((sum: number, row: { balanceDueRub?: unknown }) => sum + money(row.balanceDueRub), 0),
				);
				console.log(`patientInsights: строк ${insights.length}, сумма balanceDueRub=${insightDebt}`);
				same(
					org.name,
					"пациентов в patientInsights = пациентов в картотеке дашборда",
					insights.length,
					dashboard.patients?.length ?? 0,
					[insights.length, dashboard.patients?.length ?? 0],
				);
			}

			const receivablesResponse = await app.inject({
				method: "GET",
				url: "/api/reports/receivables",
				headers: { "x-dente-staff-token": staffToken },
			});
			if (receivablesResponse.statusCode !== 200) {
				console.log(`ПРОВАЛ /api/reports/receivables HTTP ${receivablesResponse.statusCode}: ${receivablesResponse.body.slice(0, 300)}`);
			} else {
				const receivables = JSON.parse(receivablesResponse.body);
				console.log(
					`/api/reports/receivables: должников ${receivables.rows?.length ?? 0}, ` +
						`итог долга=${money(receivables.totalDebtRub)}, корзины=${JSON.stringify(receivables.byBucket)}`,
				);
				for (const row of (receivables.rows ?? []).slice(0, 10)) {
					console.log(`   ${row.patientName}: ${money(row.debtRub)} ₽ (${row.bucket}, с ${row.oldestChargeAt})`);
				}
				/*
				 * Две внутренние сходимости отчёта дебиторки. Обе не зависят ни от
				 * периода, ни от даты прогона: корзины — это разбиение тех же строк по
				 * сроку, а итог — их сумма. Именно поэтому они годятся в утверждения:
				 * ожидание считается из того же ответа, а не зашито под сегодняшнюю
				 * базу.
				 */
				const debtRows = (receivables.rows ?? []) as { debtRub?: unknown }[];
				const rowsDebt = money(debtRows.reduce((sum, row) => sum + money(row.debtRub), 0));
				const bucketDebt = money(
					Object.values((receivables.byBucket ?? {}) as Record<string, unknown>).reduce(
						(sum: number, value) => sum + money(value),
						0,
					),
				);
				same(org.name, "сумма долгов по строкам = итог дебиторки", rowsDebt, money(receivables.totalDebtRub), [
					rowsDebt,
					money(receivables.totalDebtRub),
				]);
				same(org.name, "сумма корзин по сроку = итог дебиторки", bucketDebt, money(receivables.totalDebtRub), [
					bucketDebt,
					money(receivables.totalDebtRub),
				]);
				same(
					org.name,
					"должников в отчёте = строк с положительным долгом",
					receivables.rows?.length ?? 0,
					debtRows.filter((row) => money(row.debtRub) > 0).length,
					[receivables.rows?.length ?? 0, debtRows.length],
				);

				/*
				 * СВЕРКА С КАНОНОМ ДОЛГА, а не с десятой формулой. Считает
				 * money/patientDebt.ts — единственный дом этого вопроса. Смысл
				 * утверждений: отчёт дебиторки обязан совпасть с каноном до копейки,
				 * потому что канон из него и выведен, а главный экран обязан
				 * отличаться РОВНО на переплаты — и это отличие называется числом, а
				 * не замалчивается.
				 */
				const canon = await canonDebt(org.id);
				console.log(`канон долга (money/patientDebt.ts): ${canon.explanation}`);
				same(org.name, "назначено по канону = SQL по позициям", canon.chargedRub, money(totals.planned_sql_greatest), [
					canon.chargedRub,
					money(totals.planned_sql_greatest),
				]);
				same(org.name, "дебиторка отчёта = дебиторка по канону", money(receivables.totalDebtRub), canon.receivableRub, [
					money(receivables.totalDebtRub),
					canon.receivableRub,
				]);
				same(org.name, "переплата отчёта = возврат по канону", money(receivables.totalPrepaidRub), canon.refundRub, [
					money(receivables.totalPrepaidRub),
					canon.refundRub,
				]);
				same(org.name, "должников в отчёте = должников по канону", receivables.rows?.length ?? 0, canon.debtorCount, [
					receivables.rows?.length ?? 0,
					canon.debtorCount,
				]);
				same(
					org.name,
					"переплативших в отчёте = переплативших по канону",
					receivables.prepayments?.length ?? 0,
					canon.overpaidCount,
					[receivables.prepayments?.length ?? 0, canon.overpaidCount],
				);
				if (dashboardDueRub !== null) {
					const screenGap = money(money(receivables.totalDebtRub) - dashboardDueRub);
					console.log(
						`РАСХОЖДЕНИЕ ДВУХ ЭКРАНОВ: дебиторка ${money(receivables.totalDebtRub)} − долг главного экрана ` +
							`${dashboardDueRub} = ${screenGap}; переплаты пациентов ${canon.refundRub}. ` +
							"Это не дефект расчёта, а две разные величины: главный экран считает нетто по клинике одним " +
							"вычитанием, поэтому переплата одного пациента гасит долг другого.",
					);
					same(org.name, "разница дебиторки и главного экрана = переплаты пациентов", screenGap, canon.refundRub, [
						money(receivables.totalDebtRub),
						dashboardDueRub,
						canon.refundRub,
					]);
				}
			}

			/**
			 * Вся выручка периода, как её видит отчёт по врачам: отнесённая плюс
			 * неотнесённая. Считается здесь, а сверяется ниже с динамикой выручки —
			 * это два независимых запроса с ОДНИМ периодом, поэтому их итоги обязаны
			 * совпасть до копейки. Утверждение не зависит ни от даты прогона, ни от
			 * того, сколько строк лежит в базе.
			 */
			let doctorsPeriodRevenue: number | null = null;

			const doctorsResponse = await app.inject({
				method: "GET",
				url: `/api/reports/doctors?from=${REPORT_PERIOD_FROM}&to=${REPORT_PERIOD_TO}`,
				headers: { "x-dente-staff-token": staffToken },
			});
			if (doctorsResponse.statusCode !== 200) {
				console.log(`ПРОВАЛ /api/reports/doctors HTTP ${doctorsResponse.statusCode}: ${doctorsResponse.body.slice(0, 300)}`);
			} else {
				const doctors = JSON.parse(doctorsResponse.body);
				console.log(
					`/api/reports/doctors: строк ${doctors.rows?.length ?? 0}, не отнесено к врачу=${money(doctors.unattributedRevenueRub)}`,
				);
				console.log(`   примечание: ${doctors.attributionNote}`);
				for (const row of doctors.rows ?? []) {
					console.log(`   ${row.doctorName}: выручка=${money(row.revenueRub)}, приёмов=${row.appointmentsTotal}, завершено=${row.appointmentsCompleted}`);
				}
				const doctorRows = (doctors.rows ?? []) as { revenueRub?: unknown }[];
				const attributed = money(doctorRows.reduce((sum, row) => sum + money(row.revenueRub), 0));
				doctorsPeriodRevenue = money(attributed + money(doctors.unattributedRevenueRub));
			}

			const servicesResponse = await app.inject({
				method: "GET",
				url: `/api/reports/services?from=${REPORT_PERIOD_FROM}&to=${REPORT_PERIOD_TO}`,
				headers: { "x-dente-staff-token": staffToken },
			});
			if (servicesResponse.statusCode !== 200) {
				console.log(`ПРОВАЛ /api/reports/services HTTP ${servicesResponse.statusCode}: ${servicesResponse.body.slice(0, 300)}`);
			} else {
				const services = JSON.parse(servicesResponse.body);
				console.log(
					`/api/reports/services: строк ${services.rows?.length ?? 0}, назначено итого=${money(services.plannedTotalRub)}`,
				);
			}

			const revenueResponse = await app.inject({
				method: "GET",
				url: `/api/reports/revenue?from=${REPORT_PERIOD_FROM}&to=${REPORT_PERIOD_TO}&granularity=month`,
				headers: { "x-dente-staff-token": staffToken },
			});
			if (revenueResponse.statusCode !== 200) {
				console.log(`ПРОВАЛ /api/reports/revenue HTTP ${revenueResponse.statusCode}: ${revenueResponse.body.slice(0, 300)}`);
			} else {
				const revenue = JSON.parse(revenueResponse.body);
				console.log(`/api/reports/revenue: точек ${revenue.points?.length ?? 0}, итог=${money(revenue.totalRub)}`);
				if (doctorsPeriodRevenue !== null) {
					same(
						org.name,
						"выручка динамики = выручка врачей плюс не отнесённая (тот же период)",
						money(revenue.totalRub),
						doctorsPeriodRevenue,
						[money(revenue.totalRub), doctorsPeriodRevenue],
					);
				}
				const revenuePoints = (revenue.points ?? []) as { revenueRub?: unknown }[];
				const pointsTotal = money(revenuePoints.reduce((sum, row) => sum + money(row.revenueRub), 0));
				same(org.name, "сумма точек динамики = итог динамики", pointsTotal, money(revenue.totalRub), [
					pointsTotal,
					money(revenue.totalRub),
				]);
			}
		}
	} finally {
		await app.close();
	}

	console.log("\n=== ШАГ 3. ПОПАРНАЯ СВЕРКА ПО ПАЦИЕНТАМ (назначено/оплачено/долг) ===");
	await rows(
		"пациенты, у которых числа расходятся между формулами",
		sql`with planned as (
			  select patient_id, organization_id,
			         sum(greatest(unit_price_rub * greatest(quantity,1) - discount_rub, 0))::numeric(12,2) as planned_greatest,
			         sum(greatest(unit_price_rub * round(greatest(quantity,1)) - discount_rub, 0))::numeric(12,2) as planned_rounded,
			         sum(greatest(unit_price_rub * greatest(quantity,1) - discount_rub, 0)) filter (where status = 'completed')::numeric(12,2) as planned_completed
			    from treatment_items where status <> 'cancelled'
			   group by patient_id, organization_id
			), paid as (
			  select patient_id, sum(amount_rub)::numeric(12,2) as paid_rub
			    from payments where status = 'paid' group by patient_id
			), advance as (
			  select patient_id, sum(amount_rub)::numeric(12,2) as advance_rub
			    from payments where status = 'planned' group by patient_id
			)
			select p.full_name,
			       pl.planned_greatest, pl.planned_rounded, pl.planned_completed,
			       coalesce(pd.paid_rub, 0) as paid_rub,
			       coalesce(ad.advance_rub, 0) as advance_rub,
			       (pl.planned_greatest - coalesce(pd.paid_rub, 0))::numeric(12,2) as debt_receivables,
			       (pl.planned_rounded - coalesce(pd.paid_rub, 0))::numeric(12,2) as debt_dashboard
			  from planned pl
			  join patients p on p.id = pl.patient_id
			  left join paid pd on pd.patient_id = pl.patient_id
			  left join advance ad on ad.patient_id = pl.patient_id
			 order by pl.planned_greatest desc
			 limit 25`,
	);

	await rows(
		"оплаты пациентов, у которых нет ни одной позиции лечения — долг отрицательный, отчёт их не покажет",
		sql`select p.full_name, sum(pay.amount_rub)::numeric(12,2) as paid_rub, count(*)::int as payments
		      from payments pay
		      join patients p on p.id = pay.patient_id
		     where pay.status = 'paid'
		       and not exists (select 1 from treatment_items ti where ti.patient_id = pay.patient_id and ti.status <> 'cancelled')
		     group by p.full_name
		     order by paid_rub desc
		     limit 15`,
	);

	console.log("\n=== ШАГ 4. ОТКРЫТИЕ ПРИЁМА: МАРШРУТЫ ЧЕРНОВИКА ПРОТИВ ЖИВОГО activeVisit ===");
	const visitApp = Fastify();
	visitApp.addHook("onRequest", async (request) => {
		getRequestIdentity(request);
	});
	await registerVisitRoutes(visitApp);
	await visitApp.ready();
	try {
		for (const org of orgs) {
			const live = (
				await db.execute(sql`
					select id::text as id, patient_id::text as patient_id, status::text as status
					  from visits
					 where organization_id = ${org.id}
					 order by (status = 'draft') desc, updated_at desc
					 limit 1
				`)
			).rows[0] as { id: string; patient_id: string; status: string } | undefined;
			if (!live) {
				console.log(`\n«${org.name}»: приёмов в базе нет вовсе — карту приёма открывать не на чем.`);
				continue;
			}
			console.log(`\n«${org.name}»: дашборд подставит визит ${live.id} статус=${live.status}`);
			const clinicToken = signToken({ organizationId: org.id }, authTokenSecret());
			const get = await visitApp.inject({
				method: "GET",
				url: `/api/visits/${live.id}/draft/autosave`,
				headers: { "x-dente-clinic-token": clinicToken },
			});
			console.log(`  GET  /api/visits/${live.id}/draft/autosave -> HTTP ${get.statusCode} ${get.body.slice(0, 220)}`);
			const put = await visitApp.inject({
				method: "PUT",
				url: `/api/visits/${live.id}/draft/autosave`,
				headers: { "x-dente-clinic-token": clinicToken, "content-type": "application/json" },
				payload: {
					patientId: live.patient_id,
					selectedSpecialty: "therapist",
					transcript: "разведка цепочки: попытка автосохранения черновика",
					draft: {
						warnings: [],
						complaint: "проверка",
						anamnesis: "",
						objectiveStatus: "",
						diagnosis: "",
						treatmentPlan: "",
					},
				},
			});
			console.log(`  PUT  автосохранение -> HTTP ${put.statusCode} ${put.body.slice(0, 260)}`);
			if (put.statusCode === 200) {
				console.log("  ВНИМАНИЕ: автосохранение прошло — значит визит был черновиком, состояние базы изменено этим шагом.");
			}
		}
	} finally {
		await visitApp.close();
	}

	console.log("\nГОТОВО. Единственная возможная запись по живым клиникам — PUT автосохранения выше, и он отвечает отказом на подписанном визите.");
}

/**
 * Итог прогона. Возвращает число нарушений, а не печатает приговор в одиночку:
 * решение о коде возврата принимает вызывающий, у которого на руках ещё и
 * результат уборки.
 */
function printVerdict(extraViolations: readonly string[]): number {
	/*
	 * ═══════════════════════════════════════════════════════════════════════
	 * ИТОГ: СКОЛЬКО УТВЕРЖДЕНИЙ ВООБЩЕ БЫЛО И СКОЛЬКО ИЗ НИХ ЧТО-ТО ЗНАЧИЛИ
	 * ═══════════════════════════════════════════════════════════════════════
	 *
	 * Вырожденные утверждения печатаются ПОИМЁННО и с названием клиники. Молчать
	 * о них нельзя: это единственное место, где видно, что прогон по конкретной
	 * клинике ничего не подтвердил.
	 *
	 * ПОЧЕМУ ВЫРОЖДЕНИЕ НЕ СЧИТАЕТСЯ НАРУШЕНИЕМ. Пустая клиника — законное
	 * состояние клиники, а не дефект кода. Страж, кричащий на верном коде, будет
	 * выключен: в этом дереве так уже случилось трижды. Поэтому вырождение — это
	 * ПРОБЕЛ В ДОКАЗАТЕЛЬСТВЕ, он называется числом и именем, а нарушением
	 * объявляется только несошедшееся утверждение, у которого было что сверять,
	 * и поломка самого датчика.
	 */
	const sensorComplaints = proveSubstanceSensorFires();
	console.log("\n===== ПРОВЕРКА ДАТЧИКА СОДЕРЖАТЕЛЬНОСТИ (на заданных числах, без базы) =====");
	if (sensorComplaints.length === 0) {
		console.log(
			"датчик исправен: ноль против нуля и пустота против пустоты названы вырождением, " +
				"ненулевые суммы — содержательными, расхождение опознано.",
		);
	} else {
		for (const complaint of sensorComplaints) console.log(`ПРОВАЛ ДАТЧИКА: ${complaint}`);
	}

	const verdict = substanceSummary(claims);
	console.log("\n===== ИТОГ СВЕРКИ =====");
	console.log(`утверждений всего: ${verdict.total}`);
	console.log(`из них содержательных: ${verdict.substantive}`);
	console.log(`вырожденных (сравнивался ноль с нулём): ${verdict.degenerate.length}`);
	if (verdict.degenerate.length > 0) {
		console.log("вырожденные утверждения — НЕ подтверждение, перечислены полностью:");
		for (const claim of verdict.degenerate) {
			console.log(`  «${claim.clinic}» — ${claim.label}`);
		}
		const byClinic = new Map<string, number>();
		for (const claim of verdict.degenerate) byClinic.set(claim.clinic, (byClinic.get(claim.clinic) ?? 0) + 1);
		for (const [clinic, count] of byClinic) {
			const all = claims.filter((claim) => claim.clinic === clinic).length;
			console.log(
				`  ИТОГ ПО КЛИНИКЕ «${clinic}»: ${count} из ${all} утверждений не подтверждают ничего — ` +
					"в ней нет данных для этих звеньев цепочки.",
			);
		}
	}
	for (const claim of verdict.failed) {
		console.log(`ПРОВАЛ «${claim.clinic}» — ${claim.label}: ${JSON.stringify(claim.actual)} против ${JSON.stringify(claim.expected)}`);
	}

	for (const complaint of extraViolations) console.log(`НАРУШЕНИЕ: ${complaint}`);

	const violations = verdict.failed.length + sensorComplaints.length + extraViolations.length;
	console.log(
		`\nИТОГ: СОДЕРЖАТЕЛЬНЫХ УТВЕРЖДЕНИЙ: ${verdict.substantive} из ${verdict.total}; ` +
			`вырожденных ${verdict.degenerate.length}; РАСХОЖДЕНИЙ на содержательных ${verdict.failed.length}; ` +
			`НАРУШЕНИЙ: ${violations}`,
	);
	return violations;
}

/**
 * Уборка своей клиники и НЕЗАВИСИМАЯ проверка, что от неё не осталось строк.
 *
 * Проверка отдельным запросом, а не доверием к уборке: `purgeFixtureOrganizations`
 * идёт по каталогу базы и бросает исключение сама, но тихо оставленный мусор в
 * следующем прогоне читается как данные клиники, поэтому остаток называется
 * числом. Маркер `[УТЕЧКА]` ставится сознательно — прогон сквозных сценариев
 * читает его как заявленное нарушение.
 */
async function purgeFixtureAndProve(): Promise<string[]> {
	const complaints: string[] = [];
	try {
		await purgeFixtureOrganizations([FIXTURE_ORGANIZATION_ID]);
	} catch (error) {
		complaints.push(`уборка своей клиники не завершилась: ${error instanceof Error ? error.message : String(error)}`);
	}
	const leftovers = (
		await db.execute(sql`
			select
			  (select count(*)::int from organizations where id = ${FIXTURE_ORGANIZATION_ID}::uuid) as organizations,
			  (select count(*)::int from patients where organization_id = ${FIXTURE_ORGANIZATION_ID}::uuid) as patients,
			  (select count(*)::int from users where organization_id = ${FIXTURE_ORGANIZATION_ID}::uuid) as users,
			  (select count(*)::int from appointments where organization_id = ${FIXTURE_ORGANIZATION_ID}::uuid) as appointments,
			  (select count(*)::int from visits where organization_id = ${FIXTURE_ORGANIZATION_ID}::uuid) as visits,
			  (select count(*)::int from treatment_items where organization_id = ${FIXTURE_ORGANIZATION_ID}::uuid) as treatment_items,
			  (select count(*)::int from payments where organization_id = ${FIXTURE_ORGANIZATION_ID}::uuid) as payments,
			  (select count(*)::int from service_catalog_items where organization_id = ${FIXTURE_ORGANIZATION_ID}::uuid) as prices
		`)
	).rows[0] as Record<string, unknown>;
	console.log(`\nостатки своей клиники после уборки (обязаны быть нулями): ${JSON.stringify(leftovers)}`);
	for (const [table, count] of Object.entries(leftovers ?? {})) {
		if (Number(count) !== 0) {
			console.log(`[УТЕЧКА] уборка оставила ${count} строк в ${table} по клинике ${FIXTURE_ORGANIZATION_ID}`);
			complaints.push(`уборка оставила ${count} строк в ${table}`);
		}
	}
	return complaints;
}

/**
 * Порядок работы: уборка следов прошлого прогона → посев своей цепочки → сверка
 * → уборка → приговор.
 *
 * Уборка ДО посева обязательна: прогон, убитый снаружи, до `finally` не доходит,
 * и его строки остались бы в живой базе. Приговор печатается ПОСЛЕ уборки,
 * потому что остаток строк — тоже нарушение и обязан попасть в тот же счёт.
 */
async function run(): Promise<void> {
	const cleanupComplaints: string[] = [];
	try {
		await purgeFixtureOrganizations([FIXTURE_ORGANIZATION_ID]);
		await seedFixtureChain();
		await main();
	} finally {
		cleanupComplaints.push(...(await purgeFixtureAndProve()));
	}
	const violations = printVerdict(cleanupComplaints);
	await pool.end();
	if (violations > 0) process.exitCode = 1;
}

run().catch(async (error) => {
	console.error(error);
	/*
	 * Падение посреди прогона не имеет права оставить свою клинику в живой базе:
	 * следующий прогон прочитал бы её как данные клиники. Уборка на входе это
	 * подметёт, но подметать надо и здесь — на чужой базе входа может и не быть.
	 */
	try {
		await purgeFixtureOrganizations([FIXTURE_ORGANIZATION_ID]);
		console.log("своя клиника убрана после падения прогона");
	} catch (cleanupError) {
		console.log(`[УТЕЧКА] своя клиника осталась в базе: ${cleanupError instanceof Error ? cleanupError.message : String(cleanupError)}`);
	}
	try {
		await pool.end();
	} catch {
		// Пул мог не открыться вовсе — тогда закрывать нечего.
	}
	process.exitCode = 1;
});
