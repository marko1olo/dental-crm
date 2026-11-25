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
 * 3. Сообщения из MAX записывались как `channel: "telegram"` через принудительное приведение типа —
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

import { and, eq, gte, lte, isNull, sql } from "drizzle-orm";
import { onTenantTxCommit, withSuperuserBypass, withTenantCtx, type TenantDb } from "../db/rls.js";
import {
	appointments,
	clinics,
	communicationEvents,
	communicationTasks,
	crmLeads,
	messengerInboundEvents,
	patientCommunicationConsents,
	patients,
} from "../db/schema.js";
import { defaultWhatsAppBridge } from "./messaging/whatsappBridge.js";
import type { CommunicationChannelCode } from "./communications/channelRouter.js";
import { enqueueMessage } from "./communications/dispatcher.js";
import {
	detectOptOutIntent,
	optOutAcknowledgement,
} from "./communications/optOut.js";
import { wsBroker } from "./websocketBroker.js";

export type InboundIngestionLogger = {
	readonly info?: (obj: unknown, msg?: string) => void;
	readonly warn?: (obj: unknown, msg?: string) => void;
	readonly error?: (obj: unknown, msg?: string) => void;
};

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
const KNOWN_CHANNELS: readonly CommunicationChannelCode[] = [
	"telegram",
	"whatsapp",
	"vk",
	"max",
	"sms",
	"email",
];

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
async function findPatientByPhone(
	tx: TenantDb,
	organizationId: string,
	rawPhone: string,
): Promise<PatientMatch> {
	const digits = rawPhone.replace(/\D/g, "");
	if (digits.length < 10) return { kind: "none" };
	const suffix = digits.slice(-10);

	const rows = await tx
		.select({ id: patients.id })
		.from(patients)
		.where(
			and(
				eq(patients.organizationId, organizationId),
				sql`right(regexp_replace(coalesce(${patients.phone}, ''), '[^0-9]', '', 'g'), 10) = ${suffix}`,
			),
		)
		.limit(5);

	if (rows.length === 0) return { kind: "none" };
	if (rows.length > 1) return { kind: "ambiguous", count: rows.length };
	const first = rows[0];
	return first ? { kind: "found", patientId: first.id } : { kind: "none" };
}

