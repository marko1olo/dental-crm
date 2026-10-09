/**
 * types.ts — Layer 0: Типы, интерфейсы и метаданные журнала аудита 152-ФЗ / ФСТЭК.
 * Не содержит зависимостей от других модулей (чистый Layer 0).
 */

export const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

export const AUDIT_EVENT_TYPES = [
	'view_patient_card',
	'modify_bill',
	'delete_appointment',
	'export_patients_csv',
	'sign_consent_pep',
	'sign_consent_ukep',
	'delete_bill',
	'unmask_pii',
	'view_treatment_plan',
	'emr_entry_edit',
	'role_permission_change',
	'login_attempt',
	'export_audit_log',
	'system_backup',
] as const;

export type AuditEventType = (typeof AUDIT_EVENT_TYPES)[number];

export type AuditEventCategory =
	| 'patient_pii'
	| 'clinical'
	| 'financial'
	| 'auth_security'
	| 'system_admin';

export type AuditSeverity = 'info' | 'warning' | 'critical' | 'alert';

export type AuditStatus = 'success' | 'failure' | 'denied';

export type AuditEntityType =
	| 'patient'
	| 'patient_card_043'
	| 'appointment'
	| 'invoice_bill'
	| 'consent_document'
	| 'staff_user'
	| 'system_config'
	| 'audit_log';

export interface AuditActor {
	readonly userId: string;
	readonly fullName: string;
	readonly role: string;
	readonly ipAddress: string;
	readonly userAgent?: string | undefined;
	readonly department?: string | undefined;
}

export interface AuditEntity {
	readonly entityType: AuditEntityType;
	readonly entityId: string;
	readonly entityName?: string | undefined;
	readonly patientId?: string | undefined;
	readonly patientNameMasked?: string | undefined;
}

export interface AuditPayload {
	readonly actionDescriptionRu: string;
	readonly oldValue?: Record<string, unknown> | string | number | null | undefined;
	readonly newValue?: Record<string, unknown> | string | number | null | undefined;
	readonly diffSummaryRu?: string | undefined;
	readonly justificationReason?: string | undefined;
	readonly exportRecordCount?: number | undefined;
	readonly metadata?: Record<string, unknown> | undefined;
}

export interface AuditTrailEntry {
	readonly id: string;
	readonly timestamp: string; // ISO 8601
	readonly sequenceNumber: number; // 1, 2, 3...
	readonly eventType: AuditEventType;
	readonly eventCategory: AuditEventCategory;
	readonly severity: AuditSeverity;
	readonly status: AuditStatus;
	readonly actor: AuditActor;
	readonly entity: AuditEntity;
	readonly payload: AuditPayload;
	readonly previousHash: string;
	readonly chainHash: string;
}

export interface CreateAuditEntryParams {
	readonly id?: string | undefined;
	readonly timestamp?: string | undefined;
	readonly eventType: AuditEventType;
	readonly eventCategory?: AuditEventCategory | undefined;
	readonly severity?: AuditSeverity | undefined;
	readonly status?: AuditStatus | undefined;
	readonly actor: AuditActor;
	readonly entity: AuditEntity;
	readonly payload: AuditPayload;
}

export interface AuditChainVerificationResult {
	readonly isValid: boolean;
	readonly verifiedCount: number;
	readonly latestHash: string;
	readonly brokenAtIndex?: number | undefined;
	readonly brokenEntryId?: string | undefined;
	readonly reason?: string | undefined;
}

export type AuditAnomalyCode =
	| 'NIGHT_HOURS_ACCESS'
	| 'MASS_PII_EXPORT'
	| 'HIGH_FREQUENCY_BURST'
	| 'CHAIN_TAMPERING'
	| 'REPEATED_FAILED_ACCESS';

export interface AuditAnomalyReport {
	readonly id: string;
	readonly code: AuditAnomalyCode;
	readonly titleRu: string;
	readonly descriptionRu: string;
	readonly severity: 'warning' | 'critical' | 'alert';
	readonly detectedAt: string;
	readonly relatedEntryIds: readonly string[];
	readonly actorUserId?: string | undefined;
	readonly actorFullName?: string | undefined;
	readonly recommendationRu: string;
}

export interface ClinicComplianceMetadata {
	readonly clinicName: string;
	readonly ogrn: string;
	readonly inn: string;
	readonly operatorRegistrationNumberRoskomnadzor: string;
	readonly responsiblePersonFullName: string;
	readonly headDoctorFullName: string;
	readonly securityAdminFullName: string;
}

