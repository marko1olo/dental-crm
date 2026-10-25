import React from "react";
import { Stethoscope, X } from "lucide-react";
import type { ClinicalVisitItem } from "./types";

interface DrawerHeaderProps {
	visit: ClinicalVisitItem;
	formattedDateStr: string;
	onClose: () => void;
}

export const DrawerHeader: React.FC<DrawerHeaderProps> = ({ visit, formattedDateStr, onClose }) => {
	return (
		<div className="p-4 border-b border-[var(--line)] flex items-center justify-between gap-3 bg-[var(--paper-soft)]">
			<div className="flex items-center gap-2 min-w-0">
				<div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
					<Stethoscope className="w-4 h-4" />
				</div>
				<div className="min-w-0">
					<h3 id="history-detail-drawer-title" className="text-sm font-bold text-[var(--ink)] truncate m-0">
						Протокол приёма: {formattedDateStr}
					</h3>
					<div className="flex items-center gap-2 text-xs text-[var(--muted)]">
						<span>{visit.specialtyLabelRu}</span>
						<span>•</span>
						<span className="truncate">{visit.doctorName}</span>
					</div>
				</div>
			</div>

			<button
				type="button"
				onClick={onClose}
				className="w-8 h-8 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-strong)] flex items-center justify-center transition-colors"
				data-testid="history-detail-drawer-close"
				title="Закрыть шторку"
			>
				<X className="w-4 h-4" />
			</button>
		</div>
	);
};
