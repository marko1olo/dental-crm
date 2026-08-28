/**
 * auditTrailEngine.ts — Движок аудита безопасности и доступа к ПДн (152-ФЗ РФ и Требования ФСТЭК России).
 *
 * Особенности:
 *  1. Неизменяемый журнал (Immutable Ledger) с SHA-256 блокчейн-связыванием (chainHash, previousHash).
 *  2. Протоколирование 152-ФЗ событий (карты 043/у, счета, удаления приемов, экспорт, подписи ПЭП/УКЭП).
 *  3. Детектор аномалий: ночной доступ (22:00-07:00), массовый экспорт (>50 записей), burst-запросы.
 *  4. Формирование отчетов и выгрузок для Роскомнадзора и ФСТЭК (JSON, CSV с BOM, Акт 152-ФЗ).
 */

// ============================================================================
// 1. КРИПТОГРАФИЧЕСКИЙ ДВИЖОК SHA-256 (FIPS 180-4, ZERO-DEPENDENCY, SYNCHRONOUS)
// ============================================================================

const SHA256_K: readonly number[] = [
	0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
	0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
	0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
	0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
	0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
	0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
	0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
	0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

function rightRotate(value: number, amount: number): number {
	return (value >>> amount) | (value << (32 - amount));
}

/**
 * Вычисляет криптографический хэш SHA-256 для массива байтов (Uint8Array).
 */
export function sha256Bytes(bytes: Uint8Array): string {
	let h0 = 0x6a09e667;
	let h1 = 0xbb67ae85;
	let h2 = 0x3c6ef372;
	let h3 = 0xa54ff53a;
	let h4 = 0x510e527f;
	let h5 = 0x9b05688c;
	let h6 = 0x1f83d9ab;
	let h7 = 0x5be0cd19;

	const len = bytes.length;
	const bitLen = len * 8;
	const kPad = (56 - ((len + 1) % 64) + 64) % 64;
	const totalLen = len + 1 + kPad + 8;
	const padded = new Uint8Array(totalLen);
	padded.set(bytes);
	padded[len] = 0x80;

	const view = new DataView(padded.buffer);
	const highBits = Math.floor(bitLen / 0x100000000);
	const lowBits = bitLen >>> 0;
	view.setUint32(totalLen - 8, highBits, false);
	view.setUint32(totalLen - 4, lowBits, false);

	const W = new Int32Array(64);

	for (let chunk = 0; chunk < totalLen; chunk += 64) {
		for (let i = 0; i < 16; i++) {
			W[i] = view.getInt32(chunk + i * 4, false);
		}
		for (let i = 16; i < 64; i++) {
			const w15 = W[i - 15]!;
			const w2 = W[i - 2]!;
			const s0 = rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3);
			const s1 = rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10);
			W[i] = ((W[i - 16]! + s0 + W[i - 7]! + s1) | 0);
		}

		let a = h0;
		let b = h1;
		let c = h2;
		let d = h3;
		let e = h4;
		let f = h5;
		let g = h6;
		let h = h7;

		for (let i = 0; i < 64; i++) {
			const s1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
			const ch = (e & f) ^ (~e & g);
			const temp1 = ((h + s1 + ch + SHA256_K[i]! + W[i]!) | 0);
			const s0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
			const maj = (a & b) ^ (a & c) ^ (b & c);
			const temp2 = ((s0 + maj) | 0);

			h = g;
			g = f;
			f = e;
			e = ((d + temp1) | 0);
			d = c;
			c = b;
			b = a;
			a = ((temp1 + temp2) | 0);
		}

		h0 = ((h0 + a) | 0);
		h1 = ((h1 + b) | 0);
		h2 = ((h2 + c) | 0);
		h3 = ((h3 + d) | 0);
		h4 = ((h4 + e) | 0);
		h5 = ((h5 + f) | 0);
		h6 = ((h6 + g) | 0);
		h7 = ((h7 + h) | 0);
	}

	const toHex = (n: number): string => (n >>> 0).toString(16).padStart(8, '0');
	return toHex(h0) + toHex(h1) + toHex(h2) + toHex(h3) + toHex(h4) + toHex(h5) + toHex(h6) + toHex(h7);
}

/**
 * Синхронный расчет SHA-256 хэша для UTF-8 строки.
 */
export function calculateSha256(input: string): string {
	const encoder = new TextEncoder();
	return sha256Bytes(encoder.encode(input));
}

// ============================================================================
// 2. ТИПЫ И КОНСТАНТЫ ЖУРНАЛА АУДИТА 152-ФЗ / ФСТЭК
// ============================================================================

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

// ============================================================================
// 3. СЛОВАРИ И КЛАССИФИКАЦИЯ СОБЫТИЙ 152-ФЗ
// ============================================================================

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

// ============================================================================
// 4. ДЕТЕРМИНИРОВАННЫЙ РАСЧЕТ БЛОКОВ И ХЭШ-ЦЕПОЧКИ
// ============================================================================

/**
 * Каноническая сериализация полей блока для детерминированного хэширования.
 */
