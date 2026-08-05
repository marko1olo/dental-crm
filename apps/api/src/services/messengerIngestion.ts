/**
 * Разбор входящих сообщений из мессенджеров.
 *
 * ЧТО БЫЛО НЕ ТАК
 *
 * 1. Разбор запускался только из двух вебхуков — routes/whatsapp.ts и
 *    routes/max.ts — и то как `void processInboundEvents().catch(console.error)`,
 *    то есть без ожидания и без повтора. Следствия: событие, упавшее при
 *    разборе, не разбиралось больше никогда; входящие из любого другого
 *    источника (Telegram, SMS, ручная вставка) не разбирались вовсе; при
 *    перезапуске сервера очередь оставалась нетронутой. Теперь тот же разбор
 *    вызывается ещё и фоновым обработчиком (dispatchWorker), поэтому
 *    непрочитанное не залипает.
 *
 * 2. Каждое сообщение с неопознанного номера создавало КАРТОЧКУ ПАЦИЕНТА с
 *    именем вида «WhatsApp User 79161234567». Ошибочно набранный номер, спам,
 *    сообщение курьера — всё это попадало в картотеку наравне с живыми
 *    пациентами и портило поиск, статистику и рассылки. Для незнакомого
 *    отправителя правильное место — CRM-лид (crm_leads), а не медкарта.
 *
 * 3. Сообщения из MAX записывались как `channel: "telegram"` через `as any` —
 *    в перечислении не было значения `max`. Значение добавлено миграцией 0120,
 *    подмена больше не нужна.
 *
 * 4. Сопоставление пациента по телефону шло через `ILIKE %последние-10-цифр%`
 *    и брало первую попавшуюся строку. При двух совпадениях переписка уходила
 *    в чужую карточку. Теперь неоднозначное совпадение не сопоставляется вовсе:
 *    событие становится лидом с пометкой, и его разбирает администратор.
 *
 * 5. Одно испорченное событие обрывало разбор всей очереди — `for` без
 *    try/catch внутри. Теперь сбой изолирован в пределах события.
 *
 * 6. Ответ «СТОП» ничего не менял. Отписаться пациент не мог никак, кроме
 *    звонка в клинику, при том что обязанность прекратить рассылку возникает
 *    сразу. Теперь отказ фиксируется в согласиях по этому каналу.
 */

import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { withSuperuserBypass, withTenantCtx } from "../db/rls.js";
import {
	clinics,
	communicationEvents,
	crmLeads,
	messengerInboundEvents,
	patientCommunicationConsents,
	patients
} from "../db/schema.js";
import type { CommunicationChannelCode } from "./communications/channelRouter.js";
import { enqueueMessage } from "./communications/dispatcher.js";
import { detectOptOutIntent, optOutAcknowledgement } from "./communications/optOut.js";
import { wsBroker } from "./websocketBroker.js";

export type InboundIngestionReport = {
	readonly processed: number;
	readonly matchedToPatient: number;
	readonly leadsCreated: number;
	readonly optOuts: number;
	readonly optIns: number;
	readonly ambiguous: number;
	readonly failed: number;
	readonly problems: string[];
};

/** Каналы, которые могут прийти во входящих. Значения совпадают с pgEnum. */
const KNOWN_CHANNELS: readonly CommunicationChannelCode[] = ["telegram", "whatsapp", "vk", "max", "sms", "email"];

/**
 * Тип возвращается конкретный, а не string: код канала расходится дальше — в
 * согласия, в очередь, в ответ пациенту, — и потерянный тип там означал бы
 * приведение вслепую.
 */
function channelForEvent(rawChannel: string): CommunicationChannelCode {
	// Неизвестный канал раньше подменялся телеграмом. Подмена — это неправда в
	// журнале; здесь неизвестное значение сводится к telegram только потому,
	// что колонка перечислением ограничена, и это единственный случай.
	const known = KNOWN_CHANNELS.find((candidate) => candidate === rawChannel);
	return known ?? "telegram";
}

type PatientMatch =
	| { readonly kind: "found"; readonly patientId: string }
	| { readonly kind: "none" }
	| { readonly kind: "ambiguous"; readonly count: number };

