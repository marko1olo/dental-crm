/**
 * Отбор получателей рассылки.
 *
 * ЗАЧЕМ ЭТОТ ФАЙЛ
 * Отправить сообщение группе пациентов было нельзя: колонка campaign_id в
 * очереди существовала как метка, а самой кампании и отбора получателей — нет.
 * Виджеты вроде UisMassAppointmentConfirmationsWidget читали пустые таблицы и
 * показывали выдуманные записи.
 *
 * ДВА ПРИНЦИПА
 *
 * 1. Признаки отбора — закрытый набор, а не произвольный SQL из интерфейса.
 *    «Гибкий конструктор запросов» на медицинской базе означает, что рано или
 *    поздно администратор выгрузит всю картотеку одним условием.
 *
 * 2. Кампания не запускается вслепую. Предпросмотр отвечает не только «сколько
 *    подошло», но и сколько отсеяно и почему: нет контакта, нет согласия,
 *    исчерпан суточный предел. Иначе «отправлено 12 из 400» выясняется уже
 *    после отправки, и непонятно, ошибка это или так и задумано.
 *
 * Отдельно считается стоимость: для SMS это число сегментов, умноженное на
 * получателей. Разница между «влезло в один сегмент» и «в три» — это счёт от
 * оператора в конце месяца.
 */

import {
	and,
	eq,
	gte,
	inArray,
	isNotNull,
	ne,
	type SQL,
	sql,
} from "drizzle-orm";
import { db } from "../../db/client.js";
import {
	appointments,
	patients,
	payments,
	treatmentItems,
} from "../../db/schema.js";
import { isValidEmailAddress } from "../../emailTransport.js";
import { normalizeRussianMsisdn } from "../../smsTransport.js";
import { normalizeWhatsappRecipient } from "../../whatsappTransport.js";
/*
 * Пояс клиники берётся из ЕДИНСТВЕННОГО дома, а не читается здесь ещё раз.
 *
 * Дом сегодня физически лежит в модуле отчётов, и это не идеал — читателю пояса
 * из рассылок незачем зависеть от отчётов. Но выбор здесь был между зависимостью
 * и ЧЕТВЁРТОЙ копией: копий `clinicTimeZone` в дереве уже три
 * (`services/reports/managerReports.ts` — канон, `migration/loader.ts` — читает
 * другую таблицу и подставляет пояс по умолчанию вместо «неизвестно», и одна
 * снята из `routes/reports.ts`). Четвёртая была бы четвёртым источником истины о
 * календарной дате. Перенос дома в нейтральное место — отдельная задача, она
 * записана в очередь; зависимость дешевле копии и обратима.
 */
import { clinicTimeZone } from "../reports/managerReports.js";
import type {
	CommunicationChannelCode,
	CommunicationConsentScope,
} from "./channelRouter.js";
import { resolveTelegramChatId } from "./channelRouter.js";
import { loadConsentsByPatient } from "./consentLoader.js";
import { type ConsentRecord, decideConsent } from "./deliveryPolicy.js";
import { describeSmsPayload } from "./templateRenderer.js";

/**
 * Признаки отбора. Все необязательные; заданные складываются по «и».
 * Каждый признак превращается в настоящее условие SQL или в проверку после
 * выборки — там, где выразить его запросом дороже, чем проверить в коде.
 *
 * `| undefined` выписано явно: при exactOptionalPropertyTypes разобранный zod
 * отдаёт поля со значением undefined, а не отсутствующие, и без этого тип не
 * принимает собственный же результат разбора.
 */
