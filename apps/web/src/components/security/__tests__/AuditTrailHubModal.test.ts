import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { AuditTrailHubModal } from '../AuditTrailHubModal';
import {
	mapRawToAuditEntryParams,
	formatAuditDateTime,
	formatAuditTimeShort,
	truncateHash,
} from '../auditTrailHubModalModules/auditUtils';
import {
	AUDIT_EVENT_TYPE_OPTIONS,
	AUDIT_SEVERITY_OPTIONS,
	AUDIT_STATUS_OPTIONS,
} from '../auditTrailHubModalModules/auditConstants';

describe('AuditTrailHubModal Decomposed Module Parity', () => {
	it('exports AuditTrailHubModal as a valid functional component', () => {
		assert.strictEqual(typeof AuditTrailHubModal, 'function');
	});

	it('maps raw audit events accurately to 152-FZ parameters', () => {
		const rawCardEvent = {
			action: 'view_emr_card',
			actorName: 'Др. Иванов',
			userId: 'doc-1',
			createdAt: '2026-10-11T10:00:00.000Z',
		};
		const mapped = mapRawToAuditEntryParams(rawCardEvent);
		assert.strictEqual(mapped.eventType, 'view_patient_card');
		assert.strictEqual(mapped.eventCategory, 'patient_pii');
		assert.strictEqual(mapped.actor.fullName, 'Др. Иванов');
		assert.strictEqual(mapped.actor.userId, 'doc-1');
	});

	it('maps refund events to critical financial severity', () => {
		const rawRefund = {
			action: 'refund_cash',
			actorName: 'Кассир',
			createdAt: '2026-10-11T11:00:00.000Z',
		};
		const mapped = mapRawToAuditEntryParams(rawRefund);
		assert.strictEqual(mapped.eventType, 'delete_bill');
		assert.strictEqual(mapped.eventCategory, 'financial');
		assert.strictEqual(mapped.severity, 'critical');
	});

	it('formats timestamps and truncates cryptographic hashes cleanly', () => {
		const hash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
		const truncated = truncateHash(hash, 8, 4);
		assert.strictEqual(truncated, 'e3b0c442...b855');

		const formattedTime = formatAuditTimeShort('2026-10-11T12:30:00.000Z');
		assert.strictEqual(typeof formattedTime, 'string');
		assert.ok(formattedTime.length > 0);
	});

	it('provides comprehensive filter options for 152-FZ compliance', () => {
		assert.ok(AUDIT_EVENT_TYPE_OPTIONS.length >= 10);
		assert.ok(AUDIT_SEVERITY_OPTIONS.length >= 5);
		assert.ok(AUDIT_STATUS_OPTIONS.length >= 4);
	});
});
