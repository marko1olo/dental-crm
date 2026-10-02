/**
 * DENTE CRM — Staff Action Audit Logging & Telemetry Service
 *
 * Архитектурные принципы (Mandate 8e / 8n / 152-ФЗ):
 * 1. Неблокирующий характер (Zero Friction): вызовы аудита асинхронны и безопасны к сбоям,
 *    ни один сбой логирования не может прервать клиническую или финансовую операцию врача.
 * 2. Офлайн-персистентность: события сохраняются в локальном буфере localStorage и автоматически
 *    дренируются на сервер (POST /api/audit/events/batch) при восстановлении сети.
 * 3. Детальные diff-слепки: фиксация oldState, newState, сумм в копейках, кодов МКБ-10 и причин.
 * 4. Связка с блокчейн-цепочкой: при наличии активной сессии события также попадают в SHA-256 Ledger.
 */

import {
	type StaffActionAuditEntry,
	type StaffActionType,
	type StaffActionDetails,
	generateUuidV7,
	sanitizePayload,
	sanitizeString,
} from "@dental/shared";
import clientLogger from "../logging/clientLogger";

export interface LogStaffActionParams {
	actionType: StaffActionType;
	entityType: string;
	entityId: string;
	patientId?: string | null | undefined;
	actorUserId?: string | null | undefined;
	actorRole?: string | null | undefined;
	actorName?: string | null | undefined;
	details?: StaffActionDetails | Record<string, unknown> | undefined;
	reason?: string | null | undefined;
	organizationId?: string | undefined;
}

export class StaffActionAuditService {
	/**
	 * Базовый метод регистрации действия персонала.
	 * Никогда не выбрасывает исключений (Non-blocking Doctor Autonomy).
	 */
	public static logAction(params: LogStaffActionParams): StaffActionAuditEntry | null {
		try {
			return clientLogger.recordStaffAction({
				actionType: params.actionType,
				entityType: params.entityType,
				entityId: params.entityId,
				patientId: params.patientId ?? null,
				actorUserId: params.actorUserId ?? null,
				actorRole: params.actorRole ?? null,
				actorName: params.actorName ?? null,
				details: params.details as Record<string, unknown> | undefined,
				reason: params.reason ? sanitizeString(params.reason) : null,
				organizationId: params.organizationId,
			});
		} catch (err) {
			console.warn("[StaffAuditService] Не удалось зафиксировать действие персонала:", err);
			return null;
		}
	}

	/**
	 * 1. Открытие медицинской карты (ЭМК 043/у)
	 */
	public static logEmrOpen(params: {
		patientId: string;
		cardId?: string | null | undefined;
		actorUserId?: string | null | undefined;
		actorRole?: string | null | undefined;
		actorName?: string | null | undefined;
		reason?: string | null | undefined;
	}): StaffActionAuditEntry | null {
		return StaffActionAuditService.logAction({
			actionType: "emr_open",
			entityType: "emr_card_043",
			entityId: params.cardId || params.patientId,
			patientId: params.patientId,
			actorUserId: params.actorUserId,
			actorRole: params.actorRole,
			actorName: params.actorName,
			reason: params.reason ?? "Открытие амбулаторной карты 043/у",
			details: {
				patientId: params.patientId,
				cardId: params.cardId,
				viewedAt: new Date().toISOString(),
			},
		});
	}

	/**
	 * 2. Изменение диагноза (МКБ-10, формулировка, одонтограмма)
	 */
	public static logDiagnosisChange(params: {
		patientId: string;
		recordId?: string | null | undefined;
		oldDiagnosis?: { icdCode?: string | null; name?: string | null } | null | undefined;
		newDiagnosis: { icdCode: string; name?: string | null };
		toothNumber?: number | null | undefined;
		reason?: string | null | undefined;
		actorUserId?: string | null | undefined;
		actorRole?: string | null | undefined;
		actorName?: string | null | undefined;
	}): StaffActionAuditEntry | null {
		return StaffActionAuditService.logAction({
			actionType: "diagnosis_change",
			entityType: "clinical_diagnosis",
			entityId: params.recordId || params.patientId,
			patientId: params.patientId,
			actorUserId: params.actorUserId,
			actorRole: params.actorRole,
			actorName: params.actorName,
			reason: params.reason ?? "Уточнение клинического диагноза",
			details: {
				oldState: params.oldDiagnosis ?? null,
				newState: params.newDiagnosis,
				toothNumber: params.toothNumber ?? null,
				icdCode: params.newDiagnosis.icdCode,
				reason: params.reason ?? null,
			},
		});
	}