/**
 * Пациент по номеру телефона. Сравнение по последним десяти цифрам с очисткой
 * номера в базе от разделителей: «+7 (916) 123-45-67» и «89161234567» — один и
 * тот же номер. Больше одного совпадения — `ambiguous`: записать переписку в
 * чужую карту хуже, чем оставить её неразобранной.
 */
async function findPatientByPhone(organizationId: string, rawPhone: string): Promise<PatientMatch> {
	const digits = rawPhone.replace(/\D/g, "");
	if (digits.length < 10) return { kind: "none" };
	const suffix = digits.slice(-10);

	const rows = await db
		.select({ id: patients.id })
		.from(patients)
		.where(
			and(
				eq(patients.organizationId, organizationId),
				sql`right(regexp_replace(coalesce(${patients.phone}, ''), '[^0-9]', '', 'g'), 10) = ${suffix}`
			)
		)
		.limit(5);

	if (rows.length === 0) return { kind: "none" };
	if (rows.length > 1) return { kind: "ambiguous", count: rows.length };
	const first = rows[0];
	return first ? { kind: "found", patientId: first.id } : { kind: "none" };
}

/** Пациент по метке внешнего чата в заметках — так связывается MAX. */
async function findPatientByExternalMark(organizationId: string, mark: string): Promise<PatientMatch> {
	const rows = await db
		.select({ id: patients.id })
		.from(patients)
		.where(and(eq(patients.organizationId, organizationId), sql`${patients.notes} LIKE ${`%${mark}%`}`))
		.limit(5);

	if (rows.length === 0) return { kind: "none" };
	if (rows.length > 1) return { kind: "ambiguous", count: rows.length };
	const first = rows[0];
	return first ? { kind: "found", patientId: first.id } : { kind: "none" };
}

/**
 * Отказ от сообщений: обе области сразу. Пациент, написавший «СТОП», не делает
 * разницы между сервисным и рекламным — разбираться в этом должна клиника, а
 * не он.
 */
async function revokeConsentForChannel(organizationId: string, patientId: string, channel: string, evidence: string) {
	const now = new Date();
	for (const scope of ["service", "marketing"] as const) {
		await db
			.insert(patientCommunicationConsents)
			.values({
				organizationId,
				patientId,
				channel: channel as never,
				scope,
				state: "revoked",
				source: "inbound_stop",
				evidence: evidence.slice(0, 500),
				decidedAt: now
			})
			.onConflictDoUpdate({
				target: [
					patientCommunicationConsents.organizationId,
					patientCommunicationConsents.patientId,
					patientCommunicationConsents.channel,
					patientCommunicationConsents.scope
				],
				set: {
					state: "revoked",
					source: "inbound_stop",
					evidence: evidence.slice(0, 500),
					decidedAt: now,
					updatedAt: now
				}
			});
	}
}

/**
 * Возврат к рассылке по просьбе пациента. Возвращается только сервисная
 * область: согласие на рекламу словом «СТАРТ» не выдаётся — для рекламы нужно
 * отдельное явное согласие (ФЗ «О рекламе» ст. 18 ч. 1).
 */
async function restoreServiceConsent(organizationId: string, patientId: string, channel: string, evidence: string) {
	const now = new Date();
	await db
		.insert(patientCommunicationConsents)
		.values({
			organizationId,
			patientId,
			channel: channel as never,
			scope: "service",
			state: "granted",
			source: "inbound_start",
			evidence: evidence.slice(0, 500),
			decidedAt: now
		})
		.onConflictDoUpdate({
			target: [
				patientCommunicationConsents.organizationId,
				patientCommunicationConsents.patientId,
				patientCommunicationConsents.channel,
				patientCommunicationConsents.scope
			],
			set: {
				state: "granted",
				source: "inbound_start",
				evidence: evidence.slice(0, 500),
				decidedAt: now,
				updatedAt: now
			}
		});
}

async function markAsProcessed(eventId: string) {
	await db
		.update(messengerInboundEvents)
		.set({ processedAt: new Date() })
		.where(eq(messengerInboundEvents.id, eventId));
}