export function serializeAuditBlockForHash(entryWithoutHash: Omit<AuditTrailEntry, 'chainHash'>): string {
	const canonicalPayload = {
		id: entryWithoutHash.id,
		timestamp: entryWithoutHash.timestamp,
		sequenceNumber: entryWithoutHash.sequenceNumber,
		eventType: entryWithoutHash.eventType,
		eventCategory: entryWithoutHash.eventCategory,
		severity: entryWithoutHash.severity,
		status: entryWithoutHash.status,
		actor: {
			userId: entryWithoutHash.actor.userId,
			fullName: entryWithoutHash.actor.fullName,
			role: entryWithoutHash.actor.role,
			ipAddress: entryWithoutHash.actor.ipAddress,
			...(entryWithoutHash.actor.userAgent ? { userAgent: entryWithoutHash.actor.userAgent } : {}),
		},
		entity: {
			entityType: entryWithoutHash.entity.entityType,
			entityId: entryWithoutHash.entity.entityId,
			...(entryWithoutHash.entity.entityName ? { entityName: entryWithoutHash.entity.entityName } : {}),
			...(entryWithoutHash.entity.patientId ? { patientId: entryWithoutHash.entity.patientId } : {}),
		},
		payload: {
			actionDescriptionRu: entryWithoutHash.payload.actionDescriptionRu,
			oldValue: entryWithoutHash.payload.oldValue ?? null,
			newValue: entryWithoutHash.payload.newValue ?? null,
			justificationReason: entryWithoutHash.payload.justificationReason ?? '',
			exportRecordCount: entryWithoutHash.payload.exportRecordCount ?? 0,
		},
		previousHash: entryWithoutHash.previousHash,
	};

	return JSON.stringify(canonicalPayload);
}

/**
 * Вычисляет SHA-256 хэш для записи журнала.
 */
export function calculateEntryHash(entryWithoutHash: Omit<AuditTrailEntry, 'chainHash'>): string {
	const serialized = serializeAuditBlockForHash(entryWithoutHash);
	return calculateSha256(serialized);
}

let entryIdCounter = 1;

/**
 * Создает новую запись аудита и встраивает ее в криптографическую цепочку.
 */
export function createAuditEntry(
	params: CreateAuditEntryParams,
	previousEntry?: AuditTrailEntry | null,
): AuditTrailEntry {
	const timestamp = params.timestamp ?? new Date().toISOString();
	const eventMeta = AUDIT_EVENT_METADATA[params.eventType];
	const eventCategory = params.eventCategory ?? eventMeta.category;
	const severity = params.severity ?? eventMeta.defaultSeverity;
	const status = params.status ?? 'success';

	const sequenceNumber = previousEntry ? previousEntry.sequenceNumber + 1 : 1;
	const previousHash = previousEntry ? previousEntry.chainHash : GENESIS_HASH;
	const id = params.id ?? `audit-${Date.now()}-${sequenceNumber}-${entryIdCounter++}`;

	const rawEntry: Omit<AuditTrailEntry, 'chainHash'> = {
		id,
		timestamp,
		sequenceNumber,
		eventType: params.eventType,
		eventCategory,
		severity,
		status,
		actor: params.actor,
		entity: params.entity,
		payload: params.payload,
		previousHash,
	};

	const chainHash = calculateEntryHash(rawEntry);

	return {
		...rawEntry,
		chainHash,
	};
}

/**
 * Проверяет целостность всей цепочки хэшей журнала аудита.
 * Обнаруживает модификацию, вставку, удаление или изменение порядка записей.
 */
export function verifyAuditChain(entries: readonly AuditTrailEntry[]): AuditChainVerificationResult {
	if (entries.length === 0) {
		return {
			isValid: true,
			verifiedCount: 0,
			latestHash: GENESIS_HASH,
		};
	}

	let expectedPreviousHash = GENESIS_HASH;

	for (let i = 0; i < entries.length; i++) {
		const entry = entries[i]!;

		// Проверка порядкового номера (1-indexed, монотонно возрастает)
		if (entry.sequenceNumber !== i + 1) {
			return {
				isValid: false,
				verifiedCount: i,
				latestHash: expectedPreviousHash,
				brokenAtIndex: i,
				brokenEntryId: entry.id,
				reason: `Нарушена последовательность sequenceNumber: ожидался ${i + 1}, получен ${entry.sequenceNumber}`,
			};
		}

		// Проверка связи с предыдущим хэшем
		if (entry.previousHash !== expectedPreviousHash) {
			return {
				isValid: false,
				verifiedCount: i,
				latestHash: expectedPreviousHash,
				brokenAtIndex: i,
				brokenEntryId: entry.id,
				reason: `Несовпадение previousHash на блоке #${entry.sequenceNumber}. Ожидался: ${expectedPreviousHash}, фактически: ${entry.previousHash}`,
			};
		}

		// Пересчет хэша текущего блока
		const recalculatedHash = calculateEntryHash(entry);
		if (entry.chainHash !== recalculatedHash) {
			return {
				isValid: false,
				verifiedCount: i,
				latestHash: expectedPreviousHash,
				brokenAtIndex: i,
				brokenEntryId: entry.id,
				reason: `Хэш блока #${entry.sequenceNumber} скомпрометирован (фальсификация данных). Записан: ${entry.chainHash}, расчетный: ${recalculatedHash}`,
			};
		}

		expectedPreviousHash = entry.chainHash;
	}

	return {
		isValid: true,
		verifiedCount: entries.length,
		latestHash: expectedPreviousHash,
	};
}