	/**
	 * 3.1 Добавление услуги в план лечения или наряд
	 */
	public static logServiceAdd(params: {
		patientId: string;
		planId: string;
		serviceCode: string;
		serviceName: string;
		amountKopecks?: number | null | undefined;
		quantity?: number | undefined;
		toothNumber?: number | null | undefined;
		actorUserId?: string | null | undefined;
		actorRole?: string | null | undefined;
	}): StaffActionAuditEntry | null {
		return StaffActionAuditService.logAction({
			actionType: "service_add",
			entityType: "treatment_plan_item",
			entityId: `${params.planId}:${params.serviceCode}`,
			patientId: params.patientId,
			actorUserId: params.actorUserId,
			actorRole: params.actorRole,
			details: {
				planId: params.planId,
				serviceCode: params.serviceCode,
				serviceName: params.serviceName,
				amountKopecks: params.amountKopecks ?? null,
				quantity: params.quantity ?? 1,
				toothNumber: params.toothNumber ?? null,
			},
		});
	}

	/**
	 * 3.2 Удаление услуги из плана лечения или наряда
	 */
	public static logServiceRemove(params: {
		patientId: string;
		planId: string;
		serviceCode: string;
		serviceName?: string | null | undefined;
		reason?: string | null | undefined;
		amountKopecks?: number | null | undefined;
		actorUserId?: string | null | undefined;
		actorRole?: string | null | undefined;
	}): StaffActionAuditEntry | null {
		return StaffActionAuditService.logAction({
			actionType: "service_remove",
			entityType: "treatment_plan_item",
			entityId: `${params.planId}:${params.serviceCode}`,
			patientId: params.patientId,
			actorUserId: params.actorUserId,
			actorRole: params.actorRole,
			reason: params.reason ?? "Исключение позиции из плана лечения",
			details: {
				planId: params.planId,
				serviceCode: params.serviceCode,
				serviceName: params.serviceName ?? null,
				amountKopecks: params.amountKopecks ?? null,
				reason: params.reason ?? null,
			},
		});
	}

	/**
	 * 4. Применение скидки (процентная или фиксированная)
	 */
	public static logDiscountApply(params: {
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
	}): StaffActionAuditEntry | null {
		return StaffActionAuditService.logAction({
			actionType: "discount_apply",
			entityType: "financial_discount",
			entityId: params.billId || params.planId || generateUuidV7(),
			patientId: params.patientId ?? null,
			actorUserId: params.actorUserId,
			actorRole: params.actorRole,
			reason: params.reason,
			details: {
				discountPercent: params.discountPercent ?? null,
				amountKopecks: params.discountAmountKopecks ?? null,
				originalAmountKopecks: params.originalAmountKopecks ?? null,
				finalAmountKopecks: params.finalAmountKopecks ?? null,
				reason: params.reason,
			},
		});
	}

	/**
	 * 5. Прием оплаты (касса, терминал, СБП, депозит)
	 */
	public static logPaymentReceive(params: {
		patientId: string;
		billId: string;
		amountKopecks: number;
		paymentMethod: "cash" | "card" | "sbp" | "deposit" | "split" | string;
		fiscalReceiptNumber?: string | null | undefined;
		actorUserId?: string | null | undefined;
		actorRole?: string | null | undefined;
	}): StaffActionAuditEntry | null {
		return StaffActionAuditService.logAction({
			actionType: "payment_receive",
			entityType: "payment_receipt",
			entityId: params.billId,
			patientId: params.patientId,
			actorUserId: params.actorUserId,
			actorRole: params.actorRole,
			details: {
				billId: params.billId,
				amountKopecks: params.amountKopecks,
				paymentMethod: params.paymentMethod,
				fiscalReceiptNumber: params.fiscalReceiptNumber ?? null,
			},
		});
	}

	/**
	 * 6. Оформление возврата средств
	 */
	public static logPaymentRefund(params: {
		patientId: string;
		billId: string;
		amountKopecks: number;
		paymentMethod: string;
		reason: string;
		actorUserId?: string | null | undefined;
		actorRole?: string | null | undefined;
	}): StaffActionAuditEntry | null {
		return StaffActionAuditService.logAction({
			actionType: "payment_refund",
			entityType: "payment_refund",
			entityId: params.billId,
			patientId: params.patientId,
			actorUserId: params.actorUserId,
			actorRole: params.actorRole,
			reason: params.reason,
			details: {
				billId: params.billId,
				amountKopecks: params.amountKopecks,
				paymentMethod: params.paymentMethod,
				reason: params.reason,
			},
		});
	}

