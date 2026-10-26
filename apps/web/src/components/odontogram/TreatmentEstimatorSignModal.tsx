import React from "react";
import { createPortal } from "react-dom";
import { PenTool, Printer, ShieldCheck, X } from "lucide-react";

export interface TreatmentEstimatorSignModalProps {
	isOpen: boolean;
	onClose: () => void;
	onConfirmPaper: () => void;
	onPrint: () => void;
}

export const TreatmentEstimatorSignModal: React.FC<TreatmentEstimatorSignModalProps> = ({
	isOpen,
	onClose,
	onConfirmPaper,
	onPrint,
}) => {
	if (!isOpen) return null;

	const modalContent = (
		<div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="estimator-sign-title">
			<div
				className="modal-content"
				style={{ maxWidth: "600px" }}
				onClick={(e) => e.stopPropagation()}
			>
				<div className="modal-drag-handle" title="Потяните вниз для закрытия" />
				<div className="modal-header">
					<div className="modal-header-title-wrap">
						<PenTool size={18} className="text-teal-600" aria-hidden="true" />
						<h3 id="estimator-sign-title" className="modal-title">Подписание плана лечения</h3>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="modal-close-btn"
						aria-label="Закрыть"
					>
						<X size={18} aria-hidden="true" />
					</button>
				</div>
				<div className="modal-body text-center">
					<div className="p-4 bg-[var(--paper-soft,#f8fafc)] rounded-xl border border-[var(--line,#e2e8f0)] space-y-2">
						<p className="text-sm font-medium text-[var(--ink,#0f172a)]">
							Смета согласована с пациентом и соответствует правилам оказания платных медицинских услуг.
						</p>
						<p className="text-xs text-[var(--muted,#64748b)]">
							Выберите подтверждение на распечатанном бланке или отправку на печать.
						</p>
					</div>
				</div>
				<div className="modal-footer">
					<button
						type="button"
						onClick={onPrint}
						className="modal-btn-secondary"
						data-testid="estimator-modal-print-btn"
					>
						<Printer size={16} aria-hidden="true" />
						<span>Печать сметы (А4)</span>
					</button>
					<button
						type="button"
						onClick={onConfirmPaper}
						className="modal-btn-primary"
						data-testid="estimator-modal-paper-confirm-btn"
					>
						<ShieldCheck size={16} aria-hidden="true" />
						<span>Подтвердить на бумажном носителе</span>
					</button>
				</div>
			</div>
		</div>
	);

	return typeof document !== "undefined" ? createPortal(modalContent, document.body) : modalContent;
};
