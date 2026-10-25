import React from "react";
import type { PatientGeneralInfo } from "./types";

interface RepresentativeFullModeExtrasProps {
	patient?: PatientGeneralInfo | null | undefined;
	disabled?: boolean;
	onUpdatePatient?: ((field: keyof PatientGeneralInfo, value: any) => void) | undefined;
}

export const RepresentativeFullModeExtras: React.FC<RepresentativeFullModeExtrasProps> = ({
	patient,
	disabled = false,
	onUpdatePatient,
}) => {
	return (
		<div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
			<div className="flex flex-col gap-1">
				<label className="text-xs font-bold text-[var(--ink)]">
					Кому выдавать медицинскую документацию и справки:
				</label>
				<select
					className="min-h-[44px] sm:min-h-[32px] px-3 py-1.5 text-xs rounded-lg bg-[var(--paper)] border border-[var(--glass-border)] text-[var(--ink)]"
					value={patient?.preferredDocumentRecipient ?? "Лично пациенту"}
					onChange={(e) => onUpdatePatient?.("preferredDocumentRecipient", e.target.value)}
					disabled={disabled}
				>
					<option value="Лично пациенту">Лично пациенту</option>
					<option value="Законному представителю">Законному представителю</option>
					<option value="По нотариальной доверенности">По нотариальной доверенности</option>
				</select>
			</div>

			<div className="flex flex-col gap-1">
				<label className="text-xs font-bold text-[var(--ink)]">
					Основание обработки персональных данных:
				</label>
				<input
					type="text"
					className="min-h-[44px] sm:min-h-[32px] px-3 py-1.5 text-xs rounded-lg bg-[var(--paper)] border border-[var(--glass-border)] text-[var(--ink)]"
					value={patient?.dataProcessingBasisNote ?? "Согласие на ОПД от первичного приема"}
					onChange={(e) => onUpdatePatient?.("dataProcessingBasisNote", e.target.value)}
					placeholder="Согласие на ОПД №..."
					disabled={disabled}
				/>
			</div>
		</div>
	);
};
