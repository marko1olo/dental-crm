import type React from "react";
import { memo } from "react";
import { MobileQuadrantTabs } from "../MobileQuadrantTabs";
import { ToothChartExpressActions } from "./toolbar/ToothChartExpressActions";
import { ToothChartQuadrantBar } from "./toolbar/ToothChartQuadrantBar";
import type { OdontogramQuadrantId } from "./toothChartTypes";

export interface ToothChartToolbarProps {
	hideExpressActions?: boolean | undefined;
	hideQuadrantSwitcher?: boolean | undefined;
	hideDentitionSwitcher?: boolean | undefined;
	currentQuadrant: OdontogramQuadrantId;
	isPediatricEffective: boolean;
	isMixedEffective: boolean;
	pediatricMode?: boolean | undefined;
	dentitionMode?: "adult" | "pediatric" | "mixed" | undefined;
	onDentitionModeChange?: ((mode: "adult" | "pediatric" | "mixed") => void) | undefined;
	handleMarkIntactDentition: () => void;
	handleMarkProHygieneDone: () => void;
	handleApplyFastCariesK021: () => void;
	handleMarkWisdomTeethMissing: () => void;
	handleMarkMolarsMissing: () => void;
	handleMarkFrontIntact: () => void;
	handleSelectQuadrant: (q: OdontogramQuadrantId) => void;
	mobileDisplayMode?: "quadrant" | "carousel" | undefined;
	onToggleMobileDisplayMode?:
		| ((mode: "quadrant" | "carousel") => void)
		| undefined;
}

export const ToothChartToolbar: React.FC<ToothChartToolbarProps> = memo(
	({
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
		const showDesktopExpress = !hideExpressActions;
		const showDesktopQuadrant = !hideQuadrantSwitcher;
		const showDesktopBar = showDesktopExpress || showDesktopQuadrant;

		return (
			<div className="tooth-chart-toolbar-wrapper w-full flex flex-col gap-1 mb-1">
				{/* Mobile 2x2 Quadrant Tabs per Apple HIG (< 768px) - ALWAYS available on mobile */}
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

				{showDesktopBar && (
					<div
						className="odontogram-unified-toolbar mb-0.5 select-none hidden sm:flex items-center justify-between gap-1.5 flex-nowrap overflow-x-auto no-scrollbar min-h-[32px] sm:min-h-[36px] sm:h-9 py-0.5"
						data-testid="tooth-chart-express-actions"
					>
						{showDesktopQuadrant && (
							<div className="odontogram-quadrant-bar min-h-[32px] contents">
								<ToothChartQuadrantBar
									currentQuadrant={currentQuadrant}
									isPediatricEffective={isPediatricEffective}
									isMixedEffective={isMixedEffective}
									handleSelectQuadrant={handleSelectQuadrant}
								/>
							</div>
						)}

						{showDesktopQuadrant && showDesktopExpress && (
							<div className="h-4 w-px bg-[var(--line-strong,#cbd5e1)] dark:bg-white/20 mx-0.5 shrink-0 hidden sm:block" />
						)}

						{showDesktopExpress && (
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
				)}
			</div>
		);
	},
);
ToothChartToolbar.displayName = "ToothChartToolbar";
