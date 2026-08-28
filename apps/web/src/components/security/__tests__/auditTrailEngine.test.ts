import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
	calculateSha256,
	GENESIS_HASH,
	createAuditEntry,
	verifyAuditChain,
	detectAuditAnomalies,
	filterAuditTrail,
	exportAuditTrailToRoskomnadzorJson,
	exportAuditTrailToCsv,
	generate152FzAuditActText,
	generate152FzAuditActHtml,
	getInitialAuditTrailDemoData,
	AuditTrailEntry,
} from '../auditTrailEngine';

describe('auditTrailEngine — 1. Cryptographic SHA-256 Hashing', () => {
	it('matches standard NIST SHA-256 test vectors for empty string and ASCII', () => {
		// NIST empty string
		assert.equal(
			calculateSha256(''),
			'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
		);
		// NIST "abc"
		assert.equal(
			calculateSha256('abc'),
			'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
		);
		// NIST "message digest"
		assert.equal(
			calculateSha256('message digest'),
			'f7846f55cf23e14eebeab5b4e1550cad5b509e3348fbc4efa3a1413d393cb650',
		);
	});

	it('computes exact deterministic SHA-256 for Russian Cyrillic strings', () => {
		const text = 'Медицинская карта 043/у пациента Барабаша С.В.';
		const hash1 = calculateSha256(text);
		const hash2 = calculateSha256(text);
		assert.equal(hash1, hash2);
		assert.equal(hash1.length, 64);
		assert.match(hash1, /^[0-9a-f]{64}$/);
	});
});

describe('auditTrailEngine — 2. Immutable Ledger & Blockchain Chaining', () => {
	it('creates genesis block with sequence 1 and GENESIS_HASH', () => {
		const entry = createAuditEntry({
			eventType: 'view_patient_card',
			actor: {
				userId: 'usr-1',
				fullName: 'Волкова Е. С.',
				role: 'head_doctor',
				ipAddress: '192.168.1.10',
			},
			entity: {
				entityType: 'patient_card_043',
				entityId: 'card-100',
			},
			payload: {
				actionDescriptionRu: 'Просмотр карты 043/у',
			},
		});

		assert.equal(entry.sequenceNumber, 1);
		assert.equal(entry.previousHash, GENESIS_HASH);
		assert.equal(entry.chainHash.length, 64);
		assert.equal(entry.status, 'success');
	});

	it('links subsequent blocks to previous chainHash in sequence', () => {
		const block1 = createAuditEntry({
			eventType: 'login_attempt',
			actor: { userId: 'usr-1', fullName: 'Волкова Е. С.', role: 'head_doctor', ipAddress: '192.168.1.10' },
			entity: { entityType: 'staff_user', entityId: 'usr-1' },
			payload: { actionDescriptionRu: 'Вход в систему' },
		});

		const block2 = createAuditEntry(
			{
				eventType: 'view_patient_card',
				actor: { userId: 'usr-1', fullName: 'Волкова Е. С.', role: 'head_doctor', ipAddress: '192.168.1.10' },
				entity: { entityType: 'patient_card_043', entityId: 'card-100' },
				payload: { actionDescriptionRu: 'Открытие карты' },
			},
			block1,
		);

		const block3 = createAuditEntry(
			{
				eventType: 'modify_bill',
				actor: { userId: 'usr-2', fullName: 'Калашников Д. М.', role: 'senior_admin', ipAddress: '192.168.1.5' },
				entity: { entityType: 'invoice_bill', entityId: 'inv-500' },
				payload: { actionDescriptionRu: 'Скидка 5%' },
			},
			block2,
		);

		assert.equal(block2.sequenceNumber, 2);
		assert.equal(block2.previousHash, block1.chainHash);
		assert.equal(block3.sequenceNumber, 3);
		assert.equal(block3.previousHash, block2.chainHash);

		const chain = [block1, block2, block3];
		const verification = verifyAuditChain(chain);
		assert.equal(verification.isValid, true);
		assert.equal(verification.verifiedCount, 3);
		assert.equal(verification.latestHash, block3.chainHash);
	});
});

