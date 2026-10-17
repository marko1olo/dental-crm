import type React from "react";
import { memo, useMemo, useRef } from "react";
import { triggerHaptic } from "../../../native/mobileBridge";
import { SurfaceSelector } from "./SurfaceSelector";
import {
	type ToothData,
	type ToothState,
	TOP_TEETH,
	BOTTOM_TEETH,
	PEDIATRIC_TOP_TEETH,
	PEDIATRIC_BOTTOM_TEETH,
} from "./toothChartTypes";
import { ToothCarouselHeader } from "./carousel/ToothCarouselHeader";
import { ToothCarouselPathologyGrid } from "./carousel/ToothCarouselPathologyGrid";
import { ToothCarouselStage } from "./carousel/ToothCarouselStage";

export interface ToothCarouselFocusProps {
	readonly toothNumber: number;
	readonly toothDataMap: Map<number, ToothData>;
	readonly isPediatricEffective: boolean;
	readonly pediatricMode?: boolean | undefined;
	readonly onSelectTooth: (num: number) => void;
	readonly onOpenStatusSheet: (num: number, rect?: DOMRect) => void;
	readonly onQuickStateChange?: ((targets: number[], state: ToothState, surfaces?: readonly string[]) => void) | undefined;
	readonly onSurfacesChange?: ((targets: number[], surfaces: readonly string[]) => void) | undefined;
	readonly showPulpAndCanals?: boolean | undefined;
	readonly showPeriapicalHalos?: boolean | undefined;
	readonly showPeriodontalBoneLoss?: boolean | undefined;
	readonly useSurfaces?: boolean | undefined;
}

export const ToothCarouselFocus: React.FC<ToothCarouselFocusProps> = memo(({
	toothNumber,
	toothDataMap,
	isPediatricEffective,
	onSelectTooth,
	onOpenStatusSheet,
	onQuickStateChange,
	onSurfacesChange,
	showPulpAndCanals,
	showPeriapicalHalos,
	showPeriodontalBoneLoss,
	useSurfaces = true,
}) => {
	const stageRef = useRef<HTMLDivElement>(null);
	const allTeeth: number[] = useMemo(() => (
		isPediatricEffective ? [...PEDIATRIC_TOP_TEETH, ...PEDIATRIC_BOTTOM_TEETH] : [...TOP_TEETH, ...BOTTOM_TEETH]
	), [isPediatricEffective]);

	const safeIdx = Math.max(0, allTeeth.indexOf(toothNumber));
	const prevTooth = allTeeth[(safeIdx - 1 + allTeeth.length) % allTeeth.length] ?? 11;
	const nextTooth = allTeeth[(safeIdx + 1) % allTeeth.length] ?? 11;
	const currentToothData = toothDataMap.get(toothNumber);
	const currentState = currentToothData?.state ?? "Healthy";
	const currentSurfaces = currentToothData?.surfaces ?? [];

	const handleFastState = (state: ToothState) => {
		triggerHaptic("success");
		const surfs = state === "Caries" && currentSurfaces.length === 0 ? ["O"] : currentSurfaces;
		onQuickStateChange?.([toothNumber], state, surfs);
	};

	const handleSurfacesChange = (newSurfaces: string[]) => {
		triggerHaptic("selection");
		onSurfacesChange?.([toothNumber], newSurfaces);
		const nextState = newSurfaces.length > 0 && currentState === "Healthy" ? "Caries" : currentState;
		onQuickStateChange?.([toothNumber], nextState, newSurfaces);
	};

	return (
		<div className="tooth-carousel-focus-container w-full flex flex-col items-center gap-3 select-none" data-testid="tooth-carousel-focus">
			<ToothCarouselHeader toothNumber={toothNumber} currentState={currentState} />
			<ToothCarouselStage
				stageRef={stageRef}
				toothNumber={toothNumber}
				prevTooth={prevTooth}
				nextTooth={nextTooth}
				currentState={currentState}
				currentToothData={currentToothData}
				currentSurfaces={currentSurfaces}
				useSurfaces={useSurfaces}
				showPulpAndCanals={showPulpAndCanals}
				showPeriapicalHalos={showPeriapicalHalos}
				showPeriodontalBoneLoss={showPeriodontalBoneLoss}
				isPediatricEffective={isPediatricEffective}
				handlePrev={() => { triggerHaptic("selection"); onSelectTooth(prevTooth); }}
				handleNext={() => { triggerHaptic("selection"); onSelectTooth(nextTooth); }}
				handleStageClick={() => {
					triggerHaptic("heavy");
					onOpenStatusSheet(toothNumber, stageRef.current?.getBoundingClientRect());
				}}
			/>
			{useSurfaces && (
				<div className="flex flex-col items-center gap-1 p-2 rounded-xl bg-[var(--odontogram-paper)] border border-[var(--odontogram-border-subtle)] w-full max-w-sm">
					<span className="text-[11px] font-bold text-[var(--odontogram-ink-muted)]">Поверхности коронки (O, M, D, V, L):</span>
					<SurfaceSelector selected={currentSurfaces} onChange={handleSurfacesChange} size={85} showPresets={true} />
				</div>
			)}
			<ToothCarouselPathologyGrid currentState={currentState} handleFastState={handleFastState} />
		</div>
	);
});
ToothCarouselFocus.displayName = "ToothCarouselFocus";
