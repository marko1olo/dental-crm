import React from "react";
import { Stethoscope } from "lucide-react";
import { DOCTOR_CLINICAL_TAGS } from "./constants";
import type { PatientGeneralInfo } from "./types";

interface DoctorClinicalNotesCardProps {
	patient?: PatientGeneralInfo | null | undefined;
	onUpdatePatient?: ((field: keyof PatientGeneralInfo, value: any) => void) | undefined;
	disabled?: boolean | undefined;
	onAppendDoctorTag: (tag: string) => void;
}

export const DoctorClinicalNotesCard: React.FC<DoctorClinicalNotesCardProps> = ({
	patient, onUpdatePatient, disabled = false, onAppendDoctorTag,
}) => {
	return (
		<div className="p-3 bg-[var(--paper)] rounded-xl border border-[var(--glass-border)] shadow-2xs flex flex-col gap-2.5">
			<div className="flex items-center justify-between gap-1 flex-wrap">
				<div className="flex items-center gap-1.5">
					<Stethoscope className="w-3.5 h-3.5 text-[var(--teal)]" />
					<span className="text-xs font-bold text-[var(--ink)]">Клинические особенности (Врач):</span>
				</div>
				<span className="text-[10px] text-[var(--muted)] font-medium">Кресло & ЭМК</span>
			</div>

			<div className="flex items-center gap-1.5 flex-wrap">
				{DOCTOR_CLINICAL_TAGS.map((tag) => (
					<button
						key={tag} type="button"
						className="min-h-[44px] sm:min-h-[28px] text-[11px] px-2 py-0.5 rounded-lg font-semibold bg-[var(--paper-strong)] text-[var(--ink)] border border-[var(--glass-border)] hover:bg-[var(--paper-soft)] hover:border-[var(--teal)] transition-all cursor-pointer"
						onClick={() => onAppendDoctorTag(tag)} disabled={disabled}
					>
						<span>+ {tag}</span>
					</button>
				))}
			</div>

			<textarea
				rows={2}
				className="w-full p-2.5 text-xs rounded-lg bg-[var(--paper)] border border-[var(--glass-border)] text-[var(--ink)] focus:outline-hidden focus:ring-2 focus:ring-[var(--teal)] transition-colors"
				value={patient?.doctorClinicalNotes ?? ""}
				onChange={(e) => onUpdatePatient?.("doctorClinicalNotes", e.target.value)}
				placeholder="Страх лечения, седация, аллерго-настороженность, особенности артикуляции..."
				disabled={disabled} data-testid="textarea-doctor-notes"
			/>
		</div>
	);
};
