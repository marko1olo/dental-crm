import type { GeneralCleaningLog } from "@dental/shared";
import { Download, MoreHorizontal, Printer, Sparkles } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { useOptionalAppLogicContext } from "../../contexts/AppLogicContext";
import { exportGeneralCleaningLogsCsv, printGeneralCleaningJournal } from "./generalCleaningPrintHelpers";

export interface GeneralCleaningOptionsMenuProps {
	readonly logs: readonly GeneralCleaningLog[];
	readonly filteredLogs: readonly GeneralCleaningLog[];
	readonly isAutopilotLoading: boolean;
	readonly submitting: boolean;
	readonly onAutopilotMonth: () => void;
	readonly onQuickRecordNormCleaning: () => void;
}

export const GeneralCleaningOptionsMenu: React.FC<GeneralCleaningOptionsMenuProps> = ({
	logs,
	filteredLogs,
	isAutopilotLoading,
	submitting,
	onAutopilotMonth,
	onQuickRecordNormCleaning,
}) => {
	const appLogic = useOptionalAppLogicContext();
	const [isOpen, setIsOpen] = useState(false);
	const menuRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (menuRef.current && !menuRef.current.contains(e.target as Node)) setIsOpen(false);
		};
		if (isOpen) document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [isOpen]);

	return (
		<div style={{ position: "relative" }} ref={menuRef}>
			<button
				type="button"
				onClick={() => setIsOpen(!isOpen)}
				className="sanpin-btn sanpin-btn-secondary"
				style={{ height: "36px", minHeight: "36px", padding: "0 0.65rem", display: "inline-flex", alignItems: "center", gap: "0.35rem", fontSize: "0.825rem" }}
				title="Дополнительные опции"
				aria-label="Опции журнала"
			>
				<MoreHorizontal size={16} />
				<span>Опции</span>
			</button>

			{isOpen && (
				<div
					style={{
						position: "absolute", right: 0, top: "100%", marginTop: "4px", zIndex: 40, width: "280px",
						background: "var(--paper, #ffffff)", border: "1px solid var(--line, #e2e8f0)", borderRadius: "8px",
						boxShadow: "0 4px 16px rgba(0, 0, 0, 0.12)", padding: "0.35rem", display: "flex", flexDirection: "column", gap: "0.25rem",
					}}
				>
					<button
						type="button"
						onClick={() => { setIsOpen(false); onAutopilotMonth(); }}
						aria-busy={isAutopilotLoading}
						className="flex items-center gap-2 p-2 text-xs text-left bg-transparent border-0 rounded cursor-pointer font-bold text-teal hover:bg-paper-soft"
						data-testid="nurse-cleaning-monthly-autopilot-btn"
					>
						<Sparkles size={14} />
						<span>{isAutopilotLoading ? "Формирование графика..." : "Заполнить график уборок на месяц (7 дн.)"}</span>
					</button>

					<button
						type="button"
						onClick={() => { setIsOpen(false); onQuickRecordNormCleaning(); }}
						aria-busy={submitting}
						className="flex items-center gap-2 p-2 text-xs text-left bg-transparent border-0 rounded cursor-pointer text-ink hover:bg-paper-soft"
						data-testid="nurse-1click-norm-cleaning-btn"
					>
						<Sparkles size={14} className="text-teal" />
						<span>Провести уборку (Аламинол 5%)</span>
					</button>

					<button
						type="button"
						onClick={() => { setIsOpen(false); exportGeneralCleaningLogsCsv([...filteredLogs]); }}
						className="flex items-center gap-2 p-2 text-xs text-left bg-transparent border-0 rounded cursor-pointer text-ink hover:bg-paper-soft"
					>
						<Download size={14} />
						<span>Экспорт журнала в CSV</span>
					</button>

					<button
						type="button"
						onClick={() => { setIsOpen(false); printGeneralCleaningJournal([...logs], appLogic); }}
						className="flex items-center gap-2 p-2 text-xs text-left bg-transparent border-0 rounded cursor-pointer text-ink hover:bg-paper-soft"
						data-testid="print-general-cleaning-journal-btn"
					>
						<Printer size={14} />
						<span>Печать журнала / PDF</span>
					</button>
				</div>
			)}
		</div>
	);
};