export type AudienceCriteria = {
	/** active — обычные пациенты, archived — снятые с учёта. */
	readonly status?: "active" | "archived" | undefined;
	/** Последний приём был раньше этой даты (ISO). Основа возвратных рассылок. */
	readonly lastVisitBefore?: string | undefined;
	/** Последний приём был позже этой даты — для «недавно были». */
	readonly lastVisitAfter?: string | undefined;
	/** Ни одного приёма никогда. Взаимоисключающе с двумя предыдущими. */
	readonly neverVisited?: boolean | undefined;
	/** Есть будущая запись. false — чтобы не звать тех, кто уже записан. */
	readonly hasFutureAppointment?: boolean | undefined;
	/** Долг не меньше указанной суммы в рублях (оплачено минус запланировано). */
	readonly debtAtLeastRub?: number | undefined;
	/** День рождения в ближайшие N дней. */
	readonly birthdayWithinDays?: number | undefined;
	readonly ageFrom?: number | undefined;
	readonly ageTo?: number | undefined;
	/** Ограничить конкретными пациентами — для повторной отправки по списку. */
	readonly patientIds?: string[] | undefined;
};

export type AudienceCandidate = {
	readonly patientId: string;
	readonly fullName: string;
	readonly recipientAddress: string;
};

export type AudienceExclusionReason =
	| "no_contact"
	| "no_consent"
	| "status_mismatch"
	| "excluded_by_criteria";

export type AudiencePreview = {
	/** Подошли по признакам отбора. */
	readonly matched: number;
	/** Из них получат сообщение: есть контакт и согласие. */
	readonly deliverable: number;
	readonly candidates: AudienceCandidate[];
	readonly excluded: Readonly<Record<AudienceExclusionReason, number>>;
	/** Пояснения к отсеву — для интерфейса, не для лога. */
	readonly notes: string[];
};

export type EstimateAudienceCostInput = {
	readonly channel: CommunicationChannelCode;
	readonly recipients: number;
	readonly body: string;
};

export type AudienceCostEstimate = {
	readonly recipients: number;
	/** Для SMS — сегментов на одно сообщение. Для остальных каналов null. */
	readonly segmentsPerMessage: number | null;
	/** Всего тарифицируемых единиц: сегментов для SMS, сообщений для прочих. */
	readonly billableUnits: number;
	readonly note: string;
};

export function estimateAudienceCost(
	input: EstimateAudienceCostInput,
): AudienceCostEstimate {
	if (input.channel === "sms") {
		const payload = describeSmsPayload(input.body);
		return {
			recipients: input.recipients,
			segmentsPerMessage: payload.segments,
			billableUnits: payload.segments * input.recipients,
			note:
				`Кириллица считается как UCS-2: ${payload.characters} симв., ${payload.segments} сегм. на сообщение. ` +
				`Оператор выставит счёт за ${payload.segments * input.recipients} сегмент(ов).`,
		};
	}
	return {
		recipients: input.recipients,
		segmentsPerMessage: null,
		billableUnits: input.recipients,
		note: `Сообщений к отправке: ${input.recipients}.`,
	};
}

/**
 * Календарная дата «сегодня» ГЛАЗАМИ КЛИНИКИ, разложенная на числа.
 *
 * ЗАЧЕМ. Здесь брались `now.getUTCFullYear()`/`getUTCMonth()`/`getUTCDate()`, то
 * есть сегодняшний день по UTC. У всех российских поясов смещение
 * ПОЛОЖИТЕЛЬНОЕ, поэтому UTC отстаёт от местного календаря каждую ночь: в Самаре
 * (пояс по умолчанию в схеме) до 04:00, на Камчатке половину суток.
 *
 * ЧТО ЭТО ЗНАЧИЛО ДЛЯ КЛИНИКИ. У пациента день рождения. Администратор открывает
 * рассылку в 09:00 по местному времени — на Камчатке это ещё 21:00 ПРЕДЫДУЩЕГО
 * дня по UTC. Отбор «день рождения сегодня» (`0` дней) пациента НЕ находит: по
 * UTC до него ещё сутки. Зато находит отбор «через 1 день» — и поздравление
 * уходит на день позже, уже после праздника. То же с возрастом: пациент, которому
 * сегодня исполнилось 18, ещё сутки числится семнадцатилетним, а от возраста
 * зависит согласие на обработку данных и право самому подписывать документы.
 *
 * Пояс неизвестен — поведение прежнее, по поясу процесса. «Неизвестно» здесь не
 * превращается в «Москва»: подставленный пояс сдвинул бы поздравления у той
 * клиники, про которую мы как раз ничего не знаем.
 */
