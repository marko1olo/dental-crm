import React from "react";
import { Download, Printer } from "lucide-react";

export interface TimesheetT13FooterActionsProps {
	readonly employeesCount: number;
	readonly onExportCsv: () => void;
	readonly onPrint: () => void;
}

export const TimesheetT13FooterActions: React.FC<TimesheetT13FooterActionsProps> = ({
	employeesCount,
	onExportCsv,
	onPrint,
}) => {
	const responsibleTitle =
		employeesCount <= 1
			? "Врач-руководитель (Соло-практика)"
			: "Главный врач";

	return (
		<div className="h-12 px-4 border-t border-[var(--line)] bg-[var(--paper-soft)] flex items-center justify-between gap-3 overflow-x-auto whitespace-nowrap timesheet-no-print shrink-0">
			<div className="text-[12.5px] text-[var(--muted)]">
				Ответственный за табель:{" "}
				<span className="font-bold text-[var(--ink)]">{responsibleTitle}</span>
			</div>
			<div className="flex items-center gap-2">
				<button
					type="button"
					onClick={onExportCsv}
					className="dente-btn-secondary"
				>
					<Download className="w-4 h-4 text-[var(--teal)] shrink-0" />
					<span>Выгрузить табель в CSV</span>
				</button>
				<button
					type="button"
					onClick={onPrint}
					className="dente-btn-primary"
				>
					<Printer className="w-4 h-4 shrink-0" />
					<span>Печать табеля рабочего времени</span>
				</button>
			</div>
		</div>
	);
};
