/**
 * DENTE Dental CRM — Leads Conversion Patient Fields (Layer 4)
 * Mandate 8l (Zero Attribution Loss) & Mandate 8x/8ap (Human Clinical Language), Mandate 8b (<= 120 lines)
 */

import React from "react";
import { LeadConvertAttributionCard } from "./LeadConvertAttributionCard";
import { LeadConvertConsentSection } from "./LeadConvertConsentSection";
import type { LeadConvertPatientFieldsProps } from "./leadConvertTypes";

export const LeadConvertPatientFields: React.FC<LeadConvertPatientFieldsProps> = ({
	lead,
	borderColor,
	consentMedical,
	setConsentMedical,
	consentMarketing,
	setConsentMarketing,
}) => {
	return (
		<>
			{lead && <LeadConvertAttributionCard lead={lead} borderColor={borderColor} />}

			<LeadConvertConsentSection
				borderColor={borderColor}
				consentMedical={consentMedical}
				setConsentMedical={setConsentMedical}
				consentMarketing={consentMarketing}
				setConsentMarketing={setConsentMarketing}
			/>
		</>
	);
};
