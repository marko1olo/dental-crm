import type { SomaticSafetyInput } from "@dental/shared";

export interface SomaticSafetyAlertWidgetProps {
	/** Patient record or safety profile input */
	readonly patient?: SomaticSafetyInput | string | null | undefined;
	/** Optional allergy text override (e.g. from activePatientAllergyText) */
	readonly allergyText?: string | null | undefined;
	/** Callback when doctor applies/confirms 1-click physiological norm */
	readonly onApplyNorm?: ((updatedDiarySnippet: string) => void) | undefined;
	/** Callback when doctor syncs stop-factors warning snippet into diary */
	readonly onSyncToDiary?: ((diarySnippet: string) => void) | undefined;
	/** Callback to open full anamnesis modal */
	readonly onOpenAnamnesisModal?: (() => void) | undefined;
	/** Presentation variant */
	readonly variant?: "header" | "card" | "inline";
	/** Additional styling classes */
	readonly className?: string;
	/** Suppress redundant norm button when a primary CTA norm button is already rendered nearby */
	readonly hideNormButton?: boolean;
}
