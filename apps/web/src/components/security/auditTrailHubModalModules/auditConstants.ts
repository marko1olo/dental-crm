import type { AuditEventType, AuditSeverity, AuditStatus } from './types';

export interface SelectOption<T extends string> {
	readonly value: T;
	readonly label: string;
}

export const AUDIT_EVENT_TYPE_OPTIONS: readonly SelectOption<AuditEventType | 'all'>[] = [
	{ value: 'all', label: 'Все типы событий' },
	{ value: 'view_patient_card', label: 'Просмотр медкарты 043/у' },
	{ value: 'modify_bill', label: 'Изменение счета / оплаты' },
	{ value: 'delete_appointment', label: 'Удаление / отмена приема' },
	{ value: 'export_patients_csv', label: 'Экспорт базы пациентов' },
	{ value: 'sign_consent_pep', label: 'Подписание согласия (ПЭП)' },
	{ value: 'sign_consent_ukep', label: 'Подписание документа (УКЭП)' },
	{ value: 'unmask_pii', label: 'Просмотр полных ПДн' },
	{ value: 'login_attempt', label: 'Авторизация сотрудника' },
	{ value: 'role_permission_change', label: 'Смена прав / ролей' },
];

export const AUDIT_SEVERITY_OPTIONS: readonly SelectOption<AuditSeverity | 'all'>[] = [
	{ value: 'all', label: 'Любая критичность' },
	{ value: 'info', label: 'Info' },
	{ value: 'warning', label: 'Warning' },
	{ value: 'critical', label: 'Critical' },
	{ value: 'alert', label: 'Alert' },
];

export const AUDIT_STATUS_OPTIONS: readonly SelectOption<AuditStatus | 'all'>[] = [
	{ value: 'all', label: 'Любой статус' },
	{ value: 'success', label: 'Успешно' },
	{ value: 'failure', label: 'Ошибка' },
	{ value: 'denied', label: 'Заблокировано' },
];
