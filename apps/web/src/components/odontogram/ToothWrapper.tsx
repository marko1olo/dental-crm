/**
 * DENTE Dental CRM — Anatomical Tooth Wrapper Component
 *
 * Wraps individual tooth SVG with clinical badges, mobile touch-zoom HUD,
 * desktop hover action HUD, keyboard hotkeys, and interproximal bridge connectors.
 * Декомпозирован по Мандату 8b: <= 300 строк (Sweet spot 150–220).
 */

import React from "react";
import type { RestorativeMaterialKey } from "./anatomicalToothGeometries";
import { getAnatomicalToothColors } from "./AnatomicalToothColors";
import {
	getNextFocusedTooth,
	getToothStateFromHotkey,
} from "./ClassicGostOdontogram";
import type { ToothData, ToothState } from "./ToothChart";
import { TOOTH_STATE_LABELS } from "./ToothChart";
import { useIsTouchScreen } from "./useIsTouchScreen";
import { AnatomicalToothSVG } from "./AnatomicalToothSVG";
import { ToothBridgeConnectors } from "./toothWrapper/ToothBridgeConnectors";
import { ToothNumberBadge } from "./toothWrapper/ToothNumberBadge";
import { ToothTouchSurfaceHud } from "./toothWrapper/ToothTouchSurfaceHud";
import {
	areSurfacesEqual,
	areToothDataEqual,
	areToothWrapperPropsEqual,
} from "./toothWrapper/toothWrapperComparators";

export { areSurfacesEqual, areToothDataEqual, areToothWrapperPropsEqual };

export interface ToothWrapperProps {
	tooth: ToothData;
	isSelected: boolean;
	isHovered?: boolean | undefined;
	selectedTeeth?: number[] | undefined;
	activeStamp?: ToothState | null | undefined;
	onClick: (
		e: React.MouseEvent,
		num: number,
		surface?: string,
	) => void;
	onQuickStateChange?: ((targets: number[], state: ToothState, surfaces?: readonly string[] | undefined) => void) | undefined;
	useSurfaces?: boolean | undefined;
	isTop: boolean;
	scale?: number | undefined;
	pediatricMode?: boolean | undefined;
	showPulpAndCanals?: boolean | undefined;
	showPeriapicalHalos?: boolean | undefined;
	showPeriodontalBoneLoss?: boolean | undefined;
	isPontic?: boolean | undefined;
	bridgeMaterial?: RestorativeMaterialKey | undefined;
	hasLeftBridgeConnector?: boolean | undefined;
	hasRightBridgeConnector?: boolean | undefined;
}

