import React from 'react';
import type { AuditTrailEntry } from './types';

export interface AuditTrailDetailDrawerProps {
	readonly entry: AuditTrailEntry;
	readonly onClose: () => void;
}

export function AuditTrailDetailDrawer({
	entry,
	onClose,
}: AuditTrailDetailDrawerProps): React.JSX.Element {
	return (
		<div className="audit-detail-drawer">
			<div className="audit-detail-header">
				<span>
					Детали события #{entry.sequenceNumber} ({entry.id})
				</span>
				<button
					type="button"
					className="audit-btn"
					style={{ minHeight: '28px', padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
					onClick={onClose}
				>
					Свернуть
				</button>
			</div>

			<div className="audit-detail-grid">
				<div className="audit-detail-field">
					<span className="audit-detail-label">Полный хэш блока (chainHash):</span>
					<div className="audit-hash-block">{entry.chainHash}</div>
				</div>
				<div className="audit-detail-field">
					<span className="audit-detail-label">Хэш пред. блока (previousHash):</span>
					<div className="audit-hash-block">{entry.previousHash}</div>
				</div>
				<div className="audit-detail-field">
					<span className="audit-detail-label">Основание 152-ФЗ / Причина:</span>
					<div className="audit-detail-val">
						{entry.payload.justificationReason || 'Штатное исполнение служебных обязанностей'}
					</div>
				</div>
				{entry.payload.oldValue !== undefined && entry.payload.oldValue !== null && (
					<div className="audit-detail-field">
						<span className="audit-detail-label">Старое значение:</span>
						<div className="audit-hash-block">{JSON.stringify(entry.payload.oldValue)}</div>
					</div>
				)}
				{entry.payload.newValue !== undefined && entry.payload.newValue !== null && (
					<div className="audit-detail-field">
						<span className="audit-detail-label">Новое значение:</span>
						<div className="audit-hash-block">{JSON.stringify(entry.payload.newValue)}</div>
					</div>
				)}
			</div>
		</div>
	);
}
