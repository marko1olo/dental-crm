import type { Patient } from "@dental/shared";
import { AlertTriangle } from "lucide-react";
import React from "react";
import type { PotentialDuplicateItem } from "../patientSearchFuzzy";

export interface PatientSearchDuplicateHintProps {
	potentialDuplicate: PotentialDuplicateItem;
	onSelect: (patient: Patient) => void;
	onTriggerQuickCreate: () => void;
}

export const PatientSearchDuplicateHint: React.FC<PatientSearchDuplicateHintProps> = ({
	potentialDuplicate,
	onSelect,
	onTriggerQuickCreate,
}) => {
	return (
		<div
			data-testid="patient-search-duplicate-hint"
			className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs flex flex-col gap-1.5 text-amber-900 dark:text-amber-100 animate-in fade-in duration-100"
		>
			<div className="flex items-start gap-1.5">
				<AlertTriangle size={14} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
				<div className="min-w-0 flex-1">
					<p className="font-bold m-0 leading-tight">
						Найден похожий пациент: {potentialDuplicate.patient.fullName}
						{potentialDuplicate.patient.phone ? ` (${potentialDuplicate.patient.phone})` : ""}
					</p>
					<p className="m-0 text-[11px] text-[var(--muted)] leading-tight">
						{potentialDuplicate.explanation || "Возможен повторный ввод уже существующей карты"}
					</p>
				</div>
			</div>
			<div className="flex items-center gap-2 pt-0.5 flex-wrap">
				<button
					type="button"
					data-testid="continue-quick-create-btn"
					onClick={onTriggerQuickCreate}
					className="h-8 max-md:min-h-[44px] max-md:h-11 px-3 rounded-lg text-xs font-medium bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] hover:bg-[var(--paper-soft)] cursor-pointer transition-colors"
				>
					Продолжить создание
				</button>
				<button
					type="button"
					data-testid="open-existing-patient-btn"
					onClick={() => onSelect(potentialDuplicate.patient)}
					className="h-8 max-md:min-h-[44px] max-md:h-11 px-3 rounded-lg text-xs font-medium bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] cursor-pointer transition-colors shadow-xs"
				>
					Открыть существующего
				</button>
			</div>
		</div>
	);
};
