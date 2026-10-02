/**
 * DENTE CRM — Staff Activity & Forensic Telemetry Service
 *
 * Осуществляет всестороннее протоколирование действий медицинского и административного
 * персонала (врачи, ассистенты, регистраторы, кураторы) локально в кольцевой буфер и
 * localStorage + IndexedDB, мгновенное P2P-оповещение по локальной сети клиники (LAN P2P / WebSocket),
 * а также пакетную передачу в защищенный журнал аудита сервера (/api/audit/events/batch)
 * с соблюдением 152-ФЗ, 323-ФЗ и Мандатов 8d (Quiet Telemetry) и 8e (Doctor Autonomy).
 */

import {
	CORRELATION_ID_HEADER,
	generateCorrelationId,
	generateUuidV7,
	sanitizeAuditPayload,
	type StaffActionAuditEntry,
	type StaffActionType,
} from "@dental/shared";

export const LOCAL_STORAGE_STAFF_EVENTS_KEY = "dente_staff_audit_events_v1";
export const LEGACY_OFFLINE_STAFF_AUDIT_KEY = "dente_offline_staff_audit_buffer";
export const MAX_OFFLINE_STAFF_EVENTS = 200;
export const AUTO_FLUSH_INTERVAL_MS = 10_000;
export const BATCH_SIZE_THRESHOLD = 10;
export const STAFF_AUDIT_IDB_NAME = "dente_staff_audit_db";
export const STAFF_AUDIT_IDB_STORE = "staff_events";

export interface RecordStaffActionInput {
	actionType: StaffActionType;
	entityType: string;
	entityId: string;
	patientId?: string | null | undefined;
	actorUserId?: string | null | undefined;
	actorName?: string | null | undefined;
	actorRole?: string | null | undefined;
	details?: Record<string, unknown> | undefined;
	reason?: string | null | undefined;
	organizationId?: string | undefined;
}

export type TelemetryLoggerBridge = {
	audit: (message: string, data?: unknown, context?: Record<string, unknown>) => void;
	warn: (message: string, data?: unknown, context?: Record<string, unknown>) => void;
};

let activeLoggerBridge: TelemetryLoggerBridge | null = null;
export function registerTelemetryLoggerBridge(bridge: TelemetryLoggerBridge | null): void {
	activeLoggerBridge = bridge;
}

export class StaffTelemetryService {
	private queue: StaffActionAuditEntry[] = [];
	private flushTimer: ReturnType<typeof setInterval> | null = null;
	private isFlushing = false;
	private currentOrgId: string | null = null;
	private currentUserId: string | null = null;
	private currentUserRole: string | null = null;
	private currentUserName: string | null = null;

	constructor() {
		this.loadFromStorage();
		if (typeof window !== "undefined") {
			this.installLifecycleHooks();
			this.startAutoFlushTimer();
		}
	}

	/**
	 * Привязка контекста текущего пользователя клиники
	 */
	public setUserContext(context: {
		organizationId?: string | null | undefined;
		userId?: string | null | undefined;
		role?: string | null | undefined;
		name?: string | null | undefined;
	}): void {
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

		this.queue.push(entry);

		// Кольцевой буфер с ограничением размера
		if (this.queue.length > MAX_OFFLINE_STAFF_EVENTS) {
			this.queue.shift();
		}

		this.saveToStorage();

		// Дублируем в системный клиентский логгер
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

		// Трансляция события по локальной сети клиники (LAN P2P / WebSocket / BroadcastChannel)
		this.broadcastToLan(entry);

		// Если накопился достаточный батч, сбрасываем немедленно
		if (this.queue.length >= BATCH_SIZE_THRESHOLD) {
			void this.flushQueue();
		}

		return entry;
	}

	/**
	 * Получение текущей очереди ожидающих синхронизации событий
	 */
	public getQueuedEvents(): readonly StaffActionAuditEntry[] {
		return [...this.queue];
	}

	/**
	 * Принудительная очистка очереди (для тестов или сброса)
	 */
	public clearQueue(): void {
		this.queue = [];
		const storage =
			typeof window !== "undefined" && window.localStorage
				? window.localStorage
				: typeof localStorage !== "undefined"
					? localStorage
					: null;
		if (storage) {
			try {
				storage.removeItem(LOCAL_STORAGE_STAFF_EVENTS_KEY);
				storage.removeItem(LEGACY_OFFLINE_STAFF_AUDIT_KEY);
			} catch {
				// ignore
			}
		}
	}

