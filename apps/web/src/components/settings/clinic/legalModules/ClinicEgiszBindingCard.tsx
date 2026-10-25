/**
 * apps/web/src/components/settings/clinic/legalModules/ClinicEgiszBindingCard.tsx
 *
 * EGISZ (Uniform State Health Information System) binding card.
 * Facade <= 120 lines.
 */

import React from "react";
import { validateEgiszOid } from "./clinicLegalTypes";
import { ClinicEgiszHeader } from "./ClinicEgiszHeader";
import { ClinicEgiszAutonomousRow } from "./ClinicEgiszAutonomousRow";
import { ClinicEgiszConnectionParams } from "./ClinicEgiszConnectionParams";

export interface ClinicEgiszBindingCardProps {
	clinicProfileDraft: Record<string, any>;
	updateClinicProfileDraft: (field: string, value: any) => void;
}

export const ClinicEgiszBindingCard: React.FC<ClinicEgiszBindingCardProps> = ({
	clinicProfileDraft,
	updateClinicProfileDraft,
}) => {
	const isEgiszEnabled = Boolean(clinicProfileDraft.egiszEnabled);
	const isAutonomousMode = Boolean(
		clinicProfileDraft.egiszAutonomousMode ?? !clinicProfileDraft.egiszEnabled,
	);
	const oid = clinicProfileDraft.egiszOid || "";
	const isTestMode = Boolean(clinicProfileDraft.egiszTestMode);
	const oidValidation = validateEgiszOid(oid);

	return (
		<article
			className="p-4 sm:p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] space-y-4"
			data-testid="clinic-egisz-binding-card"
		>
			<ClinicEgiszHeader
				isEgiszEnabled={isEgiszEnabled}
				isAutonomousMode={isAutonomousMode}
				updateClinicProfileDraft={updateClinicProfileDraft}
			/>

			<ClinicEgiszAutonomousRow
				isAutonomousMode={isAutonomousMode}
				updateClinicProfileDraft={updateClinicProfileDraft}
			/>

			{isEgiszEnabled && (
				<ClinicEgiszConnectionParams
					oid={oid}
					oidValidation={oidValidation}
					isTestMode={isTestMode}
					certThumbprint={clinicProfileDraft.egiszCertThumbprint || ""}
					updateClinicProfileDraft={updateClinicProfileDraft}
				/>
			)}
		</article>
	);
};

export default ClinicEgiszBindingCard;
