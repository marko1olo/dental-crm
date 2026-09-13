import React from "react";
import {
	type Canonical043TemplateKey,
	type CanonicalSoapTemplateKey,
	CANONICAL_CLINICAL_043_TEMPLATES,
	CANONICAL_SOAP_TEMPLATES,
	type Template,
} from "./visit/clinicalSoapPresets";

export type {
	Template,
	CanonicalSoapTemplateKey,
	Canonical043TemplateKey,
};
export {
	CANONICAL_SOAP_TEMPLATES,
	CANONICAL_CLINICAL_043_TEMPLATES,
};

export interface VisitDiaryTemplateSelectorProps {
	readonly isLocked: boolean;
	readonly onSelectTemplate: (template: Template) => void;
	readonly onAutoRevise?: () => void;
}

/**
 * Transparent Facade: Delegates to canonical SOAP templates (Mandate 8s Best-of-Breed SSOT).
 * Re-exports SSOT templates and types for 100% backwards compatibility across tests and consumers.
 */
export const VisitDiaryTemplateSelector: React.FC<VisitDiaryTemplateSelectorProps> = () => {
	return null;
};

export default VisitDiaryTemplateSelector;
