import React, { useMemo, memo } from "react";
import type { ToothData } from "./ToothChart";
import { ClassicGostToothCell } from "./ClassicGostToothCell";
import {
	TOP_TEETH_MIXED,
	BOTTOM_TEETH_MIXED,
	UPPER_TEETH_PEDIATRIC,
	LOWER_TEETH_PEDIATRIC,
	UPPER_TEETH_ADULT,
	LOWER_TEETH_ADULT,
	calculateDmft,
	areClassicGostOdontogramPropsEqual,
	type ClassicGostOdontogramProps,
} from "./classicGostTypes";
import { useClassicGostKeyboard } from "./useClassicGostKeyboard";
import { ClassicGostHeader } from "./ClassicGostHeader";
import { ClassicGostGrid } from "./ClassicGostGrid";
import { ClassicGostPresetsBar } from "./ClassicGostPresetsBar";
import { ClassicGostTouchKeypad } from "./ClassicGostTouchKeypad";
import { ClassicGostLegend } from "./ClassicGostLegend";

export * from "./classicGostTypes";
export * from "./ClassicGostToothCell";

export const ClassicGostOdontogram: React.FC<ClassicGostOdontogramProps> = memo(({
	teethData = [] as readonly ToothData[],
	pediatricMode,
	mixedDentition,
	topTeeth: customTopTeeth,
	bottomTeeth: customBottomTeeth,
	selectedTeeth = [],
	activeStamp,
	onToothClick,
	onQuickStateChange,
	useSurfaces = false,
	hideHeader = false,
	hideLegend = false,
	className = "",
}) => {
	const topList = useMemo(
		() => customTopTeeth ?? (mixedDentition ? TOP_TEETH_MIXED : pediatricMode ? UPPER_TEETH_PEDIATRIC : UPPER_TEETH_ADULT),
		[customTopTeeth, mixedDentition, pediatricMode],
	);

	const bottomList = useMemo(
		() => customBottomTeeth ?? (mixedDentition ? BOTTOM_TEETH_MIXED : pediatricMode ? LOWER_TEETH_PEDIATRIC : LOWER_TEETH_ADULT),
		[customBottomTeeth, mixedDentition, pediatricMode],
	);

	const topQ1 = useMemo(() => topList.slice(0, Math.ceil(topList.length / 2)), [topList]);
	const topQ2 = useMemo(() => topList.slice(Math.ceil(topList.length / 2)), [topList]);
	const bottomQ4 = useMemo(() => bottomList.slice(0, Math.ceil(bottomList.length / 2)), [bottomList]);
	const bottomQ3 = useMemo(() => bottomList.slice(Math.ceil(bottomList.length / 2)), [bottomList]);

	const toothStateMap = useMemo(() => {
		const map = new Map<number, (typeof teethData)[number]>();
		for (const t of teethData) map.set(t.toothNumber, t);
		return map;
	}, [teethData]);

	const dmftStats = useMemo(() => calculateDmft(teethData), [teethData]);

	useClassicGostKeyboard({ selectedTeeth, onQuickStateChange, pediatricMode, teethData });

	const renderCell = (num: number, isUpper: boolean) => (
		<ClassicGostToothCell
			key={num}
			toothNumber={num}
			isUpper={isUpper}
			tooth={toothStateMap.get(num)}
			isSelected={selectedTeeth.includes(num)}
			selectedTeeth={selectedTeeth}
			activeStamp={activeStamp}
			onToothClick={onToothClick}
			onQuickStateChange={onQuickStateChange}
			useSurfaces={useSurfaces}
			pediatricMode={pediatricMode}
		/>
	);

	return (
		<div
			className={`tooth-chart-container classic-gost-mode flex flex-col gap-4 w-full px-4 sm:px-6 py-4 bg-[var(--odontogram-paper,#ffffff)] rounded-2xl border border-[var(--odontogram-border-subtle,#e2e8f0)] shadow-xs text-[var(--odontogram-ink)] ${className}`.trim()}
			data-testid="classic-gost-odontogram"
		>
			{!hideHeader && (
				<ClassicGostHeader pediatricMode={pediatricMode} teethData={teethData} dmftStats={dmftStats} />
			)}

			<ClassicGostGrid
				pediatricMode={pediatricMode}
				topQ1={topQ1}
				topQ2={topQ2}
				bottomQ4={bottomQ4}
				bottomQ3={bottomQ3}
				renderCell={renderCell}
			/>

			<ClassicGostPresetsBar
				pediatricMode={pediatricMode}
				allTargetTeeth={[...topList, ...bottomList]}
				onQuickStateChange={onQuickStateChange}
			/>

			<ClassicGostTouchKeypad
				selectedTeeth={selectedTeeth}
				onQuickStateChange={onQuickStateChange}
				pediatricMode={pediatricMode}
				defaultToothFallback={topList[0] || 18}
			/>

			{!hideLegend && <ClassicGostLegend />}
		</div>
	);
}, areClassicGostOdontogramPropsEqual);
ClassicGostOdontogram.displayName = "ClassicGostOdontogram";
