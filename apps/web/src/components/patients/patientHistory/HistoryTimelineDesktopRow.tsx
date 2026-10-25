import React from "react";
import { Check, ChevronDown, ChevronRight, Clock, ShieldCheck, User } from "lucide-react";
import { ToothMolar } from "../../icons/DentalIcons";
import type { ClinicalVisitItem } from "./types";

interface HistoryTimelineDesktopRowProps {
	visit: ClinicalVisitItem;
	isExpanded: boolean;
	formattedDateStr: string;
	onToggle: () => void;
}

export const HistoryTimelineDesktopRow: React.FC<HistoryTimelineDesktopRowProps> = ({
	visit,
	isExpanded,
	formattedDateStr,
	onToggle,
}) => {
	return (
		<div
			className="clinical-visit-compact-row hidden md:flex"
			onClick={onToggle}
			role="button"
			tabIndex={0}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					onToggle();
				}
			}}
			aria-expanded={isExpanded}
			title="Нажмите, чтобы развернуть протокол приёма"
		>
			<div className="clinical-visit-left-pills">
				<span className={`clinical-row-chevron-badge ${isExpanded ? "expanded" : ""}`} aria-hidden="true">
					{isExpanded ? (
						<ChevronDown className="w-3.5 h-3.5 text-[var(--teal)]" />
					) : (
						<ChevronRight className="w-3.5 h-3.5" />
					)}
				</span>

				<span className="clinical-pill clinical-pill-date">
					<Clock className="w-3 h-3 text-[var(--muted)]" />
					<span>{formattedDateStr}</span>
				</span>

				{visit.toothNumber ? (
					<span className="clinical-pill clinical-pill-tooth" data-testid={`pill-tooth-${visit.toothNumber}`}>
						<ToothMolar className="w-3.5 h-3.5 text-[var(--teal)]" />
						<span>Зуб {visit.toothNumber}</span>
					</span>
				) : (
					<span className="clinical-pill text-[var(--muted)]">
						<span>Общий приём</span>
					</span>
				)}

				<span className="clinical-pill clinical-pill-diagnosis" title={`${visit.diagnosisCode} ${visit.diagnosisTitle}`}>
					<span className="font-mono text-teal-700 dark:text-teal-400 font-black">
						{visit.diagnosisCode}
					</span>
					<span className="truncate">{visit.diagnosisTitle}</span>
				</span>

				<span className="clinical-pill clinical-pill-doctor hidden md:inline-flex">
					<User className="w-3 h-3 text-[var(--muted)]" />
					<span>{visit.doctorName}</span>
				</span>

				<span className="clinical-pill text-[10px] hidden lg:inline-flex bg-slate-100 dark:bg-slate-800 text-[var(--muted)]">
					{visit.specialtyLabelRu}
				</span>
			</div>

			<div className="clinical-visit-right-pills">
				<span className="clinical-pill clinical-pill-amount">
					{visit.amountRub.toLocaleString("ru-RU")} ₽
				</span>

				<span className="clinical-pill clinical-pill-status-paid">
					<Check className="w-3 h-3" />
					<span>Оплачен</span>
				</span>

				{visit.warrantyUntil && (
					<span className="clinical-pill clinical-pill-warranty hidden sm:inline-flex" title="Гарантийный период на манипуляцию">
						<ShieldCheck className="w-3 h-3 text-indigo-500" />
						<span>Гарантия до {visit.warrantyUntil}</span>
					</span>
				)}
			</div>
		</div>
	);
};
