import type {
	AuditEventType,
	AuditEventCategory,
	AuditSeverity,
} from './types';
import type {
	AuditEntityType,
	AuditPayload,
	CreateAuditEntryParams,
} from '../auditTrailEngine';

const VALID_AUDIT_ENTITY_TYPES: ReadonlySet<AuditEntityType> = new Set<AuditEntityType>([
	'patient',
	'patient_card_043',
	'appointment',
	'invoice_bill',
	'consent_document',
	'staff_user',
	'system_config',
	'audit_log',
]);

function normalizeAuditEntityType(val: unknown): AuditEntityType {
	return typeof val === 'string' && VALID_AUDIT_ENTITY_TYPES.has(val as AuditEntityType)
		? (val as AuditEntityType)
		: 'patient';
}

function normalizeAuditPayloadValue(val: unknown): AuditPayload['oldValue'] {
	if (val === null || val === undefined) return undefined;
	if (typeof val === 'string' || typeof val === 'number') return val;
	if (typeof val === 'object' && !Array.isArray(val)) {
		return val as Record<string, unknown>;
	}
	return String(val);
}

export function mapRawToAuditEntryParams(raw: Record<string, unknown>): CreateAuditEntryParams {
	const action = String(raw.actionType || raw.action || raw.eventType || '').toLowerCase();
	let eventType: AuditEventType = 'view_patient_card';
	let eventCategory: AuditEventCategory = 'clinical';
	let actionDesc = 'Действие в системе';

	if (action.includes('emr') || action.includes('card') || action.includes('043')) {
		eventType = 'view_patient_card';
		eventCategory = 'patient_pii';
		actionDesc = 'Просмотр медкарты 043/у';
	} else if (action.includes('bill') || action.includes('payment') || action.includes('discount') || action.includes('price')) {
		eventType = 'modify_bill';
		eventCategory = 'financial';
		actionDesc = 'Финансовая операция / прейскурант';
	} else if (action.includes('refund')) {
		eventType = 'delete_bill';
		eventCategory = 'financial';
		actionDesc = 'Возврат средств из кассы';
	} else if (action.includes('cancel') || action.includes('delete_appointment')) {
		eventType = 'delete_appointment';
		eventCategory = 'clinical';
		actionDesc = 'Отмена / удаление приема';
	} else if (action.includes('export')) {
		eventType = 'export_patients_csv';
		eventCategory = 'patient_pii';
		actionDesc = 'Выгрузка персональных данных (152-ФЗ)';
	} else if (action.includes('diagnosis') || action.includes('service')) {
		eventType = 'emr_entry_edit';
		eventCategory = 'clinical';
		actionDesc = 'Клинические записи / диагноз МКБ-10';
	} else if (action.includes('role') || action.includes('authority') || action.includes('credential')) {
		eventType = 'role_permission_change';
		eventCategory = 'auth_security';
		actionDesc = 'Изменение полномочий персонала';
	} else if (action.includes('login') || action.includes('auth')) {
		eventType = 'login_attempt';
		eventCategory = 'auth_security';
		actionDesc = 'Авторизация в системе';
	}

	const details = (raw.details || raw.meta || {}) as Record<string, unknown>;

	return {
		id: typeof raw.id === 'string' ? raw.id : undefined,
		timestamp: typeof raw.createdAt === 'string'
			? raw.createdAt
			: typeof raw.clientTimestamp === 'string'
				? raw.clientTimestamp
				: new Date().toISOString(),
		eventType,
		eventCategory,
		severity: (raw.severity as AuditSeverity) || (action.includes('refund') || action.includes('export') ? 'critical' : 'info'),
		status: 'success',
		actor: {
			userId: String(raw.actorUserId || raw.userId || 'system'),
			fullName: String(raw.actorName || raw.actorLogin || raw.actorFullName || 'Сотрудник клиники'),
			role: String(raw.actorRole || 'staff'),
			ipAddress: String(raw.ipAddress || raw.ip || '127.0.0.1'),
		},
		entity: {
			entityType: normalizeAuditEntityType(raw.entityType),
			entityId: String(raw.entityId || raw.id || 'unknown'),
			patientId: raw.patientId ? String(raw.patientId) : undefined,
		},
		payload: {
			actionDescriptionRu: String(raw.reason || details.reason || actionDesc),
			oldValue: normalizeAuditPayloadValue(details.oldState ?? raw.oldValue),
			newValue: normalizeAuditPayloadValue(details.newState ?? raw.newValue),
			justificationReason: raw.reason ? String(raw.reason) : undefined,
		},
	};
}

export function formatAuditDateTime(timestamp: string): string {
	return new Date(timestamp).toLocaleString('ru-RU', {
		day: '2-digit',
		month: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
	});
}

export function formatAuditTimeShort(timestamp: string): string {
	return new Date(timestamp).toLocaleTimeString('ru-RU', {
		hour: '2-digit',
		minute: '2-digit',
	});
}

export function truncateHash(hash: string, startChars = 8, endChars = 4): string {
	if (!hash) return '';
	if (hash.length <= startChars + endChars) return hash;
	return `${hash.slice(0, startChars)}...${hash.slice(-endChars)}`;
}
