/**
 * apps/web/src/components/odontogram/chart/ToothCarouselFocus.tsx
 *
 * DENTE Dental CRM — Single Tooth Carousel Focus Mode (Mandate 8c, MOBILE_DESIGN_APPLE_HIG §3.3)
 *
 * Dedicated smartphone focal stage:
 * - 1 Large Centered Tooth (120x140px stage) with crisp vector rendering at 1.8x scale
 * - Prev / Next tooth navigation controls (>= 48x48px glove-friendly touch targets)
 * - Anatomical surface selector (O, M, D, V, L) integrated directly into the cockpit
 * - 1-Tap Pathology Buttons (Кариес, Пульпит, Периодонтит, Пломба, Коронка, Имплант, Удален, Здоров)
 * - Tap on the central tooth opens the full native Bottom Sheet Drawer
 */

import type React from "react";
import { memo, useMemo, useRef } from "react";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { getToothFolkAndAnatomicalNameRu } from "../../../lib/clinicalProtocols043";
import { triggerHaptic } from "../../../native/mobileBridge";
import { ToothSVG } from "./ToothSvg";
import { SurfaceSelector } from "./SurfaceSelector";
import {
	type ToothData,
	type ToothState,
	TOOTH_STATE_LABELS,
	TOP_TEETH,
	BOTTOM_TEETH,
	PEDIATRIC_TOP_TEETH,
	PEDIATRIC_BOTTOM_TEETH,
} from "./toothChartTypes";

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

	const allTeethOrdered = useMemo(() => {
		if (isPediatricEffective) {
			return [...PEDIATRIC_TOP_TEETH, ...PEDIATRIC_BOTTOM_TEETH];
		}
		return [...TOP_TEETH, ...BOTTOM_TEETH];
	}, [isPediatricEffective]);

	const currentIndex = allTeethOrdered.indexOf(toothNumber);
	const safeIndex = currentIndex >= 0 ? currentIndex : 0;

	const prevTooth = allTeethOrdered[(safeIndex - 1 + allTeethOrdered.length) % allTeethOrdered.length] ?? allTeethOrdered[0] ?? 11;
	const nextTooth = allTeethOrdered[(safeIndex + 1) % allTeethOrdered.length] ?? allTeethOrdered[0] ?? 11;

	const currentToothData = toothDataMap.get(toothNumber);
	const currentState = currentToothData?.state ?? "Healthy";
	const currentSurfaces = currentToothData?.surfaces ?? [];

	const handlePrev = () => {
		triggerHaptic("selection");
		onSelectTooth(prevTooth);
	};

	const handleNext = () => {
		triggerHaptic("selection");
		onSelectTooth(nextTooth);
	};

	const handleStageClick = (e: React.MouseEvent) => {
		triggerHaptic("heavy");
		const rect = stageRef.current?.getBoundingClientRect();
		onOpenStatusSheet(toothNumber, rect);
	};

	const handleFastState = (state: ToothState) => {
		triggerHaptic("success");
		if (onQuickStateChange) {
			const surfs = state === "Caries" && currentSurfaces.length === 0 ? ["O"] : currentSurfaces;
			onQuickStateChange([toothNumber], state, surfs);
		}
	};

	const handleSurfacesChange = (newSurfaces: string[]) => {
		triggerHaptic("selection");
		if (onSurfacesChange) {
			onSurfacesChange([toothNumber], newSurfaces);
		}
		if (onQuickStateChange) {
			const nextState = newSurfaces.length > 0 && currentState === "Healthy" ? "Caries" : currentState;
			onQuickStateChange([toothNumber], nextState, newSurfaces);
		}
	};

	return (
		<div
			className="tooth-carousel-focus-container w-full flex flex-col items-center gap-3 select-none"
			data-testid="tooth-carousel-focus"
		>
			{/* Header: Folk Name & Current Status */}
			<div className="flex flex-col items-center text-center w-full px-2">
				<div className="flex items-center gap-2">
					<span className="w-8 h-8 rounded-xl bg-teal-500/15 border border-teal-500/30 text-[var(--teal,#0d9488)] font-black text-lg flex items-center justify-center font-mono">
						{toothNumber}
					</span>
					<h3 className="text-sm font-extrabold text-[var(--odontogram-ink)] leading-tight truncate">
						{getToothFolkAndAnatomicalNameRu(toothNumber)}
					</h3>
				</div>
				<span className="text-xs text-[var(--odontogram-ink-muted)] mt-0.5">
					Статус: <strong className="text-[var(--odontogram-ink)] font-bold">{TOOTH_STATE_LABELS[currentState]}</strong>
				</span>
			</div>

			{/* Center Viewport: Prev Button - Big Focal Stage - Next Button */}
			<div className="tooth-carousel-focal-viewport flex items-center justify-between w-full max-w-sm px-1 gap-2">
				{/* Previous Tooth Button */}
				<button
					type="button"
					onClick={handlePrev}
					className="min-h-[48px] min-w-[48px] w-12 h-12 rounded-2xl bg-[var(--odontogram-paper)] hover:bg-[var(--odontogram-surface-hover)] border border-[var(--odontogram-border)] flex flex-col items-center justify-center text-[var(--odontogram-ink)] active:scale-95 transition-all cursor-pointer shadow-2xs shrink-0"
					title={`Предыдущий зуб (${prevTooth})`}
					aria-label={`Перейти к зубу ${prevTooth}`}
					data-testid="carousel-prev-tooth-btn"
				>
					<ChevronLeft size={22} />
					<span className="text-[10px] font-black font-mono leading-none text-[var(--odontogram-ink-muted)]">
						{prevTooth}
					</span>
				</button>

				{/* Central Focal Stage (120x140px) */}
				<div
					ref={stageRef}
					role="button"
					tabIndex={0}
					onClick={handleStageClick}
					onKeyDown={(e) => {
						if (e.key === "Enter" || e.key === " ") {
							e.preventDefault();
							handleStageClick(e as any);
						}
					}}
					className="tooth-carousel-stage flex-1 max-w-[160px] min-h-[140px] flex flex-col items-center justify-center p-2 rounded-2xl bg-[var(--odontogram-paper)] border-2 border-teal-500/40 shadow-sm cursor-pointer hover:border-teal-500 transition-all active:scale-[0.98]"
					title="Нажмите для открытия меню патологий (Bottom Sheet)"
					data-testid={`carousel-focal-tooth-${toothNumber}`}
				>
					<div className="w-full flex items-center justify-center py-1">
						<ToothSVG
							number={toothNumber}
							scale={1.65}
							state={currentState}
							material={currentToothData?.material}
							canalObturation={currentToothData?.canalObturation}
							hasPost={currentToothData?.hasPost}
							postType={currentToothData?.postType}
							boneLossLevel={currentToothData?.boneLossLevel}
							boneLossType={currentToothData?.boneLossType}
							rootResorptionStage={currentToothData?.rootResorptionStage ?? currentToothData?.rootResorption}
							periapicalLesion={currentToothData?.periapicalLesion}
							pocketDepth={currentToothData?.pocketDepth}
							pocketDepthMm={currentToothData?.pocketDepthMm}
							maxPocketDepth={currentToothData?.maxPocketDepth}
							surfaces={currentSurfaces}
							useSurfaces={useSurfaces}
							showPulpAndCanals={showPulpAndCanals}
							showPeriapicalHalos={showPeriapicalHalos}
							showPeriodontalBoneLoss={showPeriodontalBoneLoss}
							isSelected={true}
							onClick={(e) => {
								e.stopPropagation();
								handleStageClick(e);
							}}
							pediatricMode={isPediatricEffective}
						/>
					</div>
					<span className="text-[11px] font-bold text-teal-600 dark:text-teal-400 mt-1 flex items-center gap-1">
						<Sparkles size={12} />
						Шторка статуса
					</span>
				</div>

				{/* Next Tooth Button */}
				<button
					type="button"
					onClick={handleNext}
					className="min-h-[48px] min-w-[48px] w-12 h-12 rounded-2xl bg-[var(--odontogram-paper)] hover:bg-[var(--odontogram-surface-hover)] border border-[var(--odontogram-border)] flex flex-col items-center justify-center text-[var(--odontogram-ink)] active:scale-95 transition-all cursor-pointer shadow-2xs shrink-0"
					title={`Следующий зуб (${nextTooth})`}
					aria-label={`Перейти к зубу ${nextTooth}`}
					data-testid="carousel-next-tooth-btn"
				>
					<ChevronRight size={22} />
					<span className="text-[10px] font-black font-mono leading-none text-[var(--odontogram-ink-muted)]">
						{nextTooth}
					</span>
				</button>
			</div>

			{/* Surface Selector for Tooth Surfaces (O, M, D, V, L) */}
			{useSurfaces && (
				<div className="flex flex-col items-center gap-1 p-2 rounded-xl bg-[var(--odontogram-paper)] border border-[var(--odontogram-border-subtle)] w-full max-w-sm">
					<span className="text-[11px] font-bold text-[var(--odontogram-ink-muted)]">
						Поверхности коронки (O, M, D, V, L):
					</span>
					<SurfaceSelector
						selected={currentSurfaces}
						onChange={handleSurfacesChange}
						size={85}
						showPresets={true}
					/>
				</div>
			)}

			{/* Fast Pathology Grid (8 Clinical Buttons >= 44x44px) */}
			<div className="grid grid-cols-4 gap-1.5 w-full max-w-sm pt-1">
				<button
					type="button"
					onClick={() => handleFastState("Caries")}
					className={`min-h-[44px] px-2 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex flex-col items-center justify-center ${
						currentState === "Caries"
							? "bg-orange-500 text-white border-orange-600 shadow-sm"
							: "bg-[var(--odontogram-paper)] text-orange-600 border-orange-500/30 hover:bg-orange-500/10"
					}`}
					title="Кариес (C)"
				>
					<span>Кариес</span>
					<span className="text-[10px] opacity-80">C</span>
				</button>

				<button
					type="button"
					onClick={() => handleFastState("Pulpitis")}
					className={`min-h-[44px] px-2 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex flex-col items-center justify-center ${
						currentState === "Pulpitis"
							? "bg-rose-500 text-white border-rose-600 shadow-sm"
							: "bg-[var(--odontogram-paper)] text-rose-600 border-rose-500/30 hover:bg-rose-500/10"
					}`}
					title="Пульпит (P)"
				>
					<span>Пульпит</span>
					<span className="text-[10px] opacity-80">P</span>
				</button>

				<button
					type="button"
					onClick={() => handleFastState("Periodontitis")}
					className={`min-h-[44px] px-2 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex flex-col items-center justify-center ${
						currentState === "Periodontitis"
							? "bg-amber-600 text-white border-amber-700 shadow-sm"
							: "bg-[var(--odontogram-paper)] text-amber-600 border-amber-500/30 hover:bg-amber-500/10"
					}`}
					title="Периодонтит (Pt)"
				>
					<span>Периодонт</span>
					<span className="text-[10px] opacity-80">Pt</span>
				</button>

				<button
					type="button"
					onClick={() => handleFastState("Filled")}
					className={`min-h-[44px] px-2 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex flex-col items-center justify-center ${
						currentState === "Filled"
							? "bg-sky-500 text-white border-sky-600 shadow-sm"
							: "bg-[var(--odontogram-paper)] text-sky-600 border-sky-500/30 hover:bg-sky-500/10"
					}`}
					title="Пломба (F)"
				>
					<span>Пломба</span>
					<span className="text-[10px] opacity-80">F</span>
				</button>

				<button
					type="button"
					onClick={() => handleFastState("Crown")}
					className={`min-h-[44px] px-2 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex flex-col items-center justify-center ${
						currentState === "Crown"
							? "bg-emerald-600 text-white border-emerald-700 shadow-sm"
							: "bg-[var(--odontogram-paper)] text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10"
					}`}
					title="Коронка (Cr)"
				>
					<span>Коронка</span>
					<span className="text-[10px] opacity-80">Cr</span>
				</button>

				<button
					type="button"
					onClick={() => handleFastState("Implant")}
					className={`min-h-[44px] px-2 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex flex-col items-center justify-center ${
						currentState === "Implant"
							? "bg-indigo-600 text-white border-indigo-700 shadow-sm"
							: "bg-[var(--odontogram-paper)] text-indigo-600 border-indigo-500/30 hover:bg-indigo-500/10"
					}`}
					title="Имплант (Imp)"
				>
					<span>Имплант</span>
					<span className="text-[10px] opacity-80">Imp</span>
				</button>

				<button
					type="button"
					onClick={() => handleFastState("Missing")}
					className={`min-h-[44px] px-2 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex flex-col items-center justify-center ${
						currentState === "Missing"
							? "bg-slate-600 text-white border-slate-700 shadow-sm"
							: "bg-[var(--odontogram-paper)] text-slate-600 border-slate-500/30 hover:bg-slate-500/10"
					}`}
					title="Удален / Отсутствует (X)"
				>
					<span>Удален</span>
					<span className="text-[10px] opacity-80">X</span>
				</button>

				<button
					type="button"
					onClick={() => handleFastState("Healthy")}
					className={`min-h-[44px] px-2 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex flex-col items-center justify-center ${
						currentState === "Healthy"
							? "bg-teal-600 text-white border-teal-700 shadow-sm"
							: "bg-[var(--odontogram-paper)] text-teal-600 border-teal-500/30 hover:bg-teal-500/10"
					}`}
					title="Здоров / Интактен (0)"
				>
					<span>Здоров</span>
					<span className="text-[10px] opacity-80">0</span>
				</button>
			</div>
		</div>
	);
});

ToothCarouselFocus.displayName = "ToothCarouselFocus";
