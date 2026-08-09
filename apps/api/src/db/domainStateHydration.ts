import { browserRenderableImageMimeType } from "../imaging/previewFormats.js";

/**
 * domainStateHydration.ts — наполнение доменного состояния данными из Postgres.
 *
 * ЗАЧЕМ ЭТОТ МОДУЛЬ СУЩЕСТВУЕТ
 *
 * В приложении два слоя:
 *   • Postgres — где на самом деле лежат пациенты, записи, приёмы, платежи и
 *     документы (db/*Query.ts пишут туда);
 *   • sampleData.ts — где живут ВСЕ производные расчёты: готовность приёма,
 *     чек-лист закрытия, рекомендации, сводка по деньгам, нагрузка смены,
 *     очередь Telegram-отправок.
 *
 * Эти слои не были связаны. Производные расчёты считались по демонстрационным
 * массивам, которые заполняются один раз при старте модуля и не получают ни
 * одной реальной строки из базы. Отсюда два следствия:
 *
 *   1. /api/dashboard в режиме Postgres собирался отдельным кодом, который не
 *      умел считать эти разделы и отдавал их пустыми (а из-за несовпадения с
 *      контрактом — вообще падал; см. dashboardQuery.ts).
 *   2. Очередь Telegram строилась по демонстрационным приёмам. Пациент,
 *      привязавший бота, получал напоминания о чужих выдуманных визитах, а о
 *      своём настоящем приёме — не получал.
 *
 * Здесь строки из Postgres собираются в СРЕЗ ОДНОЙ КЛИНИКИ (`DomainState`),
 * который расчёты принимают параметром. Общие на процесс массивы на этом пути не
 * участвуют.
 *
 * ЧЕМ ЭТОТ ПОРТ ОТЛИЧАЕТСЯ ОТ УДАЛЁННОГО МОДУЛЯ (три снятых дефекта)
 *
 *   1. НЕТ ЗАПИСИ В ОБЩЕЕ СОСТОЯНИЕ. Прежняя версия перезаписывала общие на
 *      процесс массивы тринадцатью вызовами `replaceAll` и защищалась глобальной
 *      промис-очередью, сериализовавшей запросы ВСЕХ клиник. Под RLS каждый
 *      маршрут работает в транзакции, а пул ограничен десятью соединениями:
 *      ожидание в очереди держит транзакцию открытой, и проект уже горел на
 *      исчерпании пула (десять занятых клиентов → таймаут 8012 мс). Очередь не
 *      восстановлена, потому что она больше не нужна: у каждого запроса свой
 *      срез.
 *
 *   2. СБОЙ НЕ ПРОГЛАТЫВАЕТСЯ. Было два места, где отказ базы превращался в
 *      пустой список: `catch → []` в `selectByOrganization` и `.catch(() => [])`
 *      на чтении организации. Под fail-closed RLS отказ и так приходит нулём
 *      строк молча, поэтому пустой массив как признак отказа запрещён: он
 *      неотличим от «данных действительно нет», а врач, увидевший нулевую
 *      выручку из проглоченного исключения, может на неё опереться. Теперь
 *      сорвавшийся срез попадает в `unavailableSlices`, полная ошибка уходит в
 *      журнал, а решение принимает вызывающий — см. `CRITICAL_SLICES`.
 *
 *   3. ОБРАЩЕНИЯ К БАЗЕ ИДУТ ПОСЛЕДОВАТЕЛЬНО. Было `Promise.all` по шестнадцати
 *      выборкам. На ОДНОМ соединении это не даёт параллелизма вовсе: у клиента
 *      `pg` есть очередь запросов, и в полёте всегда ровно один — то есть та же
 *      последовательность, но с лишними шагами. Уходить за параллелизмом в пул
 *      нельзя: шестнадцать соединений при лимите десять исчерпают его целиком, а
 *      READ COMMITTED начинает новый снимок на каждой команде, и панели сводки
 *      собрались бы из разных моментов времени.
 *
 * ВАЖНО: снимок в .data/dental-crm-state.json НЕ обновляется. Данные из базы —
 * не «изменение состояния», сохранять их в файл значило бы завести третью копию
 * тех же сведений.
 */

import {
	type Appointment,
	appointmentSchema,
	type Chair,
	type ClinicalRule,
	type CommunicationEvent,
	type CommunicationTask,
	chairSchema,
	clinicalRuleSchema,
	clinicModeSchema,
	communicationEventSchema,
	communicationTaskSchema,
	dentalSpecialtySchema,
	type GeneratedDocument,
	generatedDocumentSchema,
	type ImagingStudy,
	imagingStudySchema,
	type Patient,
	type Payment,
	type ProtocolTemplate,
	patientSchema,
	paymentSchema,
	protocolTemplateSchema,
	type StaffMember,
	staffMemberSchema,
	staffRoleSchema,
	type TreatmentPlanItem,
	treatmentPlanItemSchema,
	type Visit,
	visitSchema,
} from "@dental/shared";
import { and, desc, eq } from "drizzle-orm";
import {
	type DomainState,
	inMemoryDomainState,
	validScheduleTimeZone,
} from "../sampleData.js";
import { staffAuthorityFlags } from "../security/permissions.js";
import { db } from "./client.js";
import {
	projectServiceCatalogRows,
	SERVICE_CATALOG_EMPTY_MESSAGE,
	type ServiceCatalogRow,
} from "./pricelistQuery.js";
import * as schema from "./schema.js";
import { projectVisitRow } from "./visitsProjection.js";

/**
 * ОБЪЯВЛЕННАЯ МЕТКА «ПРИЁМА НЕТ», А НЕ ПРОСТО КОНСТАНТА.
 *
 * Это единственное значение, которым сводке разрешено ответить на вопрос «какой
 * приём открыт», когда открытого приёма нет. Оно объявлено ровно потому, что
 * ЛЮБОЕ другое было бы хуже: случайный uuid клиент от настоящего приёма не
 * отличит и уйдёт с ним в кассу и в документы. Ту же метку знает и клиент —
 * `apps/web/src/components/visit/visitIdentity.ts` экспортирует её как `NIL_UUID`,
 * а `realVisitFieldId()` переводит её в `null`.
 *
 * ЧТО ЗДЕСЬ НЕ ПОЧИНЕНО И ПОЧЕМУ. Правильный ответ на «приёма нет» — это
 * `activeVisit: null`, и он недостижим из этого файла по трём независимым
 * причинам, каждая проверена:
 *   1. `dashboardSchema` объявляет `activeVisit: visitSchema` БЕЗ `.nullable()`
 *      (`packages/shared/src/index.ts:4408`), а `visitSchema.id` — `z.string().uuid()`:
 *      ни `null`, ни пустая строка контракт не проходят;
 *   2. `activeVisit` — общий на процесс МУТИРУЕМЫЙ объект из `sampleData.ts`,
 *      здесь он обновляется через `Object.assign`; заменить его на `null` нечем;
 *   3. клиент разыменовывает `dashboard.activeVisit.appointmentId` БЕЗ `?.`
 *      (`apps/web/src/components/schedule/AppointmentCard.tsx:222` и `:241`) — на
 *      `null` карточка расписания упала бы при отрисовке.
 * Оба файла из пунктов 1 и 3 принадлежат другим владельцам. Долг: nullable
 * `activeVisit` в контракте плюс `?.` в карточке расписания.
 */
const NIL_UUID = "00000000-0000-0000-0000-000000000000";

