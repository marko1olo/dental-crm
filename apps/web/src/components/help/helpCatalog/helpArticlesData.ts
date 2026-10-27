/**
 * DENTE CRM — Aggregated Clinical Knowledge Base Articles & Guides
 * Authority: Mandate 8b (<= 120 lines), Mandate 8l (Red Team Knowledge Hub)
 */

import { CLINICAL_SECTION_GUIDES } from "./helpClinicalGuidesData";
import { FINANCE_DIAGNOSTICS_GUIDES } from "./helpFinanceDiagnosticsData";
import { INFRASTRUCTURE_GUIDES } from "./helpInfrastructureData";
import type {
	ClinicalGuideCategory,
	ClinicalGuideMeta,
	ClinicalGuideTab,
} from "./helpTypes";

export const CLINICAL_GUIDES: readonly ClinicalGuideMeta[] = [
	...CLINICAL_SECTION_GUIDES,
	...FINANCE_DIAGNOSTICS_GUIDES,
	...INFRASTRUCTURE_GUIDES,
];

export function getGuideById(id: ClinicalGuideTab): ClinicalGuideMeta | undefined {
	return CLINICAL_GUIDES.find((g) => g.id === id);
}

export function getGuidesByCategory(
	category: ClinicalGuideCategory,
): ClinicalGuideMeta[] {
	return CLINICAL_GUIDES.filter((g) => g.category === category);
}

export { CLINICAL_SECTION_GUIDES } from "./helpClinicalGuidesData";
export { FINANCE_DIAGNOSTICS_GUIDES } from "./helpFinanceDiagnosticsData";
export { INFRASTRUCTURE_GUIDES } from "./helpInfrastructureData";
