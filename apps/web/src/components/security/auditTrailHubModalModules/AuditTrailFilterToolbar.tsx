import React from 'react';
import { Search, X, AlertTriangle } from 'lucide-react';
import type { AuditEventType, AuditSeverity, AuditStatus } from './types';
import {
	AUDIT_EVENT_TYPE_OPTIONS,
	AUDIT_SEVERITY_OPTIONS,
	AUDIT_STATUS_OPTIONS,
} from './auditConstants';

export interface AuditTrailFilterToolbarProps {
	readonly searchQuery: string;
	readonly onSearchQueryChange: (query: string) => void;
	readonly selectedEventType: AuditEventType | 'all';
	readonly onEventTypeChange: (type: AuditEventType | 'all') => void;
	readonly selectedSeverity: AuditSeverity | 'all';
	readonly onSeverityChange: (severity: AuditSeverity | 'all') => void;
	readonly selectedStatus: AuditStatus | 'all';
	readonly onStatusChange: (status: AuditStatus | 'all') => void;
	readonly onlyAnomalies: boolean;
	readonly onToggleOnlyAnomalies: () => void;
	readonly anomaliesCount: number;
}

export function AuditTrailFilterToolbar({
	searchQuery,
	onSearchQueryChange,
	selectedEventType,
	onEventTypeChange,
	selectedSeverity,
	onSeverityChange,
	selectedStatus,
	onStatusChange,
	onlyAnomalies,
	onToggleOnlyAnomalies,
	anomaliesCount,
}: AuditTrailFilterToolbarProps): React.JSX.Element {
	return (
		<div className="audit-filter-bar">
			<div className="audit-search-input-box dente-search-wrap">
				<Search size={15} className="audit-search-icon dente-search-icon" />
				<input
					type="text"
					value={searchQuery}
					onChange={(e) => onSearchQueryChange(e.target.value)}
					placeholder="Поиск по ФИО, пациенту, IP или действию..."
					className="audit-search-input dente-search-input"
				/>
				{searchQuery && (
					<button
						type="button"
						onClick={() => onSearchQueryChange('')}
						className="dente-search-clear"
						aria-label="Очистить поиск"
					>
						<X size={14} />
					</button>
				)}
			</div>

			<select
				value={selectedEventType}
				onChange={(e) => onEventTypeChange(e.target.value as AuditEventType | 'all')}
				className="audit-filter-select"
			>
				{AUDIT_EVENT_TYPE_OPTIONS.map((opt) => (
					<option key={opt.value} value={opt.value}>
						{opt.label}
					</option>
				))}
			</select>

			<select
				value={selectedSeverity}
				onChange={(e) => onSeverityChange(e.target.value as AuditSeverity | 'all')}
				className="audit-filter-select"
			>
				{AUDIT_SEVERITY_OPTIONS.map((opt) => (
					<option key={opt.value} value={opt.value}>
						{opt.label}
					</option>
				))}
			</select>

			<select
				value={selectedStatus}
				onChange={(e) => onStatusChange(e.target.value as AuditStatus | 'all')}
				className="audit-filter-select"
			>
				{AUDIT_STATUS_OPTIONS.map((opt) => (
					<option key={opt.value} value={opt.value}>
						{opt.label}
					</option>
				))}
			</select>

			<button
				type="button"
				className={`audit-filter-toggle-btn ${onlyAnomalies ? 'active' : ''}`}
				onClick={onToggleOnlyAnomalies}
			>
				<AlertTriangle size={14} />
				<span>Аномалии ({anomaliesCount})</span>
			</button>
		</div>
	);
}
