import React, { useEffect } from "react";
import { Check } from "lucide-react";
import { ToothMolar } from "../../icons/DentalIcons";
import type { ClinicalVisitItem } from "./types";
import { DrawerHeader } from "./DrawerHeader";
import { DrawerSoapSection } from "./DrawerSoapSection";
import { DrawerScansAndMaterialsSection } from "./DrawerScansAndMaterialsSection";
import { DrawerFooter } from "./DrawerFooter";

export interface HistoryDetailDrawerProps {
	visit: ClinicalVisitItem | null;
	isOpen: boolean;
	onClose: () => void;
	onExtract043: (visit: ClinicalVisitItem) => void;
	onAddToTreatmentPlan: (visit: ClinicalVisitItem) => void;
	onNavigateToVisit?: ((visitId: string) => void) | undefined;
}

export const HistoryDetailDrawer: React.FC<HistoryDetailDrawerProps> = React.memo(
	function HistoryDetailDrawer({
		visit, isOpen, onClose, onExtract043, onAddToTreatmentPlan, onNavigateToVisit,
	}) {
		useEffect(() => {
			if (!isOpen) return;
			const handleKeyDown = (e: KeyboardEvent) => {
				if (e.key === "Escape") { e.stopPropagation(); onClose(); }
			};
			window.addEventListener("keydown", handleKeyDown);
			return () => window.removeEventListener("keydown", handleKeyDown);
		}, [isOpen, onClose]);

		if (!isOpen || !visit) return null;

		const formattedDateStr = (() => {
			try {
				const d = new Date(visit.date);
				if (!Number.isNaN(d.getTime())) {
					return `${d.toLocaleDateString("ru-RU")}${visit.time ? ` ${visit.time}` : ""}`;
				}
			} catch {}
			return visit.date;
		})();

		return (
			<div
				className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity duration-200"
				data-testid="history-detail-drawer-backdrop" onClick={onClose}
				role="dialog" aria-modal="true" aria-labelledby="history-detail-drawer-title"
			>
				<div
					className="w-full max-w-xl h-full bg-[var(--paper)] border-l border-[var(--line)] shadow-2xl flex flex-col overflow-hidden text-[var(--ink)] animate-in slide-in-from-right duration-200"
					data-testid="history-detail-drawer" onClick={(e) => e.stopPropagation()}
				>
					<DrawerHeader visit={visit} formattedDateStr={formattedDateStr} onClose={onClose} />

					<div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
						<div className="flex flex-wrap items-center gap-2 p-2.5 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)]">
							{visit.toothNumber ? (
								<span className="clinical-pill clinical-pill-tooth">
									<ToothMolar className="w-3.5 h-3.5 text-[var(--teal)]" />
									<span>Зуб {visit.toothNumber}</span>
								</span>
							) : (
								<span className="clinical-pill text-[var(--muted)]">
									<span>Общий приём</span>
								</span>
							)}
							<span className="clinical-pill clinical-pill-diagnosis">
								<span className="font-mono text-teal-700 dark:text-teal-400 font-black">{visit.diagnosisCode}</span>
								<span>{visit.diagnosisTitle}</span>
							</span>
							<span className="clinical-pill clinical-pill-amount ml-auto">
								{visit.amountRub.toLocaleString("ru-RU")} ₽
							</span>
							<span className="clinical-pill clinical-pill-status-paid">
								<Check className="w-3 h-3" />
								<span>{visit.isPaid ? "Оплачен" : "Запланирован"}</span>
							</span>
						</div>

						<DrawerSoapSection visit={visit} />
						<DrawerScansAndMaterialsSection visit={visit} />
					</div>

					<DrawerFooter
						visit={visit} onExtract043={onExtract043}
						onAddToTreatmentPlan={onAddToTreatmentPlan} onNavigateToVisit={onNavigateToVisit}
					/>
				</div>
			</div>
		);
	},
);

HistoryDetailDrawer.displayName = "HistoryDetailDrawer";
