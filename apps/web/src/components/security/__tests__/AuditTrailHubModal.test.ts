import { describe, it, expect } from 'vitest';
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
		expect(typeof AuditTrailHubModal).toBe('function');
	});

	it('maps raw audit events accurately to 152-FZ parameters', () => {
		const rawCardEvent = {
			action: 'view_emr_card',
			actorName: 'Др. Иванов',
			userId: 'doc-1',
			createdAt: '2026-10-11T10:00:00.000Z',
		};
		const mapped = mapRawToAuditEntryParams(rawCardEvent);
		expect(mapped.eventType).toBe('view_patient_card');
		expect(mapped.eventCategory).toBe('patient_pii');
		expect(mapped.actor.fullName).toBe('Др. Иванов');
		expect(mapped.actor.userId).toBe('doc-1');
	});

	it('maps refund events to critical financial severity', () => {
		const rawRefund = {
			action: 'refund_cash',
			actorName: 'Кассир',
			createdAt: '2026-10-11T11:00:00.000Z',
		};
		const mapped = mapRawToAuditEntryParams(rawRefund);
		expect(mapped.eventType).toBe('delete_bill');
		expect(mapped.eventCategory).toBe('financial');
		expect(mapped.severity).toBe('critical');
	});

	it('formats timestamps and truncates cryptographic hashes cleanly', () => {
		const hash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
		const truncated = truncateHash(hash, 8, 4);
		expect(truncated).toBe('e3b0c442...b855');

		const formattedTime = formatAuditTimeShort('2026-10-11T12:30:00.000Z');
		expect(typeof formattedTime).toBe('string');
		expect(formattedTime.length).toBeGreaterThan(0);
	});

	it('provides comprehensive filter options for 152-FZ compliance', () => {
		expect(AUDIT_EVENT_TYPE_OPTIONS.length).toBeGreaterThanOrEqual(10);
		expect(AUDIT_SEVERITY_OPTIONS.length).toBeGreaterThanOrEqual(5);
		expect(AUDIT_STATUS_OPTIONS.length).toBeGreaterThanOrEqual(4);
	});
});
