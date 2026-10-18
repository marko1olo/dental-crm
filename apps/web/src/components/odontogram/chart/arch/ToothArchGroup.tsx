import type React from "react";
import { memo } from "react";
import { ToothSVG } from "../ToothSvg";
import type { ToothData, ToothState, RootResorptionStage } from "../toothChartTypes";

export interface ToothArchGroupProps {
	teeth: readonly number[];
	toothDataMap: Map<number, ToothData>;
	scale: number;
	useSurfaces?: boolean | undefined;
	showPulpAndCanals?: boolean | undefined;
	showPeriapicalHalos?: boolean | undefined;
	showPeriodontalBoneLoss?: boolean | undefined;
	selectedTeeth: number[];
	activeStamp?: ToothState | null | undefined;
	handleToothClick: (e: React.MouseEvent, num: number, surface?: string) => void;
	onQuickStateChange?: ((targets: number[], state: ToothState, surfaces?: readonly string[] | undefined) => void) | undefined;
	onResorptionChange?: ((targets: number[], stage: RootResorptionStage) => void) | undefined;
	pediatricMode?: boolean | undefined;
	className?: string;
}

export const ToothArchGroup: React.FC<ToothArchGroupProps> = memo(({
	teeth,
	toothDataMap,
	scale,
	useSurfaces,
	showPulpAndCanals,
	showPeriapicalHalos,
	showPeriodontalBoneLoss,
	selectedTeeth,
	activeStamp,
	handleToothClick,
	onQuickStateChange,
	onResorptionChange,
	pediatricMode,
	className,
}) => {
	return (
		<div className={className}>
			{(Array.isArray(teeth) ? teeth : []).map((num) => {
				const tData = toothDataMap.get(num);
				return (
					<ToothSVG
						key={num}
						number={num}
						scale={scale}
						state={tData ? tData.state : "Healthy"}
						material={tData?.material}
						canalObturation={tData?.canalObturation}
						hasPost={tData?.hasPost}
						postType={tData?.postType}
						boneLossLevel={tData?.boneLossLevel}
						boneLossType={tData?.boneLossType}
						rootResorptionStage={tData?.rootResorptionStage ?? tData?.rootResorption}
						periapicalLesion={tData?.periapicalLesion}
						pocketDepth={tData?.pocketDepth}
						pocketDepthMm={tData?.pocketDepthMm}
						maxPocketDepth={tData?.maxPocketDepth}
						surfaces={tData?.surfaces}
						useSurfaces={useSurfaces}
						showPulpAndCanals={showPulpAndCanals}
						showPeriapicalHalos={showPeriapicalHalos}
						showPeriodontalBoneLoss={showPeriodontalBoneLoss}
						isSelected={selectedTeeth.includes(num)}
						selectedTeeth={selectedTeeth}
						activeStamp={activeStamp}
						onClick={handleToothClick}
						onQuickStateChange={onQuickStateChange}
						onResorptionChange={onResorptionChange}
						pediatricMode={pediatricMode}
						stageBadge={tData?.stageBadge}
					/>
				);
			})}
		</div>
	);
});
ToothArchGroup.displayName = "ToothArchGroup";
