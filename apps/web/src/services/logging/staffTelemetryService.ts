/**
 * DENTE CRM — Staff Activity & Forensic Telemetry Service
 *
 * Осуществляет всестороннее протоколирование действий медицинского и административного
 * персонала (врачи, ассистенты, регистраторы, кураторы) локально в кольцевой буфер и
 * localStorage, а также передачу в защищенный журнал аудита сервера (/api/audit/events/batch)
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
import { clientLogger } from "./clientLogger.js";

export const LOCAL_STORAGE_STAFF_EVENTS_KEY = "dente_staff_audit_events_v1";
export const MAX_OFFLINE_STAFF_EVENTS = 200;
export const AUTO_FLUSH_INTERVAL_MS = 10_000;
export const BATCH_SIZE_THRESHOLD = 10;

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
	 * Запись события действий персонала в локальный буфер и планирование синхронизации
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
		clientLogger.audit(`[StaffActivity] ${input.actionType} on ${input.entityType}:${input.entityId}`, {
			actor: actorName || actorUserId,
			patientId: input.patientId,
			details: sanitizedDetails,
		});

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
		this.saveToStorage();
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
				clientLogger.warn(`[StaffTelemetry] Не удалось отправить аудит-события: статус ${response.status}`);
				return false;
			}
		} catch (err) {
			// Сетевой сбой: оставляем события в очереди для следующей попытки
			clientLogger.warn("[StaffTelemetry] Ошибка сети при отправке телеметрии персонала", err);
			return false;
		} finally {
			this.isFlushing = false;
		}
	}

	// ─── Специализированные хелперы для ключевых действий клиники ─────────

	/**
	 * Открытие медицинской карты пациента / визита
	 */
	public logEmrOpen(patientId: string, visitId?: string, meta?: Record<string, unknown>): StaffActionAuditEntry {
		return this.recordAction({
			actionType: "emr_open",
			entityType: "emr",
			entityId: visitId || patientId,
			patientId,
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
		patientId: string,
		tooth: number | string | undefined,
		oldDiagnosis: string | null | undefined,
		newDiagnosis: string,
		reason?: string,
	): StaffActionAuditEntry {
		return this.recordAction({
			actionType: "diagnosis_change",
			entityType: "diagnosis",
			entityId: tooth ? `tooth_${tooth}` : "general",
			patientId,
			reason,
			details: {
				tooth: tooth ?? null,
				oldState: { diagnosis: oldDiagnosis || "" },
				newState: { diagnosis: newDiagnosis },
				reason,
			},
		});
	}

	/**
	 * Добавление услуги в заказ-наряд или счет
	 */
	public logServiceAdd(
		patientId: string,
		serviceCode: string,
		serviceName: string,
		amountKopecks: number,
		quantity: number = 1,
	): StaffActionAuditEntry {
		return this.recordAction({
			actionType: "service_add",
			entityType: "service",
			entityId: serviceCode,
			patientId,
			details: {
				serviceCode,
				serviceName,
				amountKopecks,
				quantity,
			},
		});
	}

	/**
	 * Удаление услуги из заказ-наряда или счета
	 */
	public logServiceRemove(
		patientId: string,
		serviceCode: string,
		serviceName: string,
		reason?: string,
	): StaffActionAuditEntry {
		return this.recordAction({
			actionType: "service_remove",
			entityType: "service",
			entityId: serviceCode,
			patientId,
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
		patientId: string,
		discountPercent: number,
		reason: string,
		oldAmountKopecks?: number,
		newAmountKopecks?: number,
	): StaffActionAuditEntry {
		return this.recordAction({
			actionType: "discount_apply",
			entityType: "discount",
			entityId: `disc_${discountPercent}pct`,
			patientId,
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
	 * Открытие рабочей смены врача
	 */
	public logShiftOpen(shiftNumber: string, doctorId?: string, doctorName?: string): StaffActionAuditEntry {
		return this.recordAction({
			actionType: "shift_open",
			entityType: "shift",
			entityId: shiftNumber,
			actorUserId: doctorId,
			actorName: doctorName,
			details: {
				shiftNumber,
				openedAt: new Date().toISOString(),
			},
		});
	}

	/**
	 * Закрытие рабочей смены врача
	 */
	public logShiftClose(
		shiftNumber: string,
		doctorId?: string,
		doctorName?: string,
		stats?: Record<string, unknown>,
	): StaffActionAuditEntry {
		return this.recordAction({
			actionType: "shift_close",
			entityType: "shift",
			entityId: shiftNumber,
			actorUserId: doctorId,
			actorName: doctorName,
			details: {
				shiftNumber,
				closedAt: new Date().toISOString(),
				stats: stats || {},
			},
		});
	}

	/**
	 * Получение оплаты от пациента
	 */
	public logPaymentReceive(
		patientId: string,
		amountKopecks: number,
		method: string,
		invoiceId?: string,
	): StaffActionAuditEntry {
		return this.recordAction({
			actionType: "payment_receive",
			entityType: "payment",
			entityId: invoiceId || generateUuidV7(),
			patientId,
			details: {
				amountKopecks,
				method,
				invoiceId,
			},
		});
	}

	/**
	 * Печать клинического или бухгалтерского документа
	 */
	public logDocumentPrint(documentType: string, documentId: string, patientId?: string): StaffActionAuditEntry {
		return this.recordAction({
			actionType: "document_print",
			entityType: "document",
			entityId: documentId,
			patientId,
			details: {
				documentType,
				documentId,
				printedAt: new Date().toISOString(),
			},
		});
	}

	/**
	 * Экспорт документа или выписки (PDF/Excel)
	 */
	public logDocumentExport(documentType: string, documentId: string, patientId?: string): StaffActionAuditEntry {
		return this.recordAction({
			actionType: "document_export",
			entityType: "document",
			entityId: documentId,
			patientId,
			details: {
				documentType,
				documentId,
				exportedAt: new Date().toISOString(),
			},
		});
	}

	/**
	 * Сохранение ревизии карты/дневника («Исправленному верить»)
	 */
	public logRevisionSaved(patientId: string, visitId: string, revisionReason: string): StaffActionAuditEntry {
		return this.recordAction({
			actionType: "custom_action",
			entityType: "diary_revision",
			entityId: visitId,
			patientId,
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
			storage.setItem(LOCAL_STORAGE_STAFF_EVENTS_KEY, JSON.stringify(this.queue));
		} catch {
			// Игнорируем ошибку переполнения квоты localStorage
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
