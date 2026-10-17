/**
 * DENTE Dental CRM — Anatomical Quadrant Switcher & Navigation
 * Compliant with Mandate 8b (<= 120 lines).
 */

import React from "react";
import type { OdontogramQuadrantId } from "./ToothChart";
import { MobileQuadrantTabs } from "./MobileQuadrantTabs";
import { DesktopQuadrantStrip } from "./quadrantSwitcher/DesktopQuadrantStrip";
import { QuadrantFocusedHeader } from "./quadrantSwitcher/QuadrantFocusedHeader";

export { QuadrantFocusedHeader };

export interface AnatomicalQuadrantSwitcherProps {
	currentQuadrant: OdontogramQuadrantId;
	onSelectQuadrant: (q: OdontogramQuadrantId) => void;
	isPediatricEffective: boolean;
	isMixedEffective: boolean;
	showWisdomTeeth?: boolean;
	mobileDisplayMode?: "quadrant" | "carousel" | undefined;
	onToggleMobileDisplayMode?: ((mode: "quadrant" | "carousel") => void) | undefined;
}

export const AnatomicalQuadrantSwitcher: React.FC<AnatomicalQuadrantSwitcherProps> = ({
	currentQuadrant,
	onSelectQuadrant,
	isPediatricEffective,
	isMixedEffective,
	showWisdomTeeth = true,
	mobileDisplayMode = "quadrant",
	onToggleMobileDisplayMode,
}) => {
	const allTeethCount = isMixedEffective
		? "24"
		: isPediatricEffective
			? "20"
			: showWisdomTeeth
				? "32"
				: "28";

	return (
		<div className="odontogram-quadrant-bar mb-2 select-none w-full" data-testid="odontogram-quadrant-bar">
			{/* Mobile 2x2 Quadrant Tabs per Apple HIG (< 768px) */}
			<div className="block sm:hidden w-full mb-1">
				<MobileQuadrantTabs
					currentQuadrant={currentQuadrant}
					onSelectQuadrant={onSelectQuadrant}
					isPediatricEffective={isPediatricEffective}
					isMixedEffective={isMixedEffective}
					showAllOption={true}
					mobileDisplayMode={mobileDisplayMode}
					onToggleMobileDisplayMode={onToggleMobileDisplayMode}
				/>
			</div>

			<DesktopQuadrantStrip
				currentQuadrant={currentQuadrant}
				onSelectQuadrant={onSelectQuadrant}
				isPediatricEffective={isPediatricEffective}
				allTeethCount={allTeethCount}
			/>
		</div>
	);
};
