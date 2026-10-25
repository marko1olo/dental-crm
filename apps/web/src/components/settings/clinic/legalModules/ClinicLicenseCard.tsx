/**
 * apps/web/src/components/settings/clinic/legalModules/ClinicLicenseCard.tsx
 *
 * Medical license settings card: Roszdravnadzor L041 registry number,
 * issue date, issuing authority, and clinical activities nomenclature.
 *
 * Facade <= 120 lines.
 */

import React, { useId } from "react";
import { Award, ShieldCheck } from "lucide-react";
import { validateMedicalLicense } from "./clinicLegalTypes";
import { ClinicLicenseInputs } from "./ClinicLicenseInputs";
import { ClinicLicenseActivitiesGrid } from "./ClinicLicenseActivitiesGrid";

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

			<ClinicLicenseInputs
				licenseNumber={licenseNumber}
				licenseValidation={licenseValidation}
				medicalLicenseIssuedAt={clinicProfileDraft.medicalLicenseIssuedAt || ""}
				medicalLicenseIssuer={clinicProfileDraft.medicalLicenseIssuer || ""}
				updateClinicProfileDraft={updateClinicProfileDraft}
			/>

			<ClinicLicenseActivitiesGrid
				activeActivities={activeActivities}
				toggleActivity={toggleActivity}
			/>
		</article>
	);
};

export default ClinicLicenseCard;