	/**
	 * 7.1 Открытие кассовой смены
	 */
	public static logShiftOpen(params: {
		cashRegisterId: string;
		shiftNumber: string | number;
		openingCashKopecks?: number | null | undefined;
		actorUserId?: string | null | undefined;
		actorRole?: string | null | undefined;
	}): StaffActionAuditEntry | null {
		return StaffActionAuditService.logAction({
			actionType: "shift_open",
			entityType: "cash_register_shift",
			entityId: `shift:${params.cashRegisterId}:${params.shiftNumber}`,
			actorUserId: params.actorUserId,
			actorRole: params.actorRole,
			details: {
				cashRegisterId: params.cashRegisterId,
				shiftNumber: String(params.shiftNumber),
				amountKopecks: params.openingCashKopecks ?? 0,
			},
		});
	}

	/**
	 * 7.2 Закрытие кассовой смены (Z-отчет)
	 */
	public static logShiftClose(params: {
		cashRegisterId: string;
		shiftNumber: string | number;
		totalRevenueKopecks?: number | null | undefined;
		closingCashKopecks?: number | null | undefined;
		actorUserId?: string | null | undefined;
		actorRole?: string | null | undefined;
	}): StaffActionAuditEntry | null {
		return StaffActionAuditService.logAction({
			actionType: "shift_close",
			entityType: "cash_register_shift",
			entityId: `shift:${params.cashRegisterId}:${params.shiftNumber}`,
			actorUserId: params.actorUserId,
			actorRole: params.actorRole,
			details: {
				cashRegisterId: params.cashRegisterId,
				shiftNumber: String(params.shiftNumber),
				totalRevenueKopecks: params.totalRevenueKopecks ?? 0,
				closingCashKopecks: params.closingCashKopecks ?? 0,
			},
		});
	}

	/**
	 * 8. Отмена / удаление приема в расписании
	 */
	public static logAppointmentCancel(params: {
		appointmentId: string;
		patientId?: string | null | undefined;
		reason: string;
		scheduledTime?: string | null | undefined;
		actorUserId?: string | null | undefined;
		actorRole?: string | null | undefined;
	}): StaffActionAuditEntry | null {
		return StaffActionAuditService.logAction({
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
	 * 9.1 Печать документа / формы (ИДС, справка в налоговую, рецепт, акт)
	 */
	public static logDocumentPrint(params: {
		patientId?: string | null | undefined;
		documentType: string;
		documentId?: string | null | undefined;
		title?: string | null | undefined;
		actorUserId?: string | null | undefined;
		actorRole?: string | null | undefined;
	}): StaffActionAuditEntry | null {
		return StaffActionAuditService.logAction({
			actionType: "document_print",
			entityType: "printed_document",
			entityId: params.documentId || generateUuidV7(),
			patientId: params.patientId ?? null,
			actorUserId: params.actorUserId,
			actorRole: params.actorRole,
			details: {
				documentType: params.documentType,
				documentId: params.documentId ?? null,
				title: params.title ?? null,
			},
		});
	}

	/**
	 * 9.2 Экспорт данных (реестр пациентов, выгрузка отчетов, CSV, Excel)
	 */
	public static logDocumentExport(params: {
		exportType: string;
		recordCount: number;
		format: "csv" | "excel" | "json" | "pdf" | string;
		actorUserId?: string | null | undefined;
		actorRole?: string | null | undefined;
		reason?: string | null | undefined;
	}): StaffActionAuditEntry | null {
		return StaffActionAuditService.logAction({
			actionType: "document_export",
			entityType: "system_export",
			entityId: generateUuidV7(),
			actorUserId: params.actorUserId,
			actorRole: params.actorRole,
			reason: params.reason ?? "Экспорт операционных отчетов клиники",
			details: {
				documentType: params.exportType,
				recordCount: params.recordCount,
				format: params.format,
				reason: params.reason ?? null,
			},
		});
	}

	/**
	 * Получение количества несинхронизированных записей в очереди
	 */
	public static getPendingCount(): number {
		return clientLogger.getPendingStaffAuditCount();
	}

	/**
	 * Принудительный сброс очереди на сервер
	 */
	public static async flushPending(): Promise<number> {
		return clientLogger.flushStaffAuditBuffer();
	}
}

export default StaffActionAuditService;
