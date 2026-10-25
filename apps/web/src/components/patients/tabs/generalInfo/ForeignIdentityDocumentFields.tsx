import React from "react";
import type { PatientGeneralInfo } from "./types";

interface ForeignIdentityDocumentFieldsProps {
	patient?: PatientGeneralInfo | null | undefined;
	onUpdatePatient?: ((field: keyof PatientGeneralInfo, value: any) => void) | undefined;
	disabled?: boolean | undefined;
}

export const ForeignIdentityDocumentFields: React.FC<ForeignIdentityDocumentFieldsProps> = ({
	patient, onUpdatePatient, disabled = false,
}) => {
	return (
		<div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
			<div className="flex flex-col gap-1">
				<label className="text-[11px] font-bold text-[var(--muted)]">Серия и номер документа</label>
				<input
					type="text"
					className="min-h-[44px] sm:min-h-[32px] h-8 px-2.5 py-1 text-xs rounded-lg bg-[var(--paper)] border border-[var(--glass-border)] text-[var(--ink)] focus:outline-hidden focus:ring-2 focus:ring-[var(--teal)] transition-colors"
					value={patient?.passportNumber ?? patient?.passportSeries ?? ""}
					onChange={(e) => onUpdatePatient?.("passportNumber", e.target.value)}
					placeholder="Номер свидетельства / ВНЖ" disabled={disabled} data-testid="input-passport-number"
				/>
			</div>

			<div className="flex flex-col gap-1">
				<label className="text-[11px] font-bold text-[var(--muted)]">Дата выдачи</label>
				<input
					type="date"
					className="min-h-[44px] sm:min-h-[32px] h-8 px-2 py-1 text-xs rounded-lg bg-[var(--paper)] border border-[var(--glass-border)] text-[var(--ink)] focus:outline-hidden focus:ring-2 focus:ring-[var(--teal)] transition-colors"
					value={patient?.passportIssuedDate ?? ""}
					onChange={(e) => onUpdatePatient?.("passportIssuedDate", e.target.value)}
					disabled={disabled} data-testid="input-passport-issued-date"
				/>
			</div>

			<div className="flex flex-col gap-1">
				<label className="text-[11px] font-bold text-[var(--muted)]">Орган выдачи</label>
				<input
					type="text"
					className="min-h-[44px] sm:min-h-[32px] h-8 px-2.5 py-1 text-xs rounded-lg bg-[var(--paper)] border border-[var(--glass-border)] text-[var(--ink)] focus:outline-hidden focus:ring-2 focus:ring-[var(--teal)] transition-colors"
					value={patient?.passportIssuedBy ?? ""}
					onChange={(e) => onUpdatePatient?.("passportIssuedBy", e.target.value)}
					placeholder="Кем выдан документ" disabled={disabled} data-testid="input-passport-issued-by"
				/>
			</div>
		</div>
	);
};
