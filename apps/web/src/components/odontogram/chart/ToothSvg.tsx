import type React from "react";
import { useCallback, memo } from "react";
import { getToothConfig, getToothPath } from "../../../utils/math/toothGeometry";
import { getToothFolkAndAnatomicalNameRu } from "../../../lib/clinicalProtocols043";
import { useIsTouchScreen } from "../useIsTouchScreen";
import {
	isPrimaryTooth,
	getPrimaryToothResorptionVisual,
} from "../pediatricDentitionEngine";
import {
	type CanalObturationMaterial,
	type FurcationGrade,
	type PeriodontalBoneLossPattern,
	type PostCoreType,
	type RestorativeMaterialKey,
	type RootResorptionStage,
	getPeriodontalBoneLevelPath,
} from "../anatomicalToothGeometries";
import {
	type ToothState,
	TOOTH_STATE_LABELS,
	getNextFocusedTooth,
	getToothStateFromHotkey,
	scaleCssPx,
} from "./toothChartTypes";
import { getToothColors } from "./ToothColors";
import { ToothImplantGraphic } from "./ToothImplantGraphic";
import { ToothStandardGraphic } from "./ToothStandardGraphic";
import { ToothCardHud } from "./ToothCardHud";

export interface ToothSvgProps {
	number: number;
	state: ToothState;
	scale: number;
	material?: RestorativeMaterialKey | undefined;
	canalObturation?: CanalObturationMaterial | undefined;
	hasPost?: boolean | undefined;
	postType?: PostCoreType | undefined;
	boneLossLevel?: number | undefined;
	boneLossType?: PeriodontalBoneLossPattern | undefined;
	rootResorptionStage?: RootResorptionStage | number | undefined;
	periapicalLesion?: boolean | undefined;
	pocketDepth?: number | undefined;
	pocketDepthMm?: number | undefined;
	maxPocketDepth?: number | undefined;
	isSelected?: boolean | undefined;
	selectedTeeth?: number[] | undefined;
	activeStamp?: ToothState | null | undefined;
	onClick: (e: React.MouseEvent, num: number, surface?: string) => void;
	onQuickStateChange?: ((targets: number[], state: ToothState, surfaces?: readonly string[] | undefined) => void) | undefined;
	onResorptionChange?: ((targets: number[], stage: RootResorptionStage) => void) | undefined;
	pediatricMode?: boolean | undefined;
	surfaces?: readonly string[] | undefined;
	useSurfaces?: boolean | undefined;
	showPulpAndCanals?: boolean | undefined;
	showPeriapicalHalos?: boolean | undefined;
	showPeriodontalBoneLoss?: boolean | undefined;
}

