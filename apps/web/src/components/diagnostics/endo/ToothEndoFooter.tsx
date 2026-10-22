import React from "react";
import { DentalForm043 } from "../../icons/DentalIcons";

export interface ToothEndoFooterProps {
	onInsertProtocol: () => void;
}

export const ToothEndoFooter: React.FC<ToothEndoFooterProps> = ({
	onInsertProtocol,
}) => {
	return (
		<div className="dente-endo-footer">
			<button
				type="button"
				onClick={onInsertProtocol}
				className="dente-primary-action-btn"
			>
				<DentalForm043 size={15} />
				<span>Вставить протокол эндодонтии в медкарту</span>
			</button>
		</div>
	);
};
