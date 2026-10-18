import type React from "react";
import { memo } from "react";
import type { OdontogramQuadrantId } from "./toothChartTypes";
import { MobileQuadrantTabs } from "../MobileQuadrantTabs";
import { ToothChartQuadrantBar } from "./toolbar/ToothChartQuadrantBar";
import { ToothChartExpressActions } from "./toolbar/ToothChartExpressActions";

export interface ToothChartToolbarProps {
	hideExpressActions?: boolean | undefined;
	hideQuadrantSwitcher?: boolean | undefined;
	currentQuadrant: OdontogramQuadrantId;
	isPediatricEffective: boolean;
	isMixedEffective: boolean;
	pediatricMode?: boolean | undefined;
	handleMarkIntactDentition: () => void;
	handleMarkProHygieneDone: () => void;
	handleApplyFastCariesK021: () => void;
	handleMarkWisdomTeethMissing: () => void;
	handleMarkMolarsMissing: () => void;
	handleMarkFrontIntact: () => void;
	handleSelectQuadrant: (q: OdontogramQuadrantId) => void;
	mobileDisplayMode?: "quadrant" | "carousel" | undefined;
	onToggleMobileDisplayMode?: ((mode: "quadrant" | "carousel") => void) | undefined;
}

export const ToothChartToolbar: React.FC<ToothChartToolbarProps> = memo(({
	hideExpressActions,
	hideQuadrantSwitcher,
	currentQuadrant,
	isPediatricEffective,
	isMixedEffective,
	handleMarkIntactDentition,
	handleMarkProHygieneDone,
	handleApplyFastCariesK021,
	handleMarkWisdomTeethMissing,
	handleMarkMolarsMissing,
	handleMarkFrontIntact,
	handleSelectQuadrant,
	mobileDisplayMode,
	onToggleMobileDisplayMode,
}) => {
	return (
		<div className="tooth-chart-toolbar-wrapper w-full flex flex-col gap-1 mb-1">
			{/* Mobile 2x2 Quadrant Tabs per Apple HIG (< 768px) */}
			{!hideQuadrantSwitcher && (
				<div className="block sm:hidden w-full">
					<MobileQuadrantTabs
						currentQuadrant={currentQuadrant}
						onSelectQuadrant={handleSelectQuadrant}
						isPediatricEffective={isPediatricEffective}
						isMixedEffective={isMixedEffective}
						showAllOption={true}
						mobileDisplayMode={mobileDisplayMode}
						onToggleMobileDisplayMode={onToggleMobileDisplayMode}
					/>
				</div>
			)}

			<div
				className="odontogram-unified-toolbar mb-0.5 select-none flex items-center justify-between gap-1.5 flex-nowrap overflow-x-auto no-scrollbar min-h-[32px] sm:min-h-[36px] sm:h-9 py-0.5"
				data-testid="tooth-chart-express-actions"
			>
				{!hideQuadrantSwitcher && (
					<div className="odontogram-quadrant-bar min-h-[32px] contents">
						<ToothChartQuadrantBar
							currentQuadrant={currentQuadrant}
							isPediatricEffective={isPediatricEffective}
							isMixedEffective={isMixedEffective}
							handleSelectQuadrant={handleSelectQuadrant}
						/>
					</div>
				)}

				{!hideQuadrantSwitcher && !hideExpressActions && (
					<div className="h-4 w-px bg-[var(--line-strong,#cbd5e1)] dark:bg-white/20 mx-0.5 shrink-0 hidden sm:block" />
				)}

				{!hideExpressActions && (
					<ToothChartExpressActions
						isPediatricEffective={isPediatricEffective}
						handleMarkIntactDentition={handleMarkIntactDentition}
						handleMarkProHygieneDone={handleMarkProHygieneDone}
						handleApplyFastCariesK021={handleApplyFastCariesK021}
						handleMarkWisdomTeethMissing={handleMarkWisdomTeethMissing}
						handleMarkMolarsMissing={handleMarkMolarsMissing}
						handleMarkFrontIntact={handleMarkFrontIntact}
					/>
				)}
			</div>
		</div>
	);
});
ToothChartToolbar.displayName = "ToothChartToolbar";
