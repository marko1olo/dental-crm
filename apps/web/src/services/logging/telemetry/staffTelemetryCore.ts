/**
 * DENTE CRM — Staff Telemetry Core Service
 *
 * Главный координатор протоколирования действий медицинского и административного персонала.
 * Реализует врачебную автономию (Мандат 8e) и фоновую тихую телеметрию (Мандат 8d).
 */

import {
	generateUuidV7,
	sanitizeAuditPayload,
	type StaffActionAuditEntry,
} from "@dental/shared";
import {
	broadcastStaffActionToLan,
	getActiveLoggerBridge,
	sendTelemetryBatch,
	sendTelemetryBeaconFallback,
} from "./batchTransport.js";
import {
	buildAppointmentCancelInput,
	buildAppointmentCreateInput,
	buildAppointmentRescheduleInput,
	buildDiagnosisChangeInput,
	buildDiscountApplyInput,
	buildDocumentExportInput,
	buildDocumentPrintInput,
	buildEmrOpenInput,
	buildPaymentReceiveInput,
	buildPaymentRefundInput,
	buildRevisionSavedInput,
	buildServiceAddInput,
	buildServiceRemoveInput,
	buildShiftCloseInput,
	buildShiftOpenInput,
} from "./clinicalActionHelpers.js";
import { StaffEventQueue } from "./eventQueue.js";
import {
	AUTO_FLUSH_INTERVAL_MS,
	BATCH_SIZE_THRESHOLD,
	type RecordStaffActionInput,
	type StaffTelemetryUserContext,
} from "./types.js";

export class StaffTelemetryService {
	private eventQueue: StaffEventQueue;
	private flushTimer: ReturnType<typeof setInterval> | null = null;
	private isFlushing = false;
	private currentOrgId: string | null = null;
	private currentUserId: string | null = null;
	private currentUserRole: string | null = null;
	private currentUserName: string | null = null;

	constructor(queue?: StaffEventQueue) {
		this.eventQueue = queue ?? new StaffEventQueue();
		if (typeof window !== "undefined") {
			this.installLifecycleHooks();
			this.startAutoFlushTimer();
		}
	}

	/**
	 * Привязка контекста текущего пользователя клиники
	 */
	public setUserContext(context: StaffTelemetryUserContext): void {
		if (context.organizationId) this.currentOrgId = context.organizationId;
		if (context.userId) this.currentUserId = context.userId;
		if (context.role) this.currentUserRole = context.role;
		if (context.name) this.currentUserName = context.name;
	}

	/**
	 * Запись события действий персонала в локальный буфер, P2P трансляция и планирование синхронизации
	 */
	public recordAction(input: RecordStaffActionInput): StaffActionAuditEntry {
		const orgId = input.organizationId || this.currentOrgId || "00000000-0000-0000-0000-000000000000";
		const actorUserId = input.actorUserId || this.currentUserId || null;
		const actorRole = input.actorRole || this.currentUserRole || null;
		const actorName = input.actorName || this.currentUserName || null;

		const sanitizedDetails = sanitizeAuditPayload(input.details || {});

		const entry: StaffActionAuditEntry = {
			id: generateUuidV7(),
			organizationId: orgId,
			actionType: input.actionType,
			entityType: input.entityType,
			entityId: input.entityId,
			patientId: input.patientId ?? null,
			actorUserId,
			actorRole,
			actorName,
			details: sanitizedDetails,
			reason: input.reason ?? null,
			clientTimestamp: new Date().toISOString(),
			ipAddress: null,
			userAgent: typeof navigator !== "undefined" ? navigator.userAgent : null,
		};

		this.eventQueue.push(entry);

		const activeLoggerBridge = getActiveLoggerBridge();
		if (activeLoggerBridge) {
			activeLoggerBridge.audit(
				`[StaffActivity] ${input.actionType} on ${input.entityType}:${input.entityId}`,
				{
					actor: actorName || actorUserId,
					patientId: input.patientId,
					details: sanitizedDetails,
				},
				{ module: "StaffAudit" },
			);
		}

		// Трансляция события по локальной сети клиники (LAN P2P)
		broadcastStaffActionToLan(entry);

		// Если накопился достаточный батч, сбрасываем немедленно
		if (this.eventQueue.size() >= BATCH_SIZE_THRESHOLD) {
			void this.flushQueue();
		}

		return entry;
	}

