/**
 * DENTE Dental CRM — Odontogram View Container (Modular Master Facade)
 *
 * Coordinates clinical odontogram view modes (3D Anatomical, 6-Surface FDI, Classic GOST 043/u),
 * unified clinical toolbar, live financial invoice panel, voice dictation HUD,
 * and secondary clinical drawers/modals.
 */

import React, { useState, useCallback, useMemo, useEffect } from "react";
import { Sparkles } from "lucide-react";
import type { OdontogramViewMode } from "@dental/shared";
import { globalDentalVoiceEngine } from "../../services/voice";
import {
	loadUiPreferences,
	saveUiPreferences,
} from "../../utils/preferencesUtils";
import { useAppStore } from "../../store/appStore";
import { AnatomicalSvgOdontogram } from "./AnatomicalSvgOdontogram";
import {
	ToothChart,
	type ToothData,
	type ToothState,
	type OdontogramQuadrantId,
	getQuadrantTitle,
	ALL_ADULT_TEETH_NUMBERS,
	PEDIATRIC_TOP_TEETH,
	PEDIATRIC_BOTTOM_TEETH,
} from "./ToothChart";
import { ClassicGostOdontogram } from "./ClassicGostOdontogram";
import { SoundFeedbackService } from "../../services/audio/SoundFeedbackService";
import { triggerHaptic } from "../../native/mobileBridge";
import { OdontogramLiveInvoice } from "./OdontogramLiveInvoice";
import { showToast } from "../GlobalToast";
import {
	type OdontogramViewContainerProps,
	areOdontogramViewContainerPropsEqual,
} from "./OdontogramViewTypes";
import { OdontogramToolbar } from "./OdontogramToolbar";
import { OdontogramStampPalette } from "./OdontogramStampPalette";
import {
	OdontogramViewModals,
	type RadialMenuAnchorData,
} from "./OdontogramViewModals";

// Transparent re-exports for complete monorepo backward compatibility
export * from "./OdontogramViewTypes";
export * from "./OdontogramToolbar";
export * from "./OdontogramStampPalette";
export * from "./OdontogramToolbarQuickActions";
export * from "./OdontogramToolbarMoreMenu";
export * from "./OdontogramViewModals";