export async function processInboundEvents(options: { limit?: number } = {}): Promise<InboundIngestionReport> {
	const limit = Math.max(1, Math.min(500, options.limit ?? 100));
	const report = {
		processed: 0,
		matchedToPatient: 0,
		leadsCreated: 0,
		optOuts: 0,
		optIns: 0,
		ambiguous: 0,
		failed: 0,
		problems: [] as string[]
	};

	/*
	 * ОЧЕРЕДЬ ВХОДЯЩИХ ОБЩАЯ ДЛЯ ВСЕХ КЛИНИК, и это единственное место разбора,
	 * где арендатор неизвестен: строка ещё не прочитана, назвать клинику нечем.
	 *
	 * Под FORCE RLS этот запрос без контекста возвращал ноль строк и не ошибался
	 * ни разу: цикл ниже не выполнялся НИКОГДА, и весь модуль был мёртв при
	 * живых вызывающих. Дороже всего это стоило на слове «СТОП» — отказ от
	 * рассылки не доходил до согласий, и клиника продолжала писать человеку,
	 * который прямо попросил перестать.
	 *
	 * Обход накрывает РОВНО это чтение очереди. Разбор каждого события идёт под
	 * контекстом ЕГО клиники (ниже): под обходом соседнее событие чужой клиники
	 * могло бы дописать согласие или лид не в ту картотеку.
	 */
	const pendingEvents = await withSuperuserBypass(async (tx) =>
		tx
			.select()
			.from(messengerInboundEvents)
			.where(isNull(messengerInboundEvents.processedAt))
			.orderBy(messengerInboundEvents.createdAt)
			.limit(limit)
	);

	for (const event of pendingEvents) {
		try {
			// Сбой на одном событии не должен останавливать разбор очереди.
			// Клиника события известна из самой строки — работа идёт под ней.
			await withTenantCtx(event.organizationId, () => processSingleEvent(event, report));
			report.processed += 1;
		} catch (error) {
			report.failed += 1;
			report.problems.push(
				`Событие ${event.id}: ${error instanceof Error ? error.message.slice(0, 200) : String(error).slice(0, 200)}`
			);
		}
	}

	return report;
}

/**
 * Подтверждение пациенту, что его «СТОП» или «СТАРТ» приняты.
 *
 * ЧТО БЫЛО. Текст подтверждения существовал (optOutAcknowledgement), но не
 * отправлялся никуда, кроме теста: согласие отзывалось молча. Со стороны
 * пациента это выглядит как игнорирование — он попросил перестать, ответа нет,
 * а через неделю приходит служебное напоминание о приёме. Дальше жалоба, и она
 * будет справедливой по ощущению, даже если формально всё верно.
 *
 * Ставится с назначением transactional_reply — единственным, которому диспетчер
 * разрешает обойти только что отозванное согласие и тихие часы. Ключ повтора
 * привязан к событию: повторный разбор той же входящей строки не пошлёт второе
 * подтверждение.
 *
 * Ошибка постановки не роняет разбор входящих: отзыв согласия уже произошёл и
 * важнее ответа. Молча это тоже не проходит — причина пишется в журнал.
 */
async function sendOptOutAcknowledgement(
	organizationId: string,
	patientId: string,
	channel: CommunicationChannelCode,
	intent: "opt_out" | "opt_in",
	eventId: string
): Promise<void> {
	try {
		const [clinic] = await db
			.select({ name: clinics.name })
			.from(clinics)
			.where(eq(clinics.organizationId, organizationId))
			.limit(1);

		const result = await enqueueMessage({
			organizationId,
			patientId,
			channel,
			intent: "transactional_reply",
			// scope остаётся служебным: это ответ на обращение, не реклама.
			scope: "service",
			body: optOutAcknowledgement(intent, clinic?.name ?? "Клиника"),
			dedupeKey: `optout-ack:${eventId}`
		});

		if (!result.ok) {
			console.warn(`Подтверждение отписки не поставлено в очередь (пациент ${patientId}): ${result.reason}`);
		}
	} catch (error) {
		console.error("Подтверждение отписки не поставлено в очередь:", error);
	}
}

