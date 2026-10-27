/**
 * canonicalTemplatesData.ts
 * Unified catalog of canonical clinical document templates.
 * Mandates 8b, 8e, 8x, 8ap: Zero regulatory bird-language, single source of truth.
 */

import { CERTIFICATES_SANPIN_TEMPLATES } from "./certificatesSanpinTemplates";
import { CLINICAL_CARE_TEMPLATES } from "./clinicalCareTemplates";
import { CLINICAL_SURGERY_DIARY_TEMPLATES } from "./clinicalSurgeryDiaryTemplates";
import type { DocumentTemplateItem } from "./documentTemplateTypes";
import { FINANCE_TAX_TEMPLATES } from "./financeTaxTemplates";
import { INTAKE_PRIMARY_TEMPLATES } from "./intakePrimaryTemplates";
import { INTAKE_SPECIALIZED_TEMPLATES } from "./intakeSpecializedTemplates";

export const CANONICAL_TEMPLATES: readonly DocumentTemplateItem[] = [
	...INTAKE_PRIMARY_TEMPLATES,
	...INTAKE_SPECIALIZED_TEMPLATES,
	...CLINICAL_CARE_TEMPLATES,
	...CLINICAL_SURGERY_DIARY_TEMPLATES,
	...FINANCE_TAX_TEMPLATES,
	...CERTIFICATES_SANPIN_TEMPLATES,
];
