import React from "react";
import { MissingPriceBannerActionButtons } from "./MissingPriceBannerActionButtons";
import { MissingPriceBannerEditingActions } from "./MissingPriceBannerEditingActions";
import type { MissingPriceBannerActionsProps } from "./types";

export const MissingPriceBannerActions: React.FC<MissingPriceBannerActionsProps> = ({
	item,
	state,
	basePrice,
	onApplyBasePrice,
}) => {
	return (
		<div className="flex items-center gap-2 shrink-0 self-end sm:self-auto flex-wrap">
			{state.isEditing ? (
				<MissingPriceBannerEditingActions itemId={item.id} state={state} />
			) : (
				<MissingPriceBannerActionButtons
					item={item}
					state={state}
					basePrice={basePrice}
					onApplyBasePrice={onApplyBasePrice}
				/>
			)}
		</div>
	);
};
