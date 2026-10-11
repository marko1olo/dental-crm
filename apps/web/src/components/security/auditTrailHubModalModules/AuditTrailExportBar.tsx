import React from 'react';
import { Download, Lock, FileText, CheckCircle2 } from 'lucide-react';

export interface AuditTrailExportBarProps {
	readonly onExportCsv: () => void;
	readonly onExportJson: () => void;
	readonly onOpenActModal: () => void;
	readonly onClose: () => void;
	readonly toastMsg: string | null;
}

export function AuditTrailExportBar({
	onExportCsv,
	onExportJson,
	onOpenActModal,
	onClose,
	toastMsg,
}: AuditTrailExportBarProps): React.JSX.Element {
	return (
		<div className="audit-modal-footer">
			<div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
				<button
					type="button"
					className="audit-btn"
					onClick={onExportCsv}
				>
					<Download size={14} />
					<span>Excel / CSV</span>
				</button>

				<button
					type="button"
					className="audit-btn"
					onClick={onExportJson}
				>
					<Lock size={14} />
					<span>JSON (Роскомнадзор / ФСТЭК)</span>
				</button>

				<button
					type="button"
					className="audit-btn"
					onClick={onOpenActModal}
				>
					<FileText size={14} />
					<span>Акт проверки 152-ФЗ</span>
				</button>
			</div>

			<div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
				{toastMsg && (
					<span style={{ fontSize: '0.75rem', color: 'var(--ok-fg)', fontWeight: 600 }}>
						{toastMsg}
					</span>
				)}

				<button
					type="button"
					className="audit-btn audit-btn-primary"
					onClick={onClose}
				>
					<CheckCircle2 size={16} />
					<span>Готово</span>
				</button>
			</div>
		</div>
	);
}
