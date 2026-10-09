/**
 * tamperProofHashChain.ts — Layer 1: Криптографический движок SHA-256 (FIPS 180-4) и блокчейн-цепочка аудита.
 * Обеспечивает неизменяемость записей (Immutable Ledger), детерминированное хэширование и верификацию целостности.
 */

import {
	GENESIS_HASH,
	AUDIT_EVENT_METADATA,
	type AuditTrailEntry,
	type CreateAuditEntryParams,
	type AuditChainVerificationResult,
} from './types';

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
// 2. ДЕТЕРМИНИРОВАННЫЙ РАСЧЕТ БЛОКОВ И ХЭШ-ЦЕПОЧКИ
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
// 3. ДЕМОНСТРАЦИОННЫЙ НАБОР РЕАЛЬНЫХ ДАННЫХ
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
			userId: 'usr-doctor-cmo',
			fullName: 'Главный врач / Руководитель',
			role: 'head_doctor',
			ipAddress: '192.168.1.12',
		},
		entity: {
			entityType: 'staff_user',
			entityId: 'usr-doctor-cmo',
			entityName: 'Главный врач / Руководитель',
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
			userId: 'usr-doctor-cmo',
			fullName: 'Главный врач / Руководитель',
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
			entityName: 'Запись на 14:00 к врачу',
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
