import React from "react";
import { Building, X } from "lucide-react";

export interface TaxAccountingHeaderProps {
	onClose: () => void;
}

export const TaxAccountingHeader: React.FC<TaxAccountingHeaderProps> = ({ onClose }) => {
	return (
		<div className="document-package-modal-header">
			<h3 className="document-package-modal-title" id="tax-package-modal-title">
				<Building className="w-5 h-5 text-indigo-600 inline" />
				<span>Налоговый вычет и бухгалтерия</span>
			</h3>
			<button
				type="button"
				className="secondary-button"
				onClick={onClose}
				aria-label="Закрыть модальное окно"
			>
				<X size={18} aria-hidden="true" />
			</button>
		</div>
	);
};
