/**
 * tabs/DocumentFormSwitch.tsx
 * Modular document forms switch router (Mandate 8b <= 120 lines, Mandate 8e, Mandate 8x)
 */

import React from "react";
import type { DocumentFormSwitchProps } from "./formSwitch/documentFormSwitchTypes";
import { ClinicalDocumentForms } from "./formSwitch/ClinicalDocumentForms";
import { ConsentDocumentForms } from "./formSwitch/ConsentDocumentForms";
import { FinancialDocumentForms } from "./formSwitch/FinancialDocumentForms";

export type { DocumentFormSwitchProps } from "./formSwitch/documentFormSwitchTypes";

export const DocumentFormSwitch: React.FC<DocumentFormSwitchProps> = React.memo(
	function DocumentFormSwitch(props) {
		return (
			<section className="document-factory-form">
				<ClinicalDocumentForms {...props} />
				<ConsentDocumentForms {...props} />
				<FinancialDocumentForms {...props} />
			</section>
		);
	},
);