function calendarPartsIn(
	timeZone: string | null,
	at: Date,
): { year: number; month: number; day: number } {
	if (timeZone) {
		try {
			const parts = new Map(
				new Intl.DateTimeFormat("en-CA", {
					timeZone,
					year: "numeric",
					month: "2-digit",
					day: "2-digit",
				})
					.formatToParts(at)
					.map((part) => [part.type, part.value]),
			);
			const year = Number(parts.get("year"));
			const month = Number(parts.get("month"));
			const day = Number(parts.get("day"));
			if (
				Number.isFinite(year) &&
				Number.isFinite(month) &&
				Number.isFinite(day)
			) {
				return { year, month: month - 1, day };
			}
		} catch {
			// Имени пояса не существует — это не повод не отобрать получателей.
		}
	}
	return {
		year: at.getUTCFullYear(),
		month: at.getUTCMonth(),
		day: at.getUTCDate(),
	};
}

/** Возраст в полных годах по дате рождения в виде «ГГГГ-ММ-ДД». */
function ageFromBirthDate(
	birthDate: string | null,
	now: Date,
	timeZone: string | null,
): number | null {
	if (!birthDate) return null;
	const parsed = new Date(birthDate);
	if (Number.isNaN(parsed.getTime())) return null;
	const today = calendarPartsIn(timeZone, now);
	let age = today.year - parsed.getUTCFullYear();
	const monthDelta = today.month - parsed.getUTCMonth();
	if (monthDelta < 0 || (monthDelta === 0 && today.day < parsed.getUTCDate()))
		age -= 1;
	return age >= 0 && age < 130 ? age : null;
}

/**
 * Через сколько дней день рождения. Считается по дню и месяцу, поэтому 29
 * февраля у невисокосного года попадает на 1 марта — так же, как это делает
 * администратор вручную.
 *
 * Сравнение остаётся в UTC-миллисекундах намеренно: обе стороны — календарные
 * тройки без времени, `Date.UTC` здесь просто способ вычесть одну календарную
 * дату из другой без арифметики по длине месяцев. Пояс влияет на то, КАКАЯ дата
 * считается сегодняшней, а не на то, как считается разница.
 */
function daysUntilBirthday(
	birthDate: string | null,
	now: Date,
	timeZone: string | null,
): number | null {
	if (!birthDate) return null;
	const parsed = new Date(birthDate);
	if (Number.isNaN(parsed.getTime())) return null;

	const today = calendarPartsIn(timeZone, now);
	const todayUtc = Date.UTC(today.year, today.month, today.day);
	for (let yearOffset = 0; yearOffset <= 1; yearOffset += 1) {
		const candidate = Date.UTC(
			today.year + yearOffset,
			parsed.getUTCMonth(),
			parsed.getUTCDate(),
		);
		if (candidate >= todayUtc) {
			return Math.round((candidate - todayUtc) / 86_400_000);
		}
	}
	return null;
}

async function lastVisitByPatient(
	organizationId: string,
): Promise<Map<string, Date>> {
	// Последним приёмом считается последняя завершённая запись: черновик визита
	// без записи в расписании — это ещё не состоявшийся приём.
	const rows = await db
		.select({
			patientId: appointments.patientId,
			lastAt: sql<Date>`max(${appointments.startsAt})`,
		})
		.from(appointments)
		.where(
			and(
				eq(appointments.organizationId, organizationId),
				isNotNull(appointments.patientId),
				inArray(appointments.status, ["completed", "arrived", "in_treatment"]),
			),
		)
		.groupBy(appointments.patientId);

	const map = new Map<string, Date>();
	for (const row of rows) {
		if (row.patientId && row.lastAt)
			map.set(row.patientId, new Date(row.lastAt));
	}
	return map;
}