	/**
	 * Получение текущей очереди ожидающих синхронизации событий
	 */
	public getQueuedEvents(): readonly StaffActionAuditEntry[] {
		return this.eventQueue.getEvents();
	}

	/**
	 * Доступ к нижележащей очереди событий
	 */
	public getEventQueue(): StaffEventQueue {
		return this.eventQueue;
	}

	/**
	 * Принудительная очистка очереди (для тестов или сброса)
	 */
	public clearQueue(): void {
		this.eventQueue.clear();
	}

	/**
	 * Отправка накопленных событий на сервер
	 */
	public async flushQueue(): Promise<boolean> {
		if (this.isFlushing || this.eventQueue.size() === 0) {
			return false;
		}

		if (typeof navigator !== "undefined" && !navigator.onLine) {
			return false;
		}

		this.isFlushing = true;
		const batchToSend = this.eventQueue.getSnapshot();

		try {
			const success = await sendTelemetryBatch(batchToSend);
			if (success) {
				const sentIds = new Set(
					batchToSend.map((e) => e.id).filter((id): id is string => Boolean(id)),
				);
				this.eventQueue.removeSent(sentIds);
				return true;
			}
			return false;
		} catch {
			return false;
		} finally {
			this.isFlushing = false;
		}
	}

	// ─── Специализированные хелперы для ключевых действий клиники ─────────

	/**
	 * Открытие медицинской карты пациента / визита
	 */
	public logEmrOpen(
		patientIdOrParams:
			| string
			| {
					patientId: string;
					cardId?: string | null | undefined;
					actorUserId?: string | null | undefined;
					actorRole?: string | null | undefined;
					actorName?: string | null | undefined;
					reason?: string | null | undefined;
			  },
		visitId?: string,
		meta?: Record<string, unknown>,
	): StaffActionAuditEntry {
		return this.recordAction(buildEmrOpenInput(patientIdOrParams, visitId, meta));
	}

	/**
	 * Изменение диагноза в дневнике приема или зубной формуле
	 */
	public logDiagnosisChange(
		patientIdOrParams:
			| string
			| {
					patientId: string;
					recordId?: string | null | undefined;
					oldDiagnosis?: { icdCode?: string | null; name?: string | null } | null | undefined;
					newDiagnosis: { icdCode: string; name?: string | null };
					toothNumber?: number | null | undefined;
					reason?: string | null | undefined;
					actorUserId?: string | null | undefined;
					actorRole?: string | null | undefined;
					actorName?: string | null | undefined;
			  },
		tooth?: number | string | undefined,
		oldDiagnosis?: string | { icdCode?: string | null; name?: string | null } | null | undefined,
		newDiagnosis?: string | { icdCode: string; name?: string | null },
		reason?: string,
	): StaffActionAuditEntry {
		return this.recordAction(
			buildDiagnosisChangeInput(patientIdOrParams, tooth, oldDiagnosis, newDiagnosis, reason),
		);
	}

	/**
	 * Добавление услуги в заказ-наряд, план лечения или счет
	 */
	public logServiceAdd(
		patientIdOrParams:
			| string
			| {
					patientId: string;
					planId: string;
					serviceCode: string;
					serviceName: string;
					amountKopecks?: number | null | undefined;
					quantity?: number | undefined;
					toothNumber?: number | null | undefined;
					actorUserId?: string | null | undefined;
					actorRole?: string | null | undefined;
			  },
		serviceCode?: string,
		serviceName?: string,
		amountKopecks?: number,
		quantity: number = 1,
	): StaffActionAuditEntry {
		return this.recordAction(
			buildServiceAddInput(patientIdOrParams, serviceCode, serviceName, amountKopecks, quantity),
		);
	}

