import React from "react";
import { formatPhoneNumber } from "../../../../utils/inputSanitation";
import type { PatientGeneralInfo } from "./types";

interface RepresentativeFormInputsProps {
	patient?: PatientGeneralInfo | null | undefined;
	disabled?: boolean;
	compact?: boolean;
	onUpdatePatient?: ((field: keyof PatientGeneralInfo, value: any) => void) | undefined;
}

export const RepresentativeFormInputs: React.FC<RepresentativeFormInputsProps> = ({
	patient,
	disabled = false,
	compact = false,
	onUpdatePatient,
}) => {
	return (
		<div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-2 border-t border-[var(--glass-border)]">
			<div className="flex flex-col gap-1">
				<label className="text-[11px] font-bold text-[var(--muted)]">
					ФИО представителя / сопровождающего
				</label>
				<input
					type="text"
					className={`min-h-[44px] sm:min-h-[32px] px-2.5 py-1 text-xs rounded-lg bg-[var(--paper)] border border-[var(--glass-border)] text-[var(--ink)] focus:outline-hidden focus:ring-2 focus:ring-[var(--teal)] transition-colors ${
						compact ? "h-8" : "py-1.5"
					}`}
					value={patient?.representativeFullName ?? ""}
					onChange={(e) => onUpdatePatient?.("representativeFullName", e.target.value)}
					placeholder="Фамилия Имя Отчество"
					disabled={disabled}
					data-testid="input-representative-fullname"
				/>
			</div>

			<div className="flex flex-col gap-1">
				<label className="text-[11px] font-bold text-[var(--muted)]">
					Телефон представителя
				</label>
				<input
					type="tel"
					className={`min-h-[44px] sm:min-h-[32px] px-2.5 py-1 text-xs rounded-lg bg-[var(--paper)] border border-[var(--glass-border)] text-[var(--ink)] focus:outline-hidden focus:ring-2 focus:ring-[var(--teal)] transition-colors ${
						compact ? "h-8" : "py-1.5"
					}`}
					value={patient?.representativePhone ?? ""}
					onChange={(e) => onUpdatePatient?.("representativePhone", formatPhoneNumber(e.target.value))}
					placeholder="+7 (___) ___-__-__"
					disabled={disabled}
					data-testid="input-representative-phone"
				/>
			</div>

			<div className="flex flex-col gap-1">
				<label className="text-[11px] font-bold text-[var(--muted)]">
					Документ-основание (Свид-во / Доверенность)
				</label>
				<input
					type="text"
					className={`min-h-[44px] sm:min-h-[32px] px-2.5 py-1 text-xs rounded-lg bg-[var(--paper)] border border-[var(--glass-border)] text-[var(--ink)] focus:outline-hidden focus:ring-2 focus:ring-[var(--teal)] transition-colors ${
						compact ? "h-8" : "py-1.5"
					}`}
					value={patient?.representativeDoc ?? ""}
					onChange={(e) => onUpdatePatient?.("representativeDoc", e.target.value)}
					placeholder="Свидетельство II-МЮ №123456"
					disabled={disabled}
					data-testid="input-representative-doc"
				/>
			</div>
		</div>
	);
};