/** Пациент по метке внешнего чата в заметках — так связывается MAX. */
async function findPatientByExternalMark(
	tx: TenantDb,
	organizationId: string,
	mark: string,
): Promise<PatientMatch> {
	const rows = await tx
		.select({ id: patients.id })
		.from(patients)
		.where(
			and(
				eq(patients.organizationId, organizationId),
				sql`${patients.notes} LIKE ${`%${mark}%`}`,
			),
		)
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
async function revokeConsentForChannel(
	tx: TenantDb,
	organizationId: string,
	patientId: string,
	channel: CommunicationChannelCode,
	evidence: string,
) {
	const now = new Date();
	for (const scope of ["service", "marketing"] as const) {
		await tx
			.insert(patientCommunicationConsents)
			.values({
				organizationId,
				patientId,
				channel: channel as (typeof patientCommunicationConsents.$inferInsert)["channel"],
				scope,
				state: "revoked",
				source: "inbound_stop",
				evidence: evidence.slice(0, 500),
				decidedAt: now,
			})
			.onConflictDoUpdate({
				target: [
					patientCommunicationConsents.organizationId,
					patientCommunicationConsents.patientId,
					patientCommunicationConsents.channel,
					patientCommunicationConsents.scope,
				],
				set: {
					state: "revoked",
					source: "inbound_stop",
					evidence: evidence.slice(0, 500),
					decidedAt: now,
					updatedAt: now,
				},
			});
	}
}

/**
 * Возврат к рассылке по просьбе пациента. Возвращается только сервисная
 * область: согласие на рекламу словом «СТАРТ» не выдаётся — для рекламы нужно
 * отдельное явное согласие (ФЗ «О рекламе» ст. 18 ч. 1).
 */
async function restoreServiceConsent(
	tx: TenantDb,
	organizationId: string,
	patientId: string,
	channel: CommunicationChannelCode,
	evidence: string,
) {
	const now = new Date();
	await tx
		.insert(patientCommunicationConsents)
		.values({
			organizationId,
			patientId,
			channel: channel as (typeof patientCommunicationConsents.$inferInsert)["channel"],
			scope: "service",
			state: "granted",
			source: "inbound_start",
			evidence: evidence.slice(0, 500),
			decidedAt: now,
		})
		.onConflictDoUpdate({
			target: [
				patientCommunicationConsents.organizationId,
				patientCommunicationConsents.patientId,
				patientCommunicationConsents.channel,
				patientCommunicationConsents.scope,
			],
			set: {
				state: "granted",
				source: "inbound_start",
				evidence: evidence.slice(0, 500),
				decidedAt: now,
				updatedAt: now,
			},
		});
}

async function markAsProcessed(tx: TenantDb, organizationId: string, eventId: string) {
	await tx
		.update(messengerInboundEvents)
		.set({ processedAt: new Date() })
		.where(
			and(
				eq(messengerInboundEvents.id, eventId),
				eq(messengerInboundEvents.organizationId, organizationId),
			),
		);
}

export async function processInboundEvents(
	options: { limit?: number; logger?: InboundIngestionLogger } = {},
): Promise<InboundIngestionReport> {
	const limit = Math.max(1, Math.min(500, options.limit ?? 100));
	const logger = options.logger;
	const report = {
		processed: 0,
		matchedToPatient: 0,
		leadsCreated: 0,
		optOuts: 0,
		optIns: 0,
		ambiguous: 0,
		failed: 0,
		problems: [] as string[],
	};

	const pendingEvents = await withSuperuserBypass(async (tx) =>
		tx
			.select()
			.from(messengerInboundEvents)
			.where(isNull(messengerInboundEvents.processedAt))
			.orderBy(messengerInboundEvents.createdAt)
			.limit(limit),
	);

	for (const event of pendingEvents) {
		try {
			// Сбой на одном событии не должен останавливать разбор очереди.
			// Клиника события известна из самой строки — работа идёт под ней.
			await withTenantCtx(event.organizationId, (tx) =>
				processSingleEvent(tx, event, report, logger),
			);
			report.processed += 1;
		} catch (error) {
			report.failed += 1;
			report.problems.push(
				`Событие ${event.id}: ${error instanceof Error ? error.message.slice(0, 200) : String(error).slice(0, 200)}`,
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
	tx: TenantDb,
	organizationId: string,
	patientId: string,
	channel: CommunicationChannelCode,
	intent: "opt_out" | "opt_in",
	eventId: string,
	logger?: InboundIngestionLogger,
): Promise<void> {
	try {
		const [clinic] = await tx
			.select({ name: clinics.name })
			.from(clinics)
			.where(eq(clinics.organizationId, organizationId))
			.limit(1);

		const result = await enqueueMessage(
			{
				organizationId,
				patientId,
				channel,
				intent: "transactional_reply",
				// scope остаётся служебным: это ответ на обращение, не реклама.
				scope: "service",
				body: optOutAcknowledgement(intent, clinic?.name ?? "Клиника"),
				dedupeKey: `optout-ack:${eventId}`,
			},
			tx,
		);

		if (!result.ok) {
			logger?.warn?.(
				{ patientId, reason: result.reason },
				`Подтверждение отписки не поставлено в очередь (пациент ${patientId}): ${result.reason}`,
			);
		}
	} catch (error) {
		logger?.error?.({ error, patientId }, "Подтверждение отписки не поставлено в очередь");
	}
}

export function isPositiveAppointmentConfirmationText(text: string): boolean {
	const cleaned = text
		.trim()
		.toLowerCase()
		.replace(/[\s\-_,!.?]+/g, " ")
		.trim();
	if (/^(да|буду|приду|подтверждаю|подтверждаем|подтвердить|ок|ok|хорошо|\+)$/i.test(cleaned)) {
		return true;
	}
	if (/^(да\s*(буду|приду|подтверждаю|конечно|обязательно)|буду\s*обязательно|запись\s*подтверждаю|подтверждаю\s*запись|буду\s*на\s*приеме|буду\s*на\s*приёме)$/i.test(cleaned)) {
		return true;
	}
	return false;
}

type InboundEventRow = typeof messengerInboundEvents.$inferSelect;

async function processSingleEvent(
	tx: TenantDb,
	event: InboundEventRow,
	report: {
		matchedToPatient: number;
		leadsCreated: number;
		optOuts: number;
		optIns: number;
		ambiguous: number;
	},
	logger?: InboundIngestionLogger,
): Promise<void> {
	const organizationId = event.organizationId;
	let messageText = event.messageText?.trim();
	if (!messageText) {
		if (event.eventKind === "message") {
			const rawPayload = event.rawPayload;
			const payload =
				typeof rawPayload === "object" && rawPayload !== null
					? (rawPayload as Record<string, unknown>)
					: null;
			const payloadType =
				typeof payload?.["type"] === "string" ? payload["type"] : "вложение";
			messageText = `[Входящее медиавложение: ${payloadType}]`;
		} else {
			// Статусы доставки и служебные события текста не несут.
			await markAsProcessed(tx, organizationId, event.id);
			return;
		}
	}

	const channel = channelForEvent(event.channel);
	const externalChatId = event.externalChatId?.trim() ?? "";
	let patientId = event.patientId;
	let ambiguousMatch = false;

	if (!patientId && externalChatId) {
		const match =
			channel === "whatsapp" || channel === "sms"
				? await findPatientByPhone(tx, organizationId, externalChatId)
				: await findPatientByExternalMark(
						tx,
						organizationId,
						`${channel.toUpperCase()}:${externalChatId}`,
					);

		if (match.kind === "found") {
			patientId = match.patientId;
			await tx
				.update(messengerInboundEvents)
				.set({ patientId })
				.where(
					and(
						eq(messengerInboundEvents.id, event.id),
						eq(messengerInboundEvents.organizationId, organizationId),
					),
				);
		} else if (match.kind === "ambiguous") {
			ambiguousMatch = true;
			report.ambiguous += 1;
		}
	}

	if (patientId) {
		report.matchedToPatient += 1;

		const intent = detectOptOutIntent(messageText);
		if (intent === "opt_out") {
			await revokeConsentForChannel(
				tx,
				organizationId,
				patientId,
				channel,
				messageText,
			);
			report.optOuts += 1;
			await sendOptOutAcknowledgement(
				tx,
				organizationId,
				patientId,
				channel,
				"opt_out",
				event.id,
				logger,
			);
		} else if (intent === "opt_in") {
			await restoreServiceConsent(
				tx,
				organizationId,
				patientId,
				channel,
				messageText,
			);
			report.optIns += 1;
			await sendOptOutAcknowledgement(
				tx,
				organizationId,
				patientId,
				channel,
				"opt_in",
				event.id,
				logger,
			);
		}

		await tx.insert(communicationEvents).values({
			organizationId,
			patientId,
			// Канал записывается как есть: раньше MAX подменялся телеграмом.
			channel: channel as (typeof communicationEvents.$inferInsert)["channel"],
			direction: "inbound",
			status: "delivered",
			message:
				intent === null
					? messageText
					: `${messageText} [распознано: ${intent === "opt_out" ? "отказ от сообщений" : "возврат к рассылке"}]`,
		});

		const broadcastText = messageText;
		onTenantTxCommit(() => {
			wsBroker.broadcastToOrganization(organizationId, {
				type: "INBOX_NEW_MESSAGE",
				payload: { channel, patientId, text: broadcastText, optOutIntent: intent },
			});
		});

		// Автоматическое распознавание согласия на визит («Да, буду», «Подтверждаю»)
		if (intent === null && isPositiveAppointmentConfirmationText(messageText)) {
			try {
				const now = new Date();
				const windowStart = new Date(now.getTime() - 2 * 60 * 60 * 1000);
				const windowEnd = new Date(now.getTime() + 48 * 60 * 60 * 1000);

				const [plannedAppt] = await tx
					.select({
						id: appointments.id,
						startsAt: appointments.startsAt,
					})
					.from(appointments)
					.where(
						and(
							eq(appointments.organizationId, organizationId),
							eq(appointments.patientId, patientId),
							eq(appointments.status, "planned"),
							gte(appointments.startsAt, windowStart),
							lte(appointments.startsAt, windowEnd),
						),
					)
					.orderBy(appointments.startsAt)
					.limit(1);

				if (plannedAppt) {
					await tx
						.update(appointments)
						.set({ status: "confirmed" })
						.where(
							and(
								eq(appointments.organizationId, organizationId),
								eq(appointments.id, plannedAppt.id),
							),
						);

					const apptId = plannedAppt.id;
					onTenantTxCommit(() => {
						wsBroker.broadcastToOrganization(organizationId, {
							type: "APPOINTMENT_UPDATED",
							payload: { id: apptId, status: "confirmed" },
						});
					});

					try {
						await enqueueMessage(
							{
								organizationId,
								patientId,
								channel,
								intent: "appointment_confirmation",
								body: "Спасибо! Ваша запись подтверждена. Ждём вас в клинике!",
								dedupeKey: `appt_confirm_ack_${plannedAppt.id}`,
							},
							tx,
						);
					} catch (enqueueErr) {
						logger?.warn?.({ enqueueErr }, "[MessengerIngestion] Failed to enqueue confirmation reply");
					}
				}
			} catch (apptErr) {
				logger?.warn?.({ apptErr }, "[MessengerIngestion] Failed to auto-confirm appointment by text");
			}
		}

		// Semantic triage & HitL pipeline integration (MAX / WhatsApp / Telegram / VK / SMS)
		if (intent === null) {
			try {
				const [p] = await tx
					.select({ fullName: patients.fullName, phone: patients.phone })
					.from(patients)
					.where(
						and(
							eq(patients.id, patientId),
							eq(patients.organizationId, organizationId),
						),
					)
					.limit(1);

				const triageResult = defaultWhatsAppBridge.getTriageAnalyzer().analyze(messageText);

				if (triageResult.urgency === "CRITICAL") {
					await tx.insert(communicationTasks).values({
						organizationId,
						patientId,
						assignedRole: "receptionist",
						channel: channel as (typeof communicationTasks.$inferInsert)["channel"],
						intent: "general",
						status: "needs_call",
						priority: "urgent",
						dueAt: new Date(Date.now() + 60 * 1000),
						title: `[Экстренно] Сообщение ${channel.toUpperCase()}: ${triageResult.clinicalSummary}`,
						body: messageText,
						workflowCode: "OMNICHANNEL_EMERGENCY_TRIAGE",
					});
				}

				const bridgeMsg = {
					messageId: event.id,
					fromPhone: externalChatId || p?.phone || "Неизвестный номер",
					rawText: messageText,
					timestamp: event.createdAt,
					patientId,
					patientName: p?.fullName || null,
					organizationId,
					channel,
				};
				onTenantTxCommit(async () => {
					try {
						await defaultWhatsAppBridge.handleIncomingMessage(bridgeMsg);
					} catch (err) {
						logger?.warn?.({ err }, "[MessengerIngestion] Post-commit triage dispatch failed");
					}
				});
			} catch (err) {
				logger?.warn?.({ err }, "[MessengerIngestion] Triage processing failed");
			}
		}

		await markAsProcessed(tx, organizationId, event.id);
		return;
	}

	// Незнакомый отправитель — это лид, а не медицинская карта. Раньше здесь
	// создавалась карточка пациента с именем «WhatsApp User 79161234567».
	const [clinic] = await tx
		.select({ name: clinics.name })
		.from(clinics)
		.where(eq(clinics.organizationId, organizationId))
		.limit(1);

	const noteParts = [
		`Первое сообщение: ${messageText.slice(0, 400)}`,
		`Внешний чат: ${externalChatId || "неизвестен"}`,
	];
	if (ambiguousMatch) {
		noteParts.push(
			"ВНИМАНИЕ: под этот номер подходит несколько карточек пациентов — сопоставьте вручную.",
		);
	}
	if (clinic?.name) noteParts.push(`Клиника: ${clinic.name}`);

	const leadPhone =
		channel === "whatsapp" || channel === "sms"
			? externalChatId || null
			: null;

	let leadId: string | null = null;

	// Защита от дублей лидов: если незнакомый пациент пишет несколько сообщений подряд,
	// дополняем существующий открытый лид вместо создания лавины дубликатов.
	if (leadPhone) {
		const [existingLead] = await tx
			.select({ id: crmLeads.id, notes: crmLeads.notes })
			.from(crmLeads)
			.where(
				and(
					eq(crmLeads.organizationId, organizationId),
					eq(crmLeads.phone, leadPhone),
				),
			)
			.limit(1);

		if (existingLead) {
			leadId = existingLead.id;
			const updatedNotes = existingLead.notes
				? `${existingLead.notes}\n---\n[Доп. сообщение ${channel}]: ${messageText.slice(0, 400)}`
				: noteParts.join("\n");
			await tx
				.update(crmLeads)
				.set({ notes: updatedNotes })
				.where(
					and(
						eq(crmLeads.id, existingLead.id),
						eq(crmLeads.organizationId, organizationId),
					),
				);
		}
	}

	if (!leadId) {
		const [lead] = await tx
			.insert(crmLeads)
			.values({
				organizationId,
				name: `Входящее сообщение · ${channel}`,
				phone: leadPhone,
				source: `inbound_${channel}`,
				status: "new",
				notes: noteParts.join("\n"),
			})
			.returning({ id: crmLeads.id });

		if (lead) {
			leadId = lead.id;
			report.leadsCreated += 1;
		}
	}

	// Semantic triage & WS broadcast strictly after TX commit
	const finalLeadId = leadId;
	const leadBridgeMsg = {
		messageId: event.id,
		fromPhone: externalChatId || "Неизвестный номер",
		rawText: messageText,
		timestamp: event.createdAt,
		patientId: null,
		patientName: `Лид (${channel.toUpperCase()}: ${externalChatId || "чат"})`,
		organizationId,
		channel,
	};
	const leadBroadcastText = messageText;
	onTenantTxCommit(async () => {
		try {
			await defaultWhatsAppBridge.handleIncomingMessage(leadBridgeMsg);
		} catch (err) {
			logger?.warn?.({ err }, "[MessengerIngestion] Lead triage processing failed");
		}
		wsBroker.broadcastToOrganization(organizationId, {
			type: "INBOX_NEW_MESSAGE",
			payload: {
				channel,
				patientId: null,
				leadId: finalLeadId,
				text: leadBroadcastText,
				ambiguousMatch,
			},
		});
	});

	await markAsProcessed(tx, organizationId, event.id);
}
