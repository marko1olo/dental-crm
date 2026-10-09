/**
 * auditComplianceExporter.ts — Layer 2: Формирование отчетов и выгрузок для регуляторов (Роскомнадзор, ФСТЭК, 152-ФЗ РФ).
 * Поддерживает: JSON-пакет по схеме РКН, CSV с UTF-8 BOM для Excel, текстовый и HTML Акт проверки журнала.
 */

import {
	AUDIT_EVENT_METADATA,
	type AuditTrailEntry,
	type AuditEventType,
	type ClinicComplianceMetadata,
} from './types';
import { verifyAuditChain } from './tamperProofHashChain';
import { detectAuditAnomalies } from './anomalyDetector';

export const DEFAULT_CLINIC_COMPLIANCE: ClinicComplianceMetadata = {
	clinicName: 'ООО «ДЕНТЕ КЛИНИК»',
	ogrn: '1227700456789',
	inn: '7704812345',
	operatorRegistrationNumberRoskomnadzor: '77-22-019842',
	responsiblePersonFullName: 'Ответственное лицо по ПДн',
	headDoctorFullName: 'Главный врач',
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

	report += `\n4. ПОДПИСИ ОТВЕТСТВЕННЫХ ЛИЦ:\n`;
	report += `--------------------------------------------------------------------------------\n`;
	report += `Руководитель клиники / ИП:                  _________ / ${clinicInfo.headDoctorFullName} /\n\n`;
	report += `Ответственный за организацию обработки ПДн: _________ / ${clinicInfo.responsiblePersonFullName} /\n\n`;
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
    <div class="sign-box">Руководитель клиники / ИП<br><strong>${clinicInfo.headDoctorFullName}</strong></div>
    <div class="sign-box">Ответственный за ПДн<br><strong>${clinicInfo.responsiblePersonFullName}</strong></div>
    <div class="sign-box">Администратор ИБ<br><strong>${clinicInfo.securityAdminFullName}</strong></div>
  </div>
</body>
</html>`;
}
