import type React from "react";
import { MobileFilterPopover } from "./MobileFilterPopover.js";
import { MobileThumbActionButtons } from "./MobileThumbActionButtons.js";
import type { MobileRadiologyFilterToolbarProps } from "./types.js";

export * from "./MobileThumbActionButtons.js";

export const MobileRadiologyFilterToolbar: React.FC<
	MobileRadiologyFilterToolbarProps
> = (p) => {
	return (
		<>
			<nav
				className="mobile-radiology-thumb-bar"
				data-testid="mobile-radiology-thumb-bar"
				role="toolbar"
				aria-label="Инструменты управления снимком"
			>
				<MobileThumbActionButtons {...p} />
			</nav>

			<MobileFilterPopover
				isOpen={p.isFilterPopoverOpen}
				brightness={p.brightness}
				contrast={p.contrast}
				enhancementClahe={p.enhancementClahe}
				onChangeBrightness={p.onChangeBrightness}
				onChangeContrast={p.onChangeContrast}
				onToggleClahe={p.onToggleClahe}
				onResetFilters={p.onResetFilters}
				onClose={p.onCloseFilterPopover}
			/>
		</>
	);
};
