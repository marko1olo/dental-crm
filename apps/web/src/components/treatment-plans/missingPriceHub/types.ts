import type React from "react";
import type { TreatmentPlanItem } from "../types";
import type { useMissingPriceAlert } from "../useMissingPriceAlert";

export interface MissingPriceAlertProps {
	readonly item: TreatmentPlanItem;
	readonly onUpdatePrice?: ((itemId: string, newPriceRub: number) => void) | undefined;
	readonly onUpdateItem?: ((updatedItem: TreatmentPlanItem) => void) | undefined;
	readonly onKeepAgreedPrice?: ((itemId: string) => void) | undefined;
	readonly onApplyBundleBasePrice?: ((itemId: string, basePriceRub: number) => void) | undefined;
	readonly bundleBasePriceRub?: number | undefined;
	readonly variant?: "full" | "banner" | "inline" | "compact" | undefined;
	readonly className?: string | undefined;
}

export interface MissingPriceBannerAlertProps {
	readonly item: TreatmentPlanItem;
	readonly state: ReturnType<typeof useMissingPriceAlert>;
	readonly basePrice?: number | undefined;
	readonly onApplyBasePrice?: (() => void) | undefined;
	readonly className?: string | undefined;
}

export interface MissingPriceBannerActionsProps {
	readonly item: TreatmentPlanItem;
	readonly state: ReturnType<typeof useMissingPriceAlert>;
	readonly basePrice?: number | undefined;
	readonly onApplyBasePrice?: (() => void) | undefined;
}

export interface MissingPriceInlineAlertProps {
	readonly item: TreatmentPlanItem;
	readonly state: ReturnType<typeof useMissingPriceAlert>;
	readonly basePrice?: number | undefined;
	readonly onApplyBasePrice?: (() => void) | undefined;
	readonly className?: string | undefined;
}

export interface MissingPriceInlineEditorProps {
	readonly itemId: string;
	readonly inputRef: React.RefObject<HTMLInputElement | null>;
	readonly inputPrice: string;
	readonly setInputPrice: (val: string) => void;
	readonly error: string | null;
	readonly setError: (err: string | null) => void;
	readonly handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
	readonly handleSavePrice: () => void;
	readonly setIsEditing: (isEditing: boolean) => void;
}