// ============================================================================
// 5. ДЕТЕКТОР АНОМАЛИЙ (152-ФЗ И ТРЕБОВАНИЯ ФСТЭК)
// ============================================================================

export interface AnomalyDetectionOptions {
	readonly nightStartHour?: number | undefined; // По умолчанию 22 (22:00)
	readonly nightEndHour?: number | undefined; // По умолчанию 7 (07:00)
	readonly massExportThreshold?: number | undefined; // По умолчанию 50 записей
	readonly burstRequestThreshold?: number | undefined; // По умолчанию 15 обращений за минуту
	readonly burstWindowSeconds?: number | undefined; // По умолчанию 60 сек
}

/**
 * Анализирует записи аудита на наличие нарушений информационной безопасности и аномалий доступа.
 */
export function detectAuditAnomalies(
	entries: readonly AuditTrailEntry[],
	options: AnomalyDetectionOptions = {},
): readonly AuditAnomalyReport[] {
	const anomalies: AuditAnomalyReport[] = [];
	const nightStart = options.nightStartHour ?? 22;
	const nightEnd = options.nightEndHour ?? 7;
	const massThreshold = options.massExportThreshold ?? 50;
	const burstThreshold = options.burstRequestThreshold ?? 15;
	const burstWindowMs = (options.burstWindowSeconds ?? 60) * 1000;

	// 1. Проверка целостности криптографической цепочки
	const chainVerification = verifyAuditChain(entries);
	if (!chainVerification.isValid && chainVerification.brokenAtIndex !== undefined) {
		const brokenEntry = entries[chainVerification.brokenAtIndex];
		anomalies.push({
			id: `anomaly-tamper-${chainVerification.brokenAtIndex}`,
			code: 'CHAIN_TAMPERING',
			titleRu: 'Критическое нарушение целостности журнала (Tampering)',
			descriptionRu: `Обнаружена модификация или повреждение цепочки на блоке #${chainVerification.brokenAtIndex + 1}. Причина: ${chainVerification.reason}`,
			severity: 'alert',
			detectedAt: new Date().toISOString(),
			relatedEntryIds: brokenEntry ? [brokenEntry.id] : [],
			...(brokenEntry?.actor.userId ? { actorUserId: brokenEntry.actor.userId } : {}),
			...(brokenEntry?.actor.fullName ? { actorFullName: brokenEntry.actor.fullName } : {}),
			recommendationRu: 'Немедленно изолировать рабочую станцию, запустить аудит безопасности и проверить журналы СУБД.',
		});
	}

	// 2. Анализ отдельных событий (Ночной доступ, Массовый экспорт, Ошибки доступа)
	const userAccessTimestamps: Record<string, { time: number; entryId: string }[]> = {};

	for (const entry of entries) {
		const entryDate = new Date(entry.timestamp);
		const localHour = entryDate.getHours();

		// Аномалия 1: Просмотр медкарты или экспорт во внерабочее время (с 22:00 до 07:00)
		const isSensitiveEvent =
			entry.eventType === 'view_patient_card' ||
			entry.eventType === 'export_patients_csv' ||
			entry.eventType === 'unmask_pii' ||
			entry.eventType === 'modify_bill';

		const isNightHours = localHour >= nightStart || localHour < nightEnd;

		if (isSensitiveEvent && isNightHours) {
			const timeFormatted = entryDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
			anomalies.push({
				id: `anomaly-night-${entry.id}`,
				code: 'NIGHT_HOURS_ACCESS',
				titleRu: 'Доступ к ПДн / ЭМК во внерабочее время',
				descriptionRu: `Сотрудник ${entry.actor.fullName} (${entry.actor.role}) совершил действие «${AUDIT_EVENT_METADATA[entry.eventType].labelRu}» в ${timeFormatted} (IP: ${entry.actor.ipAddress}).`,
				severity: 'warning',
				detectedAt: entry.timestamp,
				relatedEntryIds: [entry.id],
				actorUserId: entry.actor.userId,
				actorFullName: entry.actor.fullName,
				recommendationRu: 'Запросить у сотрудника обоснование доступа к ПДн во внерабочее время в соответствии с Регламентом 152-ФЗ.',
			});
		}

		// Аномалия 2: Массовый экспорт базы пациентов (>50 записей)
		if (entry.eventType === 'export_patients_csv') {
			const count = entry.payload.exportRecordCount ?? 0;
			if (count >= massThreshold) {
				anomalies.push({
					id: `anomaly-export-${entry.id}`,
					code: 'MASS_PII_EXPORT',
					titleRu: 'Массовый экспорт персональных данных пациентов',
					descriptionRu: `Выгрузка реестра на ${count} записей пользователем ${entry.actor.fullName} (IP: ${entry.actor.ipAddress}). Превышен порог в ${massThreshold} записей.`,
					severity: 'critical',
					detectedAt: entry.timestamp,
					relatedEntryIds: [entry.id],
					actorUserId: entry.actor.userId,
					actorFullName: entry.actor.fullName,
					recommendationRu: 'Проверить наличие письменного разрешения главного врача на выгрузку и зафиксировать факт передачи в Журнале учета 152-ФЗ.',
				});
			}
		}

		// Аномалия 3: Отказ в доступе (denied)
		if (entry.status === 'denied') {
			anomalies.push({
				id: `anomaly-denied-${entry.id}`,
				code: 'REPEATED_FAILED_ACCESS',
				titleRu: 'Попытка несанкционированного доступа к защищенным данным',
				descriptionRu: `Заблокирована попытка доступа к «${entry.entity.entityType}» (ID: ${entry.entity.entityId}) пользователем ${entry.actor.fullName}. Причина: ${entry.payload.actionDescriptionRu}`,
				severity: 'warning',
				detectedAt: entry.timestamp,
				relatedEntryIds: [entry.id],
				actorUserId: entry.actor.userId,
				actorFullName: entry.actor.fullName,
				recommendationRu: 'Проверить корректность назначенных ролей и исключить попытку несанкционированного сбора данных.',
			});
		}

		// Сбор истории для детектора всплесков (Burst)
		const userKey = entry.actor.userId;
		if (!userAccessTimestamps[userKey]) {
			userAccessTimestamps[userKey] = [];
		}
		userAccessTimestamps[userKey].push({ time: entryDate.getTime(), entryId: entry.id });
	}

	// 3. Анализ всплесков запросов (Burst Scraping / Скрипты)
	for (const [userId, events] of Object.entries(userAccessTimestamps)) {
		if (events.length < burstThreshold) continue;

		events.sort((a, b) => a.time - b.time);

		for (let i = 0; i <= events.length - burstThreshold; i++) {
			const start = events[i]!;
			const end = events[i + burstThreshold - 1]!;
			if (end.time - start.time <= burstWindowMs) {
				const sampleEntry = entries.find((e) => e.id === start.entryId);
				const burstEntryIds = events.slice(i, i + burstThreshold).map((e) => e.entryId);
				anomalies.push({
					id: `anomaly-burst-${userId}-${start.time}`,
					code: 'HIGH_FREQUENCY_BURST',
					titleRu: 'Аномальная частота обращений к картотеке (Burst Access)',
					descriptionRu: `Зафиксировано ${burstThreshold} обращений к картам за ${Math.round((end.time - start.time) / 1000)} сек пользователем ${sampleEntry?.actor.fullName ?? userId}.`,
					severity: 'critical',
					detectedAt: new Date(end.time).toISOString(),
					relatedEntryIds: burstEntryIds,
					actorUserId: userId,
					...(sampleEntry?.actor.fullName ? { actorFullName: sampleEntry.actor.fullName } : {}),
					recommendationRu: 'Проверить станцию на наличие вредоносного ПО или автоматизированных скриптов выкачивания базы.',
				});
				break; // Фиксируем один алерт на пользователя в рамках окна
			}
		}
	}

	return anomalies;
}

