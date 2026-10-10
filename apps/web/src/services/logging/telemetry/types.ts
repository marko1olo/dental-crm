/**
 * DENTE CRM — Staff Activity & Forensic Telemetry Types
 *
 * Контракты данных, модели событий аудита, интерфейсы пакетов и константы телеметрии.
 * В соответствии с 152-ФЗ, 323-ФЗ и Мандатами 8d (Quiet Telemetry) и 8e (Doctor Autonomy).
 */

import type { StaffActionAuditEntry, StaffActionType } from "@dental/shared";

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

export interface StaffTelemetryUserContext {
	organizationId?: string | null | undefined;
	userId?: string | null | undefined;
	role?: string | null | undefined;
	name?: string | null | undefined;
}

export interface TelemetryBatchPayload {
	events: StaffActionAuditEntry[];
}