	/**
	 * Отправка накопленных событий на сервер
	 */
	public async flushQueue(): Promise<boolean> {
		if (this.isFlushing || this.queue.length === 0) {
			return false;
		}

		if (typeof navigator !== "undefined" && !navigator.onLine) {
			return false;
		}

		this.isFlushing = true;
		const batchToSend = [...this.queue];

		try {
			const correlationId = generateCorrelationId("staff_audit");
			const response = await fetch("/api/audit/events/batch", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					[CORRELATION_ID_HEADER]: correlationId,
				},
				credentials: "include",
				body: JSON.stringify({ events: batchToSend }),
			});

			if (response.ok) {
				// Успешно доставлено на сервер: удаляем отправленные события
				const sentIds = new Set(batchToSend.map((e) => e.id));
				this.queue = this.queue.filter((e) => !sentIds.has(e.id));
				this.saveToStorage();
				return true;
			} else {
				if (activeLoggerBridge) {
					activeLoggerBridge.warn(
						`[StaffTelemetry] Не удалось отправить аудит-события: статус ${response.status}`,
					);
				}
				return false;
			}
		} catch (err) {
			// Сетевой сбой: оставляем события в очереди для следующей попытки
			if (activeLoggerBridge) {
				activeLoggerBridge.warn(
					"[StaffTelemetry] Ошибка сети при отправке телеметрии персонала",
					err,
				);
			}
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
		if (typeof patientIdOrParams === "object" && patientIdOrParams !== null) {
			const p = patientIdOrParams;
			return this.recordAction({
				actionType: "emr_open",
				entityType: "emr_card_043",
				entityId: p.cardId || p.patientId,
				patientId: p.patientId,
				actorUserId: p.actorUserId,
				actorRole: p.actorRole,
				actorName: p.actorName,
				reason: p.reason ?? "Открытие амбулаторной карты 043/у",
				details: {
					patientId: p.patientId,
					cardId: p.cardId,
					viewedAt: new Date().toISOString(),
				},
			});
		}

		return this.recordAction({
			actionType: "emr_open",
			entityType: "emr",
			entityId: visitId || patientIdOrParams,
			patientId: patientIdOrParams,
			details: {
				visitId,
				openedAt: new Date().toISOString(),
				...meta,
			},
		});
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
		if (typeof patientIdOrParams === "object" && patientIdOrParams !== null) {
			const p = patientIdOrParams;
			return this.recordAction({
				actionType: "diagnosis_change",
				entityType: "clinical_diagnosis",
				entityId: p.recordId || p.patientId,
				patientId: p.patientId,
				actorUserId: p.actorUserId,
				actorRole: p.actorRole,
				actorName: p.actorName,
				reason: p.reason ?? "Уточнение клинического диагноза",
				details: {
					oldState: p.oldDiagnosis ?? null,
					newState: p.newDiagnosis,
					toothNumber: p.toothNumber ?? null,
					icdCode: p.newDiagnosis?.icdCode ?? null,
					reason: p.reason ?? null,
				},
			});
		}

		return this.recordAction({
			actionType: "diagnosis_change",
			entityType: "diagnosis",
			entityId: tooth ? `tooth_${tooth}` : "general",
			patientId: patientIdOrParams,
			reason,
			details: {
				tooth: tooth ?? null,
				oldState: typeof oldDiagnosis === "object" ? oldDiagnosis : { diagnosis: oldDiagnosis || "" },
				newState: typeof newDiagnosis === "object" ? newDiagnosis : { diagnosis: newDiagnosis || "" },
				icdCode: typeof newDiagnosis === "string" ? newDiagnosis : newDiagnosis?.icdCode ?? null,
				reason,
			},
		});
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
		if (typeof patientIdOrParams === "object" && patientIdOrParams !== null) {
			const p = patientIdOrParams;
			return this.recordAction({
				actionType: "service_add",
				entityType: "treatment_plan_item",
				entityId: `${p.planId}:${p.serviceCode}`,
				patientId: p.patientId,
				actorUserId: p.actorUserId,
				actorRole: p.actorRole,
				details: {
					planId: p.planId,
					serviceCode: p.serviceCode,
					serviceName: p.serviceName,
					amountKopecks: p.amountKopecks ?? null,
					quantity: p.quantity ?? 1,
					toothNumber: p.toothNumber ?? null,
				},
			});
		}

		return this.recordAction({
			actionType: "service_add",
			entityType: "service",
			entityId: serviceCode || "unknown_service",
			patientId: patientIdOrParams,
			details: {
				serviceCode,
				serviceName,
				amountKopecks,
				quantity,
			},
		});
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
		if (typeof patientIdOrParams === "object" && patientIdOrParams !== null) {
			const p = patientIdOrParams;
			return this.recordAction({
				actionType: "service_remove",
				entityType: "treatment_plan_item",
				entityId: `${p.planId}:${p.serviceCode}`,
				patientId: p.patientId,
				actorUserId: p.actorUserId,
				actorRole: p.actorRole,
				reason: p.reason ?? "Исключение позиции из плана лечения",
				details: {
					planId: p.planId,
					serviceCode: p.serviceCode,
					serviceName: p.serviceName ?? null,
					amountKopecks: p.amountKopecks ?? null,
					reason: p.reason ?? null,
				},
			});
		}

		return this.recordAction({
			actionType: "service_remove",
			entityType: "service",
			entityId: serviceCode || "unknown_service",
			patientId: patientIdOrParams,
			reason,
			details: {
				serviceCode,
				serviceName,
				reason,
			},
		});
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
		if (typeof patientIdOrParams === "object" && patientIdOrParams !== null) {
			const p = patientIdOrParams;
			return this.recordAction({
				actionType: "discount_apply",
				entityType: "financial_discount",
				entityId: p.billId || p.planId || generateUuidV7(),
				patientId: p.patientId ?? null,
				actorUserId: p.actorUserId,
				actorRole: p.actorRole,
				reason: p.reason,
				details: {
					discountPercent: p.discountPercent ?? null,
					amountKopecks: p.discountAmountKopecks ?? null,
					originalAmountKopecks: p.originalAmountKopecks ?? null,
					finalAmountKopecks: p.finalAmountKopecks ?? null,
					reason: p.reason,
				},
			});
		}

		return this.recordAction({
			actionType: "discount_apply",
			entityType: "discount",
			entityId: `disc_${discountPercent}pct`,
			patientId: patientIdOrParams,
			reason,
			details: {
				discountPercent,
				reason,
				amountKopecks: oldAmountKopecks ?? null,
				discountedAmountKopecks: newAmountKopecks ?? null,
			},
		});
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
		if (typeof shiftNumberOrParams === "object" && shiftNumberOrParams !== null) {
			const p = shiftNumberOrParams;
			return this.recordAction({
				actionType: "shift_open",
				entityType: "cash_register_shift",
				entityId: `shift:${p.cashRegisterId}:${p.shiftNumber}`,
				actorUserId: p.actorUserId,
				actorRole: p.actorRole,
				details: {
					cashRegisterId: p.cashRegisterId,
					shiftNumber: String(p.shiftNumber),
					amountKopecks: p.openingCashKopecks ?? 0,
				},
			});
		}

		return this.recordAction({
			actionType: "shift_open",
			entityType: "shift",
			entityId: String(shiftNumberOrParams),
			actorUserId: doctorId,
			actorName: doctorName,
			details: {
				shiftNumber: String(shiftNumberOrParams),
				openedAt: new Date().toISOString(),
			},
		});
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
		if (typeof shiftNumberOrParams === "object" && shiftNumberOrParams !== null) {
			const p = shiftNumberOrParams;
			return this.recordAction({
				actionType: "shift_close",
				entityType: "cash_register_shift",
				entityId: `shift:${p.cashRegisterId}:${p.shiftNumber}`,
				actorUserId: p.actorUserId,
				actorRole: p.actorRole,
				details: {
					cashRegisterId: p.cashRegisterId,
					shiftNumber: String(p.shiftNumber),
					totalRevenueKopecks: p.totalRevenueKopecks ?? 0,
					closingCashKopecks: p.closingCashKopecks ?? 0,
				},
			});
		}

		return this.recordAction({
			actionType: "shift_close",
			entityType: "shift",
			entityId: String(shiftNumberOrParams),
			actorUserId: doctorId,
			actorName: doctorName,
			details: {
				shiftNumber: String(shiftNumberOrParams),
				closedAt: new Date().toISOString(),
				stats: stats || {},
			},
		});
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
		if (typeof patientIdOrParams === "object" && patientIdOrParams !== null) {
			const p = patientIdOrParams;
			return this.recordAction({
				actionType: "payment_receive",
				entityType: "payment_receipt",
				entityId: p.billId,
				patientId: p.patientId,
				actorUserId: p.actorUserId,
				actorRole: p.actorRole,
				details: {
					billId: p.billId,
					amountKopecks: p.amountKopecks,
					paymentMethod: p.paymentMethod,
					fiscalReceiptNumber: p.fiscalReceiptNumber ?? null,
				},
			});
		}

		return this.recordAction({
			actionType: "payment_receive",
			entityType: "payment",
			entityId: invoiceId || generateUuidV7(),
			patientId: patientIdOrParams,
			details: {
				amountKopecks: amountKopecks ?? 0,
				method: method || "cash",
				invoiceId,
			},
		});
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
		if (typeof patientIdOrParams === "object" && patientIdOrParams !== null) {
			const p = patientIdOrParams;
			return this.recordAction({
				actionType: "payment_refund",
				entityType: "payment_refund",
				entityId: p.billId,
				patientId: p.patientId,
				actorUserId: p.actorUserId,
				actorRole: p.actorRole,
				reason: p.reason,
				details: {
					billId: p.billId,
					amountKopecks: p.amountKopecks,
					paymentMethod: p.paymentMethod,
					reason: p.reason,
				},
			});
		}

		return this.recordAction({
			actionType: "payment_refund",
			entityType: "payment_refund",
			entityId: billId || generateUuidV7(),
			patientId: patientIdOrParams,
			reason,
			details: {
				billId,
				amountKopecks: amountKopecks ?? 0,
				paymentMethod: paymentMethod || "cash",
				reason,
			},
		});
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
		return this.recordAction({
			actionType: "appointment_create",
			entityType: "appointment",
			entityId: params.appointmentId,
			patientId: params.patientId ?? null,
			actorUserId: params.actorUserId,
			actorRole: params.actorRole,
			reason: params.reason ?? "Создание первичной записи в расписании",
			details: {
				appointmentId: params.appointmentId,
				scheduledTime: params.scheduledTime ?? null,
				doctorUserId: params.doctorUserId ?? null,
				reason: params.reason ?? null,
			},
		});
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
		return this.recordAction({
			actionType: "appointment_reschedule",
			entityType: "appointment",
			entityId: params.appointmentId,
			patientId: params.patientId ?? null,
			actorUserId: params.actorUserId,
			actorRole: params.actorRole,
			reason: params.reason ?? "Перенос времени приёма",
			details: {
				appointmentId: params.appointmentId,
				oldTime: params.oldTime ?? null,
				newTime: params.newTime ?? null,
				reason: params.reason ?? null,
			},
		});
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
		return this.recordAction({
			actionType: "appointment_cancel",
			entityType: "appointment",
			entityId: params.appointmentId,
			patientId: params.patientId ?? null,
			actorUserId: params.actorUserId,
			actorRole: params.actorRole,
			reason: params.reason,
			details: {
				appointmentId: params.appointmentId,
				scheduledTime: params.scheduledTime ?? null,
				reason: params.reason,
			},
		});
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
		if (typeof docTypeOrParams === "object" && docTypeOrParams !== null) {
			const p = docTypeOrParams;
			return this.recordAction({
				actionType: "document_print",
				entityType: "printed_document",
				entityId: p.documentId || generateUuidV7(),
				patientId: p.patientId ?? null,
				actorUserId: p.actorUserId,
				actorRole: p.actorRole,
				details: {
					documentType: p.documentType,
					documentId: p.documentId ?? null,
					title: p.title ?? null,
				},
			});
		}

		return this.recordAction({
			actionType: "document_print",
			entityType: "document",
			entityId: documentId || generateUuidV7(),
			patientId,
			details: {
				documentType: docTypeOrParams,
				documentId,
				printedAt: new Date().toISOString(),
			},
		});
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
		if (typeof docTypeOrParams === "object" && docTypeOrParams !== null) {
			const p = docTypeOrParams;
			return this.recordAction({
				actionType: "document_export",
				entityType: "system_export",
				entityId: generateUuidV7(),
				actorUserId: p.actorUserId,
				actorRole: p.actorRole,
				reason: p.reason ?? "Экспорт операционных отчетов клиники",
				details: {
					documentType: p.exportType,
					recordCount: p.recordCount,
					format: p.format,
					reason: p.reason ?? null,
				},
			});
		}

		return this.recordAction({
			actionType: "document_export",
			entityType: "document",
			entityId: typeof recordCountOrDocId === "string" ? recordCountOrDocId : generateUuidV7(),
			patientId: typeof formatOrPatientId === "string" ? formatOrPatientId : null,
			details: {
				documentType: docTypeOrParams,
				recordCount: typeof recordCountOrDocId === "number" ? recordCountOrDocId : null,
				exportedAt: new Date().toISOString(),
			},
		});
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
		if (typeof patientIdOrParams === "object" && patientIdOrParams !== null) {
			const p = patientIdOrParams;
			return this.recordAction({
				actionType: "diary_revision",
				entityType: "diary_revision",
				entityId: p.visitId,
				patientId: p.patientId,
				actorUserId: p.actorUserId,
				actorRole: p.actorRole,
				reason: p.revisionReason,
				details: {
					visitId: p.visitId,
					revisionReason: p.revisionReason,
					protocol: "Исправленному верить",
					savedAt: new Date().toISOString(),
				},
			});
		}

		return this.recordAction({
			actionType: "custom_action",
			entityType: "diary_revision",
			entityId: visitId || "unknown_visit",
			patientId: patientIdOrParams,
			reason: revisionReason,
			details: {
				visitId,
				revisionReason,
				protocol: "Исправленному верить",
				savedAt: new Date().toISOString(),
			},
		});
	}

	// ─── Внутренние методы хранилища и слушателей ───────────────────────

	private loadFromStorage(): void {
		const storage =
			typeof window !== "undefined" && window.localStorage
				? window.localStorage
				: typeof localStorage !== "undefined"
					? localStorage
					: null;
		if (!storage) return;
		try {
			const saved = storage.getItem(LOCAL_STORAGE_STAFF_EVENTS_KEY);
			if (saved) {
				const parsed = JSON.parse(saved);
				if (Array.isArray(parsed)) {
					this.queue = parsed.slice(-MAX_OFFLINE_STAFF_EVENTS);
				}
			} else {
				// Fallback: миграция из legacy-ключа
				const legacySaved = storage.getItem(LEGACY_OFFLINE_STAFF_AUDIT_KEY);
				if (legacySaved) {
					const parsed = JSON.parse(legacySaved);
					if (Array.isArray(parsed) && parsed.length > 0) {
						this.queue = parsed.slice(-MAX_OFFLINE_STAFF_EVENTS);
						this.saveToStorage();
					}
				}
			}
		} catch {
			this.queue = [];
		}
	}

	private saveToStorage(): void {
		const storage =
			typeof window !== "undefined" && window.localStorage
				? window.localStorage
				: typeof localStorage !== "undefined"
					? localStorage
					: null;
		if (!storage) return;
		try {
			const serialized = JSON.stringify(this.queue);
			storage.setItem(LOCAL_STORAGE_STAFF_EVENTS_KEY, serialized);
			// Зеркалируем в legacy-ключ для 100% совместимости
			storage.setItem(LEGACY_OFFLINE_STAFF_AUDIT_KEY, serialized);
		} catch {
			// Игнорируем ошибку переполнения квоты localStorage
		}
		this.backupToIndexedDb();
	}

	private backupToIndexedDb(): void {
		if (typeof window === "undefined" || !window.indexedDB) return;
		try {
			const req = window.indexedDB.open(STAFF_AUDIT_IDB_NAME, 1);
			req.onupgradeneeded = (e) => {
				const idb = (e.target as IDBOpenDBRequest).result;
				if (!idb.objectStoreNames.contains(STAFF_AUDIT_IDB_STORE)) {
					idb.createObjectStore(STAFF_AUDIT_IDB_STORE, { keyPath: "id" });
				}
			};
			req.onsuccess = (e) => {
				try {
					const idb = (e.target as IDBOpenDBRequest).result;
					const tx = idb.transaction(STAFF_AUDIT_IDB_STORE, "readwrite");
					const store = tx.objectStore(STAFF_AUDIT_IDB_STORE);
					for (const item of this.queue) {
						store.put(item);
					}
					tx.oncomplete = () => idb.close();
					tx.onerror = () => idb.close();
				} catch {
					// non-blocking Doctor Autonomy
				}
			};
			req.onerror = () => {};
		} catch {
			// non-blocking Doctor Autonomy
		}
	}

	private broadcastToLan(entry: StaffActionAuditEntry): void {
		try {
			// Don't initialize LAN mesh background intervals during headless Node unit tests
			if (
				typeof process !== "undefined" &&
				(process.env?.NODE_ENV === "test" || Boolean(process.env?.VITEST))
			) {
				return;
			}
			if (typeof window !== "undefined" && typeof window.document?.createElement === "function") {
				import("../offline/lanP2PDispatcher.js")
					.then(({ lanP2PDispatcher }) => {
						void lanP2PDispatcher.broadcastStaffAction(entry);
					})
					.catch(() => {
						// Non-blocking Doctor Autonomy
					});
			}
		} catch {
			// Non-blocking Doctor Autonomy
		}
	}

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
			void this.flushQueue();
		});
	}

	private startAutoFlushTimer(): void {
		if (this.flushTimer) clearInterval(this.flushTimer);
		this.flushTimer = setInterval(() => {
			if (this.queue.length > 0) {
				void this.flushQueue();
			}
		}, AUTO_FLUSH_INTERVAL_MS);
	}
}

export const staffTelemetryService = new StaffTelemetryService();
export default staffTelemetryService;