// ============================================================================
// 6. ФИЛЬТРАЦИЯ И ПОИСК В ЖУРНАЛЕ
// ============================================================================

export function filterAuditTrail(
	entries: readonly AuditTrailEntry[],
	filters: AuditFilterCriteria,
): readonly AuditTrailEntry[] {
	const anomalies = filters.onlyAnomalies ? detectAuditAnomalies(entries) : [];
	const anomalyEntryIdSet = new Set(anomalies.flatMap((a) => a.relatedEntryIds));

	return entries.filter((entry) => {
		if (filters.onlyAnomalies && !anomalyEntryIdSet.has(entry.id)) {
			return false;
		}

		if (filters.eventType && filters.eventType !== 'all' && entry.eventType !== filters.eventType) {
			return false;
		}

		if (filters.eventCategory && filters.eventCategory !== 'all' && entry.eventCategory !== filters.eventCategory) {
			return false;
		}

		if (filters.severity && filters.severity !== 'all' && entry.severity !== filters.severity) {
			return false;
		}

		if (filters.status && filters.status !== 'all' && entry.status !== filters.status) {
			return false;
		}

		if (filters.actorUserId && entry.actor.userId !== filters.actorUserId) {
			return false;
		}

		if (filters.startDateIso && entry.timestamp < filters.startDateIso) {
			return false;
		}

		if (filters.endDateIso && entry.timestamp > filters.endDateIso) {
			return false;
		}

		if (filters.searchQuery) {
			const q = filters.searchQuery.toLowerCase().trim();
			const matchActor = entry.actor.fullName.toLowerCase().includes(q) || entry.actor.ipAddress.includes(q);
			const matchEntity =
				(entry.entity.entityName?.toLowerCase().includes(q) ?? false) ||
				(entry.entity.patientNameMasked?.toLowerCase().includes(q) ?? false) ||
				entry.entity.entityId.toLowerCase().includes(q);
			const matchDesc = entry.payload.actionDescriptionRu.toLowerCase().includes(q);
			const matchHash = entry.chainHash.toLowerCase().includes(q);

			if (!matchActor && !matchEntity && !matchDesc && !matchHash) {
				return false;
			}
		}

		return true;
	});
}

