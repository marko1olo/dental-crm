import React from "react";
import { ClipboardList, ExternalLink, Printer } from "lucide-react";
import { showToast } from "../../GlobalToast";
import type { ClinicalVisitItem } from "./types";

interface DrawerFooterProps {
	visit: ClinicalVisitItem;
	onExtract043: (visit: ClinicalVisitItem) => void;
	onAddToTreatmentPlan: (visit: ClinicalVisitItem) => void;
	onNavigateToVisit?: ((visitId: string) => void) | undefined;
}

export const DrawerFooter: React.FC<DrawerFooterProps> = ({
	visit, onExtract043, onAddToTreatmentPlan, onNavigateToVisit,
}) => {
	return (
		<div className="p-3 border-t border-[var(--line)] bg-[var(--paper-soft)] flex flex-wrap items-center justify-between gap-2">
			<button
				type="button" onClick={() => onExtract043(visit)} className="clinical-btn-print"
				title="Сформировать медицинскую выписку из карты"
			>
				<Printer className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
				<span>Выписка из карты</span>
			</button>

			<button
				type="button" onClick={() => onAddToTreatmentPlan(visit)} className="clinical-btn-plan"
				title="Включить в план лечения"
			>
				<ClipboardList className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
				<span>В план лечения</span>
			</button>

			<button
				type="button"
				onClick={() => {
					if (onNavigateToVisit) onNavigateToVisit(visit.id);
					else showToast(`Переход к визиту ${visit.id}`, "info");
				}}
				className="clinical-btn-goto"
				title="Перейти в полный интерфейс приёма"
			>
				<span>К визиту</span>
				<ExternalLink className="w-3.5 h-3.5 shrink-0" />
			</button>
		</div>
	);
};
