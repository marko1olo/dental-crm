/**
 * DENTE Dental CRM — Anatomical Tooth Wrapper Component
 *
 * Wraps individual tooth SVG with clinical badges, mobile touch-zoom HUD,
 * desktop hover action HUD, keyboard hotkeys, and interproximal bridge connectors.
 */

import React from "react";
import {
	type AnatomicalSurfaceKey,
	isSurfaceActive,
	type RestorativeMaterialKey,
	ROOT_RESORPTION_STAGES,
} from "./anatomicalToothGeometries";
import {
	ANATOMICAL_SURFACE_LABELS_RU,
} from "./anatomicalToothGeometries";
import {
	BOTTOM_SURFACE_KEYS,
	getAnatomicalToothColors,
	TOP_SURFACE_KEYS,
} from "./AnatomicalToothColors";
import {
	getNextFocusedTooth,
	getToothStateFromHotkey,
} from "./ClassicGostOdontogram";
import type { ToothData, ToothState } from "./ToothChart";
import { TOOTH_STATE_LABELS } from "./ToothChart";
import { useIsTouchScreen } from "./useIsTouchScreen";
import { AnatomicalToothSVG } from "./AnatomicalToothSVG";

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

export function areSurfacesEqual(
	a?: readonly string[] | string[] | undefined,
	b?: readonly string[] | string[] | undefined,
): boolean {
	if (a === b) return true;
	if (!a || !b) return !a && !b;
	if (a.length !== b.length) return false;
	for (let i = 0; i < a.length; i++) {
		if (a[i] !== b[i]) return false;
	}
	return true;
}

export function areToothDataEqual(prev: ToothData, next: ToothData): boolean {
	if (prev === next) return true;
	if (prev.toothNumber !== next.toothNumber) return false;
	if (prev.state !== next.state) return false;
	if (prev.material !== next.material) return false;
	if (prev.canalObturation !== next.canalObturation) return false;
	if (prev.hasPost !== next.hasPost) return false;
	if (prev.postType !== next.postType) return false;
	if (prev.boneLossLevel !== next.boneLossLevel) return false;
	if (prev.boneLossType !== next.boneLossType) return false;
	if (prev.furcationGrade !== next.furcationGrade) return false;
	if (prev.furcation !== next.furcation) return false;
	if (prev.mobility !== next.mobility) return false;
	if (prev.gingivalRecession !== next.gingivalRecession) return false;
	if (prev.periapicalLesion !== next.periapicalLesion) return false;
	if (prev.rootResorptionStage !== next.rootResorptionStage) return false;
	if (prev.rootResorption !== next.rootResorption) return false;
	if (prev.pocketDepth !== next.pocketDepth) return false;
	if (prev.pocketDepthMm !== next.pocketDepthMm) return false;
	if (prev.maxPocketDepth !== next.maxPocketDepth) return false;
	if (prev.bridgeRole !== next.bridgeRole) return false;
	if (prev.canalObturationLevel !== next.canalObturationLevel) return false;
	if (prev.periapicalLesionSize !== next.periapicalLesionSize) return false;
	if (prev.hasFracture !== next.hasFracture) return false;
	if (prev.hasApicoectomy !== next.hasApicoectomy) return false;
	if (!areSurfacesEqual(prev.surfaces, next.surfaces)) return false;
	if (!areSurfacesEqual(prev.bopSites, next.bopSites)) return false;
	if (!areSurfacesEqual(prev.suppurationSites, next.suppurationSites)) return false;
	return true;
}