async function futureAppointmentPatientIds(
	organizationId: string,
	now: Date,
): Promise<Set<string>> {
	const rows = await db
		.select({ patientId: appointments.patientId })
		.from(appointments)
		.where(
			and(
				eq(appointments.organizationId, organizationId),
				isNotNull(appointments.patientId),
				gte(appointments.startsAt, now),
				inArray(appointments.status, ["planned", "confirmed"]),
			),
		);
	return new Set(
		rows.map((row) => row.patientId).filter((id): id is string => Boolean(id)),
	);
}

/**
 * Долг по пациенту: НАЗНАЧЕНО МИНУС ОПЛАЧЕНО, знак канона
 * (`money/patientDebt.ts`, `PatientLedger.balanceKopecks`). Возвращается
 * положительное число рублей долга; переплата и ноль в карту не попадают.
 *
 * ЗДЕСЬ СТОЯЛО «оплачено минус запланировано, как это считает
 * db/domainStateHydration.ts» — неверно дважды. Знак был назван обратным тому,
 * что считает код ниже, а файла `domainStateHydration.ts` в дереве больше нет ни
 * в рабочем каталоге, ни в индексе git. Ссылка на удалённый файл — это
 * приглашение искать его снова, а перевёрнутый знак в комментарии над денежным
 * расчётом — приглашение «починить» верный код.
 */
async function debtByPatient(
	organizationId: string,
): Promise<Map<string, number>> {
	const paidRows = await db
		.select({
			patientId: payments.patientId,
			total: sql<number>`coalesce(sum(${payments.amountRub}), 0)::numeric(12,2)`,
		})
		.from(payments)
		.where(
			and(
				eq(payments.organizationId, organizationId),
				eq(payments.status, "paid"),
			),
		)
		.groupBy(payments.patientId);

	const plannedRows = await db
		.select({
			patientId: treatmentItems.patientId,
			/*
			 * Было `::int`. Цена с миграции 0135 хранится с копейками, а приведение
			 * к целому срезало их у суммы долга, по которой потом отбирают, кому
			 * напомнить об оплате.
			 */
			/*
			 * `greatest(quantity, 1)` УБРАН. Это было ПОСЛЕДНЕЕ производственное
			 * зеркало выражения, которое 2026-08-06 убрали из
			 * `services/reports/managerReports.ts` в трёх местах; полный разбор с
			 * тремя опровергнутыми оправданиями стоит там, у `serviceSales`.
			 *
			 * ПОЧЕМУ ОНО ЗДЕСЬ ХУЖЕ, ЧЕМ В ОТЧЁТЕ. Там неверное число читал
			 * руководитель, здесь оно решает, КОМУ УЙДЁТ СООБЩЕНИЕ: эта величина
			 * сравнивается с признаком отбора `debtAtLeastRub`
			 * (`routes/communicationsOutbox.ts`, вкладка кампаний в интерфейсе).
			 * Позиция с количеством 0 добавляла пациенту полную цену одной единицы,
			 * то есть могла перевести его через порог — и человек получал напоминание
			 * о долге, которого у него нет. Отправленное сообщение не отзывается, как
			 * строку отчёта.
			 *
			 * ДОКАЗАТЕЛЬСТВО ПОВТОРЕНО НА ЭТОМ ВЫРАЖЕНИИ, А НЕ ПЕРЕНЕСЕНО. Прогон в
			 * живом PostgreSQL 18.4 на VALUES, цена 1000,00, скидка 100,00:
			 *   кол-во 1, 2, 3, 1.5 — старое и новое выражения совпадают побитово;
			 *   кол-во 0.5 — 400,00 против 900,00;
			 *   кол-во 0    —   0,00 против 900,00;
			 *   кол-во -1   —   0,00 против 900,00.
			 * То есть расхождение начинается не только на нуле и отрицательном, а на
			 * ЛЮБОМ количестве меньше единицы, и всюду старое выражение выставляло
			 * полную цену за единицу, которой в позиции нет. Введено 2026-07-27
			 * первым коммитом этого файла (b1fb7c38f) без единого слова объяснения.
			 *
			 * Прежний комментарий выше называл дробное количество нормой («половина
			 * услуги, треть курса»). Это было неверно уже тогда — общий контракт
			 * `packages/shared/src/index.ts` объявляет
			 * `quantity: z.number().int().positive()` — а с миграции 0162 стало и
			 * невозможным: у колонки есть ограничения `quantity > 0` и
			 * `quantity = trunc(quantity)`.
			 */
			total: sql<number>`coalesce(sum(greatest(${treatmentItems.unitPriceRub} * ${treatmentItems.quantity} - ${treatmentItems.discountRub}, 0)), 0)::numeric(12,2)`,
		})
		.from(treatmentItems)
		.where(
			and(
				eq(treatmentItems.organizationId, organizationId),
				ne(treatmentItems.status, "cancelled"),
			),
		)
		.groupBy(treatmentItems.patientId);

	const paid = new Map(
		paidRows.map((row) => [row.patientId, Number(row.total)]),
	);
	const debts = new Map<string, number>();
	for (const row of plannedRows) {
		const debt = Number(row.total) - (paid.get(row.patientId) ?? 0);
		if (debt > 0) debts.set(row.patientId, debt);
	}
	return debts;
}

