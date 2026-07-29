/**
 * СВЕРКА ЦЕПОЧКИ: запись -> приём -> выполненные услуги -> сумма -> оплата ->
 * долг -> отчёты. Приложение поднимается в СВОЁМ процессе (app.inject), потому
 * что общий сервер разработки на 4100 отдаёт устаревший код.
 *
 * ЧТО ЗДЕСЬ ИЗМЕНИЛОСЬ И ПОЧЕМУ ЭТО ВАЖНО ЗНАТЬ ДО ЧТЕНИЯ КОДА.
 *
 * Файл назывался «РАЗВЕДКА» и обещал «ТОЛЬКО ЧТЕНИЕ: ни одной вставки». Первое
 * было правдой в худшем смысле: он ничего не сравнивал, а печатал два числа
 * рядом — «назначено дашборд=0 vs SQL=0» — и шёл дальше. По пустой клинике такой
 * прогон зелёный ПРИ ЛЮБОМ состоянии кода. Второе было неправдой уже тогда: шаг
 * с автосохранением карты приёма писал в живой визит, если тот оказывался
 * черновиком, и файл сам это печатал словами «состояние базы изменено этим
 * шагом».
 *
 * ТЕПЕРЬ: числа СРАВНИВАЮТСЯ, у каждого утверждения названа величина, на которой
 * оно стоит, и сравнение нуля с нулём в пройденные не идёт вовсе. Сценарий сеет
 * СВОЮ клинику с полной цепочкой и известными суммами, поэтому не зависит от
 * того, что лежит в живых клиниках. Живые клиники по-прежнему только читаются:
 * единственная запись — автосохранение СВОЕГО черновика.
 *
 * ЗАПУСК (cwd apps/api):
 *   node --import tsx src/tests/routes/chainReconProof.ts
 *
 * Проверка датчика на пустоте (обязана заявить нарушения и выйти с кодом 1):
 *   DENTE_CHAIN_RECON_EMPTY_FIXTURE=1 node --import tsx src/tests/routes/chainReconProof.ts
 *
 * Не тест: имя без `.test.ts`, `npm test` его не подхватывает; запускает его
 * `node scripts/run-chain-proofs.mjs`. Проверкой типов файл ОХВАЧЕН — через
 * `tsconfig.tests.json` (`npm run typecheck:tests -w @dental/api`). Прежняя
 * строка здесь утверждала обратное: «каталог src/tests исключён из tsconfig,
 * поэтому файл не участвует в общем typecheck». Это устарело вместе с появлением
 * второго конфига, и такую строку читают как разрешение не гонять компилятор.
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
	debtNumericText,
	explainDebtTotals,
	type Kopecks,
	rublesFromKopecks,
	toKopecks,
} from "../../money/patientDebt.js";
import { registerDashboardRoutes } from "../../routes/dashboard.js";
import { registerReportRoutes } from "../../routes/reports.js";
import { registerVisitRoutes } from "../../routes/visits.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { getRequestIdentity } from "../../security/identity.js";
import { fixtureUuid, purgeFixtureOrganizations } from "../support/fixtureOrganizations.js";
import { signToken } from "../../utils/cryptoHelper.js";

/*
 * ═══════════════════════════════════════════════════════════════════════════
 * ДЕНЬГИ В ЭТОМ ФАЙЛЕ СЧИТАЮТСЯ В ЦЕЛЫХ КОПЕЙКАХ, А НЕ ОКРУГЛЯЮТСЯ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Здесь стояло `Math.round(Number(value ?? 0) * 100) / 100`. Для сравнения двух
 * сумм это не безобидное приведение, а ГЛУШИТЕЛЬ: он молча признаёт
 * `3491.4900000000002` за `3491.49`, то есть скрывает ровно тот класс дефекта,
 * ради поиска которого сквозная сверка и написана. В этом дереве такой приём уже
 * отвергали (`money/patientDebt.ts`, `kopecksFromRubles`), а здесь он к тому же
 * стоял НА САМОМ ДАТЧИКЕ и был для него несущим: разница двух экранов
 * `53001.49 − 51403.48` в плавающей точке даёт `1598.0099999999948`, и
 * утверждение проходило только потому, что округление приводило её к `1598.01`.
 *
 * Теперь любая сумма превращается в целые копейки общим домом денег
 * (`toKopecks`), суммирование и вычитание идут в копейках, и обратно в рубли
 * значение переводится ОДИН раз — только чтобы напечатать его человеку и сравнить
 * с рублёвым ожиданием. Грязь ниже копейки больше не сглаживается: она поднимает
 * исключение, потому что сумма, потерявшая точность, — это находка, а не помеха.
 */

/** Копейки из суммы маршрута или колонки `numeric`. Грязь — отказ, не округление. */
function moneyKopecks(value: unknown): Kopecks {
	/*
	 * Непришедшее поле остаётся нулём — так было и раньше (`value ?? 0`), и менять
	 * это здесь нельзя: пустая клиника законно отдаёт нули, а отсутствие поля ловят
	 * отдельные утверждения о числе строк плюс датчик вырождения. Отказ здесь
	 * означал бы падение прогона на законных данных.
	 */
	if (value === null || value === undefined) return 0;
	if (typeof value !== "number" && typeof value !== "string") {
		throw new TypeError(
			`сумма пришла типом ${typeof value}: ожидалось число рублей или текст колонки numeric`,
		);
	}
	return toKopecks(value, "сумма сверки");
}

/** Точные рубли из суммы: для печати и сравнения с рублёвым ожиданием. */
function money(value: unknown): number {
	return rublesFromKopecks(moneyKopecks(value));
}

/** Сумма нескольких сумм — в копейках, поэтому итог РАВЕН сумме частей. */
function sumMoneyKopecks(values: readonly unknown[]): Kopecks {
	let total = 0;
	for (const value of values) total += moneyKopecks(value);
	return total;
}

/**
 * Суммы, которые пришли в прогон УЖЕ потеряв точность у своего производителя.
 *
 * Список печатается в приговоре по именам и значениям. Нарушением прогона он не
 * объявляется: производитель здесь один и назван (`services/reports/
 * managerReports.ts`, `receivables()`), а правка канона в эту задачу не входит —
 * перенос его точной `numeric`-арифметики в JS даёт нулевой выигрыш при
 * максимальном риске. Молчать о нём нельзя тем более: пока сверка округляла такие
 * суммы про себя, потеря точности была невидима вообще.
 */
const producerFloatDirt: string[] = [];

/**
 * Копейки из суммы, чей ПРОИЗВОДИТЕЛЬ считает деньги в плавающей точке.
 *
 * ЗАМЕР 2026-07-29, живая демо-клиника. `GET /api/reports/receivables` отдаёт в
 * строке пациента `debtRub = 26500.989999999998`. Это не «почти 26 500,99»: три
 * знака после запятой не проходят `moneyRubSchema`, а колонка `numeric(12,2)` их
 * молча обрежет. Причина в каноне и названа построчно: `managerReports.ts:1145`
 * считает `debtRub` вычитанием В ПЛАВАЮЩЕЙ ТОЧКЕ
 * (`41300.99 − 14800 = 26500.989999999998`), `:1206` кладёт результат в ответ как
 * есть, а `:1218` округляет до копейки ТОЛЬКО итог. То есть строки отчёта и его
 * итог посчитаны по-разному, и совпадают они лишь пока округление не меняет сумму.
 *
 * Здесь такое значение приводится к копейке — ровно тем же способом, которым
 * производитель приводит свой собственный итог, иначе сравнивались бы величины
 * разной точности. Отличие от прежнего `money()` принципиальное: КАЖДЫЙ случай
 * приведения записывается и печатается с именем поля и исходным числом, а не
 * исчезает молча.
 */
function producerMoneyKopecks(value: unknown, field: string): Kopecks {
	if (value === null || value === undefined) return 0;
	const asNumber = typeof value === "string" ? Number(value) : value;
	if (typeof asNumber !== "number" || !Number.isFinite(asNumber)) {
		throw new TypeError(`${field}: сумма пришла не числом — ${String(value)}`);
	}
	const kopecks = Math.round(asNumber * 100);
	if (!Number.isSafeInteger(kopecks)) {
		throw new TypeError(`${field}: сумма вне денежного диапазона — ${String(value)}`);
	}
	if (rublesFromKopecks(kopecks) !== asNumber) {
		const finding = `${field}: производитель отдал ${asNumber}, в копейках это ${debtNumericText(kopecks)}`;
		if (!producerFloatDirt.includes(finding)) producerFloatDirt.push(finding);
	}
	return kopecks;
}