export function areToothWrapperPropsEqual(
	prev: ToothWrapperProps,
	next: ToothWrapperProps,
): boolean {
	if (prev.isSelected !== next.isSelected) return false;
	if (prev.isHovered !== next.isHovered) return false;
	if (prev.isTop !== next.isTop) return false;
	if (prev.scale !== next.scale) return false;
	if (prev.useSurfaces !== next.useSurfaces) return false;
	if (prev.activeStamp !== next.activeStamp) return false;
	if (prev.pediatricMode !== next.pediatricMode) return false;
	if (prev.showPulpAndCanals !== next.showPulpAndCanals) return false;
	if (prev.showPeriapicalHalos !== next.showPeriapicalHalos) return false;
	if (prev.showPeriodontalBoneLoss !== next.showPeriodontalBoneLoss) return false;
	if (prev.isPontic !== next.isPontic) return false;
	if (prev.bridgeMaterial !== next.bridgeMaterial) return false;
	if (prev.hasLeftBridgeConnector !== next.hasLeftBridgeConnector) return false;
	if (prev.hasRightBridgeConnector !== next.hasRightBridgeConnector) return false;
	if (prev.onClick !== next.onClick) return false;
	if (prev.onQuickStateChange !== next.onQuickStateChange) return false;
	if (!areToothDataEqual(prev.tooth, next.tooth)) return false;

	if (
		(prev.isSelected || next.isSelected) &&
		prev.selectedTeeth !== next.selectedTeeth
	) {
		const prevLen = prev.selectedTeeth?.length ?? 0;
		const nextLen = next.selectedTeeth?.length ?? 0;
		if (prevLen !== nextLen) return false;
		if (prevLen > 0) {
			for (let i = 0; i < prevLen; i++) {
				if (prev.selectedTeeth![i] !== next.selectedTeeth![i]) return false;
			}
		}
	}
	return true;
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

		const renderNumberBadge = () => {
			const isLeftMolar =
				(number >= 16 && number <= 18) ||
				(number >= 46 && number <= 48) ||
				(number >= 54 && number <= 55) ||
				(number >= 84 && number <= 85);
			const isRightMolar =
				(number >= 26 && number <= 28) ||
				(number >= 36 && number <= 38) ||
				(number >= 64 && number <= 65) ||
				(number >= 74 && number <= 75);
			const hudAlignClass = isLeftMolar
				? "left-0"
				: isRightMolar
					? "right-0"
					: "left-1/2 -translate-x-1/2";

			return (
				<div className="relative flex flex-col items-center group/badge">
					{!activeStamp && onQuickStateChange && !isTouchScreen && (
						<div
							className={`tooth-hover-quick-hud absolute ${hudAlignClass} hidden group-hover:flex group-hover/badge:flex transition-all duration-150 z-40 items-center gap-1.5 px-2 py-1.5 rounded-2xl bg-[var(--odontogram-paper)]/95 border border-[var(--odontogram-border-strong)] shadow-2xl backdrop-blur-xl pointer-events-auto whitespace-nowrap ${
								isTop ? "bottom-full mb-2" : "top-full mt-2"
							}`}
							onClick={(e) => e.stopPropagation()}
						>
							<button
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									const targets =
										selectedTeeth?.includes(number) && selectedTeeth.length > 0
											? selectedTeeth
											: [number];
									onQuickStateChange(targets, "Caries");
								}}
								className="px-3 py-2 min-h-[44px] sm:min-h-[32px] min-w-[44px] rounded-xl bg-amber-500/15 hover:bg-amber-500 text-amber-800 dark:text-amber-300 hover:text-white border border-amber-500/40 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all hover:scale-105 active:scale-95 touch-manipulation shrink-0 flex-shrink-0 whitespace-nowrap"
								title="Кариес"
							>
								<span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block shadow-xs shrink-0" />
								<span className="whitespace-nowrap shrink-0 font-bold">Кариес</span>
							</button>
							<button
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									const targets =
										selectedTeeth?.includes(number) && selectedTeeth.length > 0
											? selectedTeeth
											: [number];
									onQuickStateChange(targets, "Filled");
								}}
								className="px-3 py-2 min-h-[44px] sm:min-h-[32px] min-w-[44px] rounded-xl bg-blue-500/15 hover:bg-blue-500 text-blue-800 dark:text-blue-300 hover:text-white border border-blue-500/40 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all hover:scale-105 active:scale-95 touch-manipulation shrink-0 flex-shrink-0 whitespace-nowrap"
								title="Пломба"
							>
								<span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block shadow-xs shrink-0" />
								<span className="whitespace-nowrap shrink-0 font-bold">Пломба</span>
							</button>
							<button
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									const targets =
										selectedTeeth?.includes(number) && selectedTeeth.length > 0
											? selectedTeeth
											: [number];
									onQuickStateChange(targets, "Pulpitis");
								}}
								className="px-3 py-2 min-h-[44px] sm:min-h-[32px] min-w-[44px] rounded-xl bg-rose-500/15 hover:bg-rose-500 text-rose-800 dark:text-rose-300 hover:text-white border border-rose-500/40 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all hover:scale-105 active:scale-95 touch-manipulation shrink-0 flex-shrink-0 whitespace-nowrap"
								title="Пульпит"
							>
								<span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block shadow-xs shrink-0" />
								<span className="whitespace-nowrap shrink-0 font-bold">Пульпит</span>
							</button>
							<button
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									const targets =
										selectedTeeth?.includes(number) && selectedTeeth.length > 0
											? selectedTeeth
											: [number];
									onQuickStateChange(targets, "Periodontitis");
								}}
								className="px-3 py-2 min-h-[44px] sm:min-h-[32px] min-w-[44px] rounded-xl bg-orange-500/15 hover:bg-orange-500 text-orange-800 dark:text-orange-300 hover:text-white border border-orange-500/40 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all hover:scale-105 active:scale-95 touch-manipulation shrink-0 flex-shrink-0 whitespace-nowrap"
								title="Периодонтит"
								data-testid={`quick-periodontitis-${number}`}
							>
								<span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block shadow-xs shrink-0" />
								<span className="whitespace-nowrap shrink-0 font-bold">Периодонтит</span>
							</button>
							<button
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									const targets =
										selectedTeeth?.includes(number) && selectedTeeth.length > 0
											? selectedTeeth
											: [number];
									onQuickStateChange(targets, "Crown");
								}}
								className="px-3 py-2 min-h-[44px] sm:min-h-[32px] min-w-[44px] rounded-xl bg-amber-500/15 hover:bg-amber-500 text-amber-800 dark:text-amber-300 hover:text-white border border-amber-500/40 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all hover:scale-105 active:scale-95 touch-manipulation shrink-0 flex-shrink-0 whitespace-nowrap"
								title="Коронка"
							>
								<span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block shadow-xs shrink-0" />
								<span className="whitespace-nowrap shrink-0 font-bold">Коронка</span>
							</button>
							<button
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									const targets =
										selectedTeeth?.includes(number) && selectedTeeth.length > 0
											? selectedTeeth
											: [number];
									onQuickStateChange(targets, "Implant");
								}}
								className="px-3 py-2 min-h-[44px] sm:min-h-[32px] min-w-[44px] rounded-xl bg-indigo-500/15 hover:bg-indigo-500 text-indigo-800 dark:text-indigo-300 hover:text-white border border-indigo-500/40 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all hover:scale-105 active:scale-95 touch-manipulation shrink-0 flex-shrink-0 whitespace-nowrap"
								title="Имплантат"
								data-testid={`quick-implant-${number}`}
							>
								<span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block shadow-xs shrink-0" />
								<span className="whitespace-nowrap shrink-0 font-bold">Имплант</span>
							</button>
							<button
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									const targets =
										selectedTeeth?.includes(number) && selectedTeeth.length > 0
											? selectedTeeth
											: [number];
									onQuickStateChange(targets, "Missing");
								}}
								className="px-3 py-2 min-h-[44px] sm:min-h-[32px] min-w-[44px] rounded-xl bg-red-600/15 hover:bg-red-600 text-red-800 dark:text-red-300 hover:text-white border border-red-500/40 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all hover:scale-105 active:scale-95 touch-manipulation shrink-0 flex-shrink-0 whitespace-nowrap"
								title="Удален"
							>
								<span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block shadow-xs shrink-0" />
								<span className="whitespace-nowrap shrink-0 font-bold">Удален</span>
							</button>
							<button
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									const targets =
										selectedTeeth?.includes(number) && selectedTeeth.length > 0
											? selectedTeeth
											: [number];
									onQuickStateChange(targets, "Retained");
								}}
								className="px-3 py-2 min-h-[44px] sm:min-h-[32px] min-w-[44px] rounded-xl bg-purple-500/15 hover:bg-purple-500 text-purple-800 dark:text-purple-300 hover:text-white border border-purple-500/40 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all hover:scale-105 active:scale-95 touch-manipulation shrink-0 flex-shrink-0 whitespace-nowrap"
								title="Ретинированный"
							>
								<span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block shadow-xs shrink-0" />
								<span className="whitespace-nowrap shrink-0 font-bold">Ретинирован</span>
							</button>
							<button
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									const targets =
										selectedTeeth?.includes(number) && selectedTeeth.length > 0
											? selectedTeeth
											: [number];
									onQuickStateChange(targets, "Root");
								}}
								className="px-3 py-2 min-h-[44px] sm:min-h-[32px] min-w-[44px] rounded-xl bg-rose-700/15 hover:bg-rose-700 text-rose-900 dark:text-rose-200 hover:text-white border border-rose-700/40 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all hover:scale-105 active:scale-95 touch-manipulation shrink-0 flex-shrink-0 whitespace-nowrap"
								title="Корень"
							>
								<span className="w-2.5 h-2.5 rounded-full bg-rose-700 inline-block shadow-xs shrink-0" />
								<span className="whitespace-nowrap shrink-0 font-bold">Корень</span>
							</button>
							<button
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									const targets =
										selectedTeeth?.includes(number) && selectedTeeth.length > 0
											? selectedTeeth
											: [number];
									onQuickStateChange(targets, "Healthy");
								}}
								className="px-3 py-2 min-h-[44px] sm:min-h-[32px] min-w-[44px] rounded-xl bg-teal-500/15 hover:bg-teal-500 text-teal-800 dark:text-teal-300 hover:text-white border border-teal-500/40 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all hover:scale-105 active:scale-95 touch-manipulation shrink-0 flex-shrink-0 whitespace-nowrap"
								title="Здоров"
							>
								<span className="w-2.5 h-2.5 rounded-full bg-teal-400 inline-block shadow-xs shrink-0" />
								<span className="whitespace-nowrap shrink-0 font-bold">Здоров</span>
							</button>
						</div>
					)}

					<span
						className={`tooth-number-badge ${isSelected ? "selected" : ""}`}
						style={{ fontSize: "12px" }}
					>
						<span
							className="tooth-status-dot"
							style={{ backgroundColor: isPontic ? "#2563eb" : colors.badgeColor }}
						/>
						<span className="tooth-number-text font-black">{number}</span>
						{isPontic && (
							<span
								className="ml-0.5 px-1 py-0.2 rounded text-xs font-black bg-blue-600 text-white shadow-2xs leading-none"
								title="Тело мостовидного протеза (Bridge Pontic)"
							>
								BP
							</span>
						)}
						{mobility !== undefined && mobility > 0 && (
							<span
								className="ml-0.5 px-1 py-0.2 rounded text-xs font-black bg-indigo-600 text-white shadow-2xs leading-none"
								title={`Подвижность по Миллеру: ${mobility} ст.`}
							>
								M{mobility}
							</span>
						)}
						{furcation !== undefined && furcation > 0 && (
							<span
								className={`ml-0.5 px-1 py-0.2 rounded text-xs font-black text-white shadow-2xs leading-none ${
									furcation >= 3 ? "bg-rose-600" : "bg-amber-500"
								}`}
								title={`Поражение фуркации: ${furcation} ст.`}
							>
								F{furcation}
							</span>
						)}
						{pocketDepth !== undefined && pocketDepth > 4 && (
							<span
								className={`ml-0.5 px-1 py-0.2 rounded text-xs font-black text-white shadow-2xs leading-none ${
									pocketDepth >= 6 ? "bg-rose-600 animate-pulse" : "bg-amber-500"
								}`}
								title={`Пародонтальный карман ${pocketDepth} мм (Риск пародонтита K05.3)`}
							>
								P{pocketDepth}
							</span>
						)}
						{effectiveResorption > 0 && (
							<span
								className="ml-0.5 px-1 py-0.2 rounded text-xs font-black text-white shadow-2xs leading-none"
								style={{
									backgroundColor:
										ROOT_RESORPTION_STAGES[effectiveResorption]?.badgeColor ?? "#f59e0b",
								}}
								title={`Физиологическая резорбция корня: ${
									ROOT_RESORPTION_STAGES[effectiveResorption]?.nameRu ??
									`${effectiveResorption}%`
								}`}
							>
								R{effectiveResorption}%
							</span>
						)}
					</span>
				</div>
			);
		};

		return (
			<div
				role="button"
				tabIndex={0}
				className={`tooth-svg-wrapper group relative ${isTop ? "top" : "bottom"} ${
					isSelected ? "selected ring-2 ring-indigo-500/70" : ""
				} ${isSelected && isTouchScreen ? "touch-zoomed" : ""}`}
				data-tooth-id={number}
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
				{hasLeftBridgeConnector && (
					<div
						className={`bridge-connector-left absolute left-0 w-3.5 h-3.5 -translate-x-2 z-20 pointer-events-none rounded-full shadow-xs border border-blue-400/60 ${
							isTop ? "top-[62%]" : "top-[36%]"
						}`}
						style={{
							background:
								bridgeMaterial === "gold"
									? "linear-gradient(135deg, #f59e0b, #b45309)"
									: bridgeMaterial === "ceramic_emax"
										? "linear-gradient(135deg, #38bdf8, #0284c7)"
										: "linear-gradient(135deg, #93c5fd, #2563eb)",
						}}
						title="Мостовидное соединение"
					/>
				)}
				{hasRightBridgeConnector && (
					<div
						className={`bridge-connector-right absolute right-0 w-3.5 h-3.5 translate-x-2 z-20 pointer-events-none rounded-full shadow-xs border border-blue-400/60 ${
							isTop ? "top-[62%]" : "top-[36%]"
						}`}
						style={{
							background:
								bridgeMaterial === "gold"
									? "linear-gradient(135deg, #f59e0b, #b45309)"
									: bridgeMaterial === "ceramic_emax"
										? "linear-gradient(135deg, #38bdf8, #0284c7)"
										: "linear-gradient(135deg, #93c5fd, #2563eb)",
						}}
						title="Мостовидное соединение"
					/>
				)}

				{isTop && renderNumberBadge()}
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
				{!isTop && renderNumberBadge()}

				{isSelected && isTouchScreen && !activeStamp && (
					<div
						className={`tooth-touch-surface-hud ${isTop ? "bottom-pos" : "top-pos"}`}
						data-testid={`touch-zoom-hud-${number}`}
						onClick={(e) => e.stopPropagation()}
					>
						<div className="flex items-center justify-between w-full gap-2 px-1 pb-1 border-b border-[var(--odontogram-border-subtle)] text-[11px]">
							<span className="font-extrabold text-[var(--odontogram-ink)]">
								Зуб {number}
							</span>
							<span className="text-[10px] text-[var(--odontogram-ink-muted)] font-medium">
								{TOOTH_STATE_LABELS[state]}
							</span>
						</div>

						{useSurfaces && (
							<div className="flex items-center gap-1.5 flex-wrap justify-center py-1">
								{(isTop ? TOP_SURFACE_KEYS : BOTTOM_SURFACE_KEYS).map((sKey) => {
									const geomKey = sKey === "P" ? "L" : sKey;
									const isActive = isSurfaceActive(geomKey as AnatomicalSurfaceKey, surfaces);
									const labelInfo = ANATOMICAL_SURFACE_LABELS_RU[geomKey as AnatomicalSurfaceKey];
									const shortLabel =
										sKey === "O"
											? "О (Жев)"
											: sKey === "V"
												? "В (Вест)"
												: sKey === "P"
													? "П (Небн)"
													: sKey === "L"
														? "Я (Язычн)"
														: sKey === "M"
															? "М (Медиал)"
															: sKey === "D"
																? "Д (Дистал)"
																: "C (Шеечн)";
									return (
										<button
											key={sKey}
											type="button"
											onClick={(e) => {
												e.stopPropagation();
												onClick(e, number, sKey);
											}}
											className={`touch-surface-btn ${isActive ? "active" : ""}`}
											title={`${labelInfo?.nameRu ?? sKey} зуба ${number}`}
											data-testid={`touch-surface-btn-${number}-${sKey}`}
										>
											<span>{shortLabel}</span>
										</button>
									);
								})}
							</div>
						)}

						{onQuickStateChange && (
							<div className="flex items-center gap-1.5 flex-wrap justify-center pt-1 border-t border-[var(--odontogram-border-subtle)]">
								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation();
										const targets =
											selectedTeeth?.includes(number) && selectedTeeth.length > 0
												? selectedTeeth
												: [number];
										onQuickStateChange(targets, "Caries", useSurfaces ? surfaces : undefined);
									}}
									className="touch-quick-state-btn bg-amber-500/15 hover:bg-amber-500 text-amber-800 dark:text-amber-300 hover:text-white border border-amber-500/40"
									title="Кариес"
								>
									<span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
									<span>Кариес</span>
								</button>
								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation();
										const targets =
											selectedTeeth?.includes(number) && selectedTeeth.length > 0
												? selectedTeeth
												: [number];
										onQuickStateChange(targets, "Filled", useSurfaces ? surfaces : undefined);
									}}
									className="touch-quick-state-btn bg-blue-500/15 hover:bg-blue-500 text-blue-800 dark:text-blue-300 hover:text-white border border-blue-500/40"
									title="Пломба"
								>
									<span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
									<span>Пломба</span>
								</button>
								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation();
										const targets =
											selectedTeeth?.includes(number) && selectedTeeth.length > 0
												? selectedTeeth
												: [number];
										onQuickStateChange(targets, "Pulpitis", useSurfaces ? surfaces : undefined);
									}}
									className="touch-quick-state-btn bg-rose-500/15 hover:bg-rose-500 text-rose-800 dark:text-rose-300 hover:text-white border border-rose-500/40"
									title="Пульпит"
								>
									<span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
									<span>Пульпит</span>
								</button>
								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation();
										const targets =
											selectedTeeth?.includes(number) && selectedTeeth.length > 0
												? selectedTeeth
												: [number];
										onQuickStateChange(targets, "Periodontitis", useSurfaces ? surfaces : undefined);
									}}
									className="touch-quick-state-btn bg-orange-500/15 hover:bg-orange-500 text-orange-800 dark:text-orange-300 hover:text-white border border-orange-500/40"
									title="Периодонтит"
									data-testid={`touch-quick-periodontitis-${number}`}
								>
									<span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
									<span>Периодонтит</span>
								</button>
								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation();
										const targets =
											selectedTeeth?.includes(number) && selectedTeeth.length > 0
												? selectedTeeth
												: [number];
										onQuickStateChange(targets, "Crown", useSurfaces ? surfaces : undefined);
									}}
									className="touch-quick-state-btn bg-emerald-500/15 hover:bg-emerald-500 text-emerald-800 dark:text-emerald-300 hover:text-white border border-emerald-500/40"
									title="Коронка"
								>
									<span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
									<span>Коронка</span>
								</button>
								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation();
										const targets =
											selectedTeeth?.includes(number) && selectedTeeth.length > 0
												? selectedTeeth
												: [number];
										onQuickStateChange(targets, "Implant", surfaces);
									}}
									className="touch-quick-state-btn bg-indigo-500/15 hover:bg-indigo-500 text-indigo-800 dark:text-indigo-300 hover:text-white border border-indigo-500/40"
									title="Имплантат"
									data-testid={`touch-quick-implant-${number}`}
								>
									<span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
									<span>Имплант</span>
								</button>
								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation();
										const targets =
											selectedTeeth?.includes(number) && selectedTeeth.length > 0
												? selectedTeeth
												: [number];
										onQuickStateChange(targets, "Missing", undefined);
									}}
									className="touch-quick-state-btn bg-slate-500/15 hover:bg-slate-500 text-slate-800 dark:text-slate-300 hover:text-white border border-slate-500/40"
									title="Удален"
								>
									<span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
									<span>Удален</span>
								</button>
								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation();
										const targets =
											selectedTeeth?.includes(number) && selectedTeeth.length > 0
												? selectedTeeth
												: [number];
										onQuickStateChange(targets, "Healthy", []);
									}}
									className="touch-quick-state-btn bg-teal-500/15 hover:bg-teal-500 text-teal-800 dark:text-teal-300 hover:text-white border border-teal-500/40"
									title="Здоров"
								>
									<span className="w-2.5 h-2.5 rounded-full bg-teal-500" />
									<span>Здоров</span>
								</button>
							</div>
						)}
					</div>
				)}
			</div>
		);
	},
	areToothWrapperPropsEqual,
);
ToothWrapper.displayName = "ToothWrapper";
