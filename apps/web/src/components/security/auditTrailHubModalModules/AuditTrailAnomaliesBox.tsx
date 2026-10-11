import React from 'react';
import { AlertTriangle } from 'lucide-react';
import type { AuditAnomalyAlert } from './types';
import { formatAuditTimeShort } from './auditUtils';

export interface AuditTrailAnomaliesBoxProps {
	readonly anomalies: readonly AuditAnomalyAlert[];
	readonly onlyAnomalies: boolean;
	readonly onToggleOnlyAnomalies: () => void;
}

export function AuditTrailAnomaliesBox({
	anomalies,
	onlyAnomalies,
	onToggleOnlyAnomalies,
}: AuditTrailAnomaliesBoxProps): React.JSX.Element | null {
	if (anomalies.length === 0) return null;

	return (
		<div className="audit-anomalies-box">
			<div className="audit-anomalies-header">
				<div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
					<AlertTriangle size={16} />
					<span>Обнаружено аномальных событий доступа ({anomalies.length}):</span>
				</div>
				<button
					type="button"
					className={`audit-filter-toggle-btn ${onlyAnomalies ? 'active' : ''}`}
					onClick={onToggleOnlyAnomalies}
					style={{ minHeight: '28px', padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
				>
					{onlyAnomalies ? 'Показать все записи' : 'Фильтровать только аномалии'}
				</button>
			</div>

			<div
				className="audit-anomalies-list"
				style={{ maxHeight: '140px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
			>
				{anomalies.map((anomaly) => (
					<div key={anomaly.id} className={`audit-anomaly-item ${anomaly.severity}`}>
						<div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
							<span>{anomaly.titleRu}</span>
							<span style={{ color: 'var(--muted, #64748b)' }}>
								{formatAuditTimeShort(anomaly.detectedAt)}
							</span>
						</div>
						<div>{anomaly.descriptionRu}</div>
						<div style={{ fontSize: '0.6875rem', color: 'var(--muted, #64748b)' }}>
							<strong>Рекомендация:</strong> {anomaly.recommendationRu}
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
