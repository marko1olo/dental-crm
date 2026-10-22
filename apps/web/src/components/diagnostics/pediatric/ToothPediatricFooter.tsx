import React from "react";
import { Printer } from "lucide-react";
import { DentalForm043 } from "../../icons/DentalIcons";

export interface ToothPediatricFooterProps {
	onInsertPsychologicalProtocol: () => void;
	onPrintMemo: () => void;
}

export const ToothPediatricFooter: React.FC<ToothPediatricFooterProps> = ({
	onInsertPsychologicalProtocol,
	onPrintMemo,
}) => {
	return (
		<div className="dente-pediatric-footer">
			<button
				type="button"
				onClick={onInsertPsychologicalProtocol}
				className="dente-secondary-btn"
				style={{ minHeight: "32px", height: "32px", padding: "0 10px", fontSize: "12px" }}
			>
				<DentalForm043 size={15} />
				<span>Вставить статус Франкла в карту</span>
			</button>

			<button
				type="button"
				onClick={onPrintMemo}
				className="dente-primary-action-btn"
				style={{ minHeight: "36px", height: "36px", padding: "0 14px", fontSize: "13px" }}
			>
				<Printer size={15} />
				<span>Печать памятки для родителей...</span>
			</button>
		</div>
	);
};