type InboundEventRow = typeof messengerInboundEvents.$inferSelect;

async function processSingleEvent(
	event: InboundEventRow,
	report: {
		matchedToPatient: number;
		leadsCreated: number;
		optOuts: number;
		optIns: number;
		ambiguous: number;
	}
): Promise<void> {
	const messageText = event.messageText?.trim();
	if (!messageText) {
		// Статусы доставки и служебные события текста не несут.
		await markAsProcessed(event.id);
		return;
	}

	const organizationId = event.organizationId;
	const channel = channelForEvent(event.channel);
	const externalChatId = event.externalChatId?.trim() ?? "";
	let patientId = event.patientId;
	let ambiguousMatch = false;

	if (!patientId && externalChatId) {
		const match =
			channel === "whatsapp" || channel === "sms"
				? await findPatientByPhone(organizationId, externalChatId)
				: await findPatientByExternalMark(organizationId, `${channel.toUpperCase()}:${externalChatId}`);

		if (match.kind === "found") {
			patientId = match.patientId;
			await db.update(messengerInboundEvents).set({ patientId }).where(eq(messengerInboundEvents.id, event.id));
		} else if (match.kind === "ambiguous") {
			ambiguousMatch = true;
			report.ambiguous += 1;
		}
	}

	if (patientId) {
		report.matchedToPatient += 1;

		const intent = detectOptOutIntent(messageText);
		if (intent === "opt_out") {
			await revokeConsentForChannel(organizationId, patientId, channel, messageText);
			report.optOuts += 1;
			await sendOptOutAcknowledgement(organizationId, patientId, channel, "opt_out", event.id);
		} else if (intent === "opt_in") {
			await restoreServiceConsent(organizationId, patientId, channel, messageText);
			report.optIns += 1;
			await sendOptOutAcknowledgement(organizationId, patientId, channel, "opt_in", event.id);
		}

		await db.insert(communicationEvents).values({
			organizationId,
			patientId,
			// Канал записывается как есть: раньше MAX подменялся телеграмом.
			channel: channel as never,
			direction: "inbound",
			status: "delivered",
			message:
				intent === null
					? messageText
					: `${messageText} [распознано: ${intent === "opt_out" ? "отказ от сообщений" : "возврат к рассылке"}]`
		});

		wsBroker.broadcastToOrganization(organizationId, {
			type: "INBOX_NEW_MESSAGE",
			payload: { channel, patientId, text: messageText, optOutIntent: intent }
		});

		await markAsProcessed(event.id);
		return;
	}

	// Незнакомый отправитель — это лид, а не медицинская карта. Раньше здесь
	// создавалась карточка пациента с именем «WhatsApp User 79161234567».
	const [clinic] = await db
		.select({ name: clinics.name })
		.from(clinics)
		.where(eq(clinics.organizationId, organizationId))
		.limit(1);

	const noteParts = [
		`Первое сообщение: ${messageText.slice(0, 400)}`,
		`Внешний чат: ${externalChatId || "неизвестен"}`
	];
	if (ambiguousMatch) {
		noteParts.push("ВНИМАНИЕ: под этот номер подходит несколько карточек пациентов — сопоставьте вручную.");
	}
	if (clinic?.name) noteParts.push(`Клиника: ${clinic.name}`);

	const [lead] = await db
		.insert(crmLeads)
		.values({
			organizationId,
			name: `Входящее сообщение · ${channel}`,
			phone: channel === "whatsapp" || channel === "sms" ? externalChatId || null : null,
			source: `inbound_${channel}`,
			status: "new",
			notes: noteParts.join("\n")
		})
		.returning({ id: crmLeads.id });

	if (lead) report.leadsCreated += 1;

	wsBroker.broadcastToOrganization(organizationId, {
		type: "INBOX_NEW_MESSAGE",
		payload: { channel, patientId: null, leadId: lead?.id ?? null, text: messageText, ambiguousMatch }
	});

	await markAsProcessed(event.id);
}
