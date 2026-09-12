import React from "react";
import {
	SurgeryVisitCockpit as CanonicalSurgeryVisitCockpit,
	type SurgeryVisitCockpitProps,
} from "../../surgery/SurgeryVisitCockpit";

/**
 * SurgeryVisitCockpit.tsx — Facade-delegate to canonical surgery domain.
 * Mandate 8s: Single Indivisible Authority.
 */
export const SurgeryVisitCockpit: React.FC<SurgeryVisitCockpitProps> = (props) => {
	return <CanonicalSurgeryVisitCockpit {...props} />;
};

export default SurgeryVisitCockpit;
export type { SurgeryVisitCockpitProps };
