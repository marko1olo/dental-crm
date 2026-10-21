import React, { useMemo } from "react";
import { createPriceUpdatedPlanItem } from "../missingPriceItemUtils";
import { DENTAL_SERVICES_CATALOG } from "../treatmentPlanServicesCatalog";
import { useMissingPriceAlert } from "../useMissingPriceAlert";
import { MissingPriceBannerAlert } from "./MissingPriceBannerAlert";
import { MissingPriceInlineAlert } from "./MissingPriceInlineAlert";
import type { MissingPriceAlertProps } from "./types";

export const MissingPriceAlertHubView: React.FC<MissingPriceAlertProps> = ({
	item,
	onUpdatePrice,
	onUpdateItem,
	onKeepAgreedPrice,
	onApplyBundleBasePrice,
	bundleBasePriceRub,
	variant = "full",
	className = "",
}) => {
	const state = useMissingPriceAlert({
		item,
		onUpdatePrice,
		onUpdateItem,
		onKeepAgreedPrice,
	});

	const resolvedBasePrice = useMemo(() => {
		if (bundleBasePriceRub && bundleBasePriceRub > 0) return bundleBasePriceRub;
		if (item.unitPriceRub && item.unitPriceRub > 0) return item.unitPriceRub;
		if (item.currentCatalogPriceRub && item.currentCatalogPriceRub > 0) return item.currentCatalogPriceRub;
		const catalogCode = item.serviceCode || item.code804n;
		if (catalogCode && DENTAL_SERVICES_CATALOG[catalogCode]) {
			return DENTAL_SERVICES_CATALOG[catalogCode]!.defaultPriceRub;
		}
		return undefined;
	}, [bundleBasePriceRub, item.unitPriceRub, item.currentCatalogPriceRub, item.serviceCode, item.code804n]);

	const handleApplyBasePrice = () => {
		if (!resolvedBasePrice || resolvedBasePrice <= 0) return;
		state.setError(null);
		state.setIsEditing(false);
		if (onApplyBundleBasePrice) {
			onApplyBundleBasePrice(item.id, resolvedBasePrice);
		} else if (onUpdatePrice) {
			onUpdatePrice(item.id, resolvedBasePrice);
		}
		if (onUpdateItem) {
			onUpdateItem(createPriceUpdatedPlanItem(item, resolvedBasePrice));
		}
	};

	if (!state.isMissingPrice && !state.isEditing) {
		return null;
	}

	if (variant === "compact" || variant === "inline") {
		return (
			<MissingPriceInlineAlert
				item={item}
				state={state}
				basePrice={resolvedBasePrice}
				onApplyBasePrice={resolvedBasePrice ? handleApplyBasePrice : undefined}
				className={className}
			/>
		);
	}

	return (
		<MissingPriceBannerAlert
			item={item}
			state={state}
			basePrice={resolvedBasePrice}
			onApplyBasePrice={resolvedBasePrice ? handleApplyBasePrice : undefined}
			className={className}
		/>
	);
};
