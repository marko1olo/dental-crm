import React from "react";
import type { Dashboard, Patient } from "@dental/shared";
import { ChevronRight, MoreHorizontal } from "lucide-react";
import { formatPhoneNumber } from "../../../utils/inputSanitation";
import { PatientRowContextMenu } from "./PatientRowContextMenu";

interface PatientMasterRowProps {
	readonly patient: Patient;
	readonly isSelected: boolean;
	readonly insight?: Dashboard["patientInsights"][number] | undefined;
	readonly riskDistinguishes: boolean;
	readonly nextActionDistinguishes: boolean;
	readonly patientInsightRiskLabels?: Record<string, string> | undefined;
	readonly money: (amountRub: number) => string;
	readonly isRowMenuOpen: boolean;
	readonly rowMenuRef: React.RefObject<HTMLDivElement | null>;
	readonly onToggleRowMenu: () => void;
	readonly onCloseRowMenu: () => void;
	readonly onSelectPatient: (id: string) => void;
	readonly onOpenVisit: (patient: Patient) => void;
	readonly onBookAppointment: (patient: Patient) => void;
	readonly onOpenPatientCard: (patient: Patient) => void;
}

export const PatientMasterRow: React.FC<PatientMasterRowProps> = ({
	patient, isSelected, insight, riskDistinguishes, nextActionDistinguishes,
	patientInsightRiskLabels, money, isRowMenuOpen, rowMenuRef,
	onToggleRowMenu, onCloseRowMenu, onSelectPatient, onOpenVisit, onBookAppointment, onOpenPatientCard,
}) => (
	<article
		className={`patient-row ${insight && riskDistinguishes ? `risk-${insight.riskLevel}` : ""} ${isSelected ? "selected" : ""}`}
		key={patient.id}
		data-patient-id={patient.id}
		data-testid={`patient-row-${patient.id}`}
		style={{ contentVisibility: "auto", containIntrinsicSize: "1px 64px", contain: "content" }}
		tabIndex={0}
		role="button"
		aria-label={`Карточка пациента: ${patient.fullName}`}
		onClick={() => onSelectPatient(patient.id)}
		onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelectPatient(patient.id); } }}
	>
		<div className="min-w-0 flex-1">
			<h3 className="break-words line-clamp-2 leading-tight font-semibold text-sm" title={patient.fullName}>{patient.fullName}</h3>
			<p className="text-xs text-[var(--muted)] font-mono select-all">{patient.phone ? formatPhoneNumber(patient.phone) : "Телефон не указан"}</p>
			{patient.notes && patient.notes.length <= 42 && (
				<p className="break-words text-xs text-[var(--muted)] opacity-75 mt-0.5" title={patient.notes}>{patient.notes}</p>
			)}
			{(insight && (riskDistinguishes || nextActionDistinguishes || insight.balanceDueRub || patient.status === "archived")) || patient.status === "archived" ? (
				<div className="patient-row-meta">
					{patient.status === "archived" && (
						<span className="patient-risk-label" style={{ backgroundColor: "var(--bad-bg, rgba(239, 68, 68, 0.15))", color: "var(--bad-fg, var(--danger))", borderColor: "var(--bad-border, rgba(239, 68, 68, 0.3))" }}>
							Черный список / Архив
						</span>
					)}
					{riskDistinguishes && patientInsightRiskLabels && (
						<span className="patient-risk-label" title={patientInsightRiskLabels[insight?.riskLevel || ""]}>{patientInsightRiskLabels[insight?.riskLevel || ""]}</span>
					)}
					{nextActionDistinguishes && insight?.nextBestAction && (
						<strong className="patient-next-action" title={insight.nextBestAction}>
							{insight.nextBestAction.length > 28 ? "Контроль оплат" : insight.nextBestAction}
						</strong>
					)}
					{Boolean(insight?.balanceDueRub) && (
						<span className="patient-row-chip shrink-0">{money(insight!.balanceDueRub)}</span>
					)}
				</div>
			) : null}
		</div>
		<div className="patient-row-actions flex items-center gap-1.5 shrink-0 pl-1" onClick={(e) => e.stopPropagation()}>
			<div className="relative inline-flex items-center" ref={isRowMenuOpen ? rowMenuRef : null}>
				<button
					type="button"
					className="patient-row-more-btn w-8 h-8 min-w-[32px] min-h-[32px] p-0 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] hover:border-[var(--teal)] text-[var(--ink)] inline-flex items-center justify-center cursor-pointer transition-colors shrink-0"
					title="Действия с пациентом (В карту, Запись, Карточка, Касса)"
					aria-label={`Меню действий для ${patient.fullName}`}
					aria-expanded={isRowMenuOpen}
					data-testid={`patient-row-more-btn-${patient.id}`}
					onClick={(e) => { e.stopPropagation(); onSelectPatient(patient.id); onToggleRowMenu(); }}
				>
					<MoreHorizontal size={14} className="text-[var(--ink)]" />
				</button>
				{isRowMenuOpen && (
					<PatientRowContextMenu
						patient={patient}
						onClose={onCloseRowMenu}
						onSelectPatient={onSelectPatient}
						onOpenVisit={onOpenVisit}
						onBookAppointment={onBookAppointment}
						onOpenPatientCard={onOpenPatientCard}
					/>
				)}
			</div>
			<button
				type="button"
				className="patient-row-chevron-btn w-8 h-8 min-w-[32px] min-h-[32px] p-0 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--teal-soft)] hover:border-[var(--teal)] text-[var(--muted)] hover:text-[var(--teal-dark)] inline-flex items-center justify-center cursor-pointer transition-colors shrink-0"
				title={`Открыть карточку: ${patient.fullName}`}
				aria-label={`Открыть карточку: ${patient.fullName}`}
				data-testid={`patient-row-open-btn-${patient.id}`}
				onClick={(e) => { e.stopPropagation(); onSelectPatient(patient.id); }}
			>
				<ChevronRight size={15} className="shrink-0" aria-hidden="true" />
			</button>
		</div>
	</article>
);
