import assert from "node:assert/strict";
import test from "node:test";
import * as contract from "@dental/shared";
import { communicationChannelSchema } from "@dental/shared";
import * as schema from "../db/schema.js";

/**
 * Расхождение между pgEnum в базе и z.enum в контракте — тихая потеря данных.
 *
 * ЧТО СЛУЧИЛОСЬ. В "communication_channel" восемь значений, включая vk и max;
 * в communicationChannelSchema их было шесть. routes/vk.ts и routes/max.ts
 * пишут задачи и события с этими каналами, база принимает их без возражений,
 * а db/domainStateHydration.ts прогоняет строки через safeParse и молча
 * отбрасывает непрошедшие (функция collect: `else skipped += 1`). Переписка во
 * «ВКонтакте» и MAX исчезала из рабочего кабинета, оставляя после себя одну
 * строку в отчёте о гидратации, которую никто не читает.
 *
 * НАПРАВЛЕНИЕ ПРОВЕРКИ. Каждое значение из базы обязано быть и в контракте.
 * Обратное допустимо: контракт может знать о значении, которого ещё нет в
 * pgEnum, — такие строки просто не появятся, а вот потерять существующие
 * нельзя.
 *
 * ПОЧЕМУ СПИСОК ПАР БОЛЬШЕ НЕ ПИШЕТСЯ РУКАМИ. Здесь стоял поимённый массив из
 * 12 пар. В schema.ts объявлено 44 pgEnum, и у 36 из них есть одноимённый
 * `*Schema` в @dental/shared — то есть сверять можно было 36, а сверялось 12.
 * Порок ровно тот, который apps/web/src/tests/panelsAreMounted.test.ts уже
 * отверг словами «поимённый список структурно не способен заметить файл,
 * которого в списке нет»: новое перечисление появляется вместе со своим
 * контрактом, в список его никто не дописывает, и расхождение в нём никогда не
 * будет замечено. Проверка при этом остаётся зелёной и выглядит работающей.
 *
 * Поэтому пары строятся переписью: перебираются экспорты schema.ts, у которых
 * есть enumName и enumValues (это и есть pgEnum), и для каждого ищется
 * `<имя экспорта>Schema` в контракте. У кого пары нет — либо запись в
 * NO_CONTRACT_PAIR С ПРИЧИНОЙ, либо красный. Молча выпасть из переписи
 * перечисление больше не может.
 */

/** Перечисление базы: имя типа в PostgreSQL, имя экспорта в schema.ts и значения. */
type DatabaseEnum = {
	readonly exportName: string;
	readonly databaseName: string;
	readonly values: readonly string[];
};

/**
 * pgEnum отличается от таблицы по форме, а не по имени: у него есть и enumName,
 * и enumValues. Проверка по форме нужна, чтобы перепись не зависела от
 * соглашения об именовании экспортов — переименование не должно тихо выкидывать
 * перечисление из переписи.
 *
 * `typeof value === "function"` здесь обязателен, и это не перестраховка.
 * `pgEnum(...)` возвращает ВЫЗЫВАЕМЫЙ объект: `patientStatus("status")` создаёт
 * колонку. Первая редакция этой переписи проверяла только `typeof === "object"`
 * и нашла НОЛЬ перечислений из 44 — то есть сверка стала бы пустой, оставшись
 * зелёной. Поймала это самопроверка «перепись не выродилась», ради которой она и
 * стоит первым тестом.
 */
function isDatabaseEnum(value: unknown): value is { enumName: string; enumValues: readonly string[] } {
	if ((typeof value !== "object" && typeof value !== "function") || value === null) return false;
	const candidate = value as { enumName?: unknown; enumValues?: unknown };
	return (
		typeof candidate.enumName === "string" &&
		Array.isArray(candidate.enumValues) &&
		candidate.enumValues.every((item) => typeof item === "string")
	);
}

function databaseEnums(): DatabaseEnum[] {
	const found: DatabaseEnum[] = [];
	for (const [exportName, value] of Object.entries(schema)) {
		if (!isDatabaseEnum(value)) continue;
		found.push({ exportName, databaseName: value.enumName, values: value.enumValues });
	}
	return found.sort((left, right) => left.exportName.localeCompare(right.exportName));
}