// ============================================================================
// 7. ЭКСПОРТ ДЛЯ РЕГУЛЯТОРОВ (РОСКОМНАДЗОР, ФСТЭК, 152-ФЗ)
// ============================================================================

export const DEFAULT_CLINIC_COMPLIANCE: ClinicComplianceMetadata = {
	clinicName: 'ООО «ДЕНТЕ КЛИНИК»',
	ogrn: '1227700456789',
	inn: '7704812345',
	operatorRegistrationNumberRoskomnadzor: '77-22-019842',
	responsiblePersonFullName: 'Волкова Елена Сергеевна',
	headDoctorFullName: 'Д-р Барабаш С. В.',
	securityAdminFullName: 'Калашников Д. М.',
};

/**
 * Формирует валидированный JSON-пакет для проверки Роскомнадзором / ФСТЭК.
 */
export function exportAuditTrailToRoskomnadzorJson(
	entries: readonly AuditTrailEntry[],
	clinicInfo: ClinicComplianceMetadata = DEFAULT_CLINIC_COMPLIANCE,
): string {
	const verification = verifyAuditChain(entries);
	const anomalies = detectAuditAnomalies(entries);

	const payload = {
		$schema: 'https://rkn.gov.ru/schemas/152-fz/audit-trail-v1.json',
		complianceStandard: 'Федеральный закон РФ № 152-ФЗ «О персональных данных», Приказ ФСТЭК России № 21',
		operator: {
			name: clinicInfo.clinicName,
			ogrn: clinicInfo.ogrn,
			inn: clinicInfo.inn,
			rknRegistryNumber: clinicInfo.operatorRegistrationNumberRoskomnadzor,
			securityOfficer: clinicInfo.responsiblePersonFullName,
			headDoctor: clinicInfo.headDoctorFullName,
		},
		exportMetadata: {
			generatedAt: new Date().toISOString(),
			totalEventsCount: entries.length,
			cryptographicIntegrityVerified: verification.isValid,
			cryptographicLedgerType: 'SHA-256 Blockchain Chained Digest',
			latestChainHash: verification.latestHash,
			anomaliesDetectedCount: anomalies.length,
		},
		anomaliesSummary: anomalies.map((a) => ({
			code: a.code,
			title: a.titleRu,
			severity: a.severity,
			detectedAt: a.detectedAt,
			description: a.descriptionRu,
			recommendation: a.recommendationRu,
		})),
		events: entries.map((e) => ({
			sequenceNumber: e.sequenceNumber,
			timestamp: e.timestamp,
			eventType: e.eventType,
			eventCategory: e.eventCategory,
			severity: e.severity,
			status: e.status,
			actor: {
				userId: e.actor.userId,
				fullName: e.actor.fullName,
				role: e.actor.role,
				ipAddress: e.actor.ipAddress,
			},
			entity: {
				type: e.entity.entityType,
				id: e.entity.entityId,
				name: e.entity.entityName,
				patientId: e.entity.patientId,
			},
			actionDescription: e.payload.actionDescriptionRu,
			justificationReason: e.payload.justificationReason,
			exportCount: e.payload.exportRecordCount,
			previousHash: e.previousHash,
			chainHash: e.chainHash,
		})),
	};

	return JSON.stringify(payload, null, 2);
}

/**
 * Формирует CSV файл для Excel с UTF-8 BOM для корректного открытия кириллицы.
 */
