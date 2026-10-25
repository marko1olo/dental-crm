/**
 * apps/web/src/components/settings/clinic/SettingsClinicLegalSection.tsx
 *
 * Facade container for Clinic legal profile, DaData lookup,
 * requisites, medical license, and EGISZ bindings.
 *
 * Facade <= 120 lines.
 */

import React from "react";
import { ClinicLicenseCard } from "./legalModules/ClinicLicenseCard";
import { ClinicRequisitesCard } from "./legalModules/ClinicRequisitesCard";
import { ClinicEgiszBindingCard } from "./legalModules/ClinicEgiszBindingCard";
import { ClinicInnSearchBlock } from "./legalModules/ClinicInnSearchBlock";
import { ClinicBrandingAndSaveBar } from "./legalModules/ClinicBrandingAndSaveBar";
import { ClinicPublicLookupResults } from "./legalModules/ClinicPublicLookupResults";
import type { SettingsClinicLegalSectionProps } from "./legalModules/clinicLegalTypes";

export { type SettingsClinicLegalSectionProps } from "./legalModules/clinicLegalTypes";

export const SettingsClinicLegalSection: React.FC<SettingsClinicLegalSectionProps> = ({
	clinicProfileDraft,
	updateClinicProfileDraft,
	saveClinicProfileFromDraft,
	clinicProfileSaveState,
	lookupClinicPublicProfile,
	isClinicPublicLookupLoading,
	clinicPublicLookup,
	applyClinicLookupSuggestion,
	humanizeMigrationText,
	clinicLookupSuggestionFieldEntries,
	clinicPublicLookupFieldLabels,
}) => {
	const typedSuggestions = clinicPublicLookup?.suggestions ?? [];

	return (
		<section className="clinic-legal-form space-y-4" aria-label="Юридический профиль клиники">
			<div className="clinic-legal-summary">
				<div>
					<p className="eyebrow">Юридический профиль</p>
					<h3>Реквизиты клиники для договоров и кассовых чеков</h3>
				</div>
			</div>

			<ClinicInnSearchBlock
				clinicProfileDraft={clinicProfileDraft}
				updateClinicProfileDraft={updateClinicProfileDraft}
				lookupClinicPublicProfile={lookupClinicPublicProfile}
				isClinicPublicLookupLoading={isClinicPublicLookupLoading}
			/>

			<ClinicRequisitesCard
				clinicProfileDraft={clinicProfileDraft}
				updateClinicProfileDraft={updateClinicProfileDraft}
			/>

			<ClinicLicenseCard
				clinicProfileDraft={clinicProfileDraft}
				updateClinicProfileDraft={updateClinicProfileDraft}
			/>

			<ClinicEgiszBindingCard
				clinicProfileDraft={clinicProfileDraft}
				updateClinicProfileDraft={updateClinicProfileDraft}
			/>

			<ClinicBrandingAndSaveBar
				clinicProfileDraft={clinicProfileDraft}
				updateClinicProfileDraft={updateClinicProfileDraft}
				saveClinicProfileFromDraft={saveClinicProfileFromDraft}
				clinicProfileSaveState={clinicProfileSaveState}
			/>

			<ClinicPublicLookupResults
				clinicPublicLookup={clinicPublicLookup}
				typedSuggestions={typedSuggestions}
				humanizeMigrationText={humanizeMigrationText}
				clinicLookupSuggestionFieldEntries={clinicLookupSuggestionFieldEntries}
				clinicPublicLookupFieldLabels={clinicPublicLookupFieldLabels}
				applyClinicLookupSuggestion={applyClinicLookupSuggestion}
			/>
		</section>
	);
};

export default SettingsClinicLegalSection;
