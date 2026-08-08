/**
 * pricelistQuery.ts — ЕДИНСТВЕННАЯ проекция строки прайса в доменную услугу.
 *
 * ЧТО БЫЛО НЕ ТАК
 *
 * У прайса было два независимых чтения одной и той же таблицы
 * service_catalog_items, и они расходились:
 *
 *   • здесь (для документов) строка отдавалась как есть: цена и длительность без
 *     проверки, контракт услуги не применялся вовсе;
 *   • в db/domainStateHydration.ts (для экранов) та же строка проходила через
 *     Math.max-подрезку и проверку serviceCatalogItemSchema, а не прошедшие
 *     проверку строки МОЛЧА выбрасывались.
 *
 * Одна и та же услуга могла попасть в договор и не попасть на экран, а цена с
 * подрезкой на экране отличалась от цены в договоре. Для денег и юридических
 * документов это недопустимо (.agents/AGENTS.md §8b: суммы точны до копейки).
 *
 * ЧТО СТАЛО
 *
 * Проекция ровно одна — projectServiceCatalogRows(). И экран, и договор, и
 * анализ прайса (routes/pricelist.ts) вызывают её, поэтому расхождение цен
 * между поверхностями стало структурно невозможным, а не «проверенным глазами».
 *
 * ПОЧЕМУ ОТКАЗ, А НЕ ПОДРЕЗКА
 *
 * Подрезка Math.max(0, price) превращает битую цену в БЕСПЛАТНУЮ услугу в
 * договоре, а Math.max(1, duration) выдумывает длительность. Придуманное число
 * в юридическом документе хуже отсутствующей строки: пациент увидит сумму,
 * которой клиника не выставляла. Поэтому строка, не прошедшая контракт,
 * отклоняется целиком и попадает в список rejected — с кодом, названием и
 * человеческой причиной, чтобы администратор понял, что именно поправить.
 */

import {
	type DentalSpecialty,
	type ServiceCatalogItem,
	type ServiceCategory,
	serviceCatalogItemSchema,
} from "@dental/shared";
import { and, eq } from "drizzle-orm";
/*
 * Перевод слов разборщика в слова человека — ОДИН на весь сервер, рядом с домом
 * текстов отказа по кабинету клиники (utils/clinicSessionRefusal.ts).
 */
import { schemaIssueWords } from "../utils/schemaRefusalWords.js";
import { db } from "./client.js";
import * as schema from "./schema.js";

/** Строка прайса ровно в той форме, в которой её отдаёт база. */
export type ServiceCatalogRow = typeof schema.serviceCatalogItems.$inferSelect;

/** Услуга, которую не удалось принять, и причина — человеческими словами. */
interface RejectedServiceCatalogRow {
	code: string;
	title: string;
	reason: string;
}

export interface ServiceCatalogProjection {
	items: ServiceCatalogItem[];
	rejected: RejectedServiceCatalogRow[];
}

/**
 * Текст для пустого прайса. Живёт здесь, а не у каждого вызывающего, чтобы на
 * всех поверхностях звучала одна и та же фраза.
 */
export const SERVICE_CATALOG_EMPTY_MESSAGE =
	"Прайс-лист пуст: в справочнике услуг клиники нет ни одной позиции. " +
	"Заполните прайс в настройках — иначе договор, счёт и чек не смогут посчитать сумму, " +
	"а справка для налогового вычета уйдёт с нулём.";

function useInMemory() {
	return process.env.DENTAL_STATE_PERSISTENCE === "off";
}

/**
 * Числовое значение денежной колонки.
 *
 * numeric(12,2) с mode "number" обычно уже приходит числом, но драйвер отдаёт
 * numeric строкой, если разбор типов не зарегистрирован (см. moneyTypeParsers.ts).
 * Поэтому приведение остаётся. Возврат null вместо нуля — принципиален:
 * подставить 0 значило бы объявить услугу бесплатной.
 */
function readMoneyRub(value: unknown): number | null {
	const parsed = typeof value === "number" ? value : Number(value);
	return Number.isFinite(parsed) ? parsed : null;
}

