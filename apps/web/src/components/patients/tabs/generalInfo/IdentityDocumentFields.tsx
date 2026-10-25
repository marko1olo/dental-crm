import React from "react";
import type { IdentityDocType, PatientGeneralInfo } from "./types";
import { IDENTITY_DOCUMENT_TYPES } from "./constants";
import { ForeignIdentityDocumentFields } from "./ForeignIdentityDocumentFields";

interface IdentityDocumentFieldsProps {
	patient?: PatientGeneralInfo | null | undefined;
	onUpdatePatient?: ((field: keyof PatientGeneralInfo, value: any) => void) | undefined;
	disabled?: boolean | undefined;
}

export const IdentityDocumentFields: React.FC<IdentityDocumentFieldsProps> = ({
	patient, onUpdatePatient, disabled = false,
}) => {
	return (
		<>
			<div className="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-[var(--glass-border)]">
				<span className="text-xs font-bold text-[var(--ink)]">
					Реквизиты документа, удостоверяющего личность:
				</span>
				<div className="flex items-center gap-1.5">
					<label htmlFor="select-doc-type-field" className="text-[11px] text-[var(--muted)] font-medium">
						Тип:
					</label>
					<select
						id="select-doc-type-field"
						className="min-h-[44px] sm:min-h-[28px] h-7 px-2.5 text-xs rounded-lg bg-[var(--paper-strong)] border border-[var(--glass-border)] hover:bg-[var(--glass-hover,var(--paper-soft))] text-[var(--ink)] font-semibold cursor-pointer shadow-2xs transition-all"
						value={patient?.docType ?? "passport_rf"}
						onChange={(e) => onUpdatePatient?.("docType", e.target.value as IdentityDocType)}
						disabled={disabled}
						data-testid="select-doc-type"
					>
						{IDENTITY_DOCUMENT_TYPES.map((dt) => (
							<option key={dt.code} value={dt.code}>{dt.labelRu}</option>
						))}
					</select>
				</div>
			</div>

			{!patient?.docType || patient?.docType === "passport_rf" ? (
				<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
					<div className="flex flex-col gap-1">
						<label className="text-[11px] font-bold text-[var(--muted)]">Серия (4 цифры)</label>
						<input
							type="text" maxLength={4}
							className="min-h-[44px] sm:min-h-[32px] h-8 px-2.5 py-1 text-xs rounded-lg bg-[var(--paper)] border border-[var(--glass-border)] text-[var(--ink)] font-mono focus:outline-hidden focus:ring-2 focus:ring-[var(--teal)] transition-colors"
							value={patient?.passportSeries ?? ""}
							onChange={(e) => onUpdatePatient?.("passportSeries", e.target.value.replace(/\D/g, "").slice(0, 4))}
							placeholder="45 10" disabled={disabled} data-testid="input-passport-series"
						/>
					</div>
					<div className="flex flex-col gap-1">
						<label className="text-[11px] font-bold text-[var(--muted)]">Номер (6 цифр)</label>
						<input
							type="text" maxLength={6}
							className="min-h-[44px] sm:min-h-[32px] h-8 px-2.5 py-1 text-xs rounded-lg bg-[var(--paper)] border border-[var(--glass-border)] text-[var(--ink)] font-mono focus:outline-hidden focus:ring-2 focus:ring-[var(--teal)] transition-colors"
							value={patient?.passportNumber ?? ""}
							onChange={(e) => onUpdatePatient?.("passportNumber", e.target.value.replace(/\D/g, "").slice(0, 6))}
							placeholder="123456" disabled={disabled} data-testid="input-passport-number"
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
						<label className="text-[11px] font-bold text-[var(--muted)]">Код подр. (XXX-XXX)</label>
						<input
							type="text" maxLength={7}
							className="min-h-[44px] sm:min-h-[32px] h-8 px-2.5 py-1 text-xs rounded-lg bg-[var(--paper)] border border-[var(--glass-border)] text-[var(--ink)] font-mono focus:outline-hidden focus:ring-2 focus:ring-[var(--teal)] transition-colors"
							value={patient?.passportDepartmentCode ?? ""}
							onChange={(e) => {
								const digits = e.target.value.replace(/\D/g, "").slice(0, 6);
								const formatted = digits.length > 3 ? `${digits.slice(0, 3)}-${digits.slice(3)}` : digits;
								onUpdatePatient?.("passportDepartmentCode", formatted);
							}}
							placeholder="770-001" disabled={disabled} data-testid="input-passport-department-code"
						/>
					</div>
					<div className="flex flex-col gap-1 col-span-2">
						<label className="text-[11px] font-bold text-[var(--muted)]">Кем выдан</label>
						<input
							type="text"
							className="min-h-[44px] sm:min-h-[32px] h-8 px-2.5 py-1 text-xs rounded-lg bg-[var(--paper)] border border-[var(--glass-border)] text-[var(--ink)] focus:outline-hidden focus:ring-2 focus:ring-[var(--teal)] transition-colors"
							value={patient?.passportIssuedBy ?? ""}
							onChange={(e) => onUpdatePatient?.("passportIssuedBy", e.target.value)}
							placeholder="Отделом УФМС России по гор. Москве..." disabled={disabled} data-testid="input-passport-issued-by"
						/>
					</div>
				</div>
			) : (
				<ForeignIdentityDocumentFields
					patient={patient}
					onUpdatePatient={onUpdatePatient}
					disabled={disabled}
				/>
			)}
		</>
	);
};