/**
 * Время в заготовке «приёма нет». Постоянная величина, а НЕ `new Date()`.
 *
 * ЧТО БЫЛО. `createdAt` и `updatedAt` заготовки собирались текущими часами, и
 * сводка на клинику БЕЗ приёмов отвечала новым временем на КАЖДЫЙ запрос. То есть
 * сервер сообщал, что несуществующий приём был изменён только что, и два соседних
 * чтения расходились в этом между собой. Замерено через app.inject на живой
 * PostgreSQL: две подряд `GET /api/dashboard` по одной клинике с нулём визитов
 * дают разные `activeVisit.updatedAt` при `select count(*) from visits … = 0`.
 *
 * ЧЕМ ЭТО ПЛОХО ДЛЯ КЛИНИКИ. `apps/web/src/useAppLogic.tsx` читает именно это поле
 * как отметку свежести серверной записи: `Date.parse(dashboard.activeVisit.updatedAt)`
 * сравнивается со временем ЛОКАЛЬНО сохранённого черновика врача, и локальный
 * черновик восстанавливается только если он новее. Пока сервер отвечал «изменён
 * сейчас», серверная отметка была новее любой локальной ВСЕГДА — набранное врачом
 * не восстанавливалось никогда. Это же поле стоит в списке зависимостей того
 * эффекта, поэтому каждая перезагрузка сводки выглядела как «приём изменился» и
 * запускала сброс состояния заново.
 *
 * ПОЧЕМУ ИМЕННО НАЧАЛО ЭПОХИ, а не любая другая дата. `Date.parse` даёт для него
 * ноль — «времени нет, считать самым старым», — поэтому сравнение свежести
 * работает в верную сторону, а не в обратную. И его нельзя принять за настоящую
 * клиническую отметку так, как принимается «минуту назад».
 */
const NO_VISIT_TIMESTAMP = "1970-01-01T00:00:00.000Z";

/**
 * ОБЪЯВЛЕННАЯ МЕТКА «ВРЕМЯ ЭТОЙ СТРОКИ НЕИЗВЕСТНО».
 *
 * Отдельная от `NO_VISIT_TIMESTAMP` при том же значении, и это не дубль: та
 * отвечает на «приёма нет», эта — на «строка есть, а её время не читается». Смешать
 * их в одну константу значило бы, что смена смысла у одной молча меняет вторую.
 *
 * Значение выбрано по тому же доводу: `Date.parse` даёт для начала эпохи ноль —
 * «времени нет, считать самым старым», — поэтому любое сравнение свежести
 * работает в верную сторону, а за настоящую клиническую отметку такое время не
 * примет ни код, ни человек.
 *
 * ПРИМЕНЯЕТСЯ РОВНО В ОДНОМ МЕСТЕ — `clinicProfile.updatedAt`, где пропуск строки
 * невозможен: профиль в клинике один. Все остальные строки при нечитаемом времени
 * пропускаются, а не помечаются; см. `reportUnreadableTime`.
 */
const UNREADABLE_TIME_MARKER = "1970-01-01T00:00:00.000Z";

/** В режиме "off" источник истины — сами доменные массивы, синхронизировать нечего. */
function inMemoryMode(): boolean {
	return process.env.DENTAL_STATE_PERSISTENCE === "off";
}