export type ResolveAudienceInput = {
	readonly organizationId: string;
	readonly channel: CommunicationChannelCode;
	readonly scope: CommunicationConsentScope;
	readonly criteria: AudienceCriteria;
	readonly now?: Date;
	/**
	 * Пояс клиники для календарных признаков (день рождения, возраст). Не задан —
	 * читается из клиники по `organizationId`. Поле нужно проверкам: задать пояс
	 * без заведения клиники дешевле, чем сеять клинику ради одного числа.
	 */
	readonly timeZone?: string | null;
	/** Ограничить размер выборки — предпросмотр не должен тянуть всю картотеку. */
	readonly limit?: number;
};

/**
 * Кто получит рассылку и кто нет, с причинами. Одна и та же функция
 * используется и для предпросмотра, и для запуска: расхождение между
 * «показали» и «отправили» здесь недопустимо.
 */
export async function resolveAudience(
	input: ResolveAudienceInput,
): Promise<AudiencePreview> {
	const now = input.now ?? new Date();
	const limit = Math.max(1, Math.min(20_000, input.limit ?? 5000));
	const criteria = input.criteria;

	/*
	 * Пояс читается ТОЛЬКО когда он нужен — то есть когда отбор смотрит на день
	 * рождения или на возраст. Лишний запрос к базе на каждый предпросмотр
	 * рассылки не нужен: остальные признаки календарной даты не касаются.
	 * Явно переданный пояс (`input.timeZone`) не перезапрашивается — так тест
	 * может задать пояс, не заводя клинику.
	 */
	const needsCalendarDate =
		criteria.birthdayWithinDays !== undefined ||
		criteria.ageFrom !== undefined ||
		criteria.ageTo !== undefined;
	const timeZone = needsCalendarDate
		? (input.timeZone ?? (await clinicTimeZone(input.organizationId)))
		: (input.timeZone ?? null);

	const filters: SQL[] = [eq(patients.organizationId, input.organizationId)];
	filters.push(eq(patients.status, criteria.status ?? "active"));
	if (criteria.patientIds && criteria.patientIds.length > 0) {
		filters.push(inArray(patients.id, criteria.patientIds));
	}

	// Канал определяет, какой контакт обязателен. Без этого условия выборка
	// показала бы 400 подходящих пациентов, из которых сообщение получат 40.
	if (input.channel === "email") {
		filters.push(isNotNull(patients.email));
		filters.push(ne(patients.email, ""));
	} else if (input.channel === "sms" || input.channel === "whatsapp") {
		filters.push(isNotNull(patients.phone));
		filters.push(ne(patients.phone, ""));
	}

	const rows = await db
		.select({
			id: patients.id,
			fullName: patients.fullName,
			phone: patients.phone,
			email: patients.email,
			birthDate: patients.birthDate,
		})
		.from(patients)
		.where(and(...filters))
		.limit(limit);

	const needsVisitData =
		criteria.lastVisitBefore !== undefined ||
		criteria.lastVisitAfter !== undefined ||
		criteria.neverVisited === true;
	const [lastVisits, futureAppointments, debts] = await Promise.all([
		needsVisitData
			? lastVisitByPatient(input.organizationId)
			: Promise.resolve(new Map<string, Date>()),
		criteria.hasFutureAppointment !== undefined
			? futureAppointmentPatientIds(input.organizationId, now)
			: Promise.resolve(new Set<string>()),
		criteria.debtAtLeastRub !== undefined
			? debtByPatient(input.organizationId)
			: Promise.resolve(new Map<string, number>()),
	]);

	const excluded: Record<AudienceExclusionReason, number> = {
		no_contact: 0,
		no_consent: 0,
		status_mismatch: 0,
		excluded_by_criteria: 0,
	};
	const notes: string[] = [];
	const matchedIds: string[] = [];
	const matchedById = new Map<string, (typeof rows)[number]>();

	for (const row of rows) {
		if (criteria.neverVisited === true && lastVisits.has(row.id)) {
			excluded.excluded_by_criteria += 1;
			continue;
		}
		if (criteria.lastVisitBefore !== undefined) {
			const lastVisit = lastVisits.get(row.id);
			if (!lastVisit || lastVisit >= new Date(criteria.lastVisitBefore)) {
				excluded.excluded_by_criteria += 1;
				continue;
			}
		}
		if (criteria.lastVisitAfter !== undefined) {
			const lastVisit = lastVisits.get(row.id);
			if (!lastVisit || lastVisit <= new Date(criteria.lastVisitAfter)) {
				excluded.excluded_by_criteria += 1;
				continue;
			}
		}
		if (
			criteria.hasFutureAppointment !== undefined &&
			futureAppointments.has(row.id) !== criteria.hasFutureAppointment
		) {
			excluded.excluded_by_criteria += 1;
			continue;
		}
		if (
			criteria.debtAtLeastRub !== undefined &&
			(debts.get(row.id) ?? 0) < criteria.debtAtLeastRub
		) {
			excluded.excluded_by_criteria += 1;
			continue;
		}
		if (criteria.birthdayWithinDays !== undefined) {
			const days = daysUntilBirthday(row.birthDate, now, timeZone);
			if (days === null || days > criteria.birthdayWithinDays) {
				excluded.excluded_by_criteria += 1;
				continue;
			}
		}
		if (criteria.ageFrom !== undefined || criteria.ageTo !== undefined) {
			const age = ageFromBirthDate(row.birthDate, now, timeZone);
			if (age === null) {
				excluded.excluded_by_criteria += 1;
				continue;
			}
			if (criteria.ageFrom !== undefined && age < criteria.ageFrom) {
				excluded.excluded_by_criteria += 1;
				continue;
			}
			if (criteria.ageTo !== undefined && age > criteria.ageTo) {
				excluded.excluded_by_criteria += 1;
				continue;
			}
		}

		matchedIds.push(row.id);
		matchedById.set(row.id, row);
	}

	// Согласия читаются одним запросом на всю выборку: по одному на пациента —
	// это тысяча запросов на тысячную рассылку.
	const consentsByPatient = await loadConsents(
		input.organizationId,
		matchedIds,
	);

	const candidates: AudienceCandidate[] = [];
	for (const patientId of matchedIds) {
		const row = matchedById.get(patientId);
		if (!row) continue;

		if (
			!decideConsent(
				consentsByPatient.get(patientId) ?? [],
				input.channel,
				input.scope,
			).allowed
		) {
			excluded.no_consent += 1;
			continue;
		}

		const address = await recipientAddressFor(
			input.organizationId,
			input.channel,
			row,
		);
		if (!address) {
			excluded.no_contact += 1;
			continue;
		}

		candidates.push({
			patientId,
			fullName: row.fullName,
			recipientAddress: address,
		});
	}

	if (excluded.no_consent > 0 && input.scope === "marketing") {
		notes.push(
			`${excluded.no_consent} пациент(ов) отсеяно без согласия на рекламные сообщения. ` +
				"Согласие фиксируется в карточке пациента; без него отправка запрещена законом о рекламе.",
		);
	}
	if (excluded.no_contact > 0) {
		notes.push(
			`${excluded.no_contact} пациент(ов) без пригодного контакта для этого канала.`,
		);
	}
	if (rows.length >= limit) {
		// Молчаливое усечение выборки выглядело бы как «столько и есть».
		notes.push(
			`Показаны первые ${limit} записей: выборка ограничена, уточните условия отбора.`,
		);
	}

	return {
		matched: matchedIds.length,
		deliverable: candidates.length,
		candidates,
		excluded,
		notes,
	};
}