/** z.enum из контракта: у него есть массив строк options. */
function isContractEnum(value: unknown): value is { options: readonly string[] } {
	if (typeof value !== "object" || value === null) return false;
	const candidate = value as { options?: unknown };
	return (
		Array.isArray(candidate.options) &&
		candidate.options.length > 0 &&
		candidate.options.every((item) => typeof item === "string")
	);
}

function contractEnumFor(exportName: string): readonly string[] | null {
	const candidate = (contract as Record<string, unknown>)[`${exportName}Schema`];
	return isContractEnum(candidate) ? candidate.options : null;
}

/**
 * Перечисления базы, у которых одноимённого контракта НЕТ. Каждая строка обязана
 * называть причину: контракт зовётся иначе, контракта нет вовсе, или сверять
 * нечего по существу. Причина короче 80 символов сама валит прогон — отписка
 * вместо причины уже приводила в этом проекте к спискам, которым никто не верит.
 *
 * users.role в перепись не попадает вовсе и записи здесь не требует: она
 * объявлена как text, а не pgEnum, — сверять нечего, роль ничем не ограничена на
 * уровне базы.
 */
const NO_CONTRACT_PAIR: readonly { readonly exportName: string; readonly reason: string }[] = [
	{
		exportName: "communicationDirection",
		reason:
			"Контракт ЕСТЬ, но объявлен безымянным литералом внутри объекта: packages/shared/src/index.ts:2094, " +
			"`direction: z.enum([\"inbound\", \"outbound\"])`. Набор совпадает со схемой один в один, но перепись " +
			"видит только именованные экспорты. Починка — вынести в communicationDirectionSchema.",
	},
	{
		exportName: "denteTelegramWebhookStatus",
		reason:
			"Контракт ЕСТЬ, но безымянный: packages/shared/src/index.ts:2504, `status: z.enum([\"processing\", " +
			"\"processed\", \"duplicate\", \"ignored\", \"rejected\"])` — набор совпадает со схемой полностью. " +
			"Пара не строится только из-за отсутствия именованного экспорта.",
	},
	{
		exportName: "documentStatus",
		reason:
			"Контракт ЕСТЬ, но безымянный И продублирован: packages/shared/src/index.ts:4231 и :4299, оба " +
			"`status: z.enum([\"draft\", \"issued\", \"voided\"])`. Набор совпадает со схемой. Две копии одного " +
			"перечисления разъедутся молча — тем более нужен один именованный экспорт.",
	},
	{
		exportName: "imagingStudyStatus",
		reason:
			"Контракт ЕСТЬ, но безымянный: packages/shared/src/index.ts:4347, `status: z.enum([\"available\", " +
			"\"needs_review\", \"failed\"])` — набор совпадает со схемой. Пара не строится только из-за " +
			"отсутствия именованного экспорта.",
	},
	{
		exportName: "communicationConsentScope",
		reason:
			"Контракта НЕТ вовсе: значений service/marketing в packages/shared/src не встречается. Перечисление " +
			"живое — им типизирована колонка scope в db/communicationsSchema.ts:51 со значением по умолчанию " +
			"marketing, а согласие на рекламу по сетям электросвязи требуется по ФЗ «О рекламе» ст. 18 ч. 1. " +
			"Значение попадает в базу без проверки контрактом. Долг ведущему: packages/shared вне зоны участка.",
	},
	{
		exportName: "communicationConsentState",
		reason:
			"Контракта НЕТ вовсе: поиск по \"granted\" в packages/shared/src даёт ноль совпадений. Отзыв " +
			"согласия — юридически значимое действие, и его состояние попадает в базу без проверки на входе. " +
			"Долг ведущему: packages/shared вне зоны участка сторожей.",
	},
	{
		exportName: "communicationOutboxStatus",
		reason:
			"Контракта НЕТ вовсе: поиск по \"suppressed\" в packages/shared/src даёт ноль совпадений. Ближайший " +
			"по имени communicationStatusSchema — ДРУГОЙ набор (queued/scheduled/needs_call/sent/delivered/" +
			"completed/failed/skipped) и другая таблица, он уже спарен с pgEnum communication_status; " +
			"подставлять его сюда нельзя. Долг ведущему.",
	},
	{
		exportName: "ledgerPaymentMethod",
		reason:
			"Контракта НЕТ вовсе: поиск по \"installment_balance\" в packages/shared/src даёт ноль совпадений. " +
			"paymentMethodSchema — ДРУГОЙ набор из семи значений, уже спаренный с pgEnum payment_method: в нём " +
			"нет dms и installment_balance, зато есть лишние bank_transfer, online, insurance, other. Способ " +
			"оплаты в кассовой книге — это деньги, и проверять его чужим набором нельзя. Долг ведущему.",
	},
];