describe('auditTrailEngine — 3. Cryptographic Chain Integrity Verification', () => {
	it('detects tampering with action description in middle block', () => {
		const chain = getInitialAuditTrailDemoData();
		assert.equal(verifyAuditChain(chain).isValid, true);

		// Фальсифицируем запись #2
		const tamperedChain: AuditTrailEntry[] = chain.map((entry, idx) => {
			if (idx === 1) {
				return {
					...entry,
					payload: {
						...entry.payload,
						actionDescriptionRu: 'Фальсифицированное действие (Tampered)',
					},
				};
			}
			return entry;
		});

		const result = verifyAuditChain(tamperedChain);
		assert.equal(result.isValid, false);
		assert.equal(result.brokenAtIndex, 1);
		assert.match(result.reason ?? '', /скомпрометирован/);
	});

	it('detects broken previousHash link when block is replaced', () => {
		const chain = getInitialAuditTrailDemoData();

		const tamperedChain: AuditTrailEntry[] = chain.map((entry, idx) => {
			if (idx === 3) {
				return {
					...entry,
					previousHash: '1111111111111111111111111111111111111111111111111111111111111111',
				};
			}
			return entry;
		});

		const result = verifyAuditChain(tamperedChain);
		assert.equal(result.isValid, false);
		assert.equal(result.brokenAtIndex, 3);
		assert.match(result.reason ?? '', /Несовпадение previousHash/);
	});

	it('detects missing/omitted block in the sequence', () => {
		const chain = getInitialAuditTrailDemoData();
		// Удаляем 2-й блок
		const brokenChain = [chain[0]!, chain[2]!, chain[3]!];

		const result = verifyAuditChain(brokenChain);
		assert.equal(result.isValid, false);
		assert.equal(result.brokenAtIndex, 1);
		assert.match(result.reason ?? '', /sequenceNumber/);
	});
});

describe('auditTrailEngine — 4. 152-FZ Anomaly Detection', () => {
	it('detects off-hours access to patient card (between 22:00 and 07:00)', () => {
		const nightEntry = createAuditEntry({
			timestamp: '2026-08-28T23:30:00.000Z', // 23:30 (ночь)
			eventType: 'view_patient_card',
			actor: { userId: 'usr-intern', fullName: 'Сидоров М. Ю.', role: 'assistant', ipAddress: '95.165.1.1' },
			entity: { entityType: 'patient_card_043', entityId: 'card-99' },
			payload: { actionDescriptionRu: 'Ночной просмотр карты' },
		});

		const anomalies = detectAuditAnomalies([nightEntry]);
		assert.equal(anomalies.length, 1);
		assert.equal(anomalies[0]?.code, 'NIGHT_HOURS_ACCESS');
		assert.equal(anomalies[0]?.severity, 'warning');
		assert.match(anomalies[0]?.titleRu ?? '', /внерабочее время/);
	});

	it('detects mass patient export with >= 50 records', () => {
		const massExportEntry = createAuditEntry({
			timestamp: '2026-08-28T14:00:00.000Z',
			eventType: 'export_patients_csv',
			actor: { userId: 'usr-admin', fullName: 'Калашников Д. М.', role: 'senior_admin', ipAddress: '192.168.1.5' },
			entity: { entityType: 'patient', entityId: 'reg-all' },
			payload: { actionDescriptionRu: 'Экспорт всей базы', exportRecordCount: 150 },
		});

		const anomalies = detectAuditAnomalies([massExportEntry]);
		assert.equal(anomalies.length, 1);
		assert.equal(anomalies[0]?.code, 'MASS_PII_EXPORT');
		assert.equal(anomalies[0]?.severity, 'critical');
		assert.match(anomalies[0]?.titleRu ?? '', /Массовый экспорт/);
	});

	it('does not flag normal daytime single patient card access', () => {
		const dayEntry = createAuditEntry({
			timestamp: '2026-08-28T14:30:00.000Z', // 14:30
			eventType: 'view_patient_card',
			actor: { userId: 'usr-doc', fullName: 'Волкова Е. С.', role: 'doctor', ipAddress: '192.168.1.12' },
			entity: { entityType: 'patient_card_043', entityId: 'card-1' },
			payload: { actionDescriptionRu: 'Прием пациента' },
		});

		const anomalies = detectAuditAnomalies([dayEntry]);
		assert.equal(anomalies.length, 0);
	});

	it('detects burst access of > 15 requests in 60 seconds', () => {
		const baseTime = Date.now();
		const burstEntries: AuditTrailEntry[] = [];
		let prev: AuditTrailEntry | null = null;

		for (let i = 0; i < 18; i++) {
			const entry = createAuditEntry(
				{
					timestamp: new Date(baseTime + i * 1000).toISOString(),
					eventType: 'view_patient_card',
					actor: { userId: 'usr-scripter', fullName: 'Тестовый Пользователь', role: 'registrar', ipAddress: '192.168.1.20' },
					entity: { entityType: 'patient_card_043', entityId: `card-${i}` },
					payload: { actionDescriptionRu: `Запрос #${i}` },
				},
				prev,
			);
			burstEntries.push(entry);
			prev = entry;
		}

		const anomalies = detectAuditAnomalies(burstEntries);
		assert.ok(anomalies.some((a) => a.code === 'HIGH_FREQUENCY_BURST'));
	});
});