/**
 * Тело этой функции переехало в ./consentLoader.ts без изменения запроса: тот же
 * пакетный отбор по (organization_id, patient_id) понадобился планировщику
 * напоминаний о приёме, который до этого спрашивал базу о каждом приёме отдельно.
 * Обёртка оставлена, чтобы не менять здесь ни одного вызова.
 */
async function loadConsents(
	organizationId: string,
	patientIds: string[],
): Promise<Map<string, ConsentRecord[]>> {
	return loadConsentsByPatient(organizationId, patientIds);
}

async function recipientAddressFor(
	organizationId: string,
	channel: CommunicationChannelCode,
	row: { id: string; phone: string | null; email: string | null },
): Promise<string | null> {
	if (channel === "telegram")
		return resolveTelegramChatId(organizationId, row.id);
	if (channel === "email") {
		const email = row.email?.trim() ?? "";
		return isValidEmailAddress(email) ? email : null;
	}
	return channel === "whatsapp"
		? normalizeWhatsappRecipient(row.phone)
		: normalizeRussianMsisdn(row.phone);
}

export const AUDIENCE_CRITERIA_KEYS: readonly (keyof AudienceCriteria)[] = [
	"status",
	"lastVisitBefore",
	"lastVisitAfter",
	"neverVisited",
	"hasFutureAppointment",
	"debtAtLeastRub",
	"birthdayWithinDays",
	"ageFrom",
	"ageTo",
	"patientIds",
];

