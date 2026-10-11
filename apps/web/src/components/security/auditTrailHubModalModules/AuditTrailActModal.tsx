import React from 'react';
import { createPortal } from 'react-dom';
import { FileText, X, Printer } from 'lucide-react';
import type { AuditTrailEntry, ClinicComplianceMetadata } from './types';
import { generate152FzAuditActText, DEFAULT_CLINIC_COMPLIANCE } from '../auditTrailEngine';

export interface AuditTrailActModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly entries: readonly AuditTrailEntry[];
	readonly clinicInfo?: ClinicComplianceMetadata | undefined;
	readonly onPrintAct: () => void;
}

export function AuditTrailActModal({
	isOpen,
	onClose,
	entries,
	clinicInfo = DEFAULT_CLINIC_COMPLIANCE,
	onPrintAct,
}: AuditTrailActModalProps): React.JSX.Element | null {
	if (!isOpen) return null;

	const modalContent = (
		<div
			className="audit-modal-overlay"
			style={{ zIndex: 10000 }}
			onClick={onClose}
		>
			<div
				className="audit-modal-container"
				style={{ maxWidth: '850px' }}
				onClick={(e) => e.stopPropagation()}
			>
				<div className="audit-modal-header">
					<div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
						<FileText size={18} />
						<span>Акт проверки журнала 152-ФЗ / ФСТЭК</span>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="audit-btn-close"
					>
						<X size={18} />
					</button>
				</div>

				<div className="audit-modal-body">
					<div className="audit-act-preview-container">
						{generate152FzAuditActText(entries, clinicInfo)}
					</div>
				</div>

				<div className="audit-modal-footer">
					<button
						type="button"
						className="audit-btn"
						onClick={onClose}
					>
						Закрыть
					</button>

					<button
						type="button"
						className="audit-btn audit-btn-primary"
						onClick={onPrintAct}
					>
						<Printer size={16} />
						<span>Печать / Экспорт в PDF</span>
					</button>
				</div>
			</div>
		</div>
	);

	if (typeof document !== 'undefined') {
		return createPortal(modalContent, document.body);
	}
	return modalContent;
}
