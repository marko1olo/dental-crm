/**
 * apps/web/src/components/settings/clinic/legalModules/ClinicLicenseCard.tsx
 *
 * Medical license settings card: Roszdravnadzor L041 registry number,
 * issue date, issuing authority, and clinical activities nomenclature (804n).
 *
 * Mandates 8b, 8c, 8d, 8e: desktop density, <= 500 lines, WCAG AAA.
 */

import React, { useId } from "react";
import { Award, CheckCircle2, ExternalLink, ShieldCheck } from "lucide-react";
import {
	CLINICAL_LICENSE_ACTIVITIES,
	validateMedicalLicense,
} from "./clinicLegalTypes";

export interface ClinicLicenseCardProps {
	clinicProfileDraft: Record<string, any>;
	updateClinicProfileDraft: (field: string, value: any) => void;
}

export const ClinicLicenseCard: React.FC<ClinicLicenseCardProps> = ({
	clinicProfileDraft,
	updateClinicProfileDraft,
}) => {
	const licenseNumber = clinicProfileDraft.medicalLicenseNumber || "";
	const licenseValidation = validateMedicalLicense(licenseNumber);
	const activeActivities: string[] =
		clinicProfileDraft.medicalLicenseActivities || [
			"therapy",
			"surgery",
			"orthopedics",
			"hygiene",
		];

	const toggleActivity = (activityId: string) => {
		const next = activeActivities.includes(activityId)
			? activeActivities.filter((id) => id !== activityId)
			: [...activeActivities, activityId];
		updateClinicProfileDraft("medicalLicenseActivities", next);
	};

	const fieldIdPrefix = useId();

	return (
		<article
			className="p-4 sm:p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] space-y-4"
			data-testid="clinic-license-card"
			aria-labelledby={`${fieldIdPrefix}-title`}
		>
			<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-[var(--line)]">
				<div className="flex items-center gap-2.5">
					<div className="w-8 h-8 rounded-lg bg-[var(--teal)]/10 text-[var(--teal)] flex items-center justify-center shrink-0">
						<Award size={18} aria-hidden="true" />
					</div>
					<div>
						<h4 id={`${fieldIdPrefix}-title`} className="text-sm font-bold text-[var(--ink)] m-0">
							Медицинская лицензия (Росздравнадзор)
						</h4>
						<p className="text-xs text-[var(--muted)] m-0 mt-0.5">
							Реквизиты лицензии для медицинских карт приёма, ИДС и договоров
						</p>
					</div>
				</div>
				<div className="flex items-center gap-2">
					<span
						className={`text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5 ${
							licenseNumber && licenseValidation.isValid
								? "bg-teal-500/10 text-[var(--teal)] border border-teal-500/30"
								: "bg-[var(--paper-soft)] text-[var(--muted)] border border-[var(--line)]"
						}`}
					>
						<ShieldCheck size={13} />
						<span>
							{licenseNumber && licenseValidation.isValid
								? "В реестре (бессрочно)"
								: "Требует заполнения"}
						</span>
					</span>
				</div>
			</div>

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
								updateClinicProfileDraft(
									"medicalLicenseNumber",
									e.target.value.trim(),
								)
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
						value={clinicProfileDraft.medicalLicenseIssuedAt || ""}
						onChange={(e) =>
							updateClinicProfileDraft(
								"medicalLicenseIssuedAt",
								e.target.value,
							)
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
						value={clinicProfileDraft.medicalLicenseIssuer || ""}
						onChange={(e) =>
							updateClinicProfileDraft(
								"medicalLicenseIssuer",
								e.target.value,
							)
						}
						className="w-full px-3 py-2 rounded-lg border border-[var(--line)] text-sm bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-teal-500/30"
					/>
					<small className="text-[11px] text-[var(--muted)]">
						Указывается в шапке информированных добровольных согласий (ИДС)
					</small>
				</label>
			</div>

			{/* Разрешенные виды деятельности клиники */}
			<div className="pt-3 border-t border-[var(--line)] space-y-2">
				<div className="flex items-center justify-between">
					<span className="text-xs font-bold text-[var(--ink)]">
						Номенклатурные направления деятельности по лицензии:
					</span>
					<a
						href="https://roszdravnadzor.gov.ru/services/licenses"
						target="_blank"
						rel="noreferrer noopener"
						className="text-[11px] text-[var(--teal)] hover:underline inline-flex items-center gap-1"
					>
						<span>Реестр Росздравнадзора</span>
						<ExternalLink size={11} aria-hidden="true" />
					</a>
				</div>
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
					{CLINICAL_LICENSE_ACTIVITIES.map((act) => {
						const isChecked = activeActivities.includes(act.id);
						return (
							<button
								key={act.id}
								type="button"
								onClick={() => toggleActivity(act.id)}
								style={{
									border: isChecked ? "1px solid var(--teal)" : "1px solid var(--line)",
									background: isChecked ? "rgba(13, 148, 136, 0.08)" : "var(--paper-soft)",
									padding: "8px 12px",
									borderRadius: "8px",
								}}
								className="text-left text-xs font-medium flex items-center justify-between transition-colors cursor-pointer text-[var(--ink)]"
							>
								<span>{act.label}</span>
								{isChecked && (
									<CheckCircle2
										size={14}
										className="text-[var(--teal)] shrink-0"
										aria-hidden="true"
									/>
								)}
							</button>
						);
					})}
				</div>
			</div>
		</article>
	);
};

export default ClinicLicenseCard;