export interface AuditFilterCriteria {
	readonly searchQuery?: string | undefined;
	readonly eventType?: AuditEventType | 'all' | undefined;
	readonly eventCategory?: AuditEventCategory | 'all' | undefined;
	readonly severity?: AuditSeverity | 'all' | undefined;
	readonly status?: AuditStatus | 'all' | undefined;
	readonly actorUserId?: string | undefined;
	readonly onlyAnomalies?: boolean | undefined;
	readonly startDateIso?: string | undefined;
	readonly endDateIso?: string | undefined;
}

export interface EventTypeMetadata {
	readonly labelRu: string;
	readonly category: AuditEventCategory;
	readonly defaultSeverity: AuditSeverity;
	readonly descriptionRu: string;
}

export const AUDIT_EVENT_METADATA: Record<AuditEventType, EventTypeMetadata> = {
	view_patient_card: {
		labelRu: 'Просмотр медкарты 043/у',
		category: 'patient_pii',
		defaultSeverity: 'info',
		descriptionRu: 'Открытие и просмотр амбулаторной стоматологической карты пациента (форма 043/у).',
	},
	modify_bill: {
		labelRu: 'Изменение счета / оплаты',
		category: 'financial',
		defaultSeverity: 'warning',
		descriptionRu: 'Корректировка позиций прейскуранта, начислений, скидок или способа оплаты.',
	},
	delete_appointment: {
		labelRu: 'Удаление / отмена приема',
		category: 'clinical',
		defaultSeverity: 'warning',
		descriptionRu: 'Аннулирование или удаление записи пациента на прием из расписания.',
	},
	export_patients_csv: {
		labelRu: 'Экспорт базы пациентов (Excel/CSV)',
		category: 'patient_pii',
		defaultSeverity: 'critical',
		descriptionRu: 'Выгрузка реестра пациентов с персональными данными во внешний табличный файл.',
	},
	sign_consent_pep: {
		labelRu: 'Подписание согласия (ПЭП)',
		category: 'patient_pii',
		defaultSeverity: 'info',
		descriptionRu: 'Подписание ИДС или согласия на обработку ПДн простой электронной подписью (SMS-код/Планшет).',
	},
	sign_consent_ukep: {
		labelRu: 'Подписание документа (УКЭП)',
		category: 'clinical',
		defaultSeverity: 'info',
		descriptionRu: 'Подписание медицинской записи квалифицированной электронной подписью врача.',
	},
	delete_bill: {
		labelRu: 'Аннулирование счета',
		category: 'financial',
		defaultSeverity: 'critical',
		descriptionRu: 'Полное удаление или аннулирование неоплаченного/ошибочного счета.',
	},
	unmask_pii: {
		labelRu: 'Просмотр полных ПДн (152-ФЗ)',
		category: 'patient_pii',
		defaultSeverity: 'warning',
		descriptionRu: 'Запрос на демаскирование паспортных данных, СНИЛС или полного номера телефона.',
	},
	view_treatment_plan: {
		labelRu: 'Просмотр плана лечения',
		category: 'clinical',
		defaultSeverity: 'info',
		descriptionRu: 'Ознакомление с комплексным этапным планом стоматологического лечения.',
	},
	emr_entry_edit: {
		labelRu: 'Правка протокола ЭМК',
		category: 'clinical',
		defaultSeverity: 'warning',
		descriptionRu: 'Внесение изменений в подписанный или предварительный клинический дневник.',
	},
	role_permission_change: {
		labelRu: 'Изменение роли / прав доступа',
		category: 'auth_security',
		defaultSeverity: 'critical',
		descriptionRu: 'Назначение полномочий, изменение матричных прав персонала или смена должности.',
	},
	login_attempt: {
		labelRu: 'Вход сотрудника в систему',
		category: 'auth_security',
		defaultSeverity: 'info',
		descriptionRu: 'Авторизация в системе через логин/пароль или быстрый PIN-код.',
	},
	export_audit_log: {
		labelRu: 'Экспорт журнала безопасности',
		category: 'system_admin',
		defaultSeverity: 'critical',
		descriptionRu: 'Выгрузка криптографического журнала аудита для регуляторов (Роскомнадзор/ФСТЭК).',
	},
	system_backup: {
		labelRu: 'Резервное копирование БД',
		category: 'system_admin',
		defaultSeverity: 'info',
		descriptionRu: 'Создание зашифрованного архива базы данных и клинических файлов.',
	},
};

export interface AnomalyDetectionOptions {
	readonly nightStartHour?: number | undefined; // По умолчанию 22 (22:00)
	readonly nightEndHour?: number | undefined; // По умолчанию 7 (07:00)
	readonly massExportThreshold?: number | undefined; // По умолчанию 50 записей
	readonly burstRequestThreshold?: number | undefined; // По умолчанию 15 обращений за минуту
	readonly burstWindowSeconds?: number | undefined; // По умолчанию 60 сек
}
