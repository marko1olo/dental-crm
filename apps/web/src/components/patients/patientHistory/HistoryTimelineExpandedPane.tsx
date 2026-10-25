import React from "react";
import { ClipboardList, ExternalLink, PanelRight, Printer, ShieldCheck } from "lucide-react";
import { showToast } from "../../GlobalToast";
import type { ClinicalVisitItem } from "./types";
import { TimelineSoapGrid } from "./TimelineSoapGrid";
import { TimelineAttachmentsSection } from "./TimelineAttachmentsSection";

interface HistoryTimelineExpandedPaneProps {
	visit: ClinicalVisitItem;
	onExtract043: (visit: ClinicalVisitItem) => void;
	onAddToTreatmentPlan: (visit: ClinicalVisitItem) => void;
	onNavigateToVisit?: ((visitId: string) => void) | undefined;
	onOpenDetailDrawer?: ((visit: ClinicalVisitItem) => void) | undefined;
}

export const HistoryTimelineExpandedPane: React.FC<HistoryTimelineExpandedPaneProps> = ({
	visit, onExtract043, onAddToTreatmentPlan, onNavigateToVisit, onOpenDetailDrawer,
}) => {
	return (
		<div className="clinical-visit-details-pane" data-testid={`timeline-visit-details-${visit.id}`}>
			<TimelineSoapGrid visit={visit} />
			<TimelineAttachmentsSection visit={visit} />

			<div className="clinical-details-actions">
				{visit.warrantyUntil && (
					<div className="clinical-warranty-badge">
						<ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
						<span>Гарантия: <strong>до {visit.warrantyUntil}</strong></span>
					</div>
				)}

				<div className="clinical-actions-btn-group">
					{onOpenDetailDrawer && (
						<button type="button" onClick={() => onOpenDetailDrawer(visit)} className="clinical-btn-print" data-testid={`btn-detail-drawer-${visit.id}`} title="Открыть подробный протокол в боковой панели">
							<PanelRight className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
							<span>Шторка протокола</span>
						</button>
					)}
					<button type="button" onClick={() => onExtract043(visit)} className="clinical-btn-print" data-testid={`btn-extract-043-${visit.id}`} title="Сформировать медицинскую выписку из карты">
						<Printer className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
						<span>Выписка из карты</span>
					</button>
					<button type="button" onClick={() => onAddToTreatmentPlan(visit)} className="clinical-btn-plan" data-testid={`btn-add-to-plan-${visit.id}`} title="Включить клинический диагноз и манипуляцию в план лечения">
						<ClipboardList className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
						<span>В план лечения</span>
					</button>
					<button type="button" onClick={() => { if (onNavigateToVisit) onNavigateToVisit(visit.id); else showToast(`Переход к протоколу визита ${visit.id}`, "info"); }} className="clinical-btn-goto" data-testid={`btn-goto-visit-${visit.id}`} title="Перейти к полной карте приёма">
						<span>К визиту</span>
						<ExternalLink className="w-3.5 h-3.5 shrink-0" />
					</button>
				</div>
			</div>
		</div>
	);
};
