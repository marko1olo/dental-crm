import { CONSENTS_BASE_STYLES } from "./consentsBaseStyles";
import { CONSENTS_BUTTON_STYLES } from "./consentsButtonStyles";
import { CONSENTS_DROPDOWN_STYLES } from "./consentsDropdownStyles";
import { CONSENTS_PACKAGE_BANNER_STYLES } from "./consentsPackageBannerStyles";
import { CONSENTS_CARD_STYLES } from "./consentsCardStyles";
import { CONSENTS_PREVIEW_STYLES } from "./consentsPreviewStyles";

export const COMBINED_VISIT_CONSENTS_STYLES = [
	CONSENTS_BASE_STYLES,
	CONSENTS_BUTTON_STYLES,
	CONSENTS_DROPDOWN_STYLES,
	CONSENTS_PACKAGE_BANNER_STYLES,
	CONSENTS_CARD_STYLES,
	CONSENTS_PREVIEW_STYLES,
].join("\n");
