import React from "react";
import { X } from "lucide-react";
import { DentalMirrorProbe } from "../../icons/DentalIcons";

interface PrimaryIntakeHeaderProps {
	onClose: () => void;
}

export function PrimaryIntakeHeader({ onClose }: PrimaryIntakeHeaderProps) {
	return (
		<div className="document-package-modal-header">
			<h3 className="document-package-modal-title" id="intake-package-modal-title">
				<DentalMirrorProbe size={18} className="text-teal-600 dark:text-teal-400" aria-hidden="true" />
				<span>Экспресс-пакет первичного пациента (Договор + Согласие на лечение)</span>
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
}