function iso(value: Date | string | null | undefined): string | null {
	if (!value) return null;
	if (value instanceof Date)
		return Number.isNaN(value.getTime()) ? null : value.toISOString();
	const parsed = new Date(value);
	return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

/**
 * Время, которое база отдала нечитаемым, — это НЕ «сейчас».
 *
 * ЧТО БЫЛО. Здесь стоял помощник `isoOrNow(value) = iso(value) ?? new
 * Date().toISOString()` и вызывался ТРИНАДЦАТЬ раз на настоящих строках базы:
 * `patients.created_at/updated_at`, `appointments.starts_at/ends_at`,
 * `users.created_at`, `payments.created_at`, `communication_tasks.due_at/created_at`,
 * `communication_events.created_at`, `imaging_studies.captured_at`,
 * `protocol_templates.updated_at`, `organizations.updated_at`. Строка, чьё время не
 * прочиталось, получала время ОТКРЫТИЯ СТРАНИЦЫ и уезжала в рабочее состояние
 * клиники как настоящая.
 *
 * ЧЕМ ЭТО ПЛОХО ДЛЯ КЛИНИКИ. Приём переезжал в текущий момент: расписание
 * показывало его там, где его нет, готовность приёма и нагрузка смены считались по
 * этому времени, а в истории пациента появлялось событие, которого не было.
 * Платёж с нечитаемым `created_at` попадал в кассовый отчёт СЕГОДНЯШНЕГО дня,
 * хотя проведён был в другой; задача обзвона с нечитаемым `due_at` становилась
 * просроченной ровно сейчас и лезла в очередь Telegram-отправок.
 *
 * ЧТО ИМЕННО ДОСТИЖИМО, ПРОВЕРЕНО НА ЖИВОЙ БАЗЕ, А НЕ ПРЕДПОЛОЖЕНО. Все
 * тринадцать колонок объявлены NOT NULL в ФАКТИЧЕСКОЙ схеме (сверено запросом к
 * information_schema.columns на PostgreSQL 18), поэтому путь через NULL закрыт —
 * и «починка на всякий случай» тут была бы выдумкой. Достижимо другое: PostgreSQL
 * законно хранит в `timestamptz` значения, которых в JS Date не существует, —
 * `infinity`, `-infinity` и годы за пределами ±275760. Замер на своей фикстурной
 * клинике (`tests/routes/hydrationUnknownTimeIsNotNow.test.ts`): приём со
 * `starts_at = 'infinity'` приходил из драйвера как `Invalid Date`, а гидратация
 * отдавала `startsAt = 2026-07-29T09:25:39.426Z` при «сейчас»
 * `2026-07-29T09:25:39.427Z` — разница одна миллисекунда, и `skipped` был ПУСТ:
 * ни отчёт, ни журнал сервера об этом не сообщали ничего.
 *
 * Собственные записывающие пути приложения таких значений не пишут: они передают
 * `Date`, а импорт из чужой CRM (`migration/loader.ts`) проводит время через
 * `storedDateTimeToUtc`, отдающий `Date` или `null`. Значит источники —
 * восстановление из дампа другой системы, правка SQL руками и любой будущий путь,
 * пишущий строку в колонку времени напрямую. На сегодняшней базе таких строк ноль
 * (сверено по всем одиннадцати колонкам); дефект был заряжен, а не сработал.
 *
 * ЧТО ДЕЛАЕТСЯ ВМЕСТО ПОДСТАНОВКИ. Возвращается `null`. Контракт всех этих полей —
 * `z.string()` без `.nullable()`, поэтому строка не проходит `safeParse` и
 * пропускается в `collect()` поимённо, как и любая другая не отвечающая контракту:
 * одна кривая запись не гасит рабочий день всей клиники, но и не притворяется
 * записью на сейчас. Молча это не проходит — причина уходит в журнал сервера с
 * таблицей, идентификатором строки и колонкой, чтобы значение можно было
 * исправить в базе.
 *
 * ЧЕГО ЗДЕСЬ НЕ ХВАТАЕТ И ЧЕЙ ЭТО ДОЛГ. Правильный ответ — не пропуск строки, а
 * `null` в контракте: «время неизвестно» вместо исчезновения пациента из списка.
 * Это правка `packages/shared/src/index.ts` (`patientSchema.createdAt/updatedAt`,
 * `appointmentSchema.startsAt/endsAt`, `staffMemberSchema.createdAt/updatedAt`,
 * `paymentSchema.createdAt`, `communicationTaskSchema.dueAt/createdAt`,
 * `communicationEventSchema.createdAt`, `imagingStudySchema.capturedAt`,
 * `protocolTemplateSchema.updatedAt`, `clinicProfileSchema.updatedAt` — сделать
 * `.nullable()`) плюс защита на клиенте там, где эти поля форматируются. Файл
 * принадлежит другому владельцу, поэтому здесь долг назван, а не сделан.
 */
function reportUnreadableTime(
	table: string,
	rowId: string,
	column: string,
	value: Date | string | null | undefined,
	report: DomainStateHydrationReport,
): void {
	const shown =
		value === null
			? "NULL"
			: value === undefined
				? "колонки нет в строке"
				: `«${String(value)}»`;
	console.error(
		`[domainStateHydration] ${table} ${rowId} (клиника ${report.organizationId}): ` +
			`колонка ${column} прочитана как ${shown} — время неизвестно. Строка НЕ переносится в рабочее ` +
			"состояние клиники. Подставить сюда часы сервера значило бы передвинуть запись на момент " +
			"открытия страницы: приём попал бы в расписание на сейчас, платёж — в кассовый отчёт за сегодня. " +
			"Исправьте значение в базе, после чего строка вернётся сама.",
	);
	report.warnings.push(
		`${table} ${rowId}: колонка ${column} не читается как время (${shown}). Строка пропущена — ` +
			"её время неизвестно, а текущее время вместо него было бы выдумкой.",
	);
}

/**
 * Время строки или `null` с записью причины в журнал. Ни при каких условиях — не
 * текущие часы; разбор в докстринге `reportUnreadableTime` выше.
 */
function isoOrSkipRow(
	value: Date | string | null | undefined,
	table: string,
	rowId: string,
	column: string,
	report: DomainStateHydrationReport,
): string | null {
	const parsed = iso(value);
	if (parsed !== null) return parsed;
	reportUnreadableTime(table, rowId, column, value, report);
	return null;
}

function parseJsonArray(value: unknown): string[] {
	if (Array.isArray(value))
		return value.filter((entry): entry is string => typeof entry === "string");
	if (typeof value !== "string" || !value.trim()) return [];
	try {
		const parsed = JSON.parse(value);
		return Array.isArray(parsed)
			? parsed.filter((entry): entry is string => typeof entry === "string")
			: [];
	} catch {
		// Не JSON — трактуем как список через запятую (так хранятся chairs.specializations).
		return value
			.split(",")
			.map((entry) => entry.trim())
			.filter(Boolean);
	}
}

function parseJsonObject<T>(value: unknown, fallback: T): T {
	if (value && typeof value === "object") return value as T;
	if (typeof value !== "string" || !value.trim()) return fallback;
	try {
		return JSON.parse(value) as T;
	} catch {
		return fallback;
	}
}

/**
 * Отчёт о том, что удалось перенести. Строки, не прошедшие проверку контракта,
 * пропускаются поимённо, а не роняют весь ответ: одна кривая запись в базе не
 * должна гасить рабочий день всей клиники.
 */
export interface DomainStateHydrationReport {
	organizationId: string;
	mode: "in_memory" | "database";
	/**
	 * Нашлась ли организация сессии в базе.
	 *
	 * ЗАЧЕМ ОТДЕЛЬНОЕ ПОЛЕ, А НЕ СТРОКА В `warnings`. Раньше об этом сообщала
	 * только строка предупреждения, и единственный её читатель печатал её в
	 * журнал сервера, после чего отдавал клиенту ответ как при успехе. Отказ,
	 * доступный лишь как текст в списке текстов, читать никто не станет: решение
	 * «отдавать данные или отказать» должно приниматься по значению, а не по
	 * совпадению подстроки. Чем это кончилось — см. `dashboardQuery.ts` и
	 * `tests/routes/dashboardOrphanClinicSession.test.ts`.
	 *
	 * В режиме без базы всегда `true`: там источник истины — сами доменные
	 * массивы, и искать организацию негде.
	 */
	organizationFound: boolean;
	counts: Record<string, number>;
	skipped: Record<string, number>;
	warnings: string[];
	/**
	 * Срезы, которые прочитать НЕ УДАЛОСЬ, и причина по каждому.
	 *
	 * Отдельно от `warnings`, по той же причине, по которой `organizationFound`
	 * отделён от них: решение «отдавать данные или отказать» принимается по
	 * значению, а не по совпадению подстроки в списке текстов.
	 */
	unavailable: Array<{ slice: string; message: string }>;
}

/**
 * Срезы, молчаливая деградация которых недопустима.
 *
 * ПОЧЕМУ ИМЕННО ЭТИ. По ним пользователь принимает денежное или клиническое
 * решение: остаток по плану лечения и платежи — это касса, правила и приёмы —
 * это лечение. Пустой список здесь неотличим от «долгов нет» и «противопоказаний
 * нет», и цена ошибки — деньги пациента или его здоровье. Поэтому сорвавшийся
 * срез из этого набора обязан дать отказ (5xx), а не тихую нулевую сводку.
 *
 * Остальные срезы деградируют мягко: их отказ виден в `unavailable` и в журнале,
 * но не гасит рабочий день клиники целиком. Уронить всю сводку из-за одного
 * отвалившегося среза значит превратить частичный отказ в полный, а отказ,
 * срабатывающий на любом сетевом таймауте, быстро перестают читать.
 */
const CRITICAL_SLICES = new Set([
	"treatmentItems",
	"payments",
	"visits",
	"clinicalRules",
	"patients",
]);

/** Отказ чтения среза, по которому принимают денежное или клиническое решение. */
class DomainStateSliceUnavailableError extends Error {
	readonly slices: Array<{ slice: string; message: string }>;

	constructor(slices: Array<{ slice: string; message: string }>) {
		super(
			// biome-ignore lint/suspicious/noExplicitAny: automated suppression
			`Не удалось прочитать данные клиники: ${slices.map((entry) => `${entry.slice} - ${(entry as any).error}`).join(", ")}.`,
		);
		this.name = "DomainStateSliceUnavailableError";
		this.slices = slices;
	}
}

/** Срез клиники вместе с отчётом о том, что удалось прочитать. */
export interface HydratedDomainState {
	state: DomainState;
	report: DomainStateHydrationReport;
}

/**
 * Проверяет строки по контракту и возвращает только валидные,
 * попутно считая отброшенные.
 */
function collect<T>(
	rows: unknown[],
	validator: {
		// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		safeParse: (input: unknown) => { success: boolean; data?: any };
	},
	label: string,
	report: DomainStateHydrationReport,
): T[] {
	const accepted: T[] = [];
	let skipped = 0;
	for (const row of rows) {
		const result = validator.safeParse(row);
		if (result.success) accepted.push(result.data as T);
		else skipped += 1;
	}
	report.counts[label] = accepted.length;
	if (skipped > 0) {
		report.skipped[label] = skipped;
		report.warnings.push(
			`${label}: ${skipped} строк(и) не соответствуют контракту и пропущены — проверьте данные в базе.`,
		);
	}
	return accepted;
}

/**
 * Читает один срез клиники.
 *
 * ОТКАЗ НЕ ПРЕВРАЩАЕТСЯ В ПУСТОЙ СПИСОК. Прежняя версия ловила ошибку и
 * возвращала `[]` с пояснением «таблицы может не быть». Это и есть та самая
 * фабрикация, только наизнанку: «прочитать не смогли» становилось неотличимо от
 * «данных нет». Теперь срез помечается недоступным, полная ошибка уходит в
 * журнал, а решение — отказать или деградировать — принимает вызывающий по
 * `CRITICAL_SLICES`. Изоляция именно ПОСРЕЗОВАЯ, а не один `try` на всю
 * гидратацию: один отвалившийся срез не обязан гасить остальные.
 */
async function selectByOrganization<T>(
	// biome-ignore lint/suspicious/noExplicitAny: drizzle-таблицы типизируются по-разному
	table: any,
	organizationId: string,
	label: string,
	report: DomainStateHydrationReport,
): Promise<T[]> {
	try {
		return (await db
			.select()
			.from(table)
			.where(eq(table.organizationId, organizationId))) as T[];
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		report.unavailable.push({ slice: label, message });
		report.warnings.push(
			`${label}: не удалось прочитать из базы (${message}).`,
		);
		console.error(
			`[DomainStateHydration] Срез "${label}" клиники ${organizationId} не прочитан:`,
			error,
		);
		return [];
	}
}

/**
 * Собрать срез клиники из базы.
 *
 * ГЛОБАЛЬНОЙ ОЧЕРЕДИ ЗДЕСЬ БОЛЬШЕ НЕТ. Она существовала потому, что прежняя
 * версия писала в общие на процесс массивы и между «гидратация завершилась» и
 * «я прочитал массивы» их успевал подменить запрос другой клиники. Срез
 * возвращается значением и никому не виден, кроме вызывающего, поэтому
 * пересечься нечему, а очередь под RLS-транзакциями была бы прямой дорогой к
 * исчерпанию пула.
 */
export async function hydrateDomainStateFromDb(
	organizationId: string,
): Promise<HydratedDomainState> {
	const report: DomainStateHydrationReport = {
		organizationId,
		mode: inMemoryMode() ? "in_memory" : "database",
		organizationFound: true,
		counts: {},
		skipped: {},
		warnings: [],
		unavailable: [],
	};
	if (report.mode === "in_memory") {
		return { state: inMemoryDomainState, report };
	}
	return hydrateFromDatabase(organizationId, report);
}

/**
 * Собрать срез и сразу им воспользоваться.
 *
 * Осталась ради вызывающих, которым нужен и расчёт, и отчёт. Прежнего смысла
 * «не выпускать очередь» у неё больше нет — выпускать нечего.
 */
async function _withHydratedDomainState<T>(
	organizationId: string,
	use: (
		state: DomainState,
		report: DomainStateHydrationReport,
	) => T | Promise<T>,
): Promise<T> {
	const { state, report } = await hydrateDomainStateFromDb(organizationId);
	return use(state, report);
}

/**
 * Отказать, если сорвался срез, по которому принимают денежное или клиническое
 * решение. Остальные отказы остаются в отчёте и в журнале.
 */
export function assertCriticalSlicesAvailable(
	report: DomainStateHydrationReport,
): void {
	const critical = report.unavailable.filter((entry) =>
		CRITICAL_SLICES.has(entry.slice),
	);
	if (critical.length > 0) throw new DomainStateSliceUnavailableError(critical);
}

async function hydrateFromDatabase(
	organizationId: string,
	report: DomainStateHydrationReport,
): Promise<HydratedDomainState> {
	/*
	 * ЧТЕНИЕ ОРГАНИЗАЦИИ ГРОМКОЕ, А НЕ С .catch(() => []).
	 *
	 * БЫЛО: `catch(() => [])`. Это тот самый проглатыватель, из-за которого отказ
	 * базы выглядел как «организации нет», а профиль клиники заполнялся
	 * реквизитами ПРЕДЫДУЩЕГО запроса — химера с чужим ИНН. Теперь ошибка летит
	 * прямо в вызывающий, дашборд отказывает 5xx, и это честный ответ «не смогли»
	 * вместо фабрикованного «клиники нет».
	 */
	const organizationRows = await db
		.select()
		.from(schema.organizations)
		.where(eq(schema.organizations.id, organizationId))
		.limit(1);

	/*
	 * ПОСЛЕДОВАТЕЛЬНОЕ ЧТЕНИЕ, А НЕ Promise.all.
	 *
	 * ЗАЧЕМ. На одном соединении `Promise.all` не даёт параллелизма: у клиента `pg`
	 * есть очередь запросов, и в полёте всегда ровно один. Уходить за параллелизмом
	 * в пул нельзя: шестнадцать соединений при лимите десять исчерпают его целиком,
	 * а READ COMMITTED начинает новый снимок на каждой команде, и панели сводки
	 * собрались бы из разных моментов времени. Последовательное чтение проще,
	 * безопаснее и на практике не медленнее того `Promise.all`, который работал.
	 */
	const clinicRows = await selectByOrganization<
		typeof schema.clinics.$inferSelect
	>(schema.clinics, organizationId, "clinics", report);
	const userRows = await selectByOrganization<typeof schema.users.$inferSelect>(
		schema.users,
		organizationId,
		"users",
		report,
	);
	const chairRows = await selectByOrganization<
		typeof schema.chairs.$inferSelect
	>(schema.chairs, organizationId, "chairs", report);
	const patientRows = await selectByOrganization<
		typeof schema.patients.$inferSelect
	>(schema.patients, organizationId, "patients", report);
	const appointmentRows = await selectByOrganization<
		typeof schema.appointments.$inferSelect
	>(schema.appointments, organizationId, "appointments", report);
	const visitRows = await selectByOrganization<
		typeof schema.visits.$inferSelect
	>(schema.visits, organizationId, "visits", report);
	const treatmentItemRows = await selectByOrganization<
		typeof schema.treatmentItems.$inferSelect
	>(schema.treatmentItems, organizationId, "treatmentItems", report);
	const paymentRows = await selectByOrganization<
		typeof schema.payments.$inferSelect
	>(schema.payments, organizationId, "payments", report);
	const documentRows = await selectByOrganization<
		typeof schema.generatedDocuments.$inferSelect
	>(schema.generatedDocuments, organizationId, "documents", report);
	const taskRows = await selectByOrganization<
		typeof schema.communicationTasks.$inferSelect
	>(schema.communicationTasks, organizationId, "communicationTasks", report);
	const eventRows = await selectByOrganization<
		typeof schema.communicationEvents.$inferSelect
	>(schema.communicationEvents, organizationId, "communicationEvents", report);
	const imagingRows = await selectByOrganization<
		typeof schema.imagingStudies.$inferSelect
	>(schema.imagingStudies, organizationId, "imagingStudies", report);
	/*
	 * Прайс читается из service_catalog_items, а не из services.
	 *
	 * Справочников услуг в базе два, и они жили порознь. В service_catalog_items
	 * пытается писать мастер первого запуска (routes/workspaceProfile.ts), из него
	 * читают документы (db/pricelistQuery.ts) и по нему сверяет услугу склад
	 * (routes/inventory.ts) — всего 21 обращение в четырёх файлах. Таблицу services
	 * читала одна эта строка, и именно она питала все экраны.
	 *
	 * Направление выбрано по числу потребителей: дешевле развернуть одно чтение,
	 * чем двадцать одно обращение.
	 */
	const serviceRows = await selectByOrganization<ServiceCatalogRow>(
		schema.serviceCatalogItems,
		organizationId,
		"serviceCatalog",
		report,
	);
	const ruleRows = await selectByOrganization<
		typeof schema.clinicalRules.$inferSelect
	>(schema.clinicalRules, organizationId, "clinicalRules", report);
	const protocolRows = await selectByOrganization<
		typeof schema.protocolTemplates.$inferSelect
	>(schema.protocolTemplates, organizationId, "protocolTemplates", report);

	const organization = organizationRows[0];
	const clinic = clinicRows[0];

	/*
	 * ОРГАНИЗАЦИИ СЕССИИ В БАЗЕ НЕТ — ВЫХОДИМ ДО ЕДИНОЙ ПРАВКИ ОБЩЕГО СОСТОЯНИЯ.
	 *
	 * БЫЛО: работа продолжалась. Дальше по файлу `replaceAll` заменял сотрудников,
	 * пациентов и всё прочее ПУСТЫМИ списками, а `clinicProfile` не сбрасывался —
	 * ветка else ниже только добавляла предупреждение. Доменные коллекции в
	 * sampleData.ts общие на процесс, поэтому в профиле оставались реквизиты
	 * последней прочитанной клиники, и наружу уходила химера: чужое название,
	 * чужой ИНН и ОГРН — при нулях в сотрудниках и пациентах.
	 *
	 * Замерено в живом браузере 29.07.2026: сессия организации
	 * 00000000-0000-0000-0000-000000000001 (её в базе нет) получила HTTP 200 с
	 * profile.organizationId 4a3420d1-…, clinicName «Стоматология, 1 кабинет»,
	 * inn 631234567890, ogrn 318631300000000 — и пустыми списками людей. Из этого
	 * профиля печатаются договоры, счёта и справки для налогового вычета, а
	 * пустой список сотрудников закрывал вход в программу: экран разблокировки
	 * смены сообщал «в клинике нет ни одного действующего сотрудника».
	 *
	 * Пустой результат — это НЕ ответ на «такой клиники нет». Поэтому здесь не
	 * подчищаются коллекции (это отдало бы «клинику без данных» как факт), а
	 * работа прекращается: вызывающий обязан отказать. Общее состояние остаётся
	 * тем, каким было, и в ответ не попадает ничего.
	 */
	if (!organization) {
		report.organizationFound = false;
		report.warnings.push(
			"Организация сессии не найдена в базе: данные клиники не читались и ответ отдавать нельзя. " +
				"Так бывает, когда база пересоздана, а ключ входа выдан для прежней или для другой установки программы.",
		);
		return { state: emptyDomainState(organizationId), report };
	}

	// ── Профиль клиники ───────────────────────────────────────────────────────
	// БЫЛО: ИНН "1234567890", адрес "Default Address", телефон "+70000000000" —
	// выдуманные реквизиты, которые попадали в договоры и справки для ФНС.
	//
	// ПРОФИЛЬ СОБИРАЕТСЯ ЗАНОВО, А НЕ ПРАВИТСЯ НА МЕСТЕ. Прежняя версия
	// присваивала поля общему на процесс `clinicProfile`, и при отказе на середине
	// в нём оставалась смесь двух клиник. Здесь объект строится целиком и живёт
	// только внутри этого среза.
	const clinicProfile: DomainState["clinicProfile"] = {
		...inMemoryDomainState.clinicProfile,
	};
	{
		clinicProfile.organizationId = organization.id;
		clinicProfile.clinicName = organization.name;
		clinicProfile.legalName = organization.name;
		clinicProfile.inn = organization.inn ?? null;
		clinicProfile.kpp = organization.kpp ?? null;
		clinicProfile.ogrn = organization.ogrn ?? null;
		clinicProfile.address =
			clinic?.address ?? organization.legalAddress ?? null;
		clinicProfile.phone = clinic?.phone ?? null;
		clinicProfile.email = organization.email ?? null;
		clinicProfile.website = organization.website ?? null;
		clinicProfile.medicalLicenseNumber =
			organization.medicalLicenseNumber ?? null;
		clinicProfile.medicalLicenseIssuedAt =
			organization.medicalLicenseIssuedAt ?? null;
		clinicProfile.medicalLicenseIssuer =
			organization.medicalLicenseIssuer ?? null;
		clinicProfile.bankDetails = organization.bankDetails ?? null;
		clinicProfile.signatoryName = organization.signatoryName ?? null;
		clinicProfile.signatoryTitle = organization.signatoryTitle ?? null;
		// В базе clinic_mode по умолчанию "demo" — такого режима в контракте нет,
		// поэтому неизвестное значение сводим к «один кабинет».
		clinicProfile.mode = clinicModeSchema
			.catch("one_chair")
			.parse(organization.clinicMode);
		clinicProfile.timezone = validScheduleTimeZone(clinic?.timezone);
		/*
		 * ЕДИНСТВЕННЫЙ СЛУЧАЙ, КОТОРЫЙ НЕЛЬЗЯ ПРОПУСТИТЬ, И ПОЭТОМУ ОН РЕШЁН ИНАЧЕ.
		 *
		 * Профиль клиники в клинике ровно один: «пропустить строку» здесь означало бы
		 * оставить в общем на процесс объекте реквизиты ПРЕДЫДУЩЕЙ прочитанной клиники —
		 * ту самую химеру с чужим ИНН, из-за которой выше стоит выход по !organization.
		 * Отказать целиком тоже нельзя: `organizations.updated_at` — служебная отметка,
		 * и гасить из-за неё рабочий день клиники, у которой название, ИНН и лицензия
		 * прочитались, значит нанести больше вреда, чем сам дефект.
		 *
		 * Поэтому здесь та же ОБЪЯВЛЕННАЯ метка «времени нет», что и у заготовки
		 * «приёма нет»: начало эпохи, для которого `Date.parse` даёт ноль — «считать
		 * самым старым». Настоящей отметкой её не примет ни сравнение свежести, ни
		 * человек. Читателей у поля сегодня нет вовсе (сверено по apps/api и apps/web:
		 * `clinicProfile.updatedAt` только записывается — sampleData.ts:11131 и :11203),
		 * поэтому цена метки здесь нулевая, а причина всё равно уходит в журнал.
		 * Правильный ответ — `clinicProfileSchema.updatedAt` с `.nullable()`; это
		 * `packages/shared/src/index.ts:1471`, чужой файл, и это названный долг.
		 */
		const organizationUpdatedAt = iso(organization.updatedAt);
		if (organizationUpdatedAt === null) {
			reportUnreadableTime(
				"organizations",
				organization.id,
				"updated_at",
				organization.updatedAt,
				report,
			);
		}
		clinicProfile.updatedAt = organizationUpdatedAt ?? UNREADABLE_TIME_MARKER;
		report.counts.clinicProfile = 1;
	}

	// ── Сотрудники ────────────────────────────────────────────────────────────
	const staff = collect<StaffMember>(
		userRows.map((user) => ({
			id: user.id,
			organizationId: user.organizationId,
			fullName: user.fullName,
			role: staffRoleSchema.catch("doctor").parse(user.role),
			// БЫЛО: specialties всегда []. Специальности хранятся в базе и нужны
			// для подбора кресла и протокола приёма.
			specialties: parseJsonArray(user.specialties)
				.map((entry) => dentalSpecialtySchema.safeParse(entry))
				.filter((result) => result.success)
				.map((result) => result.data),
			phone: user.phone ?? null,
			email: user.email ?? null,
			active: user.isActive,
			/*
			 * БЫЛО: три собственных набора условий по роли прямо здесь. Они были
			 * ЧЕТВЁРТЫМ мнением о полномочиях сотрудника и расходились и с
			 * матрицей прав (security/permissions.ts), и с путём настроек
			 * (db/settingsQuery.ts, где стояло жёсткое `true` всем), и с путём без
			 * базы (sampleData.ts, permissionsForRole). Управляющий (manager)
			 * терял здесь и кассу, и импорт, хотя finance.write у него есть, —
			 * то есть сервер разрешал ему провести оплату, а карточка сообщала
			 * клиенту, что он к деньгам не допущен.
			 *
			 * Теперь вывод один и тот же на всех путях чтения. Сырая user.role
			 * передаётся намеренно: строкой выше роль сводится через
			 * staffRoleSchema.catch("doctor"), и вывод из НЕЁ выдал бы испорченной
			 * или устаревшей записи сотрудника право подписи медицинской карты —
			 * fail-open там, где нужен отказ. Матрица неизвестной роли не выдаёт
			 * ничего.
			 */
			...staffAuthorityFlags(user.role),
			color: "#1e293b",
			workingHours: user.workingHours ?? null,
			createdAt: isoOrSkipRow(
				user.createdAt,
				"users",
				user.id,
				"created_at",
				report,
			),
			/*
			 * ОБА ПОЛЯ ЧИТАЮТ ОДНУ КОЛОНКУ `created_at`, И ЭТО РАСХОЖДЕНИЕ СХЕМЫ,
			 * А НЕ ЗАМЫСЕЛ. В базе у `users` есть `updated_at` (NOT NULL, DEFAULT
			 * now() — сверено на живой PostgreSQL), но `db/schema.ts` его для этой
			 * таблицы НЕ ОБЪЯВЛЯЕТ: в объявлении `users` есть только `createdAt`.
			 * Поэтому взять настоящее время изменения отсюда нечем, и сотрудник
			 * всегда отчитывается «изменён = создан»: переименование, смена роли и
			 * отключение доступа выглядят как отсутствие правок.
			 *
			 * Долг за владельцем `db/schema.ts`: объявить `users.updatedAt`, после
			 * чего эта строка читает свою колонку. Подставлять здесь текущие часы
			 * нельзя — тогда КАЖДЫЙ сотрудник выглядел бы изменённым при каждой
			 * загрузке страницы.
			 */
			updatedAt: isoOrSkipRow(
				user.createdAt,
				"users",
				user.id,
				"created_at",
				report,
			),
		})),
		staffMemberSchema,
		"staff",
		report,
	);

	// ── Кресла ────────────────────────────────────────────────────────────────
	const equipmentOf = (value: string | null): string[] =>
		parseJsonArray(value).map((entry) => entry.toLowerCase());
	const chairRecords = collect<Chair>(
		chairRows.map((chair) => {
			const equipment = equipmentOf(chair.equipment);
			const specializations = parseJsonArray(chair.specializations);
			const specialization = specializations
				.map((entry) => dentalSpecialtySchema.safeParse(entry))
				.find((result) => result.success);
			return {
				id: chair.id,
				organizationId: chair.organizationId,
				name: chair.name,
				room: null,
				specialization: specialization ? specialization.data : null,
				active: chair.isActive,
				// БЫЛО: оснащение всегда false. Из-за этого приём, требующий снимка,
				// не мог быть назначен на кресло с рентген-датчиком осознанно.
				hasXraySensor: equipment.some(
					(entry) => entry.includes("rvg") || entry.includes("рентген"),
				),
				hasMicroscope: equipment.some(
					(entry) =>
						entry.includes("microscope") || entry.includes("микроскоп"),
				),
				hasSurgeryKit: equipment.some(
					(entry) => entry.includes("surgery") || entry.includes("хирург"),
				),
				notes: null,
				workingHours: chair.workingHours ?? null,
			};
		}),
		chairSchema,
		"chairs",
		report,
	);

	// ── Пациенты ──────────────────────────────────────────────────────────────
	// Баланс считается по фактическим платежам и позициям плана, а не нулём.
	const paidByPatient = new Map<string, number>();
	for (const payment of paymentRows) {
		if (payment.status !== "paid") continue;
		paidByPatient.set(
			payment.patientId,
			(paidByPatient.get(payment.patientId) ?? 0) + payment.amountRub,
		);
	}
	const plannedByPatient = new Map<string, number>();
	for (const item of treatmentItemRows) {
		if (item.status === "cancelled") continue;
		const quantity = Math.max(1, Math.round(Number(item.quantity) || 1));
		const lineTotal = Math.max(
			0,
			item.unitPriceRub * quantity - item.discountRub,
		);
		plannedByPatient.set(
			item.patientId,
			(plannedByPatient.get(item.patientId) ?? 0) + lineTotal,
		);
	}
	const patientRecords = collect<Patient>(
		patientRows.map((patient) => ({
			id: patient.id,
			organizationId: patient.organizationId,
			status: patient.status,
			fullName: patient.fullName,
			birthDate: patient.birthDate ?? null,
			phone: patient.phone ?? null,
			email: patient.email ?? null,
			notes: patient.notes ?? null,
			administrativeProfile: patient.administrativeProfile ?? null,
			balanceRub: Math.round(
				(paidByPatient.get(patient.id) ?? 0) -
					(plannedByPatient.get(patient.id) ?? 0),
			),
			createdAt: isoOrSkipRow(
				patient.createdAt,
				"patients",
				patient.id,
				"created_at",
				report,
			),
			updatedAt: isoOrSkipRow(
				patient.updatedAt,
				"patients",
				patient.id,
				"updated_at",
				report,
			),
		})),
		patientSchema,
		"patients",
		report,
	);

	// ── Записи ────────────────────────────────────────────────────────────────
	// БЫЛО: поля назывались doctorId/startAt/endAt — контракт ждёт
	// doctorUserId/startsAt/endsAt, поэтому НИ ОДНА запись не проходила проверку.
	const appointmentRecords = collect<Appointment>(
		appointmentRows.map((appointment) => ({
			id: appointment.id,
			organizationId: appointment.organizationId,
			patientId: appointment.patientId,
			doctorUserId: appointment.doctorUserId,
			assistantUserId: appointment.assistantUserId ?? null,
			chairId: appointment.chairId,
			status: appointment.status,
			/*
			 * Запись с нечитаемым временем не попадает в расписание вовсе — и это
			 * дешевле, чем прежнее «переехать на сейчас». Сетка приёмов строится по
			 * этим двум полям: приём со временем из часов сервера садился в текущий
			 * час поверх настоящего приёма, освобождал своё настоящее окно и вносил
			 * пациента в готовность приёма и в нагрузку смены на сегодня.
			 */
			startsAt: isoOrSkipRow(
				appointment.startsAt,
				"appointments",
				appointment.id,
				"starts_at",
				report,
			),
			endsAt: isoOrSkipRow(
				appointment.endsAt,
				"appointments",
				appointment.id,
				"ends_at",
				report,
			),
			reason: appointment.reason ?? null,
			comment: appointment.comment ?? null,
		})),
		appointmentSchema,
		"appointments",
		report,
	);

	// ── Приёмы ────────────────────────────────────────────────────────────────
	// Проекция строки приёма одна на проект (db/visitsProjection.ts): её же
	// применяет слой подписания карты приёма, и расходиться им нельзя.
	const visitRecords = collect<Visit>(
		visitRows.map(projectVisitRow),
		visitSchema,
		"visits",
		report,
	);

	// ── Позиции плана лечения ─────────────────────────────────────────────────
	const treatmentRecords = collect<TreatmentPlanItem>(
		treatmentItemRows.map((item) => ({
			id: item.id,
			organizationId: item.organizationId,
			patientId: item.patientId,
			visitId: item.visitId ?? null,
			serviceId: item.serviceId ?? "",
			snapshotServiceName: item.title,
			snapshotServiceCategory: null,
			toothCode: item.toothCode ?? null,
			// quantity в базе — numeric, драйвер отдаёт строку.
			quantity: Math.max(1, Math.round(Number(item.quantity) || 1)),
			unitPriceRub: Math.max(0, item.unitPriceRub),
			discountRub: Math.max(0, item.discountRub),
			status: item.status,
			plannedDoctorUserId: item.plannedDoctorUserId ?? null,
			plannedChairId: item.plannedChairId ?? null,
			notes: item.notes ?? null,
		})),
		treatmentPlanItemSchema,
		"treatmentPlanItems",
		report,
	);

	// ── Платежи ───────────────────────────────────────────────────────────────
	const paymentRecords = collect<Payment>(
		paymentRows.map((payment) => ({
			id: payment.id,
			organizationId: payment.organizationId,
			patientId: payment.patientId,
			visitId: payment.visitId ?? null,
			documentId: payment.documentId ?? null,
			amountRub: payment.amountRub,
			method: payment.method,
			status: payment.status,
			paidAt: iso(payment.paidAt),
			/*
			 * Баланс пациента считается ВЫШЕ, по сырым строкам paymentRows, а не по
			 * этому списку, поэтому пропуск платежа сумму долга не сдвигает. Но платёж
			 * исчезает из списка оплат, и это названо честно: сверка смены увидит
			 * расхождение и человек пойдёт в базу по строке из журнала. Прежнее
			 * поведение хуже молча: платёж, проведённый в другой день, попадал в
			 * кассовый отчёт за СЕГОДНЯ и сходился с ним до копейки.
			 */
			createdAt: isoOrSkipRow(
				payment.createdAt,
				"payments",
				payment.id,
				"created_at",
				report,
			),
			fiscalReceiptNumber: payment.fiscalReceiptNumber ?? null,
			fiscalReceiptIssuedAt: payment.fiscalReceiptIssuedAt ?? null,
			fiscalReceiptUrl: payment.fiscalReceiptUrl ?? null,
			fiscalReceipt: payment.fiscalReceipt ?? null,
			clientMutationId: payment.clientMutationId ?? null,
			payerFullName: payment.payerFullName ?? null,
			payerInn: payment.payerInn ?? null,
			payerBirthDate: payment.payerBirthDate ?? null,
			payerIdentityDocument: payment.payerIdentityDocument ?? null,
			payerRelationship: payment.payerRelationship ?? null,
			taxDeductionCode:
				payment.taxDeductionCode === "1" || payment.taxDeductionCode === "2"
					? payment.taxDeductionCode
					: null,
			note: payment.note ?? null,
		})),
		paymentSchema,
		"payments",
		report,
	);

	// ── Документы ─────────────────────────────────────────────────────────────
	const documentRecords = collect<GeneratedDocument>(
		documentRows.map((document) => ({
			id: document.id,
			organizationId: document.organizationId,
			patientId: document.patientId,
			visitId: document.visitId ?? null,
			kind: document.kind,
			title: document.title,
			status: document.status,
			issuedAt: iso(document.issuedAt),
			totalAmountRub: document.totalAmountRub ?? null,
			taxYear: document.taxYear ?? null,
			taxPayerInn: document.taxPayerInn ?? null,
			taxPaymentSnapshot: parseJsonObject(
				document.taxPaymentSnapshotJson,
				null,
			),
			payload: parseJsonObject(document.payloadJson, null),
			signatureAttestation: document.signatureAttestation ?? null,
			voidAttestation: document.voidAttestation ?? null,
			releaseJournalEntry: document.releaseJournalEntry ?? null,
			taxXmlSourceSnapshot: document.taxXmlSourceSnapshot ?? null,
			taxXmlSnapshot: document.taxXmlSnapshot ?? null,
			storagePath: document.storagePath ?? null,
			issuedSnapshotSha256: document.issuedSnapshotSha256 ?? null,
			issuedSnapshotCreatedAt: iso(document.issuedSnapshotCreatedAt),
			issuedByUserId: document.issuedByUserId ?? null,
			voidedAt: iso(document.voidedAt),
			voidedByUserId: document.voidedByUserId ?? null,
		})),
		generatedDocumentSchema,
		"documents",
		report,
	);

	// ── Задачи и события коммуникаций ─────────────────────────────────────────
	const taskRecords = collect<CommunicationTask>(
		taskRows.map((task) => ({
			id: task.id,
			organizationId: task.organizationId,
			patientId: task.patientId,
			appointmentId: task.appointmentId ?? null,
			visitId: task.visitId ?? null,
			documentId: task.documentId ?? null,
			assignedRole: staffRoleSchema
				.catch("administrator")
				.parse(task.assignedRole),
			channel: task.channel,
			intent: task.intent,
			status: task.status,
			priority: task.priority,
			// Срок обзвона из часов сервера — это задача, просроченная ровно сейчас:
			// она лезет в очередь Telegram-отправок и в список «позвонить сегодня».
			dueAt: isoOrSkipRow(
				task.dueAt,
				"communication_tasks",
				task.id,
				"due_at",
				report,
			),
			title: task.title,
			body: task.body,
			workflowCode: task.workflowCode ?? null,
			lastEventAt: iso(task.lastEventAt),
			createdAt: isoOrSkipRow(
				task.createdAt,
				"communication_tasks",
				task.id,
				"created_at",
				report,
			),
		})),
		communicationTaskSchema,
		"communicationTasks",
		report,
	);
	const eventRecords = collect<CommunicationEvent>(
		eventRows.map((event) => ({
			id: event.id,
			organizationId: event.organizationId,
			taskId: event.taskId ?? null,
			patientId: event.patientId,
			actorUserId: event.actorUserId ?? null,
			channel: event.channel,
			direction: event.direction,
			status: event.status,
			message: event.message,
			createdAt: isoOrSkipRow(
				event.createdAt,
				"communication_events",
				event.id,
				"created_at",
				report,
			),
		})),
		communicationEventSchema,
		"communicationEvents",
		report,
	);

	// ── Снимки ────────────────────────────────────────────────────────────────
	// БЫЛО: previewUrl и viewerUrl всегда null. previewUrl в контракте —
	// обязательная строка, поэтому ни один снимок не проходил проверку и
	// вкладка «Снимки» оставалась пустой даже при заполненной базе.
	const imagingRecords = collect<ImagingStudy>(
		imagingRows.map((study) => ({
			id: study.id,
			organizationId: study.organizationId,
			patientId: study.patientId,
			visitId: study.visitId ?? null,
			kind: study.kind,
			title: study.title,
			toothCode: study.toothCode ?? null,
			region: study.region ?? null,
			// Дата снимка из часов сервера — это «рентген сделан только что»:
			// врач сравнивает по ней динамику и решает, нужен ли новый снимок.
			capturedAt: isoOrSkipRow(
				study.capturedAt,
				"imaging_studies",
				study.id,
				"captured_at",
				report,
			),
			sourceKind: study.sourceKind,
			sourceName: study.sourceName,
			storagePath: study.storagePath ?? null,
			dicomStudyUid: study.dicomStudyUid ?? null,
			status: study.status,
			aiSummary: study.aiSummary ?? null,
			/*
			 * Второе место, где строится ссылка на снимок, — именно оно питает
			 * дашборд. Правило то же, что в db/imagingQuery.ts: настоящий файл,
			 * когда браузер способен его показать, иначе заглушка. Держать оба
			 * места в одном правиле обязательно, иначе экран снова покажет
			 * нарисованную челюсть вместо рентгена.
			 */
			previewUrl: browserRenderableImageMimeType(study.storagePath)
				? `/api/imaging/studies/${study.id}/file`
				: `/api/imaging/studies/${study.id}/preview.svg`,
			viewerUrl: browserRenderableImageMimeType(study.storagePath)
				? `/api/imaging/studies/${study.id}/file`
				: `/api/imaging/studies/${study.id}/preview.svg`,
		})),
		imagingStudySchema,
		"imagingStudies",
		report,
	);

	/*
	 * ── Прайс ─────────────────────────────────────────────────────────────────
	 *
	 * Проекция строк прайса НЕ пишется здесь. Она одна на весь проект —
	 * projectServiceCatalogRows() в db/pricelistQuery.ts, — и её же вызывает путь
	 * документов (db/documentQuery.ts) и анализ прайса (routes/pricelist.ts).
	 *
	 * БЫЛО: собственное отображение строки в услугу прямо здесь. Оно подрезало
	 * цену через Math.max(0, …) и длительность через Math.max(1, …), а путь
	 * документов те же строки не подрезал вовсе. Одна услуга получала на экране
	 * одну цену, а в договоре — другую; строка, не прошедшая контракт, молча
	 * исчезала с экрана, но продолжала считаться в договоре. Пока проекций две,
	 * равенство цен приходится проверять глазами; с одной — оно структурно.
	 */
	const serviceProjection = projectServiceCatalogRows(serviceRows);
	const serviceRecords = serviceProjection.items;
	report.counts.serviceCatalog = serviceRecords.length;
	if (serviceProjection.rejected.length > 0) {
		report.skipped.serviceCatalog = serviceProjection.rejected.length;
		for (const rejectedRow of serviceProjection.rejected) {
			report.warnings.push(
				`Прайс: услуга «${rejectedRow.title}» (код ${rejectedRow.code}) не принята — ${rejectedRow.reason}. ` +
					"Пока строка не исправлена, услугу не покажет ни один экран и не посчитает ни один документ.",
			);
		}
	}

	// ── Клинические правила ───────────────────────────────────────────────────
	const ruleRecords = collect<ClinicalRule>(
		ruleRows.map((rule) => ({
			id: rule.id,
			organizationId: rule.organizationId,
			title: rule.title,
			category: rule.category,
			specialty: rule.specialty,
			action: rule.action,
			severity: rule.severity,
			ownerRole: staffRoleSchema.catch("doctor").parse(rule.ownerRole),
			triggerServiceIds: parseJsonArray(rule.triggerServiceIdsJson),
			requiredServiceIds: parseJsonArray(rule.requiredServiceIdsJson),
			requiresCompletedServiceIds: parseJsonArray(
				rule.requiresCompletedServiceIdsJson,
			),
			blockedServiceIds: parseJsonArray(rule.blockedServiceIdsJson),
			condition: rule.condition ?? null,
			warningText: rule.warningText,
			patientText: rule.patientText,
			active: rule.isActive,
		})),
		clinicalRuleSchema,
		"clinicalRules",
		report,
	);

	// ── Протоколы приёма ──────────────────────────────────────────────────────
	const protocolRecords = collect<ProtocolTemplate>(
		protocolRows.map((template) => ({
			id: template.id,
			organizationId: template.organizationId,
			specialty: template.specialty,
			title: template.title,
			visitReason: template.visitReason,
			defaultDurationMinutes: Math.max(1, template.defaultDurationMinutes),
			complaintPrompt: template.complaintPrompt,
			objectiveTemplate: template.objectiveTemplate,
			diagnosisHints: parseJsonArray(template.diagnosisHints),
			treatmentPlanTemplate: template.treatmentPlanTemplate,
			requiredDocuments: parseJsonArray(template.requiredDocuments),
			suggestedImaging: parseJsonArray(template.suggestedImaging),
			safetyWarnings: parseJsonArray(template.safetyWarnings),
			updatedAt: isoOrSkipRow(
				template.updatedAt,
				"protocol_templates",
				template.id,
				"updated_at",
				report,
			),
		})),
		protocolTemplateSchema,
		"protocolTemplates",
		report,
	);

	const activeVisit = applyActiveVisit(organizationId, visitRecords);

	// ── Критические срезы — отказ, если сорвались ─────────────────────────────
	assertCriticalSlicesAvailable(report);

	const state: DomainState = {
		clinicProfile,
		staffMembers: staff,
		chairs: chairRecords,
		patients: patientRecords,
		appointments: appointmentRecords,
		activeVisit,
		documents: documentRecords,
		serviceCatalog: serviceRecords,
		treatmentPlanItems: treatmentRecords,
		treatmentPlanScenarios: [],
		clinicalRules: ruleRecords,
		payments: paymentRecords,
		communicationTemplates: [],
		communicationTasks: taskRecords,
		communicationEvents: eventRecords,
		imagingStudies: imagingRecords,
		aiRecognitionJobs: [],
		importBatches: [],
		protocolTemplates: protocolRecords,
		auditEvents: [],
		unavailableSlices: report.unavailable.map((entry) => entry.slice),
	};

	if (serviceRecords.length === 0) {
		report.warnings.push(SERVICE_CATALOG_EMPTY_MESSAGE);
	}

	return { state, report };
}

function emptyDomainState(organizationId: string): DomainState {
	return {
		clinicProfile: { ...inMemoryDomainState.clinicProfile, organizationId },
		staffMembers: [],
		chairs: [],
		patients: [],
		appointments: [],
		activeVisit: noVisitSkeleton(organizationId),
		documents: [],
		serviceCatalog: [],
		treatmentPlanItems: [],
		treatmentPlanScenarios: [],
		clinicalRules: [],
		payments: [],
		communicationTemplates: [],
		communicationTasks: [],
		communicationEvents: [],
		imagingStudies: [],
		aiRecognitionJobs: [],
		importBatches: [],
		protocolTemplates: [],
		auditEvents: [],
		unavailableSlices: [],
	};
}

/**
 * Заготовка «в этой клинике открытого приёма нет».
 *
 * Собирается ТОЛЬКО из объявленной метки и идентификатора клиники: ни одного поля
 * из часов, из другой строки базы или из состояния предыдущего запроса. Поэтому
 * два соседних чтения сводки отвечают о несуществующем приёме одно и то же — до
 * правки они расходились временем.
 *
 * `status: "draft"` оставлен НАМЕРЕННО и это не недосмотр: `visitStatusSchema`
 * знает только `draft`/`signed`/`voided` (`packages/shared/src/index.ts:49`),
 * значения «приёма нет» среди них нет, а `signed` или `voided` были бы уже не
 * заготовкой, а утверждением о закрытом лечении. Кроме того `buildDashboard()`
 * ветвится по этому полю в нескольких местах (`sampleData.ts`), и смена статуса
 * поехала бы по сводке целиком. Отсутствие приёма читается по метке
 * идентификатора, а не по статусу.
 */
function noVisitSkeleton(organizationId: string): Visit {
	return {
		id: NIL_UUID,
		organizationId,
		patientId: NIL_UUID,
		appointmentId: null,
		status: "draft",
		revision: 1,
		complaint: null,
		anamnesis: null,
		objectiveStatus: null,
		diagnosis: null,
		treatmentPlan: null,
		doctorSummary: null,
		createdAt: NO_VISIT_TIMESTAMP,
		updatedAt: NO_VISIT_TIMESTAMP,
	};
}

/**
 * Текущий приём: последний незакрытый черновик клиники, иначе последний приём
 * любого статуса. Если приёмов нет вовсе — заготовка с объявленной меткой «приёма
 * нет» (см. NIL_UUID выше), чтобы карточка приёма открывалась пустой, а не
 * показывала чужой демонстрационный визит.
 *
 * ЧТО ЗДЕСЬ ВЫДУМЫВАЛОСЬ. Заготовка брала время из часов, поэтому сводка сообщала
 * о несуществующем приёме, что он изменён только что, и на каждый запрос — новое
 * время. Разбор и замер — в докстринге NO_VISIT_TIMESTAMP.
 *
 * ЧТО ОСТАЛОСЬ ДОЛГОМ, И ОН НАЗВАН, А НЕ ЗАМОЛЧАН. Сама метка `NIL_UUID` — это
 * «неизвестное, напечатанное нулём», тот же запрещённый класс, что и нулевая сумма
 * в `apps/api/src/tests/unknownIsNotZero.test.ts`. Убрать её из этого файла нельзя:
 * контракт требует объект с полем `id` формы uuid, а клиент разыменовывает
 * `activeVisit` без защиты. Цена метки уже измерена в дереве и записана рядом с
 * каждой её проверкой на клиенте: касса отвечала «Прием для оплаты не найден»
 * (`useAppLogic.tsx`, realActiveVisitId), а лента снимков была пуста ВСЕГДА, пока
 * приём не начат (`useAppLogic.tsx`, activeImagingStudies). Сторож на эту метку —
 * `tests/routes/dashboardActiveVisitIsNotFabricated.test.ts`: он требует, чтобы
 * идентификатор приёма из сводки либо РАЗРЕШАЛСЯ в строку базы, либо был ровно
 * этой одной объявленной меткой, и запрещает выдавать что-либо третье.
 */
/**
 * Выбирает открытый приём либо заготовку «приёма нет».
 *
 * СТАЛО: возвращает объект, а не правит общий `activeVisit`. Прежняя версия
 * писала в общую переменную через `Object.assign`, а при отказе на середине в ней
 * оставалась частично заменённая смесь данных разных клиник.
 */
function applyActiveVisit(
	organizationId: string,
	visitRecords: Visit[],
): Visit {
	const draft = visitRecords
		.filter((visit) => visit.status === "draft")
		.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0];
	const latest =
		draft ??
		visitRecords
			.slice()
			.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0];

	return latest ?? noVisitSkeleton(organizationId);
}

/** Последний приём пациента — нужен маршрутам, которые открывают карточку. */
async function _findLatestVisitIdForPatient(
	organizationId: string,
	patientId: string,
): Promise<string | null> {
	if (inMemoryMode()) return null;
	try {
		const rows = await db
			.select({ id: schema.visits.id })
			.from(schema.visits)
			.where(
				and(
					eq(schema.visits.organizationId, organizationId),
					eq(schema.visits.patientId, patientId),
				),
			)
			.orderBy(desc(schema.visits.updatedAt))
			.limit(1);
		return rows[0]?.id ?? null;
	} catch {
		return null;
	}
}