function areSurfacesEqual(
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

function areToothSvgPropsEqual(
	prev: ToothSvgProps,
	next: ToothSvgProps,
): boolean {
	if (prev.number !== next.number) return false;
	if (prev.state !== next.state) return false;
	if (prev.scale !== next.scale) return false;
	if (prev.material !== next.material) return false;
	if (prev.canalObturation !== next.canalObturation) return false;
	if (prev.hasPost !== next.hasPost) return false;
	if (prev.postType !== next.postType) return false;
	if (prev.boneLossLevel !== next.boneLossLevel) return false;
	if (prev.boneLossType !== next.boneLossType) return false;
	if (prev.rootResorptionStage !== next.rootResorptionStage) return false;
	if (prev.periapicalLesion !== next.periapicalLesion) return false;
	if (prev.pocketDepth !== next.pocketDepth) return false;
	if (prev.pocketDepthMm !== next.pocketDepthMm) return false;
	if (prev.maxPocketDepth !== next.maxPocketDepth) return false;
	if (prev.isSelected !== next.isSelected) return false;
	if (prev.activeStamp !== next.activeStamp) return false;
	if (prev.pediatricMode !== next.pediatricMode) return false;
	if (prev.useSurfaces !== next.useSurfaces) return false;
	if (prev.showPulpAndCanals !== next.showPulpAndCanals) return false;
	if (prev.showPeriapicalHalos !== next.showPeriapicalHalos) return false;
	if (prev.showPeriodontalBoneLoss !== next.showPeriodontalBoneLoss) return false;
	if (prev.onClick !== next.onClick) return false;
	if (prev.onQuickStateChange !== next.onQuickStateChange) return false;
	if (prev.onResorptionChange !== next.onResorptionChange) return false;
	if (!areSurfacesEqual(prev.surfaces, next.surfaces)) return false;

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

export const ToothSVG: React.FC<ToothSvgProps> = memo(({
	number,
	state,
	scale,
	material,
	canalObturation,
	hasPost,
	postType,
	boneLossLevel,
	boneLossType,
	rootResorptionStage,
	periapicalLesion,
	pocketDepth,
	pocketDepthMm,
	maxPocketDepth,
	isSelected,
	selectedTeeth,
	activeStamp,
	onClick,
	onQuickStateChange,
	onResorptionChange,
	pediatricMode,
	surfaces,
	useSurfaces,
	showPulpAndCanals,
	showPeriapicalHalos = true,
	showPeriodontalBoneLoss = true,
}: ToothSvgProps) => {
	const effectivePocketDepth = pocketDepth ?? pocketDepthMm ?? maxPocketDepth;
	const isTop = number < 30 || (number >= 51 && number <= 65);
	const isPrimary = isPrimaryTooth(number);
	const resorptionVisual = isPrimary && rootResorptionStage !== undefined
		? getPrimaryToothResorptionVisual(number, rootResorptionStage)
		: null;
	const geom = getToothPath(number);
	const cfg = getToothConfig(number);
	const colors = getToothColors(state, material);

	const isTouchScreen = useIsTouchScreen();

	const scaledWidth = scaleCssPx(cfg.width, scale);
	const scaledHeight = scaleCssPx(cfg.height, scale);

	const isRightSide =
		(number >= 21 && number <= 28) ||
		(number >= 31 && number <= 38) ||
		(number >= 61 && number <= 65) ||
		(number >= 71 && number <= 75);
	const transform = `scaleX(${isRightSide ? -1 : 1})`;

	const isPeriodontitis = Boolean(state === "Periodontitis" || periapicalLesion);
	const isEndoTreated = canalObturation !== undefined && canalObturation !== "unfilled";
	const effectiveObturation: CanalObturationMaterial =
		canalObturation ?? "unfilled";

	const boneLossInfo =
		showPeriodontalBoneLoss && (boneLossLevel !== undefined && boneLossLevel > 0)
			? getPeriodontalBoneLevelPath(number, boneLossLevel, boneLossType ?? "horizontal")
			: null;

	const handleSurfaceClick = useCallback((e: React.MouseEvent<SVGGElement>) => {
		const target = (e.target as Element).closest("[data-surface]");
		if (target) {
			const surf = target.getAttribute("data-surface");
			const isModifierPressed = Boolean(e.shiftKey || e.altKey);
			const isSurfaceIntent = Boolean(useSurfaces || isModifierPressed);

			e.stopPropagation();
			if (surf && isSurfaceIntent) {
				onClick(e as unknown as React.MouseEvent, number, surf);
			} else {
				onClick(e as unknown as React.MouseEvent, number, undefined);
			}
		}
	}, [onClick, number, useSurfaces]);

	const handleSurfaceKeyDown = useCallback((e: React.KeyboardEvent<SVGGElement>) => {
		if (e.key === "Enter" || e.key === " ") {
			const target = (e.target as Element).closest("[data-surface]");
			if (target) {
				const surf = target.getAttribute("data-surface");
				const isModifierPressed = Boolean(e.shiftKey || e.altKey);
				const isSurfaceIntent = Boolean(useSurfaces || isModifierPressed);

				e.preventDefault();
				e.stopPropagation();
				if (surf && isSurfaceIntent) {
					onClick(e as unknown as React.MouseEvent, number, surf);
				} else {
					onClick(e as unknown as React.MouseEvent, number, undefined);
				}
			}
		}
	}, [onClick, number, useSurfaces]);

	const renderImplant = () => (
		<ToothImplantGraphic
			number={number}
			state={state}
			scaledWidth={scaledWidth}
			scaledHeight={scaledHeight}
			transform={transform}
			cfg={cfg}
			geom={geom}
			colors={colors}
			isTop={isTop}
		/>
	);

	const renderStandard = () => (
		<ToothStandardGraphic
			number={number}
			state={state}
			scaledWidth={scaledWidth}
			scaledHeight={scaledHeight}
			transform={transform}
			cfg={cfg}
			geom={geom}
			colors={colors}
			isTop={isTop}
			showPeriapicalHalos={showPeriapicalHalos}
			isPeriodontitis={isPeriodontitis}
			resorptionVisual={resorptionVisual}
			isEndoTreated={isEndoTreated}
			material={material}
			canalObturation={canalObturation}
			showPulpAndCanals={showPulpAndCanals}
			hasPost={hasPost}
			postType={postType}
			showPeriodontalBoneLoss={showPeriodontalBoneLoss}
			boneLossInfo={boneLossInfo}
			effectivePocketDepth={effectivePocketDepth}
			surfaces={surfaces}
			useSurfaces={useSurfaces}
			handleSurfaceClick={handleSurfaceClick}
			handleSurfaceKeyDown={handleSurfaceKeyDown}
		/>
	);

	const renderNumberBadge = () => {
		return (
			<div className="relative flex flex-col items-center group/badge">
				{!activeStamp && onQuickStateChange && (
					<ToothCardHud
						number={number}
						isTop={isTop}
						isPrimary={isPrimary}
						state={state}
						surfaces={surfaces}
						useSurfaces={useSurfaces}
						selectedTeeth={selectedTeeth}
						rootResorptionStage={rootResorptionStage}
						onQuickStateChange={onQuickStateChange}
						onResorptionChange={onResorptionChange}
					/>
				)}

			<span
				className={`tooth-number-badge ${isSelected ? "selected" : ""}`}
			>
				<span
					className="tooth-status-dot"
					style={{ backgroundColor: colors.badgeColor }}
				/>
				<span className="tooth-number-text font-black text-[13px] sm:text-[14px] leading-tight select-none">{number}</span>
				{resorptionVisual && resorptionVisual.stage > 0 && (
					<span
						className="ml-1 px-1 py-0.5 rounded text-xs font-black leading-none shadow-2xs"
						style={{
							backgroundColor: resorptionVisual.badgeBg,
							color: resorptionVisual.badgeColor,
						}}
						title={`Физиологическая резорбция корня: ${resorptionVisual.badgeText} (${resorptionVisual.descriptionRu})`}
						data-testid={`resorption-badge-${number}`}
					>
						R{resorptionVisual.stage}%
					</span>
				)}
				{effectivePocketDepth !== undefined && effectivePocketDepth > 4 && (
					<span
						className={`ml-1 px-1.5 py-0.5 rounded text-xs font-black text-white shadow-2xs leading-none ${
							effectivePocketDepth >= 6 ? "bg-rose-600 animate-pulse" : "bg-amber-500"
						}`}
						title={`Пародонтальный карман ${effectivePocketDepth} мм (Риск пародонтита K05.3)`}
					>
						P{effectivePocketDepth}
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
			className={`tooth-svg-wrapper group ${isTop ? "top" : "bottom"} ${
				isSelected ? "selected ring-2 ring-[var(--teal,#0d9488)]" : ""
			} ${isSelected && isTouchScreen ? "touch-zoomed" : ""}`}
			data-tooth-id={number}
			title={`${getToothFolkAndAnatomicalNameRu(number)} — Статус: ${TOOTH_STATE_LABELS[state]}`}
			aria-label={`${getToothFolkAndAnatomicalNameRu(number)}, статус: ${TOOTH_STATE_LABELS[state]}`}
			aria-pressed={isSelected ? true : undefined}
			onClick={(e) => {
				if (activeStamp && onQuickStateChange) {
					const targets = selectedTeeth?.includes(number) && selectedTeeth.length > 0 ? selectedTeeth : [number];
					onQuickStateChange(targets, activeStamp, []);
					return;
				}
				onClick(e, number);
			}}
			onKeyDown={(e) => {
				// 1. Space: Fast toggle Healthy <-> Caries
				if (e.key === " " || e.code === "Space") {
					e.preventDefault();
					if (onQuickStateChange) {
						const targets =
							selectedTeeth?.includes(number) && selectedTeeth.length > 0
								? selectedTeeth
								: [number];
						const nextState: ToothState = state === "Caries" ? "Healthy" : "Caries";
						const nextSurfaces =
							nextState === "Healthy"
								? []
								: surfaces && surfaces.length > 0
									? surfaces
									: [];
						onQuickStateChange(targets, nextState, nextSurfaces);
					}
					return;
				}

				// 2. Enter: Confirm and advance focus to next tooth
				if (e.key === "Enter") {
					e.preventDefault();
					const nextTooth = getNextFocusedTooth(number, "right", pediatricMode);
					const nextEl = document.querySelector<HTMLButtonElement>(
						`[data-tooth-id="${nextTooth}"]`,
					);
					nextEl?.focus();
					return;
				}

				// 3. Arrow keys navigation (Left/Right/Up/Down/Home/End)
				if (
					e.key === "ArrowLeft" ||
					e.key === "ArrowRight" ||
					e.key === "ArrowUp" ||
					e.key === "ArrowDown" ||
					e.key === "Home" ||
					e.key === "End"
				) {
					e.preventDefault();
					const dirMap: Record<
						string,
						"left" | "right" | "up" | "down" | "home" | "end"
					> = {
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
						const nextEl = document.querySelector<HTMLButtonElement>(
							`[data-tooth-id="${nextTooth}"]`,
						);
						nextEl?.focus();
					}
					return;
				}

				// 4. Number keys 1..5 / Numpad 1..5 for surfaces (O, M, D, V, L)
				const surfaceMap: Record<string, string> = {
					"1": "O",
					"2": "M",
					"3": "D",
					"4": "V",
					"5": "L",
					Numpad1: "O",
					Numpad2: "M",
					Numpad3: "D",
					Numpad4: "V",
					Numpad5: "L",
				};
				const surfaceToToggle = surfaceMap[e.key] || surfaceMap[e.code];
				if (surfaceToToggle && onQuickStateChange) {
					e.preventDefault();
					const currSurfaces = surfaces ?? [];
					const nextSurfaces = currSurfaces.includes(surfaceToToggle)
						? currSurfaces.filter((s) => s !== surfaceToToggle)
						: [...currSurfaces, surfaceToToggle];
					const targets =
						selectedTeeth?.includes(number) && selectedTeeth.length > 0
							? selectedTeeth
							: [number];
					const nextState: ToothState =
						nextSurfaces.length > 0
							? state === "Healthy"
								? "Caries"
								: state
							: state === "Caries"
								? "Healthy"
								: state;
					onQuickStateChange(targets, nextState, nextSurfaces);
					return;
				}

				// 5. 1-Click fast keys (К, П, Е, Ф, Ц, И, 0, З)
				const quickState = getToothStateFromHotkey(e.key);
				if (quickState && onQuickStateChange) {
					e.preventDefault();
					const targets =
						selectedTeeth?.includes(number) && selectedTeeth.length > 0
							? selectedTeeth
							: [number];
					const isWholeToothState = quickState === "Healthy" || quickState === "Missing" || quickState === "Crown" || quickState === "Implant";
					const effectiveSurfaces = isWholeToothState
						? (quickState === "Healthy" || quickState === "Missing" ? [] : undefined)
						: (useSurfaces ? surfaces : undefined);
					onQuickStateChange(targets, quickState, effectiveSurfaces);
				}
			}}
		>
			{isTop && renderNumberBadge()}
			{isSelected && isTouchScreen && (
				<div
					className={`tooth-touch-surface-hud absolute z-[999] left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 p-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-teal-600/40 dark:border-teal-500/60 rounded-xl shadow-2xl ${
						isTop ? "top-full mt-2" : "bottom-full mb-2"
					}`}
					onClick={(e) => e.stopPropagation()}
					onPointerDown={(e) => e.stopPropagation()}
				>
					{/* Surface Selector row (touch targets >= 44x44px) - strictly hidden unless useSurfaces is true */}
					{useSurfaces && (
						<div className="flex items-center gap-1">
							{(
								[
									{ key: "O", label: "O", full: "Окклюзионная" },
									{ key: "V", label: "V", full: "Вестибулярная" },
									{ key: isTop ? "P" : "L", label: isTop ? "P" : "L", full: isTop ? "Небная" : "Язычная" },
									{ key: "M", label: "M", full: "Медиальная" },
									{ key: "D", label: "D", full: "Дистальная" },
									{ key: "C", label: "C", full: "Пришеечная" },
								] as const
							).map((surf) => {
								const currSurfaces = surfaces ?? [];
								const isSurfActive = currSurfaces.includes(surf.key) || (surf.key === "P" && currSurfaces.includes("L")) || (surf.key === "L" && currSurfaces.includes("P"));
								return (
									<button
										key={surf.key}
										type="button"
										className={`touch-surface-btn px-2.5 py-2 min-h-[44px] min-w-[44px] rounded-lg text-xs font-bold border transition-all touch-manipulation flex items-center justify-center ${
											isSurfActive
												? "bg-teal-500 text-white border-teal-400 shadow-md scale-105"
												: "bg-slate-100 dark:bg-slate-800/90 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95"
										}`}
										title={`${surf.full} поверхность`}
										onClick={(e) => {
											e.stopPropagation();
											const nextSurfaces = isSurfActive
												? currSurfaces.filter((s) => s !== surf.key && s !== (surf.key === "P" ? "L" : surf.key === "L" ? "P" : ""))
												: [...currSurfaces, surf.key];
											const targets = selectedTeeth?.includes(number) && selectedTeeth.length > 0 ? selectedTeeth : [number];
											const nextState = nextSurfaces.length > 0 ? (state === "Healthy" ? "Caries" : state) : state;
											onQuickStateChange?.(targets, nextState, nextSurfaces);
										}}
									>
										{surf.label}
									</button>
								);
							})}
						</div>
					)}
					{/* Quick State Row */}
					{onQuickStateChange && (
						<div className="flex items-center gap-1 overflow-x-auto max-w-[340px] sm:max-w-none py-0.5">
							<button
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									const targets = selectedTeeth?.includes(number) && selectedTeeth.length > 0 ? selectedTeeth : [number];
									onQuickStateChange(targets, "Caries", useSurfaces ? surfaces : undefined);
								}}
								className="touch-quick-state-btn px-2.5 py-1.5 min-h-[44px] min-w-[44px] rounded-lg bg-amber-500/15 text-amber-900 dark:text-amber-200 border border-amber-500/40 text-xs font-bold flex items-center gap-1 whitespace-nowrap cursor-pointer active:scale-95"
							>
								<span className="w-2 h-2 rounded-full bg-amber-500" />
								Кариес
							</button>
							<button
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									const targets = selectedTeeth?.includes(number) && selectedTeeth.length > 0 ? selectedTeeth : [number];
									onQuickStateChange(targets, "Filled", useSurfaces ? surfaces : undefined);
								}}
								className="touch-quick-state-btn px-2.5 py-1.5 min-h-[44px] min-w-[44px] rounded-lg bg-blue-500/15 text-blue-900 dark:text-blue-200 border border-blue-500/40 text-xs font-bold flex items-center gap-1 whitespace-nowrap cursor-pointer active:scale-95"
							>
								<span className="w-2 h-2 rounded-full bg-blue-500" />
								Пломба
							</button>
							<button
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									const targets = selectedTeeth?.includes(number) && selectedTeeth.length > 0 ? selectedTeeth : [number];
									onQuickStateChange(targets, "Pulpitis", useSurfaces ? surfaces : undefined);
								}}
								className="touch-quick-state-btn px-2.5 py-1.5 min-h-[44px] min-w-[44px] rounded-lg bg-rose-500/15 text-rose-900 dark:text-rose-200 border border-rose-500/40 text-xs font-bold flex items-center gap-1 whitespace-nowrap cursor-pointer active:scale-95"
							>
								<span className="w-2 h-2 rounded-full bg-rose-500" />
								Пульпит
							</button>
							<button
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									const targets = selectedTeeth?.includes(number) && selectedTeeth.length > 0 ? selectedTeeth : [number];
									onQuickStateChange(targets, "Crown", []);
								}}
								className="touch-quick-state-btn px-2.5 py-1.5 min-h-[44px] min-w-[44px] rounded-lg bg-amber-500/15 text-amber-900 dark:text-amber-200 border border-amber-500/40 text-xs font-bold flex items-center gap-1 whitespace-nowrap cursor-pointer active:scale-95"
							>
								<span className="w-2 h-2 rounded-full bg-amber-500" />
								Коронка
							</button>
							<button
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									const targets = selectedTeeth?.includes(number) && selectedTeeth.length > 0 ? selectedTeeth : [number];
									onQuickStateChange(targets, "Missing", undefined);
								}}
								className="touch-quick-state-btn px-2.5 py-1.5 min-h-[44px] min-w-[44px] rounded-lg bg-red-600/15 text-red-900 dark:text-red-200 border border-red-500/40 text-xs font-bold flex items-center gap-1 whitespace-nowrap cursor-pointer active:scale-95"
							>
								<span className="w-2 h-2 rounded-full bg-red-600" />
								Удален
							</button>
							<button
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									const targets = selectedTeeth?.includes(number) && selectedTeeth.length > 0 ? selectedTeeth : [number];
									onQuickStateChange(targets, "Healthy", []);
								}}
								className="touch-quick-state-btn px-2.5 py-1.5 min-h-[44px] min-w-[44px] rounded-lg bg-teal-500/15 text-teal-900 dark:text-teal-200 border border-teal-500/40 text-xs font-bold flex items-center gap-1 whitespace-nowrap cursor-pointer active:scale-95"
							>
								<span className="w-2 h-2 rounded-full bg-teal-400" />
								Здоров
							</button>
						</div>
					)}
				</div>
			)}
			{state === "Implant" || state === "Planned_Implant"
				? renderImplant()
				: renderStandard()}
			{!isTop && renderNumberBadge()}
		</div>
	);
}, areToothSvgPropsEqual);
ToothSVG.displayName = "ToothSVG";