test("перепись перечислений не выродилась", () => {
	const enums = databaseEnums();
	assert.ok(
		enums.length >= 40,
		`Перепись нашла ${enums.length} pgEnum в schema.ts. Их там больше сорока — значит распознавание ` +
			"перечисления по форме сломалось, и любой зелёный результат ниже получен на пустом множестве."
	);

	const paired = enums.filter((item) => contractEnumFor(item.exportName) !== null);
	assert.ok(
		paired.length >= 30,
		`Пар «перечисление базы + контракт» нашлось ${paired.length}. Их не меньше тридцати: столь низкое ` +
			"число означает, что перепись выродилась — например, импорт контракта перестал отдавать z.enum, " +
			"и сверка тихо превратилась в проверку пустоты."
	);
});

test("у каждого перечисления базы есть либо контракт, либо объявленная причина", () => {
	const unpaired = databaseEnums()
		.filter((item) => contractEnumFor(item.exportName) === null)
		.map((item) => item.exportName);
	const declared = new Set(NO_CONTRACT_PAIR.map((entry) => entry.exportName));

	const undeclared = unpaired.filter((name) => !declared.has(name));
	assert.deepEqual(
		undeclared,
		[],
		`Перечисление базы без контракта и без объявленной причины: ${undeclared.join(", ")}. Значения из ` +
			"такого перечисления никто не проверяет на входе, и расхождение с ним будет стоить строк в " +
			"рабочем кабинете. Либо впишите соответствие контракту, либо объявите причину здесь."
	);

	const stale = [...declared].filter((name) => !unpaired.includes(name)).sort();
	assert.deepEqual(
		stale,
		[],
		`Причина объявлена для перечисления, у которого контракт УЖЕ есть: ${stale.join(", ")}. Уберите ` +
			"запись — иначе список причин перестаёт быть правдой, а пара выпадает из сверки."
	);

	const shallow = NO_CONTRACT_PAIR.filter((entry) => entry.reason.trim().length < 80).map(
		(entry) => entry.exportName
	);
	assert.deepEqual(
		shallow,
		[],
		`Причина заявлена отпиской: ${shallow.join(", ")}. Причина обязана называть, где контракт лежит под ` +
			"другим именем или почему его нет вовсе — иначе следующий инженер будет искать его заново."
	);
});

test("значения перечислений базы не теряются в контракте", () => {
	const drift: string[] = [];

	for (const item of databaseEnums()) {
		const options = contractEnumFor(item.exportName);
		if (options === null) continue;
		const known = new Set(options);
		const missing = item.values.filter((value) => !known.has(value));
		if (missing.length > 0) {
			drift.push(
				`${item.databaseName} (schema.${item.exportName}): в базе есть ` +
					`${missing.map((value) => `«${value}»`).join(", ")}, в контракте ` +
					`${item.exportName}Schema таких значений нет — такие строки будут молча отброшены при гидратации.`
			);
		}
	}

	assert.deepEqual(drift, [], drift.join("\n"));
});

test("каждая пара перечислений непуста — проверка не выродилась", () => {
	// Если pgEnum переименуют, ссылка станет undefined и тест выше начнёт
	// «проходить» на пустом множестве. Здесь это ловится.
	for (const item of databaseEnums()) {
		assert.ok(item.values.length > 0, `${item.databaseName}: пустое перечисление в базе`);
		const options = contractEnumFor(item.exportName);
		if (options === null) continue;
		assert.ok(options.length > 0, `${item.exportName}Schema: пустое перечисление в контракте`);
	}
});

test("канал связи содержит vk и max — из-за их отсутствия терялась переписка", () => {
	assert.ok(communicationChannelSchema.options.includes("vk"));
	assert.ok(communicationChannelSchema.options.includes("max"));
});
