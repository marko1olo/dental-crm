import React from "react";
import { Check, ChevronDown, ChevronRight, Clock, User } from "lucide-react";
import { ToothMolar } from "../../icons/DentalIcons";
import type { ClinicalVisitItem } from "./types";

interface HistoryTimelineMobileHeaderProps {
	visit: ClinicalVisitItem;
	isExpanded: boolean;
	formattedDateStr: string;
	onToggle: () => void;
}

export const HistoryTimelineMobileHeader: React.FC<HistoryTimelineMobileHeaderProps> = ({
	visit,
	isExpanded,
	formattedDateStr,
	onToggle,
}) => {
	return (
		<div
			className="clinical-mobile-card-header flex md:hidden"
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
			<div className="clinical-mobile-header-top">
				<div className="clinical-mobile-meta-group">
					<span className={`clinical-specialty-pill specialty-${visit.specialty}`}>
						{visit.specialtyLabelRu}
					</span>
					<span className="clinical-mobile-date">
						<Clock className="w-3 h-3 text-[var(--muted)]" />
						<span>{formattedDateStr}</span>
					</span>
				</div>
				<span className={`clinical-row-chevron-badge ${isExpanded ? "expanded" : ""}`} aria-hidden="true">
					{isExpanded ? (
						<ChevronDown className="w-4 h-4 text-[var(--teal)]" />
					) : (
						<ChevronRight className="w-4 h-4" />
					)}
				</span>
			</div>

			<div className="clinical-mobile-diagnosis-row">
				<div className="clinical-mobile-diagnosis">
					<span className="clinical-diagnosis-code font-mono font-black text-teal-600 dark:text-teal-400">
						{visit.diagnosisCode}
					</span>
					<span className="clinical-diagnosis-title font-semibold text-[var(--ink)]">
						{visit.diagnosisTitle}
					</span>
				</div>
				{visit.toothNumber && (
					<span className="clinical-pill-tooth shrink-0" data-testid={`mobile-pill-tooth-${visit.toothNumber}`}>
						<ToothMolar className="w-3.5 h-3.5 text-[var(--teal)]" />
						<span>Зуб {visit.toothNumber}</span>
					</span>
				)}
			</div>

			<div className="clinical-mobile-bottom-row">
				<div className="clinical-mobile-doctor">
					<User className="w-3 h-3 text-[var(--muted)]" />
					<span className="truncate">{visit.doctorName}</span>
				</div>
				<div className="clinical-mobile-finances">
					<span className="clinical-mobile-amount font-mono font-bold text-[var(--ink)]">
						{visit.amountRub.toLocaleString("ru-RU")} ₽
					</span>
					<span className={`clinical-mobile-payment-badge status-${visit.paymentStatus}`}>
						{visit.isPaid ? (
							<>
								<Check className="w-3 h-3" />
								<span>Оплачен</span>
							</>
						) : (
							<span>Запланирован</span>
						)}
					</span>
				</div>
			</div>
		</div>
	);
};
