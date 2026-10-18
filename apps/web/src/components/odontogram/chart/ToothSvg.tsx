import type React from "react";
import { useCallback, memo } from "react";
import { getToothConfig, getToothPath } from "../../../utils/math/toothGeometry";
import { getToothFolkAndAnatomicalNameRu } from "../../../lib/clinicalProtocols043";
import { useIsTouchScreen } from "../useIsTouchScreen";
import { isPrimaryTooth, getPrimaryToothResorptionVisual } from "../pediatricDentitionEngine";
import { getPeriodontalBoneLevelPath } from "../anatomicalToothGeometries";
import { TOOTH_STATE_LABELS, scaleCssPx } from "./toothChartTypes";
import { getToothColors } from "./ToothColors";
import { ToothImplantGraphic } from "./ToothImplantGraphic";
import { ToothStandardGraphic } from "./ToothStandardGraphic";
import { ToothNumberBadge } from "./tooth/ToothNumberBadge";
import { ToothTouchSurfaceHud } from "./tooth/ToothTouchSurfaceHud";
import { useToothSvgKeyboard } from "./tooth/useToothSvgKeyboard";
import { areToothSvgPropsEqual } from "./tooth/toothSvgPropsEqual";
import type { ToothSvgProps } from "./tooth/toothSvgProps";

export type { ToothSvgProps };

export const ToothSVG: React.FC<ToothSvgProps> = memo(({
	number, state, scale, material, canalObturation, hasPost, postType,
	boneLossLevel, boneLossType, rootResorptionStage, periapicalLesion,
	pocketDepth, pocketDepthMm, maxPocketDepth, isSelected, selectedTeeth,
	activeStamp, onClick, onQuickStateChange, onResorptionChange, pediatricMode,
	surfaces, useSurfaces, showPulpAndCanals, showPeriapicalHalos = true, showPeriodontalBoneLoss = true,
}: ToothSvgProps) => {
	const effectivePocketDepth = pocketDepth ?? pocketDepthMm ?? maxPocketDepth;
	const isTop = number < 30 || (number >= 51 && number <= 65);
	const isPrimary = isPrimaryTooth(number);
	const resorptionVisual = isPrimary && rootResorptionStage !== undefined
		? getPrimaryToothResorptionVisual(number, rootResorptionStage) : null;
	const geom = getToothPath(number);
	const cfg = getToothConfig(number);
	const colors = getToothColors(state, material);
	const isTouchScreen = useIsTouchScreen();

	const isRightSide = (number >= 21 && number <= 28) || (number >= 31 && number <= 38) || (number >= 61 && number <= 65) || (number >= 71 && number <= 75);
	const transform = `scaleX(${isRightSide ? -1 : 1})`;
	const boneLossInfo = showPeriodontalBoneLoss && (boneLossLevel !== undefined && boneLossLevel > 0)
		? getPeriodontalBoneLevelPath(number, boneLossLevel, boneLossType ?? "horizontal") : null;

	const handleSurfaceClick = useCallback((e: React.MouseEvent<SVGGElement>) => {
		const target = (e.target as Element).closest("[data-surface]");
		if (target) {
			const surf = target.getAttribute("data-surface");
			e.stopPropagation();
			onClick(e as unknown as React.MouseEvent, number, surf && (useSurfaces || e.shiftKey || e.altKey) ? surf : undefined);
		}
	}, [onClick, number, useSurfaces]);

	const onKeyDown = useToothSvgKeyboard({ number, state, surfaces, useSurfaces, selectedTeeth, pediatricMode, onQuickStateChange });
	const badgeProps = { number, isTop, isPrimary, state, colors, isSelected, surfaces, useSurfaces, selectedTeeth, rootResorptionStage, resorptionVisual, effectivePocketDepth, activeStamp, onQuickStateChange, onResorptionChange };

	return (
		<div
			role="button"
			tabIndex={0}
			className={`tooth-svg-wrapper group ${isTop ? "top" : "bottom"} ${isSelected ? "selected ring-2 ring-[var(--teal,#0d9488)]" : ""} ${isSelected && isTouchScreen ? "touch-zoomed" : ""}`}
			data-tooth-id={number}
			data-testid={`pediatric-tooth-btn-${number}`}
			title={`${getToothFolkAndAnatomicalNameRu(number)} — Статус: ${TOOTH_STATE_LABELS[state]}`}
			aria-label={`${getToothFolkAndAnatomicalNameRu(number)}, статус: ${TOOTH_STATE_LABELS[state]}`}
			aria-pressed={isSelected ? true : undefined}
			onClick={(e) => {
				if (activeStamp && onQuickStateChange) {
					onQuickStateChange(selectedTeeth?.includes(number) && selectedTeeth.length > 0 ? selectedTeeth : [number], activeStamp, []);
					return;
				}
				onClick(e, number);
			}}
			onKeyDown={onKeyDown}
		>
			{isTop && <ToothNumberBadge {...badgeProps} />}
			{isSelected && isTouchScreen && (
				<ToothTouchSurfaceHud number={number} isTop={isTop} state={state} surfaces={surfaces} useSurfaces={useSurfaces} selectedTeeth={selectedTeeth} onQuickStateChange={onQuickStateChange} />
			)}
			{state === "Implant" || state === "Planned_Implant" ? (
				<ToothImplantGraphic number={number} state={state} scaledWidth={scaleCssPx(cfg.width, scale)} scaledHeight={scaleCssPx(cfg.height, scale)} transform={transform} cfg={cfg} geom={geom} colors={colors} isTop={isTop} />
			) : (
				<ToothStandardGraphic number={number} state={state} scaledWidth={scaleCssPx(cfg.width, scale)} scaledHeight={scaleCssPx(cfg.height, scale)} transform={transform} cfg={cfg} geom={geom} colors={colors} isTop={isTop} showPeriapicalHalos={showPeriapicalHalos} isPeriodontitis={Boolean(state === "Periodontitis" || periapicalLesion)} resorptionVisual={resorptionVisual} isEndoTreated={canalObturation !== undefined && canalObturation !== "unfilled"} material={material} canalObturation={canalObturation} showPulpAndCanals={showPulpAndCanals} hasPost={hasPost} postType={postType} showPeriodontalBoneLoss={showPeriodontalBoneLoss} boneLossInfo={boneLossInfo} surfaces={surfaces} useSurfaces={useSurfaces} handleSurfaceClick={handleSurfaceClick} handleSurfaceKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleSurfaceClick(e as any); }} />
			)}
			{!isTop && <ToothNumberBadge {...badgeProps} />}
		</div>
	);
}, areToothSvgPropsEqual);
ToothSVG.displayName = "ToothSVG";