/** Точные рубли из суммы производителя, считающего в плавающей точке. */
function producerMoney(value: unknown, field: string): number {
	return rublesFromKopecks(producerMoneyKopecks(value, field));
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

	/*
	 * ПРОВЕРКА САМОГО РЕЕСТРА, тоже на выдуманных утверждениях. Датчик, который
	 * умеет назвать вырождение, но реестр которого его пропускает, бесполезен:
	 * ровно так и появляется молчаливый зелёный. Три исхода проверяются сразу —
	 * содержательное, выродившееся и не выполнявшееся вовсе.
	 */
	const synthetic: Claim[] = [
		judge("своя клиника", "живое утверждение", 9200, 9200, [9200]),
		judge("своя клиника", "выродившееся утверждение", 0, 0, [0]),
		// Чужая клиника с тем же именем утверждения: реестр обязан смотреть на СВОЮ.
		judge("другая клиника", "утверждения нет вовсе", 5, 5, [5]),
	];
	const rosterVerdict = verifyRoster(synthetic, "своя клиника", [
		"живое утверждение",
		"выродившееся утверждение",
		"утверждения нет вовсе",
	]);
	if (rosterVerdict.degenerate.length !== 1 || rosterVerdict.degenerate[0] !== "выродившееся утверждение") {
		complaints.push("реестр не назвал выродившееся утверждение своей клиники");
	}
	if (rosterVerdict.missing.length !== 1 || rosterVerdict.missing[0] !== "утверждения нет вовсе") {
		complaints.push("реестр не заметил, что утверждение не выполнялось (или зачёл его по чужой клинике)");
	}
	const cleanVerdict = verifyRoster(synthetic, "своя клиника", ["живое утверждение"]);
	if (cleanVerdict.missing.length !== 0 || cleanVerdict.degenerate.length !== 0) {
		complaints.push("реестр объявил нарушение там, где содержательное утверждение на месте");
	}

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

/*
 * ═══════════════════════════════════════════════════════════════════════════
 * РЕЕСТР УТВЕРЖДЕНИЙ, КОТОРЫМ ВЫРОЖДАТЬСЯ ЗАПРЕЩЕНО
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Счётчик содержательности честно печатает «33 из 75», но сам по себе ничего не
 * гарантирует: если данные снова опустеют, вернётся молчаливый зелёный — уже с
 * пометкой, но всё равно без доказательства. Реестр закрывает эту дыру.
 *
 * ПОЧЕМУ СПИСОК ИМЁН, А НЕ ПОРОГ ЧИСЛОМ. Порог с запасом — это оплаченный вперёд
 * молчаливый слот, и в этом дереве это уже доказано замером: датчик охвата слоя
 * доступа считался и НЕ сверялся, урезание охвата с 106 функций до 26 прошло при
 * семи зелёных проверках из восьми (коммит 115aa6595). Порог «не меньше двадцати
 * содержательных» разрешил бы потерять тринадцать молча. Список ИМЁН запаса не
 * имеет: пропало утверждение — названо по имени; выродилось — названо по имени.
 * Добавить новое можно свободно, потому что реестр требует наличия, а не
 * количества.
 *
 * ПОЧЕМУ РЕЕСТР ПРИВЯЗАН К СВОЕЙ КЛИНИКЕ. Живая клиника имеет право быть пустой —
 * это её законное состояние, а не дефект кода, и требовать от неё содержательности
 * значило бы завести стража, который кричит на верном коде. Свою клинику сценарий
 * сеет сам, поэтому её пустота означает ровно одно: сломался посев или сломался
 * маршрут. Здесь молчать нельзя, и здесь это нарушение.
 */
const FIXTURE_SUBSTANCE_ROSTER: readonly string[] = [
	// Деньги главного экрана против независимого SQL.
	"назначено дашборд = SQL по позициям (количество округлено, как считает дашборд)",
	"оплачено дашборд = SQL по оплатам в статусе paid",
	"долг дашборд = назначено − оплачено, зажатое нулём (нетто по клинике)",
	"скидка дашборд = SQL по скидкам не отменённых позиций",
	"к вычету дашборд = SQL по позициям налоговых услуг",
	"незакрытых позиций дашборд = SQL по не завершённым",
	"активный визит дашборда — настоящая строка базы",
	"позиций плана на дашборде = строк в базе",
	"оплат на дашборде = строк в базе",
	"приёмов на дашборде = строк в базе",
	"пациентов в patientInsights = пациентов в картотеке дашборда",
	// Долг: отчёт дебиторки против канона, и расхождение экранов числом.
	"сумма долгов по строкам = итог дебиторки",
	"сумма корзин по сроку = итог дебиторки",
	"должников в отчёте = строк с положительным долгом",
	"назначено по канону = SQL по позициям",
	"дебиторка отчёта = дебиторка по канону",
	"переплата отчёта = возврат по канону",
	"должников в отчёте = должников по канону",
	"переплативших в отчёте = переплативших по канону",
	/*
	 * Прежнее имя — «разница дебиторки и главного экрана = переплаты пациентов» —
	 * называло тождество, которого нет: слева стоит итог отчёта, посчитанный С
	 * ПОРОГОМ значимости 1 ₽, справа стояли переплаты БЕЗ порога. Пока в клинике не
	 * было ни одного долга меньше рубля, разница не проявлялась; появился долг
	 * 0,50 ₽ — и утверждение стало ложным на ВЕРНЫХ данных. Теперь в имени названы
	 * обе причины расхождения экранов, и обе считаются точными копейками.
	 */
	"разница дебиторки и главного экрана = переплаты минус долги ниже порога отчёта",
	"долг главного экрана = не собрано нетто по канону (порог не уносит копейки)",
	/*
	 * Прежнее имя записи — «сумма balanceDueRub = дебиторка по формуле главного
	 * экрана (с отменёнными позициями)» — описывало ДЕФЕКТ как норму: сценарий
	 * сознательно воспроизводил отсутствие фильтра статуса, потому что правка
	 * боевого кода в ту задачу не входила. Фильтр появился, и утверждение
	 * покраснело на ВЕРНОЙ правке (маршрут отдал 10 000, сверка ждала 15 000).
	 * Реестр это поймал как «проверка потеряна» — ровно то, для чего он и заведён.
	 */
	"сумма balanceDueRub = ПОЛНАЯ дебиторка по канону: отменённое лечение НЕ долг, копеечный — долг",
	"формула с отменёнными даёт БОЛЬШЕ канона — значит фильтр статуса вправду работает",
	// Врачи, услуги, выручка.
	"выручка врачей = оплаты, дошедшие до врача через приём",
	"не отнесено к врачу = оплаты, которым приём не нашёлся",
	"приёмов у врачей = приёмов клиники за период",
	"назначено услуг = SQL по позициям с визитом в периоде",
	"выручка динамики = выручка врачей плюс не отнесённая (тот же период)",
	"сумма точек динамики = итог динамики",
	// Карта приёма: и отказ, и успех.
	"черновик приёма принимает автосохранение",
	"подписанный приём отказывает в автосохранении",
	// Посев под число: без этого «пусто» не отличить от «посев не состоялся».
	"посев: приёмов",
	"посев: визитов",
	"посев: визитов, созданных из записи",
	"посев: позиций лечения",
	"посев: оплат",
	"посев: назначено",
	"посев: оплачено",
	"посев: предоплата в статусе planned",
	"посев: оплата без визита",
	"посев: отменённая позиция вне назначенного",
	"посев: дебиторка по канону",
	"посев: возврат по канону",
	"посев: полная дебиторка по канону (порога нет)",
	"посев: долг ниже порога отчёта",
	"посев: не собрано нетто = полная дебиторка − возврат",
];

interface RosterVerdict {
	/** Утверждения не выполнялись вовсе — проверка потеряна. */
	readonly missing: readonly string[];
	/** Выполнялись, но сравнивали ноль с нулём — на СВОЕЙ клинике это поломка. */
	readonly degenerate: readonly string[];
}

/**
 * Сверка реестра — ЧИСТАЯ функция, чтобы её саму можно было проверить на
 * выдуманных утверждениях, не заводя клинику и не глядя в базу.
 */
function verifyRoster(rows: readonly Claim[], clinic: string, roster: readonly string[]): RosterVerdict {
	const missing: string[] = [];
	const degenerate: string[] = [];
	for (const label of roster) {
		const claim = rows.find((row) => row.clinic === clinic && row.label === label);
		if (!claim) {
			missing.push(label);
			continue;
		}
		// Провал содержательного утверждения уже считается в общем итоге; здесь
		// реестр отвечает только за наличие и за содержательность.
		if (!claim.substantive) degenerate.push(label);
	}
	return { missing, degenerate };
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
 *   Долгов      5000×2−800 + 800     4000+1000  +5000    ← должник
 *               = 10 000             = 5000
 *   Переплатова 5000                 5800       −800     ← клиника должна ему
 *   Ровнова     5000−500 + 5000      4500       +5000    ← должник, есть незакрытая
 *               = 9 500                                    позиция в статусе proposed
 *   Копейкина   1500,50              1500       +0,50    ← должник НИЖЕ порога отчёта
 *
 *   назначено всего            26 000,50
 *   оплачено (только paid)     16 800
 *   предоплата (planned)        2 500     ← деньгами ещё не является
 *   оплата без визита           1 000     ← к врачу отнести нечем
 *   отменённая позиция          5 000     ← в назначенное не входит по канону
 *
 *   дебиторка СПИСКА           10 000     (5000 + 5000; порог 1 ₽ и переплату, и
 *                                          копеечный долг из списка выкидывает)
 *   полная дебиторка           10 000,50  ← её показывают карточки пациентов
 *   долг ниже порога                0,50  ← в списке для звонков его нет
 *   возврат по канону             800
 *   не собрано, нетто           9 200,50  (10 000,50 − 800) — это и есть число
 *                                          главного экрана
 *
 * ЗАЧЕМ В ПОСЕВЕ КОПЕЙКИ И ПОЧЕМУ ИМЕННО ДОЛГ 0,50 ₽. Прогон 2026-07-29 объявил
 * два расхождения по 50 копеек на живой демо-клинике, и оба оказались НЕ дефектом
 * расчёта, а дефектом самой сверки: она сравнивала итог отчёта, посчитанный с
 * порогом значимости 1 ₽, с величинами, у которых порога нет. На круглых суммах
 * такое тождество держится, поэтому дефект жил ровно до первой копейки в данных.
 * Своя клиника теперь несёт такой долг сама: пересев демо-клиники круглыми ценами
 * больше не может вернуть сверку в состояние «зелено по счастливой случайности».
 *
 * Эти величины РАЗНЫЕ, и именно на них расходились девять формул долга в этом
 * дереве (разбор — money/patientDebt.ts). На пустой клинике все они равны нулю,
 * поэтому их расхождение там не проверяется вообще: ровно то, ради чего нужна
 * своя клиника с деньгами.
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
/** Пациент с долгом НИЖЕ порога значимости отчёта — тот самый полтинник. */
const FIXTURE_KOPECK_DEBTOR_ID = fixtureUuid(FIXTURE_NAMESPACE, 24);
const FIXTURE_SERVICE_TAXED_ID = fixtureUuid(FIXTURE_NAMESPACE, 31);
const FIXTURE_SERVICE_PLAIN_ID = fixtureUuid(FIXTURE_NAMESPACE, 32);
const FIXTURE_SERVICE_KOPECK_ID = fixtureUuid(FIXTURE_NAMESPACE, 33);

/**
 * Суммы посева. Вынесены в константы, потому что каждая участвует и в записи, и
 * в ожидании: разъехаться им нельзя.
 */
const FIXTURE_UNIT_PRICE = 5000;
const FIXTURE_PLAIN_PRICE = 800;
const FIXTURE_DISCOUNT_TWO_UNITS = 800;
const FIXTURE_DISCOUNT_ONE_UNIT = 500;
const FIXTURE_CANCELLED_LINE = 5000;
/**
 * Цена с копейками и оплата без них: долг получается 0,50 ₽, то есть НИЖЕ порога
 * значимости отчёта (1 ₽). Цена совпадает с прайсовой строкой этой же услуги —
 * иначе покраснеет `tests/priceListMatchesTreatmentItems.test.ts`, и правильно
 * покраснеет: цена позиции обязана совпадать с прайсом, на который она ссылается.
 */
const FIXTURE_KOPECK_PRICE = 1500.5;
const FIXTURE_KOPECK_PAID = 1500;
const FIXTURE_PLANNED_TOTAL = 26_000.5;
const FIXTURE_PAID_TOTAL = 16_800;
const FIXTURE_ADVANCE_PLANNED = 2_500;
const FIXTURE_PAID_WITHOUT_VISIT = 1_000;
const FIXTURE_RECEIVABLE = 10_000;
const FIXTURE_SUB_THRESHOLD_DEBT = 0.5;
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
		{ id: FIXTURE_KOPECK_DEBTOR_ID, organizationId: FIXTURE_ORGANIZATION_ID, fullName: "Копейкина Вера Павловна" },
	]);

	/*
	 * ПРОВЕРКА ДАТЧИКА НА ПУСТОТЕ — не лазейка, а обязательный обратный прогон.
	 *
	 * Страж, чей путь отказа никогда не проходили, не доказан: он мог бы молчать
	 * всегда. `DENTE_CHAIN_RECON_EMPTY_FIXTURE=1` останавливает посев здесь и
	 * оставляет клинику ровно в состоянии живой «Стоматология, 1 кабинет» — три
	 * карточки и НОЛЬ всего остального. Тогда реестр обязан назвать выродившиеся
	 * утверждения по имени и заявить нарушения; если он промолчит, датчик сломан.
	 *
	 * Переменная действует только в сторону строгости: включить её нельзя так,
	 * чтобы прогон стал зеленее. Пустых клиник в живой базе она не создаёт — своя
	 * клиника убирается целиком на выходе, как и при полном посеве.
	 */
	if (process.env.DENTE_CHAIN_RECON_EMPTY_FIXTURE === "1") {
		console.log(
			"ПРОВЕРКА ДАТЧИКА НА ПУСТОТЕ: посев остановлен после карточек пациентов. Своя клиника " +
				"воспроизводит живую «Стоматология, 1 кабинет» — 3 пациента и ноль записей, приёмов, " +
				"позиций лечения и оплат. Реестр обязан заявить нарушения.",
		);
		return;
	}

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
		{
			id: FIXTURE_SERVICE_KOPECK_ID,
			organizationId: FIXTURE_ORGANIZATION_ID,
			code: "CHAIN-RECON-3",
			title: "Полировка пломбы, сверка цепочки",
			category: "therapy",
			// Прайс с копейками: без него в посеве не было бы ни одной суммы, на
			// которой видно потерю копейки, — и сверка снова стала бы зелёной
			// по счастливой случайности круглых чисел.
			basePriceRub: FIXTURE_KOPECK_PRICE,
			priceRub: FIXTURE_KOPECK_PRICE,
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
		appointmentFor(45, FIXTURE_KOPECK_DEBTOR_ID, "completed"),
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
		visitFor(55, FIXTURE_KOPECK_DEBTOR_ID, 45, "signed"),
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
		itemFor({
			// Позиция с копейками: 1 500,50 против оплаты 1 500,00 даёт долг 0,50 ₽ —
			// ниже порога значимости отчёта. Ровно на таком долге сверка и поймала,
			// что сравнивала итог СПИСКА с величинами без порога.
			slot: 67,
			patientId: FIXTURE_KOPECK_DEBTOR_ID,
			visitSlot: 55,
			serviceId: FIXTURE_SERVICE_KOPECK_ID,
			title: "Полировка пломбы, сверка цепочки",
			quantity: "1",
			unitPriceRub: FIXTURE_KOPECK_PRICE,
			discountRub: 0,
			status: "completed",
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
		{
			// Оплата без копеек по позиции с копейками: остаётся долг 0,50 ₽.
			id: fixtureUuid(FIXTURE_NAMESPACE, 76),
			organizationId: FIXTURE_ORGANIZATION_ID,
			patientId: FIXTURE_KOPECK_DEBTOR_ID,
			visitId: fixtureUuid(FIXTURE_NAMESPACE, 55),
			amountRub: FIXTURE_KOPECK_PAID,
			status: "paid",
			paidAt: FIXTURE_PAID_AT,
		},
	]);

	console.log(
		`Посев цепочки: клиника «${FIXTURE_ORGANIZATION_NAME}» ${FIXTURE_ORGANIZATION_ID} — ` +
			"4 пациента, 5 записей, 5 приёмов, 7 позиций лечения, 6 оплат, " +
			`долг ниже порога ${FIXTURE_SUB_THRESHOLD_DEBT} ₽.`,
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
	/** Дебиторка СПИСКА должников: с порогом значимости, как в отчёте. */
	receivableRub: number;
	/** Возврат СПИСКА переплативших: с тем же порогом. */
	refundRub: number;
	/**
	 * ПОЛНАЯ дебиторка: порог не применялся. Именно её показывают карточки
	 * пациентов на главном экране — у карточки порога нет и быть не может.
	 */
	fullReceivableRub: number;
	/** Полный возврат: порог не применялся. */
	fullRefundRub: number;
	/** Долги, которые порог выкинул из списка. Ноль — фильтр ничего не унёс. */
	subThresholdReceivableRub: number;
	/** Переплаты, которые порог выкинул из списка. */
	subThresholdRefundRub: number;
	netUncollectedRub: number;
	debtorCount: number;
	overpaidCount: number;
	chargedRub: number;
	/** Тот же расчёт формулой главного экрана: отменённые позиции учтены. */
	screenReceivableRub: number;
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

	/*
	 * ВТОРОЙ ПРОХОД — ФОРМУЛОЙ ГЛАВНОГО ЭКРАНА, А НЕ КАНОНОМ.
	 *
	 * `patientInsight.balanceDueRub` (sampleData.ts:1720) считает по тем же
	 * пациентам, но позиции берёт БЕЗ фильтра по статусу: группировка на
	 * sampleData.ts:1693 — `groupByPatientId(treatmentPlanItems)`, тогда как
	 * оплаты рядом фильтруются (`payment.status === "paid"`). Значит отменённое
	 * лечение продолжает висеть на пациенте долгом ровно там, где администратор
	 * читает сумму перед звонком.
	 *
	 * Здесь это ВОСПРОИЗВОДИТСЯ, а не исправляется: правка боевого кода в эту
	 * задачу не входит, а утверждение, требующее правильного ответа от кода,
	 * который его пока не даёт, покраснело бы на неизменном коде и было бы
	 * выключено. Поэтому статус подменяется на `completed` — так канон учтёт
	 * отменённые строки, как их учитывает экран, — и порог значимости ставится в
	 * ноль, потому что у экрана его нет вовсе. Разница двух проходов и есть
	 * размер дефекта, и она печатается числом.
	 */
	const screenLedgers = buildPatientLedgers(
		chargeRows.map((row) => ({
			patientId: row.patient_id,
			status: "completed",
			unitPriceRub: row.unit_price_rub,
			quantity: row.quantity,
			discountRub: row.discount_rub,
		})),
		paymentRows.map((row) => ({ patientId: row.patient_id, status: row.status, amountRub: row.amount_rub })),
	);
	const screenTotals = clinicDebtTotals(screenLedgers, { significanceKopecks: 0 });

	return {
		receivableRub: rublesFromKopecks(totals.receivableKopecks),
		refundRub: rublesFromKopecks(totals.refundLiabilityKopecks),
		fullReceivableRub: rublesFromKopecks(totals.fullReceivableKopecks),
		fullRefundRub: rublesFromKopecks(totals.fullRefundLiabilityKopecks),
		subThresholdReceivableRub: rublesFromKopecks(
			totals.subThresholdReceivableKopecks,
		),
		subThresholdRefundRub: rublesFromKopecks(totals.subThresholdRefundKopecks),
		netUncollectedRub: rublesFromKopecks(totals.netUncollectedKopecks),
		debtorCount: totals.debtorCount,
		overpaidCount: totals.overpaidCount,
		chargedRub: rublesFromKopecks(chargedKopecks),
		screenReceivableRub: rublesFromKopecks(screenTotals.fullReceivableKopecks),
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

	/*
	 * ЗАГОЛОВОК ЭТОГО ШАГА НАЗЫВАЛ ШОВ РАЗРЫВОМ БЕЗУСЛОВНО — и это устарело.
	 *
	 * Замер под ним показывал `plan_items_new: 0, treatment_items: 16` на сумму
	 * 148 300 ₽, то есть заполнена как раз ДЕНЕЖНАЯ таблица, а заголовок объявлял её
	 * пустой стороной разрыва. Прогон от такого не падает (слово «РАЗРЫВ» его не
	 * валит), поэтому неверная картина дерева жила в протоколе, который читают
	 * глазами, и по ней шли чинить работающее.
	 *
	 * Теперь заголовок называет ШОВ, а его состояние выводится из тех же двух чисел
	 * НИЖЕ запроса. Нарушением это не объявляется: обе таблицы пустые — законное
	 * состояние свежей установки, а страж, кричащий на верном коде, будет выключен
	 * (в этом дереве так уже случилось трижды). Утверждение здесь обязано быть
	 * верным, а не громким.
	 */
	console.log("\n=== ШАГ 1. ШОВ «ПИШЕМ В ОДНУ ТАБЛИЦУ, ЧИТАЕМ ИЗ ДРУГОЙ» ===");
	const seamRows = await rows(
		"план из odontogram (treatment_plan_items_new) против денежной таблицы (treatment_items)",
		sql`select
			(select count(*)::int from treatment_plan_items_new) as plan_items_new,
			(select count(*)::int from treatment_plan_items_new where organization_id is null) as plan_items_new_without_org,
			(select coalesce(sum(greatest(price * quantity - discount, 0)), 0)::numeric(12,2) from treatment_plan_items_new) as plan_items_new_sum,
			(select count(*)::int from treatment_items) as treatment_items,
			(select coalesce(sum(greatest(unit_price_rub * greatest(quantity,1) - discount_rub, 0)), 0)::numeric(12,2) from treatment_items) as treatment_items_sum`,
	);
	const seam = seamRows[0] ?? {};
	const planSideRows = Number(seam.plan_items_new ?? 0);
	const moneySideRows = Number(seam.treatment_items ?? 0);
	const moneySideSum = money(seam.treatment_items_sum);
	if (planSideRows > 0 && moneySideRows === 0) {
		console.log(
			`РАЗРЫВ ЖИВ: план держит ${planSideRows} позиции(й), денежная таблица treatment_items ПУСТА. ` +
				"Все денежные читатели клиники читают только её, значит главный экран показывает «назначено 0 ₽», " +
				"а отчёт дебиторки — «должников 0».",
		);
	} else if (moneySideRows > 0) {
		console.log(
			`ШОВ ЦЕЛ: денежная таблица treatment_items держит ${moneySideRows} строк(и) на ${moneySideSum} ₽ ` +
				`при ${planSideRows} позиции(ях) в treatment_plan_items_new — деньги плана видят. ` +
				"Пустой план при заполненной денежной таблице разрывом НЕ является: маршрут сметы проводит позиции " +
				"в обе таблицы, а часть строк пришла из демо-посева снимков напрямую.",
		);
	} else {
		console.log(
			"СВЕРЯТЬ НЕЧЕГО: и план, и денежная таблица пусты — состояние шва этим прогоном не подтверждено " +
				"ни в одну сторону.",
		);
	}
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
					                    where v.id = p.visit_id and a.doctor_user_id is not null)) as paid_attributable_to_doctor,
					  /*
					   * Дальше — величины, которых здесь не было и без которых половина
					   * сводки главного экрана не сверялась ни с чем: скидка, сумма к
					   * налоговому вычету, число незакрытых позиций, размеры коллекций.
					   * Формулы повторяют дашборд дословно, включая округление количества:
					   * слой чтения берёт Math.max(1, Math.round(quantity)), и сверять его
					   * надо той же формулой, иначе утверждение краснело бы на верном коде.
					   * Обратные кавычки в этом комментарии стоять НЕ МОГУТ: он лежит
					   * внутри шаблонной строки, и первая же кавычка её обрывает — на этом
					   * прогон уже падал разбором.
					   */
					  (select coalesce(sum(discount_rub),0)::numeric(12,2)
					     from treatment_items where organization_id = ${org.id} and status <> 'cancelled') as discount_sql,
					  (select coalesce(sum(greatest(ti.unit_price_rub * round(greatest(ti.quantity,1)) - ti.discount_rub, 0)),0)::numeric(12,2)
					     from treatment_items ti
					     join service_catalog_items sci on sci.id = ti.service_id
					    where ti.organization_id = ${org.id} and ti.status <> 'cancelled'
					      and sci.tax_deductible) as tax_deductible_sql,
					  (select count(*)::int from treatment_items
					    where organization_id = ${org.id} and status <> 'cancelled' and status <> 'completed') as open_items_sql,
					  (select coalesce(sum(greatest(unit_price_rub * greatest(quantity,1) - discount_rub, 0)),0)::numeric(12,2)
					     from treatment_items where organization_id = ${org.id} and status = 'cancelled') as cancelled_line_sql,
					  (select count(*)::int from treatment_items where organization_id = ${org.id}) as item_rows,
					  (select count(*)::int from payments where organization_id = ${org.id}) as payment_rows,
					  (select count(*)::int from appointments where organization_id = ${org.id}) as appointment_rows,
					  (select count(*)::int from visits where organization_id = ${org.id}) as visit_rows,
					  (select count(*)::int from visits
					    where organization_id = ${org.id} and appointment_id is not null) as visit_rows_from_appointment,
					  (select count(*)::int from visits where organization_id = ${org.id} and status = 'draft') as draft_visit_rows,
					  (select count(*)::int from visits where organization_id = ${org.id} and status = 'signed') as signed_visit_rows,
					  /*
					   * Период тот же, что уходит в отчёты. Отнесение платежа к врачу
					   * повторяет отчёт дословно: payments → visits → appointments, и
					   * «не отнесено» — это группа с пустым врачом, а не только платежи
					   * без визита. Разница видна на визите без записи: платёж по нему
					   * к врачу не относится, хотя visit_id у него есть.
					   */
					  (select coalesce(sum(p.amount_rub),0)::numeric(12,2)
					     from payments p
					     left join visits v on v.id = p.visit_id
					     left join appointments a on a.id = v.appointment_id
					    where p.organization_id = ${org.id} and p.status = 'paid'
					      and p.paid_at >= ${REPORT_PERIOD_FROM}::timestamptz
					      and p.paid_at <= ${REPORT_PERIOD_TO}::timestamptz
					      and a.doctor_user_id is not null) as period_paid_to_doctor,
					  (select coalesce(sum(p.amount_rub),0)::numeric(12,2)
					     from payments p
					     left join visits v on v.id = p.visit_id
					     left join appointments a on a.id = v.appointment_id
					    where p.organization_id = ${org.id} and p.status = 'paid'
					      and p.paid_at >= ${REPORT_PERIOD_FROM}::timestamptz
					      and p.paid_at <= ${REPORT_PERIOD_TO}::timestamptz
					      and a.doctor_user_id is null) as period_paid_unattributed,
					  (select count(*)::int from appointments
					    where organization_id = ${org.id} and doctor_user_id is not null
					      and starts_at >= ${REPORT_PERIOD_FROM}::timestamptz
					      and starts_at <= ${REPORT_PERIOD_TO}::timestamptz) as period_appointments_with_doctor,
					  (select coalesce(sum(greatest(ti.unit_price_rub * greatest(ti.quantity,1) - ti.discount_rub, 0)),0)::numeric(12,2)
					     from treatment_items ti
					     join visits v on v.id = ti.visit_id
					    where ti.organization_id = ${org.id} and ti.status <> 'cancelled'
					      and v.created_at >= ${REPORT_PERIOD_FROM}::timestamptz
					      and v.created_at <= ${REPORT_PERIOD_TO}::timestamptz) as period_services_planned
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
			/** Сумма `balanceDueRub` карточек пациентов — сверяется с каноном ниже. */
			let dashboardInsightDebt: number | null = null;

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
				const netUncollected = rublesFromKopecks(
					Math.max(
						0,
						moneyKopecks(totals.planned_dashboard_rounded) - moneyKopecks(totals.paid_sql),
					),
				);
				same(
					org.name,
					"долг дашборд = назначено − оплачено, зажатое нулём (нетто по клинике)",
					money(summary.totalDueRub),
					netUncollected,
					[money(summary.totalDueRub), netUncollected],
				);
				dashboardDueRub = money(summary.totalDueRub);
				same(
					org.name,
					"скидка дашборд = SQL по скидкам не отменённых позиций",
					money(summary.totalDiscountRub),
					money(totals.discount_sql),
					[money(summary.totalDiscountRub), money(totals.discount_sql)],
				);
				same(
					org.name,
					"к вычету дашборд = SQL по позициям налоговых услуг",
					money(summary.taxDeductionEligibleRub),
					money(totals.tax_deductible_sql),
					[money(summary.taxDeductionEligibleRub), money(totals.tax_deductible_sql)],
				);
				same(
					org.name,
					"незакрытых позиций дашборд = SQL по не завершённым",
					summary.openTreatmentItems ?? 0,
					Number(totals.open_items_sql ?? 0),
					[summary.openTreatmentItems ?? 0, Number(totals.open_items_sql ?? 0)],
				);
				same(org.name, "позиций плана на дашборде = строк в базе", dashboard.treatmentPlanItems?.length ?? 0, Number(totals.item_rows ?? 0), [
					dashboard.treatmentPlanItems?.length ?? 0,
					Number(totals.item_rows ?? 0),
				]);
				same(org.name, "оплат на дашборде = строк в базе", dashboard.payments?.length ?? 0, Number(totals.payment_rows ?? 0), [
					dashboard.payments?.length ?? 0,
					Number(totals.payment_rows ?? 0),
				]);
				same(org.name, "приёмов на дашборде = строк в базе", dashboard.appointments?.length ?? 0, Number(totals.appointment_rows ?? 0), [
					dashboard.appointments?.length ?? 0,
					Number(totals.appointment_rows ?? 0),
				]);
				/*
				 * АКТИВНЫЙ ВИЗИТ ОБЯЗАН БЫТЬ СТРОКОЙ БАЗЫ, а не подстановкой.
				 *
				 * На пустой клинике дашборд отдаёт `activeVisit.id` из нулей
				 * (`00000000-…-000000000000`) — такой строки в базе нет, и утверждение
				 * там ВЫРОЖДЕНО, потому что визитов нет вовсе и проверять нечего.
				 * Величина, на которой оно стоит, — число визитов клиники: пока их
				 * ноль, «визит существует» не вопрос. Как только визит есть, дашборд
				 * обязан подставить настоящий.
				 */
				const activeVisitId = String(dashboard.activeVisit?.id ?? "");
				const activeVisitExists =
					Number(
						(
							await db.execute(sql`
								select count(*)::int as n from visits
								 where organization_id = ${org.id} and id::text = ${activeVisitId}
							`)
						).rows[0]?.n ?? 0,
					) > 0;
				same(org.name, "активный визит дашборда — настоящая строка базы", activeVisitExists, true, [
					Number(totals.visit_rows ?? 0),
				]);
				console.log(
					`справка: сумма только по completed=${money(totals.planned_completed_only)} — ` +
						"дашборд в totalDueRub её НЕ использует, берёт все не отменённые.",
				);
				const insights = dashboard.patientInsights ?? [];
				/*
				 * Сумма долгов КАРТОЧЕК пациентов — в копейках, а не сложением рублей.
				 * Слагаемых здесь столько, сколько пациентов в клинике (на демо — 14), и
				 * ровно на таких сложениях плавающая точка даёт хвост, который прежнее
				 * округление подписывало как ровную сумму.
				 */
				const insightDebt = rublesFromKopecks(
					sumMoneyKopecks(
						(insights as { balanceDueRub?: unknown }[]).map((row) => row.balanceDueRub),
					),
				);
				console.log(`patientInsights: строк ${insights.length}, сумма balanceDueRub=${insightDebt}`);
				dashboardInsightDebt = insightDebt;
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
					console.log(
						`   ${row.patientName}: ${producerMoney(row.debtRub, "receivables.rows[].debtRub")} ₽ ` +
							`(${row.bucket}, с ${row.oldestChargeAt})`,
					);
				}
				/*
				 * Две внутренние сходимости отчёта дебиторки. Обе не зависят ни от
				 * периода, ни от даты прогона: корзины — это разбиение тех же строк по
				 * сроку, а итог — их сумма. Именно поэтому они годятся в утверждения:
				 * ожидание считается из того же ответа, а не зашито под сегодняшнюю
				 * базу.
				 */
				const debtRows = (receivables.rows ?? []) as { debtRub?: unknown }[];
				/*
				 * Строки и корзины отчёта приходят от производителя, считающего долг
				 * пациента в плавающей точке (`managerReports.ts:1145`), поэтому идут через
				 * `producerMoneyKopecks`: он приводит к копейке и НАЗЫВАЕТ каждый такой
				 * случай в приговоре. Итог отчёта производитель округляет сам (`:1218`),
				 * поэтому он читается точным путём — и сходимость «строки = итог» остаётся
				 * настоящей проверкой, а не сравнением двух по-разному сглаженных чисел.
				 */
				const rowsDebt = rublesFromKopecks(
					debtRows.reduce(
						(sum, row) => sum + producerMoneyKopecks(row.debtRub, "receivables.rows[].debtRub"),
						0,
					),
				);
				const bucketDebt = rublesFromKopecks(
					Object.entries((receivables.byBucket ?? {}) as Record<string, unknown>).reduce(
						(sum, [bucket, value]) => sum + producerMoneyKopecks(value, `receivables.byBucket.${bucket}`),
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
					debtRows.filter((row) => producerMoneyKopecks(row.debtRub, "receivables.rows[].debtRub") > 0).length,
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
					/*
					 * ═════════════════════════════════════════════════════════════════
					 * ЗДЕСЬ УТВЕРЖДЕНИЕ БЫЛО НЕВЕРНЫМ — И ПОЙМАЛ ЭТО ПОЛТИННИК
					 * ═════════════════════════════════════════════════════════════════
					 *
					 * Стояло «разница дебиторки и главного экрана = переплаты пациентов».
					 * На круглых ценах это сходилось, а после приведения демо-цен к прайсу
					 * (4759d63f0) разошлось ровно на 0,50 ₽: получено 1598.01, ожидалось
					 * 1598.51.
					 *
					 * Прав оказался ПРОГОН, а не утверждение. Слева стоит итог ОТЧЁТА, а он
					 * считается с порогом значимости 1 ₽ (`receivables`, `minDebtRub`);
					 * справа стояли переплаты БЕЗ порога. Величины разной семантики, и
					 * тождество между ними держалось только пока в клинике не было ни
					 * одного долга меньше рубля. Появился (пациент …0106: назначено
					 * 7 200,50, оплачено 7 200,00 — долг 0,50 ₽), и утверждение стало
					 * ложным на ВЕРНЫХ данных.
					 *
					 * Тождество записано полностью, с обеими причинами и без допуска:
					 *
					 *   итог отчёта − долг главного экрана
					 *       = полные переплаты − долги, отброшенные порогом отчёта
					 *
					 * Ослаблением это не является: правая часть считается из строк базы
					 * точными копейками и НЕ зависит ни от одного из двух экранов, поэтому
					 * дрейф любого из них по-прежнему красит утверждение.
					 */
					const reportDebtKopecks = moneyKopecks(receivables.totalDebtRub);
					const screenGap = rublesFromKopecks(
						reportDebtKopecks - moneyKopecks(dashboardDueRub),
					);
					const overpaidMinusDropped = rublesFromKopecks(
						moneyKopecks(canon.fullRefundRub) - moneyKopecks(canon.subThresholdReceivableRub),
					);
					console.log(
						`РАСХОЖДЕНИЕ ДВУХ ЭКРАНОВ: дебиторка отчёта ${money(receivables.totalDebtRub)} − долг главного ` +
							`экрана ${dashboardDueRub} = ${screenGap}; полные переплаты ${canon.fullRefundRub} − ` +
							`отброшенные порогом долги ${canon.subThresholdReceivableRub} = ${overpaidMinusDropped}. ` +
							"Это не дефект расчёта, а три разные величины: главный экран считает нетто по клинике одним " +
							"вычитанием, поэтому переплата одного пациента гасит долг другого; а отчёт вдобавок не " +
							"показывает долги меньше рубля, считая их шумом обзвона.",
					);
					same(
						org.name,
						"разница дебиторки и главного экрана = переплаты минус долги ниже порога отчёта",
						screenGap,
						overpaidMinusDropped,
						[money(receivables.totalDebtRub), dashboardDueRub, canon.fullRefundRub],
					);
					/*
					 * НОВОЕ УТВЕРЖДЕНИЕ, И ИМЕННО ОНО ЗАПИРАЕТ ПОЛТИННИК НАПРЯМУЮ.
					 *
					 * Итог клиники обязан сходиться с главным экраном до копейки. До правки
					 * `clinicDebtTotals` собирал его из ОТФИЛЬТРОВАННЫХ порогом сторон и
					 * давал 51 402,98 против 51 403,48 у экрана — те же 50 копеек, только
					 * это утверждение их не проверяло вовсе, потому что его не было.
					 * Зажим нулём — поведение самого экрана (`buildBillingSummary`:
					 * `Math.max(0, …)`), поэтому он назван здесь, а не спрятан.
					 */
					same(
						org.name,
						"долг главного экрана = не собрано нетто по канону (порог не уносит копейки)",
						dashboardDueRub,
						rublesFromKopecks(Math.max(0, moneyKopecks(canon.netUncollectedRub))),
						[dashboardDueRub, canon.netUncollectedRub],
					);
				}
				if (dashboardInsightDebt !== null) {
					/*
					 * ЗДЕСЬ УТВЕРЖДЕНИЕ ПЕРЕВЁРНУТО, И ЭТО ГЛАВНОЕ В ЭТОМ МЕСТЕ.
					 *
					 * Раньше сверка требовала, чтобы карточки пациентов совпадали с
					 * «формулой главного экрана С отменёнными позициями»: сценарий
					 * ВОСПРОИЗВОДИЛ дефект, потому что правка боевого кода в ту задачу
					 * не входила, а утверждение, требующее верного ответа от неверного
					 * кода, покраснело бы на неизменном коде и было бы выключено.
					 *
					 * Дефект починен (`sampleData.ts` получил фильтр по статусу), и
					 * прежнее утверждение мгновенно стало ложным: маршрут отдал 10 000,
					 * сверка ждала 15 000 — то есть покраснело на ВЕРНОЙ правке. Это
					 * ровно то, за что в этом дереве трижды выключали сторожей, и второй
					 * такой же случай за сессию (денежная цепочка требовала, чтобы касса
					 * после возврата не менялась).
					 *
					 * Поэтому сверка теперь требует КАНОН и отдельно доказывает, что
					 * отменённое лечение в долг не входит: `screenReceivableRub` считается
					 * тем же каноном, но с подменой статусов на `completed`, поэтому при
					 * ненулевом отменённом лечении он ОБЯЗАН быть больше канона — и
					 * маршрут обязан совпасть с каноном, а не с ним. Возврат дефекта
					 * ломает это утверждение, а верная правка — нет.
					 *
					 * СВЕРЯЕТСЯ С ПОЛНОЙ ДЕБИТОРКОЙ, А НЕ С ИТОГОМ ОТЧЁТА — и вот почему.
					 * Здесь стоял `canon.receivableRub`, то есть дебиторка СПИСКА, с порогом
					 * значимости 1 ₽. Карточка пациента порога не имеет и не должна иметь:
					 * пациент, задолжавший 50 копеек, обязан видеть 50 копеек, а не ноль.
					 * На круглых ценах разницы не было, после приведения цен к прайсу
					 * утверждение разошлось ровно на 0,50 ₽ (53001.99 против 53001.49) — и
					 * прав был маршрут, а не сверка. Сравнивать сумму карточек с итогом
					 * СПИСКА нельзя: это разные величины, и одна из них шумовой фильтр.
					 */
					same(
						org.name,
						"сумма balanceDueRub = ПОЛНАЯ дебиторка по канону: отменённое лечение НЕ долг, копеечный — долг",
						dashboardInsightDebt,
						canon.fullReceivableRub,
						[dashboardInsightDebt, canon.fullReceivableRub],
					);
					const cancelledWeight = money(totals.cancelled_line_sql);
					if (cancelledWeight > 0) {
						/*
						 * Проверка не выродилась: отменённое лечение в клинике ЕСТЬ, и
						 * значит совпадение с каноном — это содержательный ответ, а не
						 * совпадение двух нулей.
						 */
						/*
						 * Обе стороны БЕЗ порога: сравнивается влияние одного признака —
						 * фильтра статуса, — а не смесь «фильтр статуса плюс шумовой порог».
						 */
						same(
							org.name,
							"формула с отменёнными даёт БОЛЬШЕ канона — значит фильтр статуса вправду работает",
							canon.screenReceivableRub > canon.fullReceivableRub,
							true,
							[canon.screenReceivableRub, canon.fullReceivableRub, cancelledWeight],
						);
						console.log(
							`ШОВ ЦЕЛ: карточки пациентов считают долг ${dashboardInsightDebt} ₽ и совпадают с полной ` +
								`дебиторкой канона ${canon.fullReceivableRub} ₽ при отменённом лечении на ${cancelledWeight} ₽. ` +
								`Формула без фильтра статуса дала бы ${canon.screenReceivableRub} ₽ — разница ` +
								`${rublesFromKopecks(moneyKopecks(canon.screenReceivableRub) - moneyKopecks(canon.fullReceivableRub))} ₽ ` +
								"и есть та сумма, которую администратор раньше требовал с пациента за отменённое лечение.",
						);
					}
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
				const doctorRows = (doctors.rows ?? []) as {
					revenueRub?: unknown;
					appointmentsTotal?: unknown;
				}[];
				const attributedKopecks = sumMoneyKopecks(doctorRows.map((row) => row.revenueRub));
				const attributed = rublesFromKopecks(attributedKopecks);
				doctorsPeriodRevenue = rublesFromKopecks(
					attributedKopecks + moneyKopecks(doctors.unattributedRevenueRub),
				);
				same(
					org.name,
					"выручка врачей = оплаты, дошедшие до врача через приём",
					attributed,
					money(totals.period_paid_to_doctor),
					[attributed, money(totals.period_paid_to_doctor)],
				);
				/*
				 * «Не отнесено» — это НЕ только платежи без визита. Отчёт группирует по
				 * `appointments.doctor_user_id` после двух левых соединений, поэтому сюда
				 * же попадает платёж по визиту БЕЗ записи в расписании. Своя клиника
				 * держит и такой случай: черновик без записи существует, и разница между
				 * двумя формулами была бы видна числом.
				 */
				same(
					org.name,
					"не отнесено к врачу = оплаты, которым приём не нашёлся",
					money(doctors.unattributedRevenueRub),
					money(totals.period_paid_unattributed),
					[money(doctors.unattributedRevenueRub), money(totals.period_paid_unattributed)],
				);
				const appointmentsInReport = doctorRows.reduce((sum, row) => sum + Number(row.appointmentsTotal ?? 0), 0);
				same(
					org.name,
					"приёмов у врачей = приёмов клиники за период",
					appointmentsInReport,
					Number(totals.period_appointments_with_doctor ?? 0),
					[appointmentsInReport, Number(totals.period_appointments_with_doctor ?? 0)],
				);
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
				/*
				 * Отчёт по услугам датирует позицию по визиту, поэтому его итог — НЕ
				 * «всё назначенное», а «назначенное по визитам периода». Независимый SQL
				 * повторяет именно этот фильтр: сверка с полным назначенным сошлась бы
				 * сегодня по совпадению и разошлась бы на первой позиции без визита.
				 */
				same(
					org.name,
					"назначено услуг = SQL по позициям с визитом в периоде",
					money(services.plannedTotalRub),
					money(totals.period_services_planned),
					[money(services.plannedTotalRub), money(totals.period_services_planned)],
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
				const pointsTotal = rublesFromKopecks(
					sumMoneyKopecks(revenuePoints.map((row) => row.revenueRub)),
				);
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
	/**
	 * Одна попытка автосохранения карты приёма.
	 *
	 * ПОЧЕМУ УСПЕШНАЯ ПОПЫТКА — ТОЛЬКО ПО СВОЕЙ КЛИНИКЕ. Автосохранение на
	 * черновике ПИШЕТ в визит. Писать в черновик живой клиники сценарий не имеет
	 * права: это чужие медицинские данные, и прежняя редакция этого файла честно
	 * печатала «ВНИМАНИЕ: состояние базы изменено этим шагом» — то есть знала, что
	 * делает, но делала. Теперь успех проверяется на своём черновике, а по живым
	 * клиникам берётся только подписанный визит, на котором маршрут обязан
	 * ОТКАЗАТЬ, — то есть ничего не пишется.
	 */
	const tryAutosave = async (
		orgId: string,
		visit: { id: string; patient_id: string },
	): Promise<{ statusCode: number; body: string }> => {
		const clinicToken = signToken({ organizationId: orgId }, authTokenSecret());
		const response = await visitApp.inject({
			method: "PUT",
			url: `/api/visits/${visit.id}/draft/autosave`,
			headers: { "x-dente-clinic-token": clinicToken, "content-type": "application/json" },
			payload: {
				patientId: visit.patient_id,
				selectedSpecialty: "therapist",
				transcript: "сверка цепочки: попытка автосохранения черновика",
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
		return { statusCode: response.statusCode, body: response.body };
	};

	const visitOfStatus = async (orgId: string, status: "draft" | "signed") =>
		(
			await db.execute(sql`
				select id::text as id, patient_id::text as patient_id, status::text as status
				  from visits
				 where organization_id = ${orgId} and status = ${status}
				 order by updated_at desc
				 limit 1
			`)
		).rows[0] as { id: string; patient_id: string; status: string } | undefined;

	try {
		for (const org of orgs) {
			const signed = await visitOfStatus(org.id, "signed");
			const draft = org.id === FIXTURE_ORGANIZATION_ID ? await visitOfStatus(org.id, "draft") : undefined;
			if (!signed && !draft) {
				console.log(`\n«${org.name}»: приёмов в базе нет вовсе — карту приёма открывать не на чем.`);
			} else {
				console.log(`\n«${org.name}»: подписанный визит ${signed?.id ?? "нет"}, свой черновик ${draft?.id ?? "нет"}`);
			}

			if (signed) {
				const clinicToken = signToken({ organizationId: org.id }, authTokenSecret());
				const get = await visitApp.inject({
					method: "GET",
					url: `/api/visits/${signed.id}/draft/autosave`,
					headers: { "x-dente-clinic-token": clinicToken },
				});
				console.log(`  GET  черновик подписанного -> HTTP ${get.statusCode} ${get.body.slice(0, 200)}`);
				if (get.statusCode === 404) {
					console.log(
						"  НАХОДКА ДЛЯ ОЧЕРЕДИ: маршрут отвечает «VisitNotFound / Прием не найден» о приёме, который " +
							"в базе ЕСТЬ. Причина: db/visitsQuery.ts:46 возвращает null для любого не-черновика, а " +
							"routes/visits.ts превращает null в 404 с текстом про отсутствие приёма. Для человека за " +
							"стойкой это «приём потерялся», хотя он подписан. Правка боевого кода в эту задачу не входит.",
					);
				}
				const put = await tryAutosave(org.id, signed);
				console.log(`  PUT  автосохранение подписанного -> HTTP ${put.statusCode} ${put.body.slice(0, 220)}`);
				same(org.name, "подписанный приём отказывает в автосохранении", put.statusCode, 409, [1]);
			} else {
				same(org.name, "подписанный приём отказывает в автосохранении", null, 409, [0]);
			}

			if (draft) {
				const put = await tryAutosave(org.id, draft);
				console.log(`  PUT  автосохранение своего черновика -> HTTP ${put.statusCode} ${put.body.slice(0, 220)}`);
				same(org.name, "черновик приёма принимает автосохранение", put.statusCode, 200, [1]);
			} else if (org.id === FIXTURE_ORGANIZATION_ID) {
				same(org.name, "черновик приёма принимает автосохранение", null, 200, [0]);
			}
		}
	} finally {
		await visitApp.close();
	}

	console.log("\n=== ШАГ 5. ПОСЕВ ПОД ЧИСЛО: ЛЕГЛО ЛИ В БАЗУ ИМЕННО ТО, ЧТО ЗАЯВЛЕНО ===");
	/*
	 * ЗАЧЕМ ЭТИ УТВЕРЖДЕНИЯ, ЕСЛИ ВЫШЕ УЖЕ ВСЁ СВЕРЕНО. Без них «пусто» нельзя
	 * отличить от «посев не состоялся». Сверки выше сравнивают маршрут с базой:
	 * если посева не было вовсе, они дружно сойдутся на нулях и промолчат. Здесь
	 * ожидания — ЛИТЕРАЛЫ замысла: числа названы независимо от того, что легло в
	 * базу, поэтому неудавшийся посев виден расхождением, а не тишиной.
	 *
	 * Ожидания намеренно НЕ выводятся из констант посева: константа, использованная
	 * и при записи, и при проверке, подтверждает саму себя. Литерал здесь — вторая
	 * независимая запись того же замысла.
	 */
	const seeded = (
		await db.execute(sql`
			select
			  (select count(*)::int from appointments where organization_id = ${FIXTURE_ORGANIZATION_ID}) as appointments,
			  (select count(*)::int from visits where organization_id = ${FIXTURE_ORGANIZATION_ID}) as visits,
			  (select count(*)::int from visits
			    where organization_id = ${FIXTURE_ORGANIZATION_ID} and appointment_id is not null) as visits_from_appointment,
			  (select count(*)::int from treatment_items where organization_id = ${FIXTURE_ORGANIZATION_ID}) as items,
			  (select count(*)::int from payments where organization_id = ${FIXTURE_ORGANIZATION_ID}) as payments,
			  (select coalesce(sum(greatest(unit_price_rub * greatest(quantity,1) - discount_rub, 0)),0)::numeric(12,2)
			     from treatment_items
			    where organization_id = ${FIXTURE_ORGANIZATION_ID} and status <> 'cancelled') as planned,
			  (select coalesce(sum(amount_rub),0)::numeric(12,2) from payments
			    where organization_id = ${FIXTURE_ORGANIZATION_ID} and status = 'paid') as paid,
			  (select coalesce(sum(amount_rub),0)::numeric(12,2) from payments
			    where organization_id = ${FIXTURE_ORGANIZATION_ID} and status = 'planned') as advance,
			  (select coalesce(sum(amount_rub),0)::numeric(12,2) from payments
			    where organization_id = ${FIXTURE_ORGANIZATION_ID} and status = 'paid' and visit_id is null) as paid_without_visit,
			  (select coalesce(sum(greatest(unit_price_rub * greatest(quantity,1) - discount_rub, 0)),0)::numeric(12,2)
			     from treatment_items
			    where organization_id = ${FIXTURE_ORGANIZATION_ID} and status = 'cancelled') as cancelled_line
		`)
	).rows[0] as Record<string, unknown>;
	console.log(`посев в базе: ${JSON.stringify(seeded)}`);

	const seedClinic = FIXTURE_ORGANIZATION_NAME;
	same(seedClinic, "посев: приёмов", Number(seeded.appointments ?? 0), 5, [Number(seeded.appointments ?? 0), 5]);
	same(seedClinic, "посев: визитов", Number(seeded.visits ?? 0), 5, [Number(seeded.visits ?? 0), 5]);
	same(seedClinic, "посев: визитов, созданных из записи", Number(seeded.visits_from_appointment ?? 0), 4, [
		Number(seeded.visits_from_appointment ?? 0),
		4,
	]);
	same(seedClinic, "посев: позиций лечения", Number(seeded.items ?? 0), 7, [Number(seeded.items ?? 0), 7]);
	same(seedClinic, "посев: оплат", Number(seeded.payments ?? 0), 6, [Number(seeded.payments ?? 0), 6]);
	same(seedClinic, "посев: назначено", money(seeded.planned), 26_000.5, [money(seeded.planned), 26_000.5]);
	same(seedClinic, "посев: оплачено", money(seeded.paid), 16_800, [money(seeded.paid), 16_800]);
	same(seedClinic, "посев: предоплата в статусе planned", money(seeded.advance), 2_500, [money(seeded.advance), 2_500]);
	same(seedClinic, "посев: оплата без визита", money(seeded.paid_without_visit), 1_000, [
		money(seeded.paid_without_visit),
		1_000,
	]);
	same(seedClinic, "посев: отменённая позиция вне назначенного", money(seeded.cancelled_line), 5_000, [
		money(seeded.cancelled_line),
		5_000,
	]);
	const seedCanon = await canonDebt(FIXTURE_ORGANIZATION_ID);
	same(seedClinic, "посев: дебиторка по канону", seedCanon.receivableRub, 10_000, [seedCanon.receivableRub, 10_000]);
	same(seedClinic, "посев: возврат по канону", seedCanon.refundRub, 800, [seedCanon.refundRub, 800]);
	/*
	 * ТРИ УТВЕРЖДЕНИЯ ПРО КОПЕЙКИ ПОСЕВА — они и есть замок на тот полтинник.
	 *
	 * Ожидания — литералы замысла, не выражения из констант посева: величина
	 * «долг ниже порога» обязана быть названа числом отдельно от того, чем её
	 * посеяли. Если долг 0,50 ₽ из посева исчезнет, все три покраснеют, а реестр
	 * назовёт их по имени — то есть вернуть сверку к «зелено на круглых числах»
	 * молча больше нельзя.
	 */
	same(seedClinic, "посев: полная дебиторка по канону (порога нет)", seedCanon.fullReceivableRub, 10_000.5, [
		seedCanon.fullReceivableRub,
		10_000.5,
	]);
	same(seedClinic, "посев: долг ниже порога отчёта", seedCanon.subThresholdReceivableRub, 0.5, [
		seedCanon.subThresholdReceivableRub,
		0.5,
	]);
	same(seedClinic, "посев: не собрано нетто = полная дебиторка − возврат", seedCanon.netUncollectedRub, 9_200.5, [
		seedCanon.netUncollectedRub,
		9_200.5,
	]);

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

	/*
	 * РЕЕСТР: ЗДЕСЬ ВЫРОЖДЕНИЕ ПЕРЕСТАЁТ БЫТЬ ПРОСТО ПОМЕТКОЙ.
	 *
	 * По живым клиникам вырождение — законный пробел в доказательстве. По СВОЕЙ
	 * клинике, которую сценарий сам сеет, вырождение означает одно из двух:
	 * посев не состоялся или маршрут перестал отдавать данные. И то и другое —
	 * нарушение, потому что иначе прогон вернулся бы к молчаливому зелёному, ради
	 * ухода от которого всё это и написано.
	 */
	const roster = verifyRoster(claims, FIXTURE_ORGANIZATION_NAME, FIXTURE_SUBSTANCE_ROSTER);
	console.log("\n===== РЕЕСТР УТВЕРЖДЕНИЙ ПО СВОЕЙ КЛИНИКЕ =====");
	console.log(`в реестре: ${FIXTURE_SUBSTANCE_ROSTER.length}`);
	if (roster.missing.length === 0 && roster.degenerate.length === 0) {
		console.log("все утверждения реестра выполнены и содержательны");
	}
	for (const label of roster.missing) {
		console.log(`НАРУШЕНИЕ: утверждение «${label}» по своей клинике НЕ выполнялось — проверка потеряна`);
	}
	for (const label of roster.degenerate) {
		console.log(
			`НАРУШЕНИЕ: утверждение «${label}» по своей клинике сравнивало ноль с нулём — ` +
				"посев не состоялся или маршрут перестал отдавать данные",
		);
	}

	/*
	 * СУММЫ, ПОТЕРЯВШИЕ ТОЧНОСТЬ ДО ВХОДА В ПРОГОН.
	 *
	 * Печатается всегда, включая слово «пусто»: пока прежний `money()` округлял
	 * такие суммы про себя, отсутствие строк здесь читалось бы как отсутствие
	 * проблемы, а на деле означало отсутствие датчика. Нарушением не объявляется —
	 * производитель назван, и правка канона в эту задачу не входит.
	 */
	console.log("\n===== СУММЫ, ПОТЕРЯВШИЕ ТОЧНОСТЬ У СВОЕГО ПРОИЗВОДИТЕЛЯ =====");
	if (producerFloatDirt.length === 0) {
		console.log("ни одна сумма не пришла с хвостом плавающей точки");
	} else {
		for (const finding of producerFloatDirt) console.log(`  НАХОДКА: ${finding}`);
		console.log(
			`  всего таких сумм: ${producerFloatDirt.length}. Прогон их приводит к копейке тем же способом, ` +
				"которым производитель приводит свой итог, и называет каждую по имени. Правка производителя " +
				"(managerReports.ts:1145 — вычитание долга пациента в плавающей точке) в эту задачу не входит.",
		);
	}

	for (const complaint of extraViolations) console.log(`НАРУШЕНИЕ: ${complaint}`);

	const violations =
		verdict.failed.length +
		sensorComplaints.length +
		extraViolations.length +
		roster.missing.length +
		roster.degenerate.length;
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
