import type { ConsentSubstitutionContext, renderConsentTemplate } from "../../../consents/consentTemplates";
import type { ClinicalConsentConfig, ConsentStatusType, ConsentRecordState } from "./../visitConsentTypes";

export interface ConsentItemRowProps {
	readonly item: ClinicalConsentConfig & {
		status: ConsentStatusType;
		record?: ConsentRecordState | undefined;
		renderedTemplate: ReturnType<typeof renderConsentTemplate> | null;
	};
	readonly isExpanded: boolean;
	readonly onToggleExpand: () => void;
	readonly onTogglePaperSigned: () => void;
	readonly onPrintSingleFilled: () => void;
	readonly onPrintSingleBlank: () => void;
	readonly onOpenTabletModal?: (() => void) | undefined;
	readonly substitutionContext: ConsentSubstitutionContext;
	readonly isDropdownOpen: boolean;
	readonly onToggleDropdown: () => void;
	readonly onCloseDropdown: () => void;
}
