/**
 * auditLogQueryFilter.ts — Layer 2: Фильтрация и многокритериальный поиск в журнале аудита.
 * Поддерживает фильтрацию по типам событий, категориям, критичности, сотрудникам, временным диапазонам и текстовый поиск.
 */

import type { AuditTrailEntry, AuditFilterCriteria } from './types';
import { detectAuditAnomalies } from './anomalyDetector';

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