describe('auditTrailEngine — 5. Filtering and Search', () => {
	it('filters entries by event type and search query', () => {
		const chain = getInitialAuditTrailDemoData();

		const viewOnly = filterAuditTrail(chain, { eventType: 'view_patient_card' });
		assert.ok(viewOnly.length > 0);
		assert.ok(viewOnly.every((e) => e.eventType === 'view_patient_card'));

		const searchVolkova = filterAuditTrail(chain, { searchQuery: 'Волкова' });
		assert.ok(searchVolkova.length > 0);
		assert.ok(searchVolkova.every((e) => e.actor.fullName.includes('Волкова')));
	});
});

describe('auditTrailEngine — 6. Regulatory Exports (Roskomnadzor, FSTEC, 152-FZ)', () => {
	it('generates valid JSON compliance report for Roskomnadzor', () => {
		const chain = getInitialAuditTrailDemoData();
		const jsonStr = exportAuditTrailToRoskomnadzorJson(chain);
		const parsed = JSON.parse(jsonStr);

		assert.equal(parsed.complianceStandard.includes('152-ФЗ'), true);
		assert.equal(parsed.exportMetadata.cryptographicIntegrityVerified, true);
		assert.equal(parsed.events.length, chain.length);
		assert.equal(parsed.operator.rknRegistryNumber, '77-22-019842');
	});

	it('generates valid CSV with UTF-8 BOM and correct headers', () => {
		const chain = getInitialAuditTrailDemoData();
		const csv = exportAuditTrailToCsv(chain);

		assert.ok(csv.startsWith('﻿'));
		assert.match(csv, /"№";"Таймштамп \(ISO\)";"Событие"/);
		assert.match(csv, /Волкова Елена Сергеевна/);
	});

	it('generates formal 152-FZ Audit Act text and HTML', () => {
		const chain = getInitialAuditTrailDemoData();
		const actText = generate152FzAuditActText(chain);

		assert.match(actText, /АКТ ПРОВЕРКИ ЖУРНАЛА УЧЕТА ОБРАЩЕНИЙ/);
		assert.match(actText, /152-ФЗ РФ/);
		assert.match(actText, /РЕЗУЛЬТАТЫ КРИПТОГРАФИЧЕСКОЙ ВЕРИФИКАЦИИ/);
		assert.match(actText, /ВЕРИФИЦИРОВАНА/);

		const actHtml = generate152FzAuditActHtml(chain);
		assert.match(actHtml, /<!DOCTYPE html>/);
		assert.match(actHtml, /ВЕРИФИЦИРОВАНА/);
	});
});