export function exportAuditTrailToCsv(entries: readonly AuditTrailEntry[]): string {
	const headers = [
		'№',
		'Таймштамп (ISO)',
		'Событие',
		'Категория',
		'Критичность',
		'Статус',
		'Сотрудник (ФИО)',
		'Роль',
		'IP-адрес',
		'Тип сущности',
		'ID сущности',
		'Наименование объекта',
		'Описание действия',
		'Основание / Причина 152-ФЗ',
		'Кол-во записей',
		'Хэш блока (SHA-256)',
		'Хэш пред. блока',
	];

	const escapeCsv = (val: string | number | undefined | null): string => {
		if (val === undefined || val === null) return '""';
		const str = String(val).replace(/"/g, '""');
		return `"${str}"`;
	};

	const rows = entries.map((e) => [
		e.sequenceNumber,
		e.timestamp,
		AUDIT_EVENT_METADATA[e.eventType].labelRu,
		e.eventCategory,
		e.severity,
		e.status,
		e.actor.fullName,
		e.actor.role,
		e.actor.ipAddress,
		e.entity.entityType,
		e.entity.entityId,
		e.entity.entityName ?? '',
		e.payload.actionDescriptionRu,
		e.payload.justificationReason ?? '',
		e.payload.exportRecordCount ?? 0,
		e.chainHash,
		e.previousHash,
	]);

	const csvContent = [
		headers.map(escapeCsv).join(';'),
		...rows.map((row) => row.map(escapeCsv).join(';')),
	].join('\r\n');

	// Добавляем UTF-8 BOM \uFEFF для Excel
	return `\uFEFF${csvContent}`;
}

/**
 * Генерирует официальный текстовый Акт проверки журнала 152-ФЗ.
 */
export function generate152FzAuditActText(
	entries: readonly AuditTrailEntry[],
	clinicInfo: ClinicComplianceMetadata = DEFAULT_CLINIC_COMPLIANCE,
): string {
	const verification = verifyAuditChain(entries);
	const anomalies = detectAuditAnomalies(entries);
	const dateFormatted = new Date().toLocaleDateString('ru-RU', {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
	});

	const firstDate = entries.length > 0 ? entries[0]!.timestamp : '—';
	const lastDate = entries.length > 0 ? entries[entries.length - 1]!.timestamp : '—';

	let report = `================================================================================\n`;
	report += `           АКТ ПРОВЕРКИ ЖУРНАЛА УЧЕТА ОБРАЩЕНИЙ И ДОСТУПА К ПДн           \n`;
	report += `        В СООТВЕТСТВИИ С ТРЕБОВАНИЯМИ 152-ФЗ РФ И ПРИКАЗА ФСТЭК № 21      \n`;
	report += `================================================================================\n\n`;

	report += `Организация-оператор: ${clinicInfo.clinicName}\n`;
	report += `ОГРН: ${clinicInfo.ogrn} | ИНН: ${clinicInfo.inn}\n`;
	report += `Рег. номер в реестре операторов Роскомнадзора: ${clinicInfo.operatorRegistrationNumberRoskomnadzor}\n`;
	report += `Дата составления акта: ${dateFormatted}\n`;
	report += `Проверяемый период: с ${firstDate} по ${lastDate}\n\n`;

	report += `1. РЕЗУЛЬТАТЫ КРИПТОГРАФИЧЕСКОЙ ВЕРИФИКАЦИИ ЖУРНАЛА (SHA-256 LEDGER):\n`;
	report += `--------------------------------------------------------------------------------\n`;
	report += `Всего зарегистрировано событий: ${entries.length} шт.\n`;
	report += `Статус целостности цепочки хэшей: ${verification.isValid ? 'ВЕРИФИЦИРОВАНА (БЕЗ НАРУШЕНИЙ)' : 'НАРУШЕНА (ОБНАРУЖЕНО ВМЕШАТЕЛЬСТВО)'}\n`;
	report += `Итоговый хэш последнего блока: ${verification.latestHash}\n`;
	if (!verification.isValid) {
		report += `ВНИМАНИЕ: ${verification.reason}\n`;
	}
	report += `\n`;

	report += `2. СТАТИСТИКА СОБЫТИЙ ПО КАТЕГОРИЯМ 152-ФЗ:\n`;
	report += `--------------------------------------------------------------------------------\n`;
	const counts: Record<string, number> = {};
	for (const e of entries) {
		counts[e.eventType] = (counts[e.eventType] || 0) + 1;
	}
	for (const [type, count] of Object.entries(counts)) {
		const meta = AUDIT_EVENT_METADATA[type as AuditEventType];
		report += ` • ${meta?.labelRu ?? type}: ${count} операций\n`;
	}
	report += `\n`;

	report += `3. ЗАРЕГИСТРИРОВАННЫЕ АНОМАЛИИ И ИНЦИДЕНТЫ БЕЗОПАСНОСТИ (${anomalies.length} шт.):\n`;
	report += `--------------------------------------------------------------------------------\n`;
	if (anomalies.length === 0) {
		report += `За проверяемый период аномальных инцидентов и утечек ПДн не зафиксировано.\n`;
	} else {
		anomalies.forEach((a, idx) => {
			report += ` [${idx + 1}] [${a.severity.toUpperCase()}] ${a.titleRu}\n`;
			report += `     Время: ${a.detectedAt} | Пользователь: ${a.actorFullName ?? 'Система'}\n`;
			report += `     Описание: ${a.descriptionRu}\n`;
			report += `     Рекомендация: ${a.recommendationRu}\n\n`;
		});
	}

	report += `\n4. ПОДПИСИ ЧЛЕНОВ КОМИССИИ:\n`;
	report += `--------------------------------------------------------------------------------\n`;
	report += `Ответственный за организацию обработки ПДн: _________ / ${clinicInfo.responsiblePersonFullName} /\n\n`;
	report += `Главный врач (начмед):                      _________ / ${clinicInfo.headDoctorFullName} /\n\n`;
	report += `Администратор информационной безопасности:  _________ / ${clinicInfo.securityAdminFullName} /\n\n`;
	report += `================================================================================\n`;

	return report;
}

/**
 * Генерирует печатный HTML-бланк Акта 152-ФЗ для прямой печати или выгрузки в PDF.
 */
export function generate152FzAuditActHtml(
	entries: readonly AuditTrailEntry[],
	clinicInfo: ClinicComplianceMetadata = DEFAULT_CLINIC_COMPLIANCE,
): string {
	const verification = verifyAuditChain(entries);
	const anomalies = detectAuditAnomalies(entries);
	const dateFormatted = new Date().toLocaleDateString('ru-RU', {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
	});

	return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>Акт проверки журнала 152-ФЗ — ${clinicInfo.clinicName}</title>
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; margin: 2rem; font-size: 13px; line-height: 1.5; }
  h1 { font-size: 16px; text-align: center; text-transform: uppercase; margin-bottom: 0.25rem; }
  .subtitle { text-align: center; font-size: 12px; color: #475569; margin-bottom: 1.5rem; }
  .meta-table { width: 100%; border-collapse: collapse; margin-bottom: 1.5rem; }
  .meta-table td { padding: 4px 8px; border: 1px solid #cbd5e1; }
  .section-title { font-weight: bold; margin-top: 1.5rem; margin-bottom: 0.5rem; border-bottom: 2px solid #0f172a; padding-bottom: 2px; }
  .status-badge { display: inline-block; padding: 2px 8px; font-weight: bold; border-radius: 4px; }
  .status-ok { background: #dcfce7; color: #166534; }
  .status-bad { background: #fee2e2; color: #991b1b; }
  .table { width: 100%; border-collapse: collapse; margin-top: 0.5rem; font-size: 12px; }
  .table th, .table td { border: 1px solid #cbd5e1; padding: 6px; text-align: left; }
  .table th { background: #f8fafc; }
  .sign-grid { display: flex; justify-content: space-between; margin-top: 3rem; }
  .sign-box { width: 30%; border-top: 1px solid #000; padding-top: 6px; text-align: center; font-size: 11px; }
</style>
</head>
<body>
  <h1>Акт проверки журнала учета обращений и доступа к ПДн</h1>
  <div class="subtitle">В соответствии с требованиями 152-ФЗ РФ и Приказа ФСТЭК России № 21</div>

  <table class="meta-table">
    <tr><td><strong>Организация-оператор:</strong></td><td>${clinicInfo.clinicName} (ИНН ${clinicInfo.inn}, ОГРН ${clinicInfo.ogrn})</td></tr>
    <tr><td><strong>Рег. номер Роскомнадзора:</strong></td><td>${clinicInfo.operatorRegistrationNumberRoskomnadzor}</td></tr>
    <tr><td><strong>Дата проверки:</strong></td><td>${dateFormatted}</td></tr>
    <tr><td><strong>Всего записей в цепочке:</strong></td><td>${entries.length} событий</td></tr>
    <tr><td><strong>Целостность SHA-256 Ledger:</strong></td><td><span class="status-badge ${verification.isValid ? 'status-ok' : 'status-bad'}">${verification.isValid ? 'ВЕРИФИЦИРОВАНА' : 'НАРУШЕНА'}</span></td></tr>
    <tr><td><strong>Хэш последнего блока:</strong></td><td><code>${verification.latestHash}</code></td></tr>
  </table>

  <div class="section-title">Аномалии и инциденты безопасности (${anomalies.length} шт.)</div>
  ${
		anomalies.length === 0
			? '<p>За проверяемый период аномальных инцидентов и несанкционированного доступа не выявлено.</p>'
			: `<table class="table">
      <thead><tr><th>№</th><th>Код</th><th>Критичность</th><th>Сотрудник</th><th>Описание</th></tr></thead>
      <tbody>
        ${anomalies.map((a, i) => `<tr><td>${i + 1}</td><td>${a.code}</td><td>${a.severity}</td><td>${a.actorFullName ?? 'Система'}</td><td>${a.descriptionRu}</td></tr>`).join('')}
      </tbody>
    </table>`
	}

  <div class="sign-grid">
    <div class="sign-box">Ответственный за ПДн<br><strong>${clinicInfo.responsiblePersonFullName}</strong></div>
    <div class="sign-box">Главный врач<br><strong>${clinicInfo.headDoctorFullName}</strong></div>
    <div class="sign-box">Администратор ИБ<br><strong>${clinicInfo.securityAdminFullName}</strong></div>
  </div>
</body>
</html>`;
}

// ============================================================================
// 8. ДЕМОНСТРАЦИОННЫЙ НАБОР РЕАЛЬНЫХ ДАННЫХ
// ============================================================================

export function getInitialAuditTrailDemoData(): AuditTrailEntry[] {
	const entries: AuditTrailEntry[] = [];

	let prev: AuditTrailEntry | null = null;

	const add = (params: CreateAuditEntryParams): void => {
		const entry = createAuditEntry(params, prev);
		entries.push(entry);
		prev = entry;
	};

	// 1. Авторизация врача
	add({
		timestamp: '2026-08-28T08:30:15.000Z',
		eventType: 'login_attempt',
		actor: {
			userId: 'usr-volkova',
			fullName: 'Волкова Елена Сергеевна',
			role: 'head_doctor',
			ipAddress: '192.168.1.12',
		},
		entity: {
			entityType: 'staff_user',
			entityId: 'usr-volkova',
			entityName: 'Д-р Волкова Е. С. (Начмед)',
		},
		payload: {
			actionDescriptionRu: 'Успешный вход в систему по личному PIN-коду (Кабинет № 1)',
		},
	});

	// 2. Открытие амбулаторной карты 043/у
	add({
		timestamp: '2026-08-28T09:15:00.000Z',
		eventType: 'view_patient_card',
		actor: {
			userId: 'usr-volkova',
			fullName: 'Волкова Елена Сергеевна',
			role: 'head_doctor',
			ipAddress: '192.168.1.12',
		},
		entity: {
			entityType: 'patient_card_043',
			entityId: 'card-4512',
			entityName: 'Амбулаторная карта № 4512/26',
			patientId: 'pat-smirnov',
			patientNameMasked: 'Смирнов А. В.',
		},
		payload: {
			actionDescriptionRu: 'Просмотр дневников приема и зубной формулы по записи на 09:30',
			justificationReason: 'Оказание первичной специализированной медико-санитарной помощи',
		},
	});

	// 3. Подписание согласия ПЭП на планшете
	add({
		timestamp: '2026-08-28T09:20:45.000Z',
		eventType: 'sign_consent_pep',
		actor: {
			userId: 'usr-admin-kalashnikov',
			fullName: 'Калашников Дмитрий Михайлович',
			role: 'senior_admin',
			ipAddress: '192.168.1.5',
		},
		entity: {
			entityType: 'consent_document',
			entityId: 'doc-ids-789',
			entityName: 'Информированное добровольное согласие (ИДС № 789/26)',
			patientId: 'pat-smirnov',
			patientNameMasked: 'Смирнов А. В.',
		},
		payload: {
			actionDescriptionRu: 'Пациент подписал ИДС на терапевтическое лечение на Chairside планшете (SMS OTP #8412)',
			justificationReason: 'ст. 20 Федерального закона № 323-ФЗ',
		},
	});

	// 4. Корректировка счета
	add({
		timestamp: '2026-08-28T10:45:10.000Z',
		eventType: 'modify_bill',
		actor: {
			userId: 'usr-admin-kalashnikov',
			fullName: 'Калашников Дмитрий Михайлович',
			role: 'senior_admin',
			ipAddress: '192.168.1.5',
		},
		entity: {
			entityType: 'invoice_bill',
			entityId: 'inv-8941',
			entityName: 'Счет № 8941 (Пациент Смирнов А. В.)',
			patientId: 'pat-smirnov',
		},
		payload: {
			actionDescriptionRu: 'Применение скидки постоянного клиента 5% на терапевтическое лечение',
			oldValue: { totalKopecks: 650000, discountKopecks: 0 },
			newValue: { totalKopecks: 617500, discountKopecks: 32500 },
			justificationReason: 'Программа лояльности клиники',
		},
	});

	// 5. Отмена визита
	add({
		timestamp: '2026-08-28T11:10:00.000Z',
		eventType: 'delete_appointment',
		actor: {
			userId: 'usr-registrar-petrova',
			fullName: 'Петрова Анна Игоревна',
			role: 'registrar',
			ipAddress: '192.168.1.6',
		},
		entity: {
			entityType: 'appointment',
			entityId: 'app-9912',
			entityName: 'Запись на 14:00 к д-ру Барабашу',
			patientId: 'pat-kuznetsov',
			patientNameMasked: 'Кузнецов И. П.',
		},
		payload: {
			actionDescriptionRu: 'Отмена визита по звонку пациента (перенос на следующую неделю)',
			justificationReason: 'Просьба пациента',
		},
	});

	// 6. Пример ночного доступа (Аномалия 1)
	add({
		timestamp: '2026-08-28T23:45:00.000Z', // 23:45 (Ночной доступ)
		eventType: 'view_patient_card',
		severity: 'warning',
		actor: {
			userId: 'usr-intern-sidorov',
			fullName: 'Сидоров Михаил Юрьевич',
			role: 'assistant',
			ipAddress: '95.165.12.89', // Внешний IP
		},
		entity: {
			entityType: 'patient_card_043',
			entityId: 'card-1024',
			entityName: 'Амбулаторная карта № 1024/25',
			patientId: 'pat-orlova',
			patientNameMasked: 'Орлова Т. В.',
		},
		payload: {
			actionDescriptionRu: 'Просмотр раздела персональных данных карты во внерабочее время',
			justificationReason: 'Удаленный доступ',
		},
	});

	// 7. Пример массового экспорта (Аномалия 2)
	add({
		timestamp: '2026-08-28T14:20:00.000Z',
		eventType: 'export_patients_csv',
		severity: 'critical',
		actor: {
			userId: 'usr-admin-kalashnikov',
			fullName: 'Калашников Дмитрий Михайлович',
			role: 'senior_admin',
			ipAddress: '192.168.1.5',
		},
		entity: {
			entityType: 'patient',
			entityId: 'registry-export-all',
			entityName: 'Реестр базы пациентов клиники',
		},
		payload: {
			actionDescriptionRu: 'Выгрузка контактов пациентов для проведения SMS-оповещения о смене графика',
			exportRecordCount: 145,
			justificationReason: 'Служебная записка № 12 от 28.08.2026',
		},
	});

	return entries;
}
