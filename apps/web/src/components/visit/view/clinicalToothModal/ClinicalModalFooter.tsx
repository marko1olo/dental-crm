import React from "react";

export interface ClinicalModalFooterProps {
	code: string;
	selectedSurfaces: string[];
	closeClinicalModal: () => void;
}

export const ClinicalModalFooter: React.FC<ClinicalModalFooterProps> = ({
	code,
	selectedSurfaces,
	closeClinicalModal,
}) => {
	return (
		<div className="_ccm-footer">
			<span className="_ccm-footer-hint">
				{selectedSurfaces.length > 0
					? `Выбрана полость: [${selectedSurfaces.join("")}]`
					: `Зуб ${code} · Клинический протокол`}
			</span>
			<button
				type="button"
				onClick={closeClinicalModal}
				className="_ccm-footer-done-btn cursor-pointer"
			>
				Готово
			</button>
		</div>
	);
};
