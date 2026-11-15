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
		<div className="dente-pediatric-footer flex flex-wrap items-center gap-2">
			<button
				type="button"
				onClick={onInsertPsychologicalProtocol}
				className="dente-secondary-btn min-h-[44px] sm:min-h-[32px] sm:h-8 px-2.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
			>
				<DentalForm043 size={15} />
				<span>Вставить статус Франкла в карту</span>
			</button>

			<button
				type="button"
				onClick={onPrintMemo}
				className="dente-primary-action-btn min-h-[44px] sm:min-h-[36px] sm:h-9 px-3.5 rounded-xl bg-[var(--teal,#0d9488)] hover:bg-[var(--teal-dark,#0f766e)] text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
			>
				<Printer size={15} />
				<span>Печать памятки родителям</span>
			</button>
		</div>
	);
};