	/**
	 * Удаление услуги из заказ-наряда, плана лечения или счета
	 */
	public logServiceRemove(
		patientIdOrParams:
			| string
			| {
					patientId: string;
					planId: string;
					serviceCode: string;
					serviceName?: string | null | undefined;
					reason?: string | null | undefined;
					amountKopecks?: number | null | undefined;
					actorUserId?: string | null | undefined;
					actorRole?: string | null | undefined;
			  },
		serviceCode?: string,
		serviceName?: string,
		reason?: string,
	): StaffActionAuditEntry {
		return this.recordAction(
			buildServiceRemoveInput(patientIdOrParams, serviceCode, serviceName, reason),
		);
	}

	/**
	 * Применение скидки (в т.ч. 100% по гарантии)
	 */
	public logDiscountApply(
		patientIdOrParams:
			| string
			| {
					patientId?: string | null | undefined;
					billId?: string | null | undefined;
					planId?: string | null | undefined;
					discountPercent?: number | null | undefined;
					discountAmountKopecks?: number | null | undefined;
					originalAmountKopecks?: number | null | undefined;
					finalAmountKopecks?: number | null | undefined;
					reason: string;
					actorUserId?: string | null | undefined;
					actorRole?: string | null | undefined;
			  },
		discountPercent?: number,
		reason?: string,
		oldAmountKopecks?: number,
		newAmountKopecks?: number,
	): StaffActionAuditEntry {
		return this.recordAction(
			buildDiscountApplyInput(
				patientIdOrParams,
				discountPercent,
				reason,
				oldAmountKopecks,
				newAmountKopecks,
			),
		);
	}

	/**
	 * Открытие рабочей смены врача или кассы
	 */
	public logShiftOpen(
		shiftNumberOrParams:
			| string
			| number
			| {
					cashRegisterId: string;
					shiftNumber: string | number;
					openingCashKopecks?: number | null | undefined;
					actorUserId?: string | null | undefined;
					actorRole?: string | null | undefined;
			  },
		doctorId?: string,
		doctorName?: string,
	): StaffActionAuditEntry {
		return this.recordAction(buildShiftOpenInput(shiftNumberOrParams, doctorId, doctorName));
	}

	/**
	 * Закрытие рабочей смены врача или кассы (Z-отчет)
	 */
	public logShiftClose(
		shiftNumberOrParams:
			| string
			| number
			| {
					cashRegisterId: string;
					shiftNumber: string | number;
					totalRevenueKopecks?: number | null | undefined;
					closingCashKopecks?: number | null | undefined;
					actorUserId?: string | null | undefined;
					actorRole?: string | null | undefined;
			  },
		doctorId?: string,
		doctorName?: string,
		stats?: Record<string, unknown>,
	): StaffActionAuditEntry {
		return this.recordAction(buildShiftCloseInput(shiftNumberOrParams, doctorId, doctorName, stats));
	}

	/**
	 * Получение оплаты от пациента
	 */
	public logPaymentReceive(
		patientIdOrParams:
			| string
			| {
					patientId: string;
					billId: string;
					amountKopecks: number;
					paymentMethod: "cash" | "card" | "sbp" | "deposit" | "split" | string;
					fiscalReceiptNumber?: string | null | undefined;
					actorUserId?: string | null | undefined;
					actorRole?: string | null | undefined;
			  },
		amountKopecks?: number,
		method?: string,
		invoiceId?: string,
	): StaffActionAuditEntry {
		return this.recordAction(
			buildPaymentReceiveInput(patientIdOrParams, amountKopecks, method, invoiceId),
		);
	}

	/**
	 * Оформление возврата средств (полного или частичного)
	 */
	public logPaymentRefund(
		patientIdOrParams:
			| string
			| {
					patientId: string;
					billId: string;
					amountKopecks: number;
					paymentMethod: string;
					reason: string;
					actorUserId?: string | null | undefined;
					actorRole?: string | null | undefined;
			  },
		billId?: string,
		amountKopecks?: number,
		reason?: string,
		paymentMethod?: string,
	): StaffActionAuditEntry {
		return this.recordAction(
			buildPaymentRefundInput(patientIdOrParams, billId, amountKopecks, reason, paymentMethod),
		);
	}