export const OdontogramViewContainer: React.FC<OdontogramViewContainerProps> = React.memo(({
	teethData,
	pediatricMode,
	mixedDentition,
	dentitionMode,
	onDentitionModeChange,
	topTeeth,
	bottomTeeth,
	selectedTeeth = [],
	onToothClick,
	onQuickStateChange,
	useSurfaces: initialUseSurfaces = false,
	hideHeader = false,
	hideLegend = false,
	hideModeSwitcher = false,
	hideQuadrantSwitcher = false,
	activeQuadrant: controlledQuadrant,
	onQuadrantChange,
	className = "",
	initialViewMode,
	onViewModeChange,
	onOpenVoiceDictation,
	onOpenPediatricModal,
	onTogglePerio,
	isPerioOpen,
	onToggleEstimator,
	isEstimatorOpen,
	onLoadDiagnocat,
	diagnocatLoading,
	isMultiSelectMode,
	onToggleMultiSelect,
	onSelectTeethGroup,
	onMarkIntactDentition,
	onMarkWisdomTeethMissing,
	patientId,
	onSyncAllToDiary,
	liveGrossTotalRub,
	onOpenFastCheckout,
	allergyText,
	onOneClickLabOrder,
	contextDrawerTooth: controlledContextDrawerTooth,
	setContextDrawerTooth: controlledSetContextDrawerTooth,
}) => {
	// 1. Read mode from zustand app store or initialViewMode or localStorage preferences
	const storeMode = useAppStore((state) => state.odontogramViewMode);
	const setStoreMode = useAppStore((state) => state.setOdontogramViewMode);

	const [localMode, setLocalMode] = useState<OdontogramViewMode>(() => {
		if (initialViewMode) return initialViewMode;
		if (storeMode) return storeMode;
		const prefs = loadUiPreferences();
		return prefs.odontogramViewMode ?? "anatomical_svg";
	});

	const activeMode = storeMode || localMode || "anatomical_svg";

	const isPediatricEffective =
		dentitionMode === "pediatric" ||
		(dentitionMode === undefined && Boolean(pediatricMode));
	const isMixedEffective =
		dentitionMode === "mixed" ||
		(dentitionMode === undefined && Boolean(mixedDentition));
	const effectiveDentition =
		dentitionMode ??
		(isMixedEffective ? "mixed" : isPediatricEffective ? "pediatric" : "adult");

	// Canonical Quadrants & Frontal Group Teeth Arrays
	const ADULT_Q1 = useMemo(() => [18, 17, 16, 15, 14, 13, 12, 11], []);
	const ADULT_Q2 = useMemo(() => [21, 22, 23, 24, 25, 26, 27, 28], []);
	const ADULT_Q3 = useMemo(() => [31, 32, 33, 34, 35, 36, 37, 38], []);
	const ADULT_Q4 = useMemo(() => [48, 47, 46, 45, 44, 43, 42, 41], []);
	const ADULT_FRONT = useMemo(
		() => [13, 12, 11, 21, 22, 23, 43, 42, 41, 31, 32, 33],
		[],
	);

	const PEDIATRIC_Q5 = useMemo(() => [55, 54, 53, 52, 51], []);
	const PEDIATRIC_Q6 = useMemo(() => [61, 62, 63, 64, 65], []);
	const PEDIATRIC_Q7 = useMemo(() => [71, 72, 73, 74, 75], []);
	const PEDIATRIC_Q8 = useMemo(() => [85, 84, 83, 82, 81], []);
	const PEDIATRIC_FRONT = useMemo(
		() => [53, 52, 51, 61, 62, 63, 83, 82, 81, 71, 72, 73],
		[],
	);

	// 2. Custom toggles for clinical productivity
	const [showWisdomTeeth, setShowWisdomTeeth] = useState<boolean>(true);
	const [showPulpAndCanals, setShowPulpAndCanals] = useState<boolean>(false);
	const [useSurfaces] = useState<boolean>(initialUseSurfaces);
	const [isLiveInvoiceOpen, setIsLiveInvoiceOpen] = useState<boolean>(false);
	const [isFastExtractMode, setIsFastExtractMode] = useState<boolean>(false);
	const [activeStampTool, setActiveStampTool] = useState<ToothState | null>(null);
	const [internalContextDrawerTooth, setInternalContextDrawerTooth] = useState<
		number | null
	>(null);
	const contextDrawerTooth =
		controlledContextDrawerTooth !== undefined
			? controlledContextDrawerTooth
			: internalContextDrawerTooth;
	const setContextDrawerTooth =
		controlledSetContextDrawerTooth ?? setInternalContextDrawerTooth;
	const [endoDrawerTooth, setEndoDrawerTooth] = useState<number | null>(null);
	const [isPlanWizardOpen, setIsPlanWizardOpen] = useState<boolean>(false);
	const [isVoiceListening, setIsVoiceListening] = useState<boolean>(false);
	const [voiceInterimText, setVoiceInterimText] = useState<string>("");
	const [isOrthoCephOpen, setIsOrthoCephOpen] = useState<boolean>(false);
	const [isSmartOpgOpen, setIsSmartOpgOpen] = useState<boolean>(false);
	const [isMoreMenuOpen, setIsMoreMenuOpen] = useState<boolean>(false);
	const [orthoDrawerTooth, setOrthoDrawerTooth] = useState<number | null>(null);
	const [activeJawModalTarget, setActiveJawModalTarget] = useState<
		"JU" | "JL" | "C" | null
	>(null);

	const handleApplyOpgOdontogram = useCallback(
		(teethMap: Record<number, import("../orthodontics/opgTopologicalEngine").OpgToothSlot>) => {
			if (!onQuickStateChange) {
				showToast("Ошибка: нет доступа к сохранению зубной формулы", "error");
				return;
			}

			const grouped: Partial<Record<ToothState, number[]>> = {};
			for (const [fdiStr, slot] of Object.entries(teethMap)) {
				const fdi = Number(fdiStr);
				if (isNaN(fdi)) continue;
				if (!grouped[slot.status]) {
					grouped[slot.status] = [];
				}
				grouped[slot.status]!.push(fdi);
			}

			for (const [state, targets] of Object.entries(grouped) as [ToothState, number[]][]) {
				if (targets && targets.length > 0) {
					onQuickStateChange(targets, state, []);
				}
			}

			showToast("Зубная формула 043/у обновлена по результатам анализа ОПТГ", "success");
		},
		[onQuickStateChange],
	);

	// 3. Radial Menu Active Anchor
	const [radialMenuData, setRadialMenuData] = useState<RadialMenuAnchorData | null>(
		null,
	);

	const handleMarkIntactDentition = useCallback(() => {
		if (onMarkIntactDentition) {
			onMarkIntactDentition();
			return;
		}
		const allTeeth = isMixedEffective
			? [...PEDIATRIC_TOP_TEETH, ...PEDIATRIC_BOTTOM_TEETH, 16, 26, 36, 46]
			: isPediatricEffective
				? [...PEDIATRIC_TOP_TEETH, ...PEDIATRIC_BOTTOM_TEETH]
				: [...ALL_ADULT_TEETH_NUMBERS];
		onQuickStateChange?.(allTeeth, "Healthy", []);
		SoundFeedbackService.getInstance().playActionSuccess();
		showToast(
			"Санирован: вся зубная формула отмечена интактной (здоровой)",
			"success",
		);
	}, [onMarkIntactDentition, isPediatricEffective, isMixedEffective, onQuickStateChange]);

	const handleMarkWisdomTeethMissing = useCallback(() => {
		if (onMarkWisdomTeethMissing) {
			onMarkWisdomTeethMissing();
			return;
		}
		const wisdomTeeth = [18, 28, 38, 48];
		onQuickStateChange?.(wisdomTeeth, "Missing", []);
		SoundFeedbackService.getInstance().playActionSuccess();
		showToast("Адентия 8-ок: зубы 18, 28, 38, 48 отмечены отсутствующими", "info");
	}, [onMarkWisdomTeethMissing, onQuickStateChange]);

	const handleInvertSelection = useCallback(() => {
		const allTeeth = isMixedEffective
			? [...PEDIATRIC_TOP_TEETH, ...PEDIATRIC_BOTTOM_TEETH, 16, 26, 36, 46]
			: isPediatricEffective
				? [...PEDIATRIC_TOP_TEETH, ...PEDIATRIC_BOTTOM_TEETH]
				: [...ALL_ADULT_TEETH_NUMBERS];
		const selectedSet = new Set(selectedTeeth ?? []);
		const inverted = allTeeth.filter((t) => !selectedSet.has(t));
		if (onSelectTeethGroup) {
			onSelectTeethGroup(inverted);
		}
		SoundFeedbackService.getInstance().playActionSuccess();
		showToast(
			`Инвертировано: выделено ${inverted.length} из ${allTeeth.length} зубов`,
			"info",
			3000,
		);
	}, [isMixedEffective, isPediatricEffective, selectedTeeth, onSelectTeethGroup]);

	const handleClearSelection = useCallback(() => {
		if (onSelectTeethGroup) {
			onSelectTeethGroup([]);
		}
		SoundFeedbackService.getInstance().playActionSuccess();
		showToast("Выделение зубов снято", "info", 2000);
	}, [onSelectTeethGroup]);

	const handleBatchSelectGroup = useCallback(
		(teeth: number[]) => {
			if (activeStampTool && onQuickStateChange) {
				onQuickStateChange(teeth, activeStampTool, []);
				SoundFeedbackService.getInstance().playActionSuccess();
				showToast(
					`Штамп «${activeStampTool}» применён к ${teeth.length} зубам`,
					"success",
				);
				return;
			}
			if (onSelectTeethGroup) {
				onSelectTeethGroup(teeth);
			}
			SoundFeedbackService.getInstance().playActionSuccess();
			showToast(`Выделено: ${teeth.length} зубов (пакетный режим)`, "info");
		},
		[activeStampTool, onQuickStateChange, onSelectTeethGroup],
	);

	const handleQuickTriggerState = useCallback(
		(state: ToothState) => {
			if (selectedTeeth && selectedTeeth.length > 0 && onQuickStateChange) {
				onQuickStateChange(selectedTeeth, state, []);
				SoundFeedbackService.getInstance().playActionSuccess();
				showToast(
					`Статус «${state}» применён к ${selectedTeeth.length} зубам`,
					"success",
				);
			} else {
				setActiveStampTool((prev) => (prev === state ? null : state));
				if (activeStampTool !== state) {
					SoundFeedbackService.getInstance().playActionSuccess();
				}
			}
		},
		[selectedTeeth, onQuickStateChange, activeStampTool],
	);

	const handleModeSwitch = useCallback(
		(newMode: OdontogramViewMode) => {
			setLocalMode(newMode);
			try {
				if (typeof setStoreMode === "function") {
					setStoreMode(newMode);
				}
				const currentPrefs = loadUiPreferences();
				saveUiPreferences({
					...currentPrefs,
					odontogramViewMode: newMode,
				});
			} catch {
				// local storage safe fallback
			}
			onViewModeChange?.(newMode);
		},
		[setStoreMode, onViewModeChange],
	);

	const handleToothClickIntercept = useCallback(
		(arg1: number | React.MouseEvent, arg2?: DOMRect | null | number, surface?: string) => {
			let num: number;
			let safeRect: DOMRect;
			if (typeof arg1 === "number") {
				num = arg1;
				const rect = arg2 as DOMRect | null | undefined;
				safeRect =
					rect && typeof rect.left === "number" && typeof rect.top === "number"
						? rect
						: typeof DOMRect !== "undefined"
							? new DOMRect(0, 0, 0, 0)
							: ({
									x: 0,
									y: 0,
									width: 0,
									height: 0,
									top: 0,
									right: 0,
									bottom: 0,
									left: 0,
									toJSON: () => ({}),
								} as DOMRect);
			} else {
				const e = arg1 as React.MouseEvent;
				num = typeof arg2 === "number" ? arg2 : 0;
				const el = (e?.currentTarget as HTMLElement) ?? (e?.target as HTMLElement);
				safeRect =
					el && typeof el.getBoundingClientRect === "function"
						? el.getBoundingClientRect()
						: typeof DOMRect !== "undefined"
							? new DOMRect(0, 0, 0, 0)
							: ({
									x: 0,
									y: 0,
									width: 0,
									height: 0,
									top: 0,
									right: 0,
									bottom: 0,
									left: 0,
									toJSON: () => ({}),
								} as DOMRect);
			}

			if (!num) return;

			triggerHaptic("selection");

			// Если режим разметки поверхностей не включен (useSurfaces !== true), выбираем зуб целиком (surface: undefined)
			const effectiveSurface = useSurfaces ? surface : undefined;

			if (activeStampTool) {
				triggerHaptic("success");
				onQuickStateChange?.([num], activeStampTool, []);
				return;
			}

			if (isFastExtractMode) {
				triggerHaptic("success");
				onQuickStateChange?.([num], "Missing", []);
				return;
			}

			if (onToothClick) {
				onToothClick(num, safeRect, effectiveSurface);
				return;
			}

			const currentTooth = teethData.find((t) => t.toothNumber === num);
			setRadialMenuData({
				toothNumber: num,
				rect: {
					x: safeRect.left,
					y: safeRect.top,
					width: safeRect.width,
					height: safeRect.height,
				},
				currentState: currentTooth?.state,
				surfaces: effectiveSurface ? [effectiveSurface] : undefined,
			});
		},
		[activeStampTool, isFastExtractMode, onQuickStateChange, teethData, onToothClick, useSurfaces],
	);

	// Global Escape hotkey to exit Stamp tool
	useEffect(() => {
		const handleGlobalKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				if (activeStampTool) setActiveStampTool(null);
				if (isMoreMenuOpen) setIsMoreMenuOpen(false);
			}
		};
		window.addEventListener("keydown", handleGlobalKeyDown);
		return () => window.removeEventListener("keydown", handleGlobalKeyDown);
	}, [activeStampTool, isMoreMenuOpen]);

	// Listen to global dental voice engine for real-time tooth updates
	useEffect(() => {
		const unsub = globalDentalVoiceEngine.addListener({
			onListeningChange: (isL) => {
				setIsVoiceListening(isL);
				if (!isL) setVoiceInterimText("");
			},
			onTranscriptChange: (interim, final) => {
				setVoiceInterimText(interim || final || "");
			},
			onIntentParsed: (intent) => {
				if (intent.targetQuadrant !== undefined && onQuadrantChange) {
					onQuadrantChange(intent.targetQuadrant);
					void SoundFeedbackService.getInstance().playActionSuccess();
					showToast(
						`Голос: ${getQuadrantTitle(intent.targetQuadrant, Boolean(pediatricMode))}`,
						"info",
					);
				}

				if (onQuickStateChange && intent.teethUpdates.length > 0) {
					for (const t of intent.teethUpdates) {
						onQuickStateChange([t.toothNumber], t.state, t.surfaces);
					}
					void SoundFeedbackService.getInstance().playActionSuccess();
					const summary = intent.teethUpdates
						.map((t) => `Зуб ${t.toothNumber}: ${t.state}`)
						.join(", ");
					showToast(`Голос: ${summary}`, "success");
				}

				if (
					intent.type === "perio_measurement" ||
					(intent.perioMeasurements && intent.perioMeasurements.length > 0)
				) {
					if (onTogglePerio && !isPerioOpen) onTogglePerio();
					void SoundFeedbackService.getInstance().playActionSuccess();
					showToast("Голос: Пародонтологическая карта", "info");
				}

				if (
					intent.type === "ceph_landmark" ||
					(intent.cephLandmarks && intent.cephLandmarks.length > 0)
				) {
					setIsOrthoCephOpen(true);
					void SoundFeedbackService.getInstance().playActionSuccess();
					showToast("Голос: Цефалометрия ТРГ", "info");
				}
			},
		});
		return () => unsub();
	}, [onQuickStateChange, onQuadrantChange, pediatricMode, onTogglePerio, isPerioOpen]);

	// Listen for custom event to open Orthopedics Chairside Panel
	useEffect(() => {
		const handleOpenOrtho = (e: Event) => {
			const detail = (e as CustomEvent<{ toothNumber?: number | string }>).detail;
			const tooth = detail?.toothNumber ? Number(detail.toothNumber) : (selectedTeeth[0] || 16);
			setOrthoDrawerTooth(tooth);
		};
		window.addEventListener("dente-open-orthopedics-panel", handleOpenOrtho);
		return () => window.removeEventListener("dente-open-orthopedics-panel", handleOpenOrtho);
	}, [selectedTeeth]);

	const handleRadialSelectState = useCallback(
		(state: ToothState, surfaces?: readonly string[]) => {
			if (!radialMenuData) return;
			const finalSurfaces =
				surfaces !== undefined
					? surfaces
					: state !== "Healthy" && state !== "Missing"
						? radialMenuData.surfaces
						: undefined;
			onQuickStateChange?.(
				[radialMenuData.toothNumber],
				state,
				finalSurfaces ? [...finalSurfaces] : undefined,
			);
			setRadialMenuData(null);
		},
		[radialMenuData, onQuickStateChange],
	);

	const handleJawClick = useCallback(
		(target: "JU" | "JL" | "C") => setActiveJawModalTarget(target),
		[],
	);

	const sharedViewProps = useMemo(
		() => ({
			teethData,
			pediatricMode: isPediatricEffective,
			mixedDentition: isMixedEffective,
			dentitionMode: effectiveDentition,
			onDentitionModeChange,
			topTeeth,
			bottomTeeth,
			selectedTeeth,
			onToothClick: handleToothClickIntercept,
			onQuickStateChange,
			useSurfaces,
			hideHeader,
			hideLegend,
			hideQuadrantSwitcher: true,
			hideExpressActions: true,
			activeQuadrant: controlledQuadrant,
			onQuadrantChange,
			activeStamp: activeStampTool,
			onMarkIntactDentition: handleMarkIntactDentition,
			onMarkWisdomTeethMissing: handleMarkWisdomTeethMissing,
			onJawClick: handleJawClick,
			showWisdomTeeth,
			showPulpAndCanals,
			className: "",
		}),
		[
			teethData,
			isPediatricEffective,
			isMixedEffective,
			effectiveDentition,
			onDentitionModeChange,
			topTeeth,
			bottomTeeth,
			selectedTeeth,
			handleToothClickIntercept,
			onQuickStateChange,
			useSurfaces,
			hideHeader,
			hideLegend,
			controlledQuadrant,
			onQuadrantChange,
			activeStampTool,
			handleMarkIntactDentition,
			handleMarkWisdomTeethMissing,
			handleJawClick,
			showWisdomTeeth,
			showPulpAndCanals,
		],
	);

	return (
		<div
			className={`odontogram-view-container flex flex-col gap-1.5 w-full relative ${className}`.trim()}
			data-testid="odontogram-view-container"
			data-view-mode={activeMode}
		>
			{/* Unified Clinical Toolbar */}
			{!hideModeSwitcher && (
				<OdontogramToolbar
					activeMode={activeMode}
					handleModeSwitch={handleModeSwitch}
					onQuickStateChange={onQuickStateChange}
					handleQuickTriggerState={handleQuickTriggerState}
					activeStampTool={activeStampTool}
					setActiveStampTool={setActiveStampTool}
					onDentitionModeChange={onDentitionModeChange}
					dentitionMode={dentitionMode}
					pediatricMode={pediatricMode}
					isPediatricEffective={isPediatricEffective}
					onInvertSelection={handleInvertSelection}
					onClearSelection={handleClearSelection}
					handleMarkIntactDentition={handleMarkIntactDentition}
					handleMarkWisdomTeethMissing={handleMarkWisdomTeethMissing}
					onSyncAllToDiary={onSyncAllToDiary}
					liveGrossTotalRub={liveGrossTotalRub}
					onOpenFastCheckout={onOpenFastCheckout}
					allergyText={allergyText}
					selectedTeeth={selectedTeeth}
					onOneClickLabOrder={(teeth) => {
						onOneClickLabOrder?.(teeth);
						const targetTooth = teeth[0] || selectedTeeth[0] || 16;
						setOrthoDrawerTooth(targetTooth);
					}}
					onToggleEstimator={onToggleEstimator}
					isEstimatorOpen={isEstimatorOpen}
					isLiveInvoiceOpen={isLiveInvoiceOpen}
					setIsLiveInvoiceOpen={setIsLiveInvoiceOpen}
					setIsPlanWizardOpen={setIsPlanWizardOpen}
					onOpenVoiceDictation={onOpenVoiceDictation}
					toggleVoiceEngine={() => globalDentalVoiceEngine.toggle()}
					isVoiceListening={isVoiceListening}
					handleBatchSelectGroup={handleBatchSelectGroup}
					setActiveJawModalTarget={setActiveJawModalTarget}
					ADULT_Q1={ADULT_Q1}
					ADULT_Q2={ADULT_Q2}
					ADULT_Q3={ADULT_Q3}
					ADULT_Q4={ADULT_Q4}
					ADULT_FRONT={ADULT_FRONT}
					PEDIATRIC_Q5={PEDIATRIC_Q5}
					PEDIATRIC_Q6={PEDIATRIC_Q6}
					PEDIATRIC_Q7={PEDIATRIC_Q7}
					PEDIATRIC_Q8={PEDIATRIC_Q8}
					PEDIATRIC_FRONT={PEDIATRIC_FRONT}
					isMoreMenuOpen={isMoreMenuOpen}
					setIsMoreMenuOpen={setIsMoreMenuOpen}
					isFastExtractMode={isFastExtractMode}
					setIsFastExtractMode={setIsFastExtractMode}
					isMultiSelectMode={isMultiSelectMode}
					onToggleMultiSelect={onToggleMultiSelect}
					isPerioOpen={isPerioOpen}
					onTogglePerio={onTogglePerio}
					isOrthoCephOpen={isOrthoCephOpen}
					setIsOrthoCephOpen={setIsOrthoCephOpen}
					isSmartOpgOpen={isSmartOpgOpen}
					setIsSmartOpgOpen={setIsSmartOpgOpen}
					setContextDrawerTooth={setContextDrawerTooth}
					onOpenPediatricModal={onOpenPediatricModal}
					onLoadDiagnocat={onLoadDiagnocat}
					diagnocatLoading={diagnocatLoading}
					showWisdomTeeth={showWisdomTeeth}
					setShowWisdomTeeth={setShowWisdomTeeth}
					showPulpAndCanals={showPulpAndCanals}
					setShowPulpAndCanals={setShowPulpAndCanals}
				/>
			)}

			{/* Live Voice Dictation Interim HUD Banner */}
			{isVoiceListening && (
				<div
					className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-500/10 border border-blue-500/30 text-xs text-blue-600 dark:text-blue-400 font-medium select-none shadow-xs animate-in fade-in duration-150"
					data-testid="odontogram-voice-live-hud"
				>
					<span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping shrink-0" />
					<span className="font-extrabold shrink-0 flex items-center gap-1">
						<Sparkles size={14} className="text-blue-500" />
						Gemini Live VAD:
					</span>
					<span className="italic animate-pulse truncate font-bold text-blue-700 dark:text-blue-300">
						{voiceInterimText
							? `«${voiceInterimText}»`
							: "Диктуйте формулу: «16 кариес», «24 пломба», «36 удалить», «47 пульпит», «тотальная санация»..."}
					</span>
				</div>
			)}

			{/* Main Layout Area: Chart + Optional Live Invoice Sidebar */}
			<div className="flex flex-col lg:flex-row gap-3 w-full items-start">
				<div className="odontogram-active-view-slot w-full flex-1 min-w-0 flex flex-col gap-2.5">
					{activeMode === "anatomical_svg" && (
						<AnatomicalSvgOdontogram {...sharedViewProps} />
					)}
					{activeMode === "compact_clinical" && (
						<ToothChart {...sharedViewProps} />
					)}
					{activeMode === "classic_gost" && (
						<ClassicGostOdontogram {...sharedViewProps} />
					)}

					{/* Полноценная клиническая панель быстрой разметки (Штампы) под графикой одонтограммы */}
					{onQuickStateChange && (
						<OdontogramStampPalette
							activeStampTool={activeStampTool}
							setActiveStampTool={setActiveStampTool}
							onQuickStateChange={onQuickStateChange}
							handleQuickTriggerState={handleQuickTriggerState}
							selectedTeeth={selectedTeeth}
						/>
					)}
				</div>

				{/* Live Invoice Panel */}
				{isLiveInvoiceOpen && (
					<OdontogramLiveInvoice
						teethData={teethData}
						isOpen={isLiveInvoiceOpen}
						onClose={() => setIsLiveInvoiceOpen(false)}
						className="rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden"
					/>
				)}
			</div>

			{/* Secondary View Modals & Drawers */}
			<OdontogramViewModals
				teethData={teethData}
				patientId={patientId}
				isPlanWizardOpen={isPlanWizardOpen}
				onClosePlanWizard={() => setIsPlanWizardOpen(false)}
				radialMenuData={radialMenuData}
				onCloseRadialMenu={() => setRadialMenuData(null)}
				onRadialSelectState={handleRadialSelectState}
				onRadialAddToInvoice={() => setIsLiveInvoiceOpen(true)}
				onRadialOpenTherapy={(num) => {
					setContextDrawerTooth(num);
					setRadialMenuData(null);
				}}
				contextDrawerTooth={contextDrawerTooth}
				onCloseContextDrawer={() => setContextDrawerTooth(null)}
				onUpdateToothContext={(num, state, surfaces) => {
					onQuickStateChange?.([num], state, surfaces);
				}}
				endoDrawerTooth={endoDrawerTooth}
				onCloseEndoDrawer={() => setEndoDrawerTooth(null)}
				isOrthoCephOpen={isOrthoCephOpen}
				onCloseOrthoCeph={() => setIsOrthoCephOpen(false)}
				isSmartOpgOpen={isSmartOpgOpen}
				onCloseSmartOpg={() => setIsSmartOpgOpen(false)}
				onApplyOpgOdontogram={handleApplyOpgOdontogram}
				activeJawModalTarget={activeJawModalTarget}
				onCloseJawModal={() => setActiveJawModalTarget(null)}
				orthoDrawerTooth={orthoDrawerTooth}
				onCloseOrthoDrawer={() => setOrthoDrawerTooth(null)}
			/>
		</div>
	);
}, areOdontogramViewContainerPropsEqual);
OdontogramViewContainer.displayName = "OdontogramViewContainer";
