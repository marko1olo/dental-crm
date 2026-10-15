import React from "react";
import type { TreatmentPlanItem } from "./types";
import { useMissingPriceAlert } from "./useMissingPriceAlert";
import { MissingPriceInlineAlert } from "./MissingPriceInlineAlert";
import { MissingPriceBannerAlert } from "./MissingPriceBannerAlert";

export interface MissingPriceAlertProps {
	readonly item: TreatmentPlanItem;
	readonly onUpdatePrice?: ((itemId: string, newPriceRub: number) => void) | undefined;
	readonly onUpdateItem?: ((updatedItem: TreatmentPlanItem) => void) | undefined;
	readonly onKeepAgreedPrice?: ((itemId: string) => void) | undefined;
	readonly variant?: "full" | "inline" | "compact" | undefined;
	readonly className?: string | undefined;
}

/**
 * MissingPriceAlert — Предупреждение о ненайденной услуге в прайс-листе клиники
 * с возможностью мгновенного инлайн-ввода договорной цены или установки
 * 100% гарантийной переделки (0 ₽) в 1 клик согласно Мандату 8e (Автономия врача).
 * Декомпозирован строго по Мандату 8b (лимит <= 120 строк).
 */
export const MissingPriceAlert: React.FC<MissingPriceAlertProps> = (props) => {
	const {
		item,
		onUpdatePrice,
		onUpdateItem,
		onKeepAgreedPrice,
		variant = "full",
		className = "",
	} = props;
	const state = useMissingPriceAlert({
		item,
		onUpdatePrice,
		onUpdateItem,
		onKeepAgreedPrice,
	});

	if (!state.isMissingPrice && !state.isEditing) {
		return null;
	}

	if (variant === "compact" || variant === "inline") {
		return <MissingPriceInlineAlert item={item} state={state} className={className} />;
	}

	return <MissingPriceBannerAlert item={item} state={state} className={className} />;
};

export default MissingPriceAlert;
