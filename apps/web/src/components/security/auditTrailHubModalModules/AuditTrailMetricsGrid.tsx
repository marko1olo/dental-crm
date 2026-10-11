import React from 'react';
import { FileText, Eye, FileSpreadsheet, Lock, AlertOctagon } from 'lucide-react';
import type { AuditMetrics } from './types';

export interface AuditTrailMetricsGridProps {
	readonly metrics: AuditMetrics;
}

export function AuditTrailMetricsGrid({ metrics }: AuditTrailMetricsGridProps): React.JSX.Element {
	return (
		<div className="audit-metrics-grid">
			<div className="audit-metric-card">
				<div className="audit-metric-icon-box">
					<FileText size={20} />
				</div>
				<div>
					<div className="audit-metric-label">Всего записей</div>
					<div className="audit-metric-val">{metrics.total}</div>
				</div>
			</div>

			<div className="audit-metric-card">
				<div className="audit-metric-icon-box" style={{ color: 'var(--teal, #0284c7)' }}>
					<Eye size={20} />
				</div>
				<div>
					<div className="audit-metric-label">Просмотров 043/у</div>
					<div className="audit-metric-val">{metrics.viewCards}</div>
				</div>
			</div>

			<div className="audit-metric-card">
				<div className="audit-metric-icon-box" style={{ color: 'var(--ok-fg, #059669)' }}>
					<FileSpreadsheet size={20} />
				</div>
				<div>
					<div className="audit-metric-label">Операций со счетами</div>
					<div className="audit-metric-val">{metrics.bills}</div>
				</div>
			</div>

			<div className="audit-metric-card">
				<div className="audit-metric-icon-box" style={{ color: 'var(--info-fg, #7c3aed)' }}>
					<Lock size={20} />
				</div>
				<div>
					<div className="audit-metric-label">Согласий ПЭП/УКЭП</div>
					<div className="audit-metric-val">{metrics.consents}</div>
				</div>
			</div>

			<div
				className="audit-metric-card"
				style={{
					borderColor: metrics.anomaliesCount > 0 ? 'var(--warn-fg, #f59e0b)' : undefined,
				}}
			>
				<div
					className="audit-metric-icon-box"
					style={{
						color: metrics.anomaliesCount > 0 ? 'var(--bad-fg, #ef4444)' : 'var(--ok-fg)',
					}}
				>
					<AlertOctagon size={20} />
				</div>
				<div>
					<div className="audit-metric-label">Алертов безопасности</div>
					<div
						className="audit-metric-val"
						style={{
							color: metrics.anomaliesCount > 0 ? 'var(--bad-fg, #ef4444)' : undefined,
						}}
					>
						{metrics.anomaliesCount}
					</div>
				</div>
			</div>
		</div>
	);
}