/** Человекочитаемое описание условий — попадает в журнал и в интерфейс. */
export function describeCriteria(criteria: AudienceCriteria): string[] {
	const parts: string[] = [];
	if (criteria.status)
		parts.push(
			criteria.status === "active" ? "активные пациенты" : "архивные пациенты",
		);
	if (criteria.neverVisited) parts.push("ни разу не были на приёме");
	if (criteria.lastVisitBefore)
		parts.push(
			`последний приём раньше ${criteria.lastVisitBefore.slice(0, 10)}`,
		);
	if (criteria.lastVisitAfter)
		parts.push(`последний приём позже ${criteria.lastVisitAfter.slice(0, 10)}`);
	if (criteria.hasFutureAppointment === true) parts.push("есть будущая запись");
	if (criteria.hasFutureAppointment === false) parts.push("нет будущей записи");
	if (criteria.debtAtLeastRub !== undefined)
		parts.push(`долг не меньше ${criteria.debtAtLeastRub} ₽`);
	if (criteria.birthdayWithinDays !== undefined)
		parts.push(`день рождения в ближайшие ${criteria.birthdayWithinDays} дн.`);
	if (criteria.ageFrom !== undefined)
		parts.push(`возраст от ${criteria.ageFrom}`);
	if (criteria.ageTo !== undefined) parts.push(`возраст до ${criteria.ageTo}`);
	if (criteria.patientIds?.length)
		parts.push(`список из ${criteria.patientIds.length} пациент(ов)`);
	return parts;
}
