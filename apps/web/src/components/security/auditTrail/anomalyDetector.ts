/**
 * anomalyDetector.ts — Layer 2: Детектор аномалий и нарушений безопасности 152-ФЗ и требований ФСТЭК.
 * Выявляет: ночной доступ к ПДн (22:00-07:00), массовый экспорт (>50 записей), burst-обращения и нарушения цепочки хэшей.
 */

import {
	AUDIT_EVENT_METADATA,
	type AuditTrailEntry,
	type AuditAnomalyReport,
	type AnomalyDetectionOptions,
} from './types';
import { verifyAuditChain } from './tamperProofHashChain';

export type { AnomalyDetectionOptions };

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
