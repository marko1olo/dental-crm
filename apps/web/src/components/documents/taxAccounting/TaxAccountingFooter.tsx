import React from "react";
import { CheckCircle2, Zap } from "lucide-react";

export interface TaxAccountingFooterProps {
	missingCount: number;
	onBatchCreate: () => void;
	onClose: () => void;
}

export const TaxAccountingFooter: React.FC<TaxAccountingFooterProps> = ({
	missingCount,
	onBatchCreate,
	onClose,
}) => {
	return (
		<div className="document-package-modal-footer">
			<div>
				{missingCount > 0 ? (
					<button
						type="button"
						className="primary-button"
						onClick={onBatchCreate}
					>
						<Zap size={16} aria-hidden="true" />
						Сформировать недостающие ({missingCount})
					</button>
				) : (
					<span className="inline-flex items-center gap-1.5" style={{ fontSize: "13px", color: "var(--success-fg, #10b981)", fontWeight: 600 }}>
						<CheckCircle2 size={16} aria-hidden="true" />
						Все документы налогового пакета сформированы
					</span>
				)}
			</div>
			<button
				type="button"
				className="secondary-button"
				onClick={onClose}
			>
				Закрыть
			</button>
		</div>
	);
};