export const ToothWrapper: React.FC<ToothWrapperProps> = React.memo(
	({
		tooth,
		isSelected,
		selectedTeeth,
		activeStamp,
		onClick,
		onQuickStateChange,
		useSurfaces,
		isTop,
		scale = 1,
		pediatricMode,
		showPulpAndCanals,
		showPeriapicalHalos = true,
		showPeriodontalBoneLoss = true,
		isPontic = false,
		bridgeMaterial,
		hasLeftBridgeConnector = false,
		hasRightBridgeConnector = false,
	}) => {
		const {
			toothNumber: number,
			state,
			surfaces,
			material,
			canalObturation,
			hasPost,
			postType,
			boneLossLevel,
			boneLossType,
			furcationGrade,
			furcation: directFurcation,
			mobility,
			gingivalRecession,
			bopSites,
			suppurationSites,
			periapicalLesion,
			rootResorptionStage,
			rootResorption,
			pocketDepth: directPocketDepth,
			pocketDepthMm,
			maxPocketDepth,
		} = tooth;

		const pocketDepth = directPocketDepth ?? pocketDepthMm ?? maxPocketDepth;
		const furcation = furcationGrade ?? directFurcation;
		const effectiveResorption = rootResorptionStage ?? rootResorption ?? 0;
		const colors = getAnatomicalToothColors(state, material);
		const isTouchScreen = useIsTouchScreen();
		const isPrimary = Boolean(pediatricMode || (number >= 51 && number <= 85));

		const renderBadge = () => (
			<ToothNumberBadge
				number={number}
				isSelected={isSelected}
				isTop={isTop}
				isPontic={isPontic}
				badgeColor={colors.badgeColor}
				mobility={mobility}
				furcation={furcation}
				pocketDepth={pocketDepth}
				effectiveResorption={effectiveResorption}
				activeStamp={activeStamp}
				onQuickStateChange={onQuickStateChange}
				isTouchScreen={isTouchScreen}
				isPrimary={isPrimary}
				state={state}
				surfaces={tooth.surfaces}
				useSurfaces={useSurfaces}
				selectedTeeth={selectedTeeth}
			/>
		);

		return (
			<div
				role="button"
				tabIndex={0}
				className={`tooth-svg-wrapper group relative ${isTop ? "top" : "bottom"} ${
					isSelected ? "selected ring-2 ring-indigo-500/70" : ""
				} ${isSelected && isTouchScreen ? "touch-zoomed" : ""}`}
				data-tooth-id={number}
				data-testid={`pediatric-tooth-btn-${number}`}
				id={`plan-tooth-${number}`}
				aria-label={`Зуб ${number}, ${TOOTH_STATE_LABELS[state]}`}
				aria-pressed={isSelected ? true : undefined}
				onClick={(e) => {
					if (activeStamp && onQuickStateChange) {
						const targets =
							selectedTeeth?.includes(number) && selectedTeeth.length > 0
								? selectedTeeth
								: [number];
						onQuickStateChange(targets, activeStamp, []);
						return;
					}
					onClick(e, number);
				}}
				onKeyDown={(e) => {
					if (e.key === "Enter" || e.key === " ") {
						e.preventDefault();
						if (activeStamp && onQuickStateChange) {
							const targets =
								selectedTeeth?.includes(number) && selectedTeeth.length > 0
									? selectedTeeth
									: [number];
							onQuickStateChange(targets, activeStamp, []);
							return;
						}
						onClick(e as unknown as React.MouseEvent, number);
						return;
					}

					if (
						e.key === "ArrowLeft" ||
						e.key === "ArrowRight" ||
						e.key === "ArrowUp" ||
						e.key === "ArrowDown" ||
						e.key === "Home" ||
						e.key === "End"
					) {
						e.preventDefault();
						const dirMap: Record<string, "left" | "right" | "up" | "down" | "home" | "end"> = {
							ArrowLeft: "left",
							ArrowRight: "right",
							ArrowUp: "up",
							ArrowDown: "down",
							Home: "home",
							End: "end",
						};
						const navDir = dirMap[e.key];
						if (navDir) {
							const nextTooth = getNextFocusedTooth(number, navDir, pediatricMode);
							const nextEl = document.querySelector(
								`[data-tooth-id="${nextTooth}"]`,
							) as HTMLElement | null;
							nextEl?.focus();
						}
						return;
					}

					const quickState = getToothStateFromHotkey(e.key);
					if (quickState && onQuickStateChange) {
						e.preventDefault();
						const targets =
							selectedTeeth?.includes(number) && selectedTeeth.length > 0
								? selectedTeeth
								: [number];
						onQuickStateChange(targets, quickState, surfaces);
					}
				}}
			>
				<ToothBridgeConnectors
					hasLeftBridgeConnector={hasLeftBridgeConnector}
					hasRightBridgeConnector={hasRightBridgeConnector}
					isTop={isTop}
					bridgeMaterial={bridgeMaterial}
				/>

				{isTop && renderBadge()}
				<AnatomicalToothSVG
					number={number}
					state={state}
					scale={scale}
					material={material}
					isPontic={isPontic}
					bridgeMaterial={bridgeMaterial}
					canalObturation={canalObturation}
					canalObturationLevel={tooth.canalObturationLevel}
					periapicalLesionSize={tooth.periapicalLesionSize}
					hasFracture={tooth.hasFracture}
					hasApicoectomy={tooth.hasApicoectomy}
					hasPost={hasPost}
					postType={postType}
					boneLossLevel={boneLossLevel}
					boneLossType={boneLossType}
					furcation={furcation}
					mobility={mobility}
					gingivalRecession={gingivalRecession}
					bopSites={bopSites}
					suppurationSites={suppurationSites}
					periapicalLesion={periapicalLesion}
					pocketDepth={pocketDepth}
					rootResorptionStage={effectiveResorption}
					isSelected={isSelected}
					onClick={onClick}
					pediatricMode={pediatricMode}
					surfaces={surfaces}
					useSurfaces={useSurfaces}
					showPulpAndCanals={showPulpAndCanals}
					showPeriapicalHalos={showPeriapicalHalos}
					showPeriodontalBoneLoss={showPeriodontalBoneLoss}
				/>
				{!isTop && renderBadge()}

				{isSelected && isTouchScreen && !activeStamp && (
					<ToothTouchSurfaceHud
						number={number}
						state={state}
						isTop={isTop}
						surfaces={surfaces}
						useSurfaces={useSurfaces}
						selectedTeeth={selectedTeeth}
						onQuickStateChange={onQuickStateChange}
						onClick={onClick}
					/>
				)}
			</div>
		);
	},
	areToothWrapperPropsEqual,
);

ToothWrapper.displayName = "ToothWrapper";
export default ToothWrapper;
