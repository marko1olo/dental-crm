import React from "react";
import type { LicenseValidationResult } from "./clinicLegalTypes";

interface ClinicLicenseInputsProps {
	licenseNumber: string;
	licenseValidation: LicenseValidationResult;
	medicalLicenseIssuedAt: string;
	medicalLicenseIssuer: string;
	updateClinicProfileDraft: (field: string, value: any) => void;
}

export const ClinicLicenseInputs: React.FC<ClinicLicenseInputsProps> = ({
	licenseNumber,
	licenseValidation,
	medicalLicenseIssuedAt,
	medicalLicenseIssuer,
	updateClinicProfileDraft,
}) => {
	return (
		<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
			<label className="flex flex-col gap-1.5 text-xs font-medium text-[var(--ink)]">
				<span>Номер лицензии (формат Л041-...)</span>
				<div className="relative">
					<input
						type="text"
						data-testid="input-clinic-license-number"
						placeholder="Л041-01137-77/00345678"
						value={licenseNumber}
						onChange={(e) =>
							updateClinicProfileDraft("medicalLicenseNumber", e.target.value.trim())
						}
						className={`w-full px-3 py-2 rounded-lg border text-sm bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-teal-500/30 transition-colors ${
							licenseNumber && !licenseValidation.isValid
								? "border-amber-500"
								: "border-[var(--line)]"
						}`}
					/>
				</div>
				<small className="text-[11px] text-[var(--muted)]">
					{licenseNumber && !licenseValidation.isValid
						? licenseValidation.message
						: "Номер из единого реестра учета лицензий (ЕРУЛ)"}
				</small>
			</label>

			<label className="flex flex-col gap-1.5 text-xs font-medium text-[var(--ink)]">
				<span>Дата выдачи лицензии</span>
				<input
					type="text"
					data-testid="input-clinic-license-issued-at"
					placeholder="12.05.2021"
					value={medicalLicenseIssuedAt}
					onChange={(e) =>
						updateClinicProfileDraft("medicalLicenseIssuedAt", e.target.value)
					}
					className="w-full px-3 py-2 rounded-lg border border-[var(--line)] text-sm bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-teal-500/30"
				/>
				<small className="text-[11px] text-[var(--muted)]">
					По закону 99-ФЗ лицензии действуют бессрочно
				</small>
			</label>

			<label className="sm:col-span-2 flex flex-col gap-1.5 text-xs font-medium text-[var(--ink)]">
				<span>Кем выдана лицензия (Лицензирующий орган)</span>
				<input
					type="text"
					data-testid="input-clinic-license-issuer"
					placeholder="Департамент здравоохранения города Москвы"
					value={medicalLicenseIssuer}
					onChange={(e) =>
						updateClinicProfileDraft("medicalLicenseIssuer", e.target.value)
					}
					className="w-full px-3 py-2 rounded-lg border border-[var(--line)] text-sm bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-teal-500/30"
				/>
				<small className="text-[11px] text-[var(--muted)]">
					Указывается в шапке информированных добровольных согласий (ИДС)
				</small>
			</label>
		</div>
	);
};
