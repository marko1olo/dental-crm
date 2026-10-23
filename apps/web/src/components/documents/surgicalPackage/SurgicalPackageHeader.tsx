import React from "react";
import { Scissors, X } from "lucide-react";

export interface SurgicalPackageHeaderProps {
	onClose: () => void;
}

export const SurgicalPackageHeader: React.FC<SurgicalPackageHeaderProps> = ({ onClose }) => {
	return (
		<div className="document-package-modal-header">
			<h3 className="document-package-modal-title" id="surgical-package-modal-title">
				<Scissors className="w-5 h-5 text-rose-600 inline" />
				<span>Хирургический пакет приёма и операций</span>
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