	/**
	 * Создание записи в расписании (приём)
	 */
	public logAppointmentCreate(params: {
		appointmentId: string;
		patientId?: string | null | undefined;
		scheduledTime?: string | null | undefined;
		doctorUserId?: string | null | undefined;
		reason?: string | null | undefined;
		actorUserId?: string | null | undefined;
		actorRole?: string | null | undefined;
	}): StaffActionAuditEntry {
		return this.recordAction(buildAppointmentCreateInput(params));
	}

	/**
	 * Перенос / перепланирование записи в расписании
	 */
	public logAppointmentReschedule(params: {
		appointmentId: string;
		patientId?: string | null | undefined;
		oldTime?: string | null | undefined;
		newTime?: string | null | undefined;
		reason?: string | null | undefined;
		actorUserId?: string | null | undefined;
		actorRole?: string | null | undefined;
	}): StaffActionAuditEntry {
		return this.recordAction(buildAppointmentRescheduleInput(params));
	}

	/**
	 * Отмена / удаление приема в расписании
	 */
	public logAppointmentCancel(
		params: {
			appointmentId: string;
			patientId?: string | null | undefined;
			reason: string;
			scheduledTime?: string | null | undefined;
			actorUserId?: string | null | undefined;
			actorRole?: string | null | undefined;
		},
	): StaffActionAuditEntry {
		return this.recordAction(buildAppointmentCancelInput(params));
	}

	/**
	 * Печать клинического или бухгалтерского документа
	 */
	public logDocumentPrint(
		docTypeOrParams:
			| string
			| {
					patientId?: string | null | undefined;
					documentType: string;
					documentId?: string | null | undefined;
					title?: string | null | undefined;
					actorUserId?: string | null | undefined;
					actorRole?: string | null | undefined;
			  },
		documentId?: string,
		patientId?: string,
	): StaffActionAuditEntry {
		return this.recordAction(buildDocumentPrintInput(docTypeOrParams, documentId, patientId));
	}

	/**
	 * Экспорт документа или выписки (PDF/Excel)
	 */
	public logDocumentExport(
		docTypeOrParams:
			| string
			| {
					exportType: string;
					recordCount: number;
					format: "csv" | "excel" | "json" | "pdf" | string;
					actorUserId?: string | null | undefined;
					actorRole?: string | null | undefined;
					reason?: string | null | undefined;
			  },
		recordCountOrDocId?: number | string,
		formatOrPatientId?: string,
	): StaffActionAuditEntry {
		return this.recordAction(
			buildDocumentExportInput(docTypeOrParams, recordCountOrDocId, formatOrPatientId),
		);
	}

	/**
	 * Сохранение ревизии карты/дневника («Исправленному верить»)
	 */
	public logRevisionSaved(
		patientIdOrParams:
			| string
			| {
					patientId: string;
					visitId: string;
					revisionReason: string;
					actorUserId?: string | null | undefined;
					actorRole?: string | null | undefined;
			  },
		visitId?: string,
		revisionReason?: string,
	): StaffActionAuditEntry {
		return this.recordAction(
			buildRevisionSavedInput(patientIdOrParams, visitId, revisionReason),
		);
	}

	// ─── Внутренние методы жизненного цикла и таймеров ───────────────────

	private installLifecycleHooks(): void {
		window.addEventListener("online", () => {
			void this.flushQueue();
		});

		window.addEventListener("visibilitychange", () => {
			if (document.visibilityState === "hidden") {
				void this.flushQueue();
			}
		});

		window.addEventListener("beforeunload", () => {
			if (this.eventQueue.size() > 0) {
				sendTelemetryBeaconFallback(this.eventQueue.getSnapshot());
			}
			void this.flushQueue();
		});
	}

	private startAutoFlushTimer(): void {
		if (this.flushTimer) clearInterval(this.flushTimer);
		this.flushTimer = setInterval(() => {
			if (this.eventQueue.size() > 0) {
				void this.flushQueue();
			}
		}, AUTO_FLUSH_INTERVAL_MS);
	}

	public destroy(): void {
		if (this.flushTimer) {
			clearInterval(this.flushTimer);
			this.flushTimer = null;
		}
	}
}

export const staffTelemetryService = new StaffTelemetryService();
export default staffTelemetryService;