function readDurationMinutes(value: unknown): number | null {
	const parsed = typeof value === "number" ? value : Number(value);
	return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Русские подписи полей услуги: ключ контракта → подпись из настроек прайса.
 *
 * Без словаря причина называла поле ЛАТИНСКИМ ключом контракта, и это гасило
 * фразу целиком — `basePriceRub` (12 знаков), `durationMinutes` (15),
 * `organizationId` (14), `taxDeductible` (13) попадают под правило фильтра
 * клиента о латинском слове из шести и более знаков.
 */
const serviceCatalogFieldLabels: Record<string, string> = {
	id: "опознавательный номер услуги",
	organizationId: "клиника услуги",
	code: "код услуги",
	title: "название услуги",
	aliases: "синонимы названия",
	category: "раздел прайса",
	specialty: "специальность врача",
	basePriceRub: "цена услуги",
	durationMinutes: "длительность услуги в минутах",
	taxDeductible: "признак налогового вычета",
	active: "признак «услуга в работе»",
};

/**
 * Причина отклонения строки прайса — словами администратора клиники.
 *
 * БЫЛО: `поле «${field}»: ${issue.message}` — латинский ключ контракта плюс
 * слово разборщика. Замерено прямым вызовом проекции на строке с пустым
 * разделом прайса:
 *
 *   «поле «category»: Expected 'consultation' | 'therapy' | 'surgery' |
 *    'prosthetics' | 'orthodontics' | 'periodontology' | 'hygiene' | 'imaging' |
 *    'documents' | 'other', received null»
 *
 * Причина уходит в два места, и оба читает человек: предупреждение гидратации
 * (`db/domainStateHydration.ts:1003` — «Прайс: услуга … не принята — …») и текст
 * ошибки, которую бросает `projectSingleRow` при записи услуги. Оба гасились
 * фильтром клиента целиком, и администратор видел вместо причины подпись по коду
 * ответа: услуга просто не появлялась на экране без объяснения.
 *
 * Замысел «человеческая причина» был записан в шапке этого файла с самого
 * начала — здесь он наконец выполняется. Перевод машинных слов берётся из
 * общего дома, своего списка латинских слов тут нет.
 */
function firstIssueMessage(
	issues: readonly { path: (string | number)[]; message: string }[],
): string {
	const issue = issues[0];
	if (!issue)
		return "строка не соответствует контракту услуги, поэтому исправьте её в настройках прайса";
	/*
	 * Строчная буква и отсутствие точки на конце — не небрежность: причина
	 * встраивается в СЕРЕДИНУ чужой фразы у обоих вызывающих
	 * («…услуга «Х» не принята — <причина>. Пока строка не исправлена…»), и
	 * готовое предложение с заглавной буквы и точкой дало бы там две точки подряд.
	 */
	const words = schemaIssueWords(issue, serviceCatalogFieldLabels);
	return `${words.cause} — ${words.action}`;
}

/**
 * Единая проекция строк прайса. Вызывается и путём экранов
 * (db/domainStateHydration.ts), и путём документов (db/documentQuery.ts через
 * getServiceCatalogForOrganization), и анализом прайса (routes/pricelist.ts).
 */
export function projectServiceCatalogRows(
	rows: readonly ServiceCatalogRow[],
): ServiceCatalogProjection {
	const items: ServiceCatalogItem[] = [];
	const rejected: RejectedServiceCatalogRow[] = [];

	for (const row of rows) {
		const basePriceRub = readMoneyRub(row.basePriceRub);
		if (basePriceRub === null) {
			rejected.push({
				code: row.code,
				title: row.title,
				reason:
					"цена в базе не читается как число, поэтому услугу нельзя посчитать ни в счёте, ни в договоре",
			});
			continue;
		}
		const durationMinutes = readDurationMinutes(row.durationMinutes);
		if (durationMinutes === null) {
			rejected.push({
				code: row.code,
				title: row.title,
				reason:
					"длительность в базе не читается как число, поэтому услугу нельзя поставить в расписание",
			});
			continue;
		}

		const parsed = serviceCatalogItemSchema.safeParse({
			id: row.id,
			organizationId: row.organizationId,
			code: row.code,
			title: row.title,
			/*
			 * Синонимов у услуги в таблице нет — колонки под них не существует.
			 * Пустой массив здесь не заглушка, а честное «синонимы не заведены»:
			 * контракт объявляет aliases обязательным полем со значением по умолчанию.
			 */
			aliases: [],
			category: row.category,
			specialty: row.specialty,
			basePriceRub,
			durationMinutes,
			taxDeductible: row.taxDeductible,
			active: row.isActive,
		});

		if (!parsed.success) {
			rejected.push({
				code: row.code,
				title: row.title,
				reason: firstIssueMessage(parsed.error.issues),
			});
			continue;
		}

		items.push(parsed.data);
	}

	return { items, rejected };
}

export async function getDefaultOrganizationId(): Promise<string | null> {
	if (useInMemory()) {
		return "00000000-0000-0000-0000-000000000001";
	}
	try {
		const [org] = await db.select().from(schema.organizations).limit(1);
		return org?.id || "00000000-0000-0000-0000-000000000001";
	} catch {
		return "00000000-0000-0000-0000-000000000001";
	}
}

/** Прайс организации для документов и анализа прайса. */
export async function getServiceCatalogForOrganization(
	organizationId: string,
): Promise<ServiceCatalogItem[]> {
	const rows = await db
		.select()
		.from(schema.serviceCatalogItems)
		.where(eq(schema.serviceCatalogItems.organizationId, organizationId));
	return projectServiceCatalogRows(rows).items;
}

/* ─── ЗАПИСЬ ПРАЙСА ──────────────────────────────────────────────────────────
 *
 * ЗАЧЕМ ЭТО ПОЯВИЛОСЬ. У таблицы service_catalog_items не было ни одного
 * писателя, кроме посева мастера первого запуска (routes/workspaceProfile.ts).
 * Чтение работало, контракт был, экран настроек «Прайс» был написан целиком — а
 * адреса POST/PUT/DELETE /api/settings/catalog на сервере не существовало, и
 * Fastify отвечал «Route POST:/api/settings/catalog not found». Клиника получала
 * прайс при установке и больше не могла изменить в нём ни одной цены.
 * Замер до починки: apps/api/src/tests/routes/serviceCatalogWriteProof.ts.
 *
 * Писатели живут здесь, рядом с единственной проекцией: услуга, записанная в
 * обход projectServiceCatalogRows, могла бы попасть в базу в виде, который
 * чтение потом молча выбросит, — и оператор увидел бы «сохранено» на строке,
 * которой нет на экране.
 */

/** Поля услуги, которые задаёт оператор в настройках прайса. */
export interface ServiceCatalogItemInput {
	readonly code: string;
	readonly title: string;
	readonly category: ServiceCategory;
	readonly specialty: DentalSpecialty;
	readonly basePriceRub: number;
	readonly durationMinutes: number;
	readonly taxDeductible: boolean;
	readonly active: boolean;
}

/**
 * Частичная правка: приходит ровно то, что оператор изменил.
 *
 * Каждое поле объявлено как `?: T | undefined`, а не через Partial<>: при
 * exactOptionalPropertyTypes (включён в tsconfig) Partial<> запрещает передавать
 * поле со значением undefined, а разбор zod-схемы с optional() возвращает именно
 * такой объект.
 */
export type ServiceCatalogItemPatch = {
	readonly [Field in keyof ServiceCatalogItemInput]?:
		| ServiceCatalogItemInput[Field]
		| undefined;
};

/**
 * Отказ хранилища. Отдельный класс, чтобы маршрут ответил 503 «писать некуда», а
 * не 409 «проверьте поля»: при DENTAL_STATE_PERSISTENCE=off ошибка не в вводе
 * оператора, и посылать его искать опечатку было бы ложью.
 */
export class ServiceCatalogStorageDisabledError extends Error {
	constructor() {
		super(
			"Прайс не изменён: хранение состояния отключено (DENTAL_STATE_PERSISTENCE=off), " +
				"поэтому услуги существуют только в памяти процесса и записать их некуда.",
		);
		this.name = "ServiceCatalogStorageDisabledError";
	}
}

/** Услуга не найдена в этой клинике. Текст разбирает маршрут. */
export class ServiceCatalogItemNotFoundError extends Error {
	constructor() {
		super("Услуга не найдена.");
		this.name = "ServiceCatalogItemNotFoundError";
	}
}

/**
 * Единственная услуга по идентификатору, обязательно в пределах своей клиники.
 * Фильтр по organizationId стоит в том же условии, что и по id: без него по
 * прямой ссылке правился бы прайс чужой клиники.
 */
async function selectOwnedRow(
	organizationId: string,
	serviceId: string,
): Promise<ServiceCatalogRow | null> {
	const [row] = await db
		.select()
		.from(schema.serviceCatalogItems)
		.where(
			and(
				eq(schema.serviceCatalogItems.id, serviceId),
				eq(schema.serviceCatalogItems.organizationId, organizationId),
			),
		)
		.limit(1);
	return row ?? null;
}

/**
 * Строка прайса → доменная услуга ТОЙ ЖЕ проекцией, что и чтение.
 *
 * Если записанная строка проекцию не проходит, наружу идёт причина из rejected, а
 * не «сохранено»: услуга, которой не будет на экране, — это не успех.
 */
function projectSingleRow(row: ServiceCatalogRow): ServiceCatalogItem {
	const projection = projectServiceCatalogRows([row]);
	const item = projection.items[0];
	if (item) return item;
	const reason =
		projection.rejected[0]?.reason ??
		"строка не соответствует контракту услуги";
	throw new Error(
		`Услуга сохранена в базу, но не проходит контракт прайса: ${reason}`,
	);
}

/**
 * Обе денежные колонки заполняются одним значением.
 *
 * base_price_rub и price_rub объявлены NOT NULL обе, а проекция читает только
 * base_price_rub. Посев мастера первого запуска (routes/workspaceProfile.ts:826)
 * пишет в них равные значения, и экран показывает `basePriceRub || priceRub`,
 * то есть трактует их как замену друг другу. Запись только одной колонки
 * упала бы на NOT NULL, а запись разных значений создала бы услугу, у которой
 * цена зависит от того, кто её читает. Расхождение этих двух колонок — долг
 * схемы, и он назван здесь, а не разведён двумя разными смыслами.
 */
function moneyColumns(basePriceRub: number) {
	return { basePriceRub, priceRub: basePriceRub };
}

/** Новая услуга прайса. */
export async function createServiceCatalogItemInDb(
	organizationId: string,
	input: ServiceCatalogItemInput,
): Promise<ServiceCatalogItem> {
	if (useInMemory()) throw new ServiceCatalogStorageDisabledError();
	const [row] = await db
		.insert(schema.serviceCatalogItems)
		.values({
			organizationId,
			code: input.code,
			title: input.title,
			category: input.category,
			specialty: input.specialty,
			...moneyColumns(input.basePriceRub),
			durationMinutes: input.durationMinutes,
			taxDeductible: input.taxDeductible,
			isActive: input.active,
		})
		.returning();
	if (!row)
		throw new Error("Услуга не создана: база не вернула ни одной строки.");
	return projectSingleRow(row);
}

/** Правка услуги. Меняются только переданные поля. */
export async function updateServiceCatalogItemInDb(
	organizationId: string,
	serviceId: string,
	patch: ServiceCatalogItemPatch,
): Promise<ServiceCatalogItem> {
	if (useInMemory()) throw new ServiceCatalogStorageDisabledError();
	// Существование проверяется ДО обновления: drizzle на несовпавшем условии
	// вернёт пустой массив, и «не найдено» стало бы неотличимо от «не изменилось».
	const existing = await selectOwnedRow(organizationId, serviceId);
	if (!existing) throw new ServiceCatalogItemNotFoundError();

	const updates: Partial<typeof schema.serviceCatalogItems.$inferInsert> = {};
	if (patch.code !== undefined) updates.code = patch.code;
	if (patch.title !== undefined) updates.title = patch.title;
	if (patch.category !== undefined) updates.category = patch.category;
	if (patch.specialty !== undefined) updates.specialty = patch.specialty;
	if (patch.basePriceRub !== undefined)
		Object.assign(updates, moneyColumns(patch.basePriceRub));
	if (patch.durationMinutes !== undefined)
		updates.durationMinutes = patch.durationMinutes;
	if (patch.taxDeductible !== undefined)
		updates.taxDeductible = patch.taxDeductible;
	if (patch.active !== undefined) updates.isActive = patch.active;

	const [row] = await db
		.update(schema.serviceCatalogItems)
		.set(updates)
		.where(
			and(
				eq(schema.serviceCatalogItems.id, serviceId),
				eq(schema.serviceCatalogItems.organizationId, organizationId),
			),
		)
		.returning();
	if (!row) throw new ServiceCatalogItemNotFoundError();
	return projectSingleRow(row);
}

/**
 * Отключение услуги — НЕ физическое удаление.
 *
 * На service_catalog_items.id ссылаются treatment_items.service_id
 * (db/schema.ts:455) и правила списания материалов
 * (procedure_material_rules.service_id, routes/inventory.ts:531). DELETE строки
 * порвал бы историю лечения и уже выставленные счёта. Экран это и обещает
 * оператору: «Связанные счета сохранятся, но услуга уйдет в архив»
 * (SettingsPricesTab.tsx:200). Тот же приём уже принят в настройках для
 * сотрудников и кресел.
 */
export async function deactivateServiceCatalogItemInDb(
	organizationId: string,
	serviceId: string,
): Promise<ServiceCatalogItem> {
	if (useInMemory()) throw new ServiceCatalogStorageDisabledError();
	const existing = await selectOwnedRow(organizationId, serviceId);
	if (!existing) throw new ServiceCatalogItemNotFoundError();
	const [row] = await db
		.update(schema.serviceCatalogItems)
		.set({ isActive: false })
		.where(
			and(
				eq(schema.serviceCatalogItems.id, serviceId),
				eq(schema.serviceCatalogItems.organizationId, organizationId),
			),
		)
		.returning();
	if (!row) throw new ServiceCatalogItemNotFoundError();
	return projectSingleRow(row);
}
