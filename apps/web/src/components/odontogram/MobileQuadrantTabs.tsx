/**
 * apps/web/src/components/odontogram/MobileQuadrantTabs.tsx
 *
 * DENTE Dental CRM — Apple HIG Mobile Quadrant Selector (Mandate 8c, MOBILE_DESIGN_APPLE_HIG §3.3)
 * Replaces the cramped 16-tooth dual-arch with an ergonomic 2x2 matrix for smartphone thumb zones.
 */

import type React from "react";
import { memo, useMemo } from "react";
import { triggerHaptic } from "../../native/mobileBridge";
import type { OdontogramQuadrantId } from "./chart/toothChartTypes";
import { buildMobileQuadrants } from "./mobileQuadrantData";
import { MobileQuadrantTopBar } from "./MobileQuadrantTopBar";
import { MobileQuadrantGrid } from "./MobileQuadrantGrid";

export interface MobileQuadrantTabsProps {
	readonly currentQuadrant: OdontogramQuadrantId;
	readonly onSelectQuadrant: (q: OdontogramQuadrantId) => void;
	readonly isPediatricEffective: boolean;
	readonly isMixedEffective?: boolean | undefined;
	readonly showAllOption?: boolean | undefined;
	readonly className?: string | undefined;
	readonly mobileDisplayMode?: "quadrant" | "carousel" | undefined;
	readonly onToggleMobileDisplayMode?: ((mode: "quadrant" | "carousel") => void) | undefined;
}

export const MobileQuadrantTabs: React.FC<MobileQuadrantTabsProps> = memo(
	({
		currentQuadrant,
		onSelectQuadrant,
		isPediatricEffective,
		isMixedEffective = false,
		showAllOption = true,
		className = "",
		mobileDisplayMode = "quadrant",
		onToggleMobileDisplayMode,
	}) => {
		const allTeethCount = isMixedEffective ? "24" : isPediatricEffective ? "20" : "32";

		const handleSelect = (q: OdontogramQuadrantId) => {
			triggerHaptic("selection");
			onSelectQuadrant(q);
		};

		const quadrants = useMemo(
			() => buildMobileQuadrants(isPediatricEffective),
			[isPediatricEffective],
		);

		return (
			<div
				className={`mobile-quadrant-tabs-container w-full flex flex-col gap-1.5 p-1.5 rounded-2xl bg-[var(--odontogram-surface,var(--paper-soft))] border border-[var(--odontogram-border-subtle,var(--line))] shadow-2xs select-none ${className}`.trim()}
				data-testid="mobile-quadrant-tabs"
			>
				<MobileQuadrantTopBar
					mobileDisplayMode={mobileDisplayMode}
					onToggleMobileDisplayMode={onToggleMobileDisplayMode}
					showAllOption={showAllOption}
					currentQuadrant={currentQuadrant}
					allTeethCount={allTeethCount}
					onSelectQuadrant={handleSelect}
				/>
				<MobileQuadrantGrid
					quadrants={quadrants}
					currentQuadrant={currentQuadrant}
					onSelectQuadrant={handleSelect}
				/>
			</div>
		);
	},
);

MobileQuadrantTabs.displayName = "MobileQuadrantTabs";
