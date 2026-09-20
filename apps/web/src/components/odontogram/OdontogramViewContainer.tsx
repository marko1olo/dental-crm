import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
	Activity,
	AlertTriangle,
	Check,
	ChevronDown,
	Coins,
	Eye,
	EyeOff,
	FileText,
	FlaskConical,
	Layers,
	Mic,
	MicOff,
	MoreHorizontal,
	Paintbrush,
	Printer,
	Sparkles,
	Stethoscope,
	Trash2,
	X,
	Zap,
} from "lucide-react";
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
import { ToothRadialMenu } from "./ToothRadialMenu";
import { OdontogramLiveInvoice } from "./OdontogramLiveInvoice";
import { ToothContextDrawer } from "../diagnostics/ToothContextDrawer";
import { EndoCanalMeasurementDrawer } from "./EndoCanalMeasurementDrawer";
import { CephalometricAnalysisModal } from "../radiology/CephalometricAnalysisModal";
import { JawOcclusionModal } from "./JawOcclusionModal";
import { TreatmentPlanWizard } from "./TreatmentPlanWizard";
import { ToothCardModal } from "./ToothCardModal";
import { showToast } from "../GlobalToast";

export interface OdontogramViewOption {
	mode: OdontogramViewMode;
	label: string;
	shortLabel: string;
	icon: React.ReactNode;
	tooltip: string;
	badge?: string;
}

export const ODONTOGRAM_VIEW_MODES: readonly OdontogramViewOption[] = [
	{
		mode: "anatomical_svg",
		label: "3D Анатомический",
		shortLabel: "Анатомический",
		icon: <Sparkles size={14} className="text-indigo-500 shrink-0" />,
		tooltip: "Векторная анатомическая визуализация коронок, корней и каналов",
		badge: "3D",
	},
	{
		mode: "compact_clinical",
		label: "Клинический 6-поверхностный",
		shortLabel: "6-Поверхностный",
		icon: <Zap size={14} className="text-amber-500 shrink-0" />,
		tooltip: "Быстрая разметка патологий по 6 граням зуба (O, V, L/P, M, D, C)",
		badge: "FDI",
	},
	{
		mode: "classic_gost",
		label: "ГОСТ 043/у",
		shortLabel: "ГОСТ 043/у",
		icon: <FileText size={14} className="text-[var(--teal)] shrink-0" />,
		tooltip: "Табличная форма карты стоматологического больного (Минздрав РФ)",
		badge: "МЗ РФ",
	},
] as const;

export interface OdontogramViewContainerProps {
	teethData: ToothData[];
	pediatricMode?: boolean | undefined;
	mixedDentition?: boolean | undefined;
	dentitionMode?: "adult" | "pediatric" | "mixed" | undefined;
	onDentitionModeChange?: ((mode: "adult" | "pediatric" | "mixed") => void) | undefined;
	topTeeth?: number[] | undefined;
	bottomTeeth?: number[] | undefined;
	selectedTeeth?: number[] | undefined;
	onToothClick?: ((num: number, rect: DOMRect, surface?: string) => void) | undefined;
	onQuickStateChange?: ((targets: number[], state: ToothState, surfaces?: readonly string[] | undefined) => void) | undefined;
	useSurfaces?: boolean | undefined;
	hideHeader?: boolean | undefined;
	hideLegend?: boolean | undefined;
	hideModeSwitcher?: boolean | undefined;
	hideQuadrantSwitcher?: boolean | undefined;
	activeQuadrant?: OdontogramQuadrantId | undefined;
	onQuadrantChange?: ((quadrant: OdontogramQuadrantId) => void) | undefined;
	className?: string | undefined;
	initialViewMode?: OdontogramViewMode | undefined;
	onViewModeChange?: ((mode: OdontogramViewMode) => void) | undefined;
	onOpenVoiceDictation?: (() => void) | undefined;
	onOpenPediatricModal?: (() => void) | undefined;
	onTogglePerio?: (() => void) | undefined;
	isPerioOpen?: boolean | undefined;
	onToggleEstimator?: (() => void) | undefined;
	isEstimatorOpen?: boolean | undefined;
	onLoadDiagnocat?: (() => void) | undefined;
	diagnocatLoading?: boolean | undefined;
	isMultiSelectMode?: boolean | undefined;
	onToggleMultiSelect?: ((enabled: boolean) => void) | undefined;
	onSelectTeethGroup?: ((teeth: number[]) => void) | undefined;
	onMarkIntactDentition?: (() => void) | undefined;
	onMarkWisdomTeethMissing?: (() => void) | undefined;
	patientId?: string | undefined;
	onSyncAllToDiary?: (() => void) | undefined;
	liveGrossTotalRub?: number | undefined;
	onOpenFastCheckout?: (() => void) | undefined;
	allergyText?: string | undefined;
	onOneClickLabOrder?: ((teeth: number[]) => void) | undefined;
}

const STAMP_ITEMS: Array<{
	state: ToothState;
	label: string;
	short: string;
	testId: string;
	activeClass: string;
	badgeClass: string;
}> = [
	{
		state: "Caries",
		label: "Кариес (К)",
		short: "Кариес",
		testId: "stamp-caries-btn",
		activeClass: "bg-amber-500 text-white",
		badgeClass: "bg-amber-500/10 text-amber-800 dark:text-amber-200 hover:bg-amber-500/20 border-amber-500/20",
	},
	{
		state: "Filled",
		label: "Пломба (П)",
		short: "Пломба",
		testId: "stamp-filled-btn",
		activeClass: "bg-blue-600 text-white",
		badgeClass: "bg-blue-500/10 text-blue-700 dark:text-blue-300 hover:bg-blue-500/20 border-blue-500/30",
	},
	{
		state: "Pulpitis",
		label: "Пульпит (Ф)",
		short: "Пульпит",
		testId: "stamp-pulpitis-btn",
		activeClass: "bg-rose-600 text-white",
		badgeClass: "bg-rose-500/10 text-rose-800 dark:text-rose-200 hover:bg-rose-500/20 border-rose-500/20",
	},
	{
		state: "Crown",
		label: "Коронка (Кр)",
		short: "Коронка",
		testId: "stamp-crown-primary-btn",
		activeClass: "bg-[#10b981] text-white",
		badgeClass: "bg-[#10b981]/10 text-emerald-800 dark:text-emerald-200 hover:bg-[#10b981]/20 border border-[#10b981]/20",
	},
	{
		state: "Implant",
		label: "Имплант (И)",
		short: "Имплант",
		testId: "stamp-implant-btn",
		activeClass: "bg-slate-700 text-white",
		badgeClass: "bg-slate-500/15 text-slate-800 dark:text-slate-200 hover:bg-slate-500/25 border border-slate-500/30",
	},
	{
		state: "Missing",
		label: "Удален (X)",
		short: "Удален",
		testId: "stamp-missing-btn",
		activeClass: "bg-[#64748b] text-white",
		badgeClass: "bg-[#64748b]/10 text-slate-700 dark:text-slate-300 hover:bg-[#64748b]/20 border border-[#64748b]/20",
	},
	{
		state: "Healthy",
		label: "Здоров (З)",
		short: "Здоров",
		testId: "stamp-healthy-btn",
		activeClass: "bg-[var(--ok-fg,#10b981)] text-white",
		badgeClass: "bg-[var(--ok-bg,rgba(16,185,129,0.1))] text-[var(--ok-fg,#10b981)] hover:opacity-90 border border-[var(--ok-fg,rgba(16,185,129,0.3))]",
	},
];

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

function areTeethDataEqual(prev?: ToothData[], next?: ToothData[]): boolean {
	if (prev === next) return true;
	if (!prev || !next) return !prev && !next;
	if (prev.length !== next.length) return false;
	for (let i = 0; i < prev.length; i++) {
		const pt = prev[i];
		const nt = next[i];
		if (!pt || !nt) return false;
		if (pt.toothNumber !== nt.toothNumber) return false;
		if (pt.state !== nt.state) return false;
		if (pt.material !== nt.material) return false;
		if (pt.canalObturation !== nt.canalObturation) return false;
		if (pt.hasPost !== nt.hasPost) return false;
		if (pt.postType !== nt.postType) return false;
		if (pt.boneLossLevel !== nt.boneLossLevel) return false;
		if (pt.boneLossType !== nt.boneLossType) return false;
		if ((pt.rootResorptionStage ?? pt.rootResorption) !== (nt.rootResorptionStage ?? nt.rootResorption)) return false;
		if (pt.periapicalLesion !== nt.periapicalLesion) return false;
		const pDepth = pt.pocketDepth ?? pt.pocketDepthMm ?? pt.maxPocketDepth;
		const nDepth = nt.pocketDepth ?? nt.pocketDepthMm ?? nt.maxPocketDepth;
		if (pDepth !== nDepth) return false;
		if (!areSurfacesEqual(pt.surfaces, nt.surfaces)) return false;
	}
	return true;
}

export function areOdontogramViewContainerPropsEqual(
	prev: OdontogramViewContainerProps,
	next: OdontogramViewContainerProps,
): boolean {
	if (prev.pediatricMode !== next.pediatricMode) return false;
	if (prev.mixedDentition !== next.mixedDentition) return false;
	if (prev.dentitionMode !== next.dentitionMode) return false;
	if (prev.useSurfaces !== next.useSurfaces) return false;
	if (prev.hideHeader !== next.hideHeader) return false;
	if (prev.hideLegend !== next.hideLegend) return false;
	if (prev.hideModeSwitcher !== next.hideModeSwitcher) return false;
	if (prev.hideQuadrantSwitcher !== next.hideQuadrantSwitcher) return false;
	if (prev.activeQuadrant !== next.activeQuadrant) return false;
	if (prev.isPerioOpen !== next.isPerioOpen) return false;
	if (prev.isEstimatorOpen !== next.isEstimatorOpen) return false;
	if (prev.diagnocatLoading !== next.diagnocatLoading) return false;
	if (prev.isMultiSelectMode !== next.isMultiSelectMode) return false;
	if (prev.patientId !== next.patientId) return false;
	if (prev.className !== next.className) return false;
	if (prev.liveGrossTotalRub !== next.liveGrossTotalRub) return false;
	if (prev.allergyText !== next.allergyText) return false;

	// Compare selectedTeeth array
	if (prev.selectedTeeth !== next.selectedTeeth) {
		const prevLen = prev.selectedTeeth?.length ?? 0;
		const nextLen = next.selectedTeeth?.length ?? 0;
		if (prevLen !== nextLen) return false;
		for (let i = 0; i < prevLen; i++) {
			if (prev.selectedTeeth![i] !== next.selectedTeeth![i]) return false;
		}
	}

	// Compare topTeeth & bottomTeeth
	if (prev.topTeeth !== next.topTeeth) {
		const pLen = prev.topTeeth?.length ?? 0;
		const nLen = next.topTeeth?.length ?? 0;
		if (pLen !== nLen) return false;
		for (let i = 0; i < pLen; i++) {
			if (prev.topTeeth![i] !== next.topTeeth![i]) return false;
		}
	}
	if (prev.bottomTeeth !== next.bottomTeeth) {
		const pLen = prev.bottomTeeth?.length ?? 0;
		const nLen = next.bottomTeeth?.length ?? 0;
		if (pLen !== nLen) return false;
		for (let i = 0; i < pLen; i++) {
			if (prev.bottomTeeth![i] !== next.bottomTeeth![i]) return false;
		}
	}

	// Compare teethData
	if (!areTeethDataEqual(prev.teethData, next.teethData)) return false;

	return true;
}

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

	const isPediatricEffective = dentitionMode === "pediatric" || (dentitionMode === undefined && Boolean(pediatricMode));
	const isMixedEffective = dentitionMode === "mixed" || (dentitionMode === undefined && Boolean(mixedDentition));
	const effectiveDentition = dentitionMode ?? (isMixedEffective ? "mixed" : isPediatricEffective ? "pediatric" : "adult");

	// Canonical Quadrants & Frontal Group Teeth Arrays
	const ADULT_Q1 = useMemo(() => [18, 17, 16, 15, 14, 13, 12, 11], []);
	const ADULT_Q2 = useMemo(() => [21, 22, 23, 24, 25, 26, 27, 28], []);
	const ADULT_Q3 = useMemo(() => [31, 32, 33, 34, 35, 36, 37, 38], []);
	const ADULT_Q4 = useMemo(() => [48, 47, 46, 45, 44, 43, 42, 41], []);
	const ADULT_FRONT = useMemo(() => [13, 12, 11, 21, 22, 23, 43, 42, 41, 31, 32, 33], []);

	const PEDIATRIC_Q5 = useMemo(() => [55, 54, 53, 52, 51], []);
	const PEDIATRIC_Q6 = useMemo(() => [61, 62, 63, 64, 65], []);
	const PEDIATRIC_Q7 = useMemo(() => [71, 72, 73, 74, 75], []);
	const PEDIATRIC_Q8 = useMemo(() => [85, 84, 83, 82, 81], []);
	const PEDIATRIC_FRONT = useMemo(() => [53, 52, 51, 61, 62, 63, 83, 82, 81, 71, 72, 73], []);

	// 2. Custom toggles for clinical productivity
	const [showWisdomTeeth, setShowWisdomTeeth] = useState<boolean>(true);
	const [showPulpAndCanals, setShowPulpAndCanals] = useState<boolean>(false);
	const [useSurfaces, setUseSurfaces] = useState<boolean>(initialUseSurfaces);
	const [isLiveInvoiceOpen, setIsLiveInvoiceOpen] = useState<boolean>(false);
	const [isFastExtractMode, setIsFastExtractMode] = useState<boolean>(false);
	const [activeStampTool, setActiveStampTool] = useState<ToothState | null>(null);
	const [contextDrawerTooth, setContextDrawerTooth] = useState<number | null>(null);
	const [cardModalTooth, setCardModalTooth] = useState<number | null>(null);
	const [endoDrawerTooth, setEndoDrawerTooth] = useState<number | null>(null);
	const [isPlanWizardOpen, setIsPlanWizardOpen] = useState<boolean>(false);
	const [isVoiceListening, setIsVoiceListening] = useState<boolean>(false);
	const [voiceInterimText, setVoiceInterimText] = useState<string>("");

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
		onQuickStateChange?.(allTeeth, "Healthy");
		SoundFeedbackService.getInstance().playActionSuccess();
		showToast("Санирован: вся зубная формула отмечена интактной (здоровой)", "success");
	}, [onMarkIntactDentition, isPediatricEffective, isMixedEffective, onQuickStateChange]);

	const handleMarkWisdomTeethMissing = useCallback(() => {
		if (onMarkWisdomTeethMissing) {
			onMarkWisdomTeethMissing();
			return;
		}
		const wisdomTeeth = [18, 28, 38, 48];
		onQuickStateChange?.(wisdomTeeth, "Missing");
		SoundFeedbackService.getInstance().playActionSuccess();
		showToast("Адентия 8-ок: зубы 18, 28, 38, 48 отмечены отсутствующими", "info");
	}, [onMarkWisdomTeethMissing, onQuickStateChange]);

	const handleBatchSelectGroup = useCallback(
		(teeth: number[]) => {
			if (activeStampTool && onQuickStateChange) {
				onQuickStateChange(teeth, activeStampTool);
				SoundFeedbackService.getInstance().playActionSuccess();
				showToast(`Штамп «${activeStampTool}» применён к ${teeth.length} зубам`, "success");
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
				onQuickStateChange(selectedTeeth, state);
				SoundFeedbackService.getInstance().playActionSuccess();
				showToast(`Статус «${state}» применён к ${selectedTeeth.length} зубам`, "success");
			} else {
				setActiveStampTool((prev) => (prev === state ? null : state));
				if (activeStampTool !== state) {
					SoundFeedbackService.getInstance().playActionSuccess();
				}
			}
		},
		[selectedTeeth, onQuickStateChange, activeStampTool],
	);
	const [isOrthoCephOpen, setIsOrthoCephOpen] = useState<boolean>(false);
	const [isMoreMenuOpen, setIsMoreMenuOpen] = useState<boolean>(false);
	const [activeJawModalTarget, setActiveJawModalTarget] = useState<"JU" | "JL" | "C" | null>(null);
	const moreMenuRef = React.useRef<HTMLDivElement>(null);

	// 3. Radial Menu Active Anchor
	const [radialMenuData, setRadialMenuData] = useState<{
		toothNumber: number;
		rect: { x: number; y: number; width: number; height: number };
		currentState?: ToothState | undefined;
		surfaces?: string[] | undefined;
	} | null>(null);

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

	// Intercept tooth click: in Stamp mode -> instant State change; in Fast Extract mode -> instant Missing; else call onToothClick or fallback to radial
	const handleToothClickIntercept = useCallback(
		(num: number, rect?: DOMRect | null, surface?: string) => {
			const safeRect: DOMRect =
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

			triggerHaptic("selection");

			if (activeStampTool) {
				triggerHaptic("success");
				onQuickStateChange?.([num], activeStampTool);
				return;
			}

			if (isFastExtractMode) {
				triggerHaptic("success");
				onQuickStateChange?.([num], "Missing");
				return;
			}

			if (onToothClick) {
				onToothClick(num, safeRect, surface);
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
				surfaces: currentTooth?.surfaces ? [...currentTooth.surfaces] : undefined,
			});
		},
		[activeStampTool, isFastExtractMode, onQuickStateChange, teethData, onToothClick],
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

	// Click outside to close More dropdown
	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
				setIsMoreMenuOpen(false);
			}
		};
		if (isMoreMenuOpen) {
			document.addEventListener("mousedown", handleClickOutside);
		}
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [isMoreMenuOpen]);

	// Listen to global dental voice engine for real-time tooth updates & interim text streaming
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
				// 1. Голосовое переключение квадрантов
				if (intent.targetQuadrant !== undefined && onQuadrantChange) {
					onQuadrantChange(intent.targetQuadrant);
					void SoundFeedbackService.getInstance().playActionSuccess();
					showToast(`Голос: ${getQuadrantTitle(intent.targetQuadrant, Boolean(pediatricMode))}`, "info");
				}

				// 2. Голосовое выставление статуса зубов с аудио-фидбеком
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

				// 3. Голосовое открытие пародонтологической карты
				if (intent.type === "perio_measurement" || (intent.perioMeasurements && intent.perioMeasurements.length > 0)) {
					if (onTogglePerio && !isPerioOpen) onTogglePerio();
					void SoundFeedbackService.getInstance().playActionSuccess();
					showToast("Голос: Пародонтологическая карта", "info");
				}

				// 4. Голосовое открытие цефалометрии ТРГ
				if (intent.type === "ceph_landmark" || (intent.cephLandmarks && intent.cephLandmarks.length > 0)) {
					setIsOrthoCephOpen(true);
					void SoundFeedbackService.getInstance().playActionSuccess();
					showToast("Голос: Цефалометрия ТРГ", "info");
				}
			},
		});
		return () => unsub();
	}, [onQuickStateChange, onQuadrantChange, pediatricMode]);

	const handleRadialSelectState = useCallback(
		(state: ToothState, surfaces?: readonly string[]) => {
			if (!radialMenuData) return;
			const finalSurfaces =
				surfaces !== undefined
					? surfaces
					: state !== "Healthy" && state !== "Missing"
						? radialMenuData.surfaces
						: undefined;
			onQuickStateChange?.([radialMenuData.toothNumber], state, finalSurfaces ? [...finalSurfaces] : undefined);
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
			{/* Unified Clinical Toolbar - 1-Level Compact Console (Mandate 8d, 8e, 8p: strictly 36px) */}
			{!hideModeSwitcher && (
				<div
					className="odontogram-toolbar flex items-center justify-between gap-1.5 px-2 py-0.5 border-b border-[var(--odontogram-border-subtle,#e2e8f0)] w-full select-none flex-nowrap overflow-x-auto scrollbar-none min-h-[34px] h-[34px]"
					role="toolbar"
					aria-label="Панель управления зубной формулой"
				>
					{/* Левая группа: Режимы схемы (3D / 6-гран / ГОСТ) + Палитра статусов (Норма, Кариес, Пульпит, Пломба, Удален) + Прикус + Санирован */}
					<div className="flex items-center gap-1 sm:gap-1.5 flex-nowrap shrink-0">
						{/* Segmented View Mode Radios: 3D / 6-гран. / ГОСТ */}
						<div
							className="inline-flex items-center p-0.5 rounded-lg bg-[var(--odontogram-surface-hover,#f1f5f9)] border border-[var(--odontogram-border-subtle,#e2e8f0)] shrink-0 h-8"
							role="radiogroup"
							aria-label="Режимы схемы"
						>
							{ODONTOGRAM_VIEW_MODES.map((option) => {
								const isActive = activeMode === option.mode;
								return (
									<button
										key={option.mode}
										type="button"
										role="radio"
										aria-checked={isActive}
										title={option.tooltip}
										data-testid={`odontogram-mode-btn-${option.mode}`}
										onClick={() => handleModeSwitch(option.mode)}
										className={`h-7 flex items-center gap-1 px-2 rounded-md text-xs font-bold whitespace-nowrap transition-all duration-150 cursor-pointer select-none shrink-0 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
											isActive
												? "bg-[var(--odontogram-paper,#ffffff)] text-[var(--odontogram-ink,#0f172a)] shadow-xs font-black border border-[var(--odontogram-border,#cbd5e1)]"
												: "text-[var(--odontogram-ink-muted,#64748b)] hover:text-[var(--odontogram-ink,#0f172a)] hover:bg-[var(--odontogram-paper,#ffffff)]/60"
										}`}
									>
										{option.icon}
										<span className="truncate">{option.shortLabel}</span>
										{option.badge && (
											<span
												className={`text-[9px] px-1 py-0.2 rounded font-black tracking-tight ${
													isActive
														? "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/25 font-mono"
														: "bg-[var(--odontogram-border-subtle,#e2e8f0)] text-[var(--odontogram-ink-muted,#64748b)]"
												}`}
											>
												{option.badge}
											</span>
										)}
									</button>
								);
							})}
						</div>

						<div className="w-px h-5 bg-[var(--odontogram-border-subtle,#e2e8f0)] dark:bg-zinc-800 shrink-0" />

						{/* 1-Click Quick State Triggers (Палитра статусов в едином тулбаре 36px) */}
						{onQuickStateChange && (
							<div
								className="inline-flex items-center p-0.5 rounded-lg bg-[var(--odontogram-surface-hover,#f1f5f9)] border border-[var(--odontogram-border-subtle,#e2e8f0)] shrink-0 h-8 gap-0.5"
								role="group"
								aria-label="Быстрые статусы патологий"
							>
								<button
									type="button"
									onClick={() => handleQuickTriggerState("Healthy")}
									className={`h-7 px-1.5 sm:px-2 rounded-md text-[11px] sm:text-xs font-bold transition-all cursor-pointer select-none shrink-0 flex-shrink-0 min-w-max flex items-center gap-1 ${
										activeStampTool === "Healthy"
											? "bg-emerald-600 text-white font-black shadow-xs"
											: "text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/15"
									}`}
									title="Норма / Здоров: применить к выделенным зубам или включить штамп нормы"
									data-testid="quick-trigger-healthy-btn"
								>
									<span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
									<span className="whitespace-nowrap shrink-0 flex-shrink-0 min-w-max">Норма</span>
								</button>
								<button
									type="button"
									onClick={() => handleQuickTriggerState("Caries")}
									className={`h-7 px-1.5 sm:px-2 rounded-md text-[11px] sm:text-xs font-bold transition-all cursor-pointer select-none shrink-0 flex-shrink-0 min-w-max flex items-center gap-1 ${
										activeStampTool === "Caries"
											? "bg-amber-600 text-white font-black shadow-xs"
											: "text-amber-700 dark:text-amber-400 hover:bg-amber-500/15"
									}`}
									title="Кариес (К): применить к выделенным зубам или включить штамп кариеса"
									data-testid="quick-trigger-caries-btn"
								>
									<span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
									<span className="whitespace-nowrap shrink-0 flex-shrink-0 min-w-max">Кариес</span>
								</button>
								<button
									type="button"
									onClick={() => handleQuickTriggerState("Pulpitis")}
									className={`h-7 px-1.5 sm:px-2 rounded-md text-[11px] sm:text-xs font-bold transition-all cursor-pointer select-none shrink-0 flex-shrink-0 min-w-max flex items-center gap-1 ${
										activeStampTool === "Pulpitis"
											? "bg-red-600 text-white font-black shadow-xs"
											: "text-red-700 dark:text-red-400 hover:bg-red-500/15"
									}`}
									title="Пульпит (Ф): анатомический красный #ef4444, применить к выделенным зубам или включить штамп"
									data-testid="quick-trigger-pulpitis-btn"
								>
									<span className="w-2 h-2 rounded-full bg-[#ef4444] shrink-0" />
									<span className="whitespace-nowrap shrink-0 flex-shrink-0 min-w-max">Пульпит</span>
								</button>
								<button
									type="button"
									onClick={() => handleQuickTriggerState("Filled")}
									className={`h-7 px-1.5 sm:px-2 rounded-md text-[11px] sm:text-xs font-bold transition-all cursor-pointer select-none shrink-0 flex-shrink-0 min-w-max flex items-center gap-1 ${
										activeStampTool === "Filled"
											? "bg-sky-600 text-white font-black shadow-xs"
											: "text-sky-700 dark:text-sky-400 hover:bg-sky-500/15"
									}`}
									title="Пломба (П): применить к выделенным зубам или включить штамп пломбы"
									data-testid="quick-trigger-filling-btn"
								>
									<span className="w-2 h-2 rounded-full bg-sky-500 shrink-0" />
									<span className="whitespace-nowrap shrink-0 flex-shrink-0 min-w-max">Пломба</span>
								</button>
								<button
									type="button"
									onClick={() => handleQuickTriggerState("Missing")}
									className={`h-7 px-1.5 sm:px-2 rounded-md text-[11px] sm:text-xs font-bold transition-all cursor-pointer select-none shrink-0 flex-shrink-0 min-w-max flex items-center gap-1 ${
										activeStampTool === "Missing"
											? "bg-zinc-700 text-white font-black shadow-xs"
											: "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-500/15"
									}`}
									title="Удален (X): применить к выделенным зубам или включить штамп отсутствия"
									data-testid="quick-trigger-extracted-btn"
								>
									<span className="w-2 h-2 rounded-full bg-zinc-500 shrink-0" />
									<span className="whitespace-nowrap shrink-0 flex-shrink-0 min-w-max">Удален</span>
								</button>
							</div>
						)}

						{/* Segmented Dentition Formula 1-Click Toggle: 11-48 / 51-85 / Сменный */}
						{onDentitionModeChange && (
							<details className="relative shrink-0 flex-shrink-0">
								<summary
									className="list-none inline-flex items-center gap-1 h-8 px-2 sm:px-2.5 rounded-lg bg-[var(--odontogram-surface-hover,#f1f5f9)] border border-[var(--odontogram-border-subtle,#e2e8f0)] text-xs font-bold text-[var(--odontogram-ink,#0f172a)] cursor-pointer select-none transition-all hover:bg-[var(--odontogram-paper,#ffffff)] shrink-0"
									title="Переключение прикуса (11–48 постоянный, 51–85 молочный, сменный)"
								>
									<span className="whitespace-nowrap">
										{(dentitionMode ?? (pediatricMode ? "pediatric" : "adult")) === "pediatric"
											? "51–85"
											: (dentitionMode ?? (pediatricMode ? "pediatric" : "adult")) === "mixed"
												? "Сменный"
												: "11–48"}
									</span>
									<ChevronDown size={11} className="opacity-70 shrink-0" />
								</summary>
								<div
									className="absolute left-0 top-full mt-1 z-40 p-1.5 rounded-xl shadow-xl bg-[var(--paper,#ffffff)] dark:bg-zinc-900 border border-[var(--odontogram-border-subtle,#e2e8f0)] dark:border-zinc-800 flex flex-col gap-1 min-w-[140px]"
									role="group"
									aria-label="Тип прикуса"
								>
									<button
										type="button"
										onClick={(e) => {
											const d = e.currentTarget.closest("details");
											if (d) d.open = false;
											onDentitionModeChange("adult");
										}}
										className={`h-7 px-2 rounded-md text-xs font-bold transition-all cursor-pointer select-none flex items-center justify-between text-left ${
											(dentitionMode ?? (pediatricMode ? "pediatric" : "adult")) === "adult"
												? "bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)] font-black shadow-xs"
												: "text-[var(--odontogram-ink-muted,#64748b)] hover:text-[var(--odontogram-ink,#0f172a)] hover:bg-[var(--odontogram-surface-hover,#f1f5f9)]"
										}`}
										title="Постоянный прикус взрослых (11–48, 32 зуба)"
										data-testid="toolbar-dentition-adult"
									>
										<span>11–48 (Взрослый)</span>
										{(dentitionMode ?? (pediatricMode ? "pediatric" : "adult")) === "adult" && <Check size={12} className="shrink-0" />}
									</button>
									<button
										type="button"
										onClick={(e) => {
											const d = e.currentTarget.closest("details");
											if (d) d.open = false;
											onDentitionModeChange("pediatric");
										}}
										className={`h-7 px-2 rounded-md text-xs font-bold transition-all cursor-pointer select-none flex items-center justify-between text-left ${
											(dentitionMode ?? (pediatricMode ? "pediatric" : "adult")) === "pediatric"
												? "bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)] font-black shadow-xs"
												: "text-[var(--odontogram-ink-muted,#64748b)] hover:text-[var(--odontogram-ink,#0f172a)] hover:bg-[var(--odontogram-surface-hover,#f1f5f9)]"
										}`}
										title="Детский молочный прикус (51–85, 20 зубов)"
										data-testid="toolbar-dentition-pediatric"
									>
										<span>51–85 (Детский)</span>
										{(dentitionMode ?? (pediatricMode ? "pediatric" : "adult")) === "pediatric" && <Check size={12} className="shrink-0" />}
									</button>
									<button
										type="button"
										onClick={(e) => {
											const d = e.currentTarget.closest("details");
											if (d) d.open = false;
											onDentitionModeChange("mixed");
										}}
										className={`h-7 px-2 rounded-md text-xs font-bold transition-all cursor-pointer select-none flex items-center justify-between text-left ${
											(dentitionMode ?? (pediatricMode ? "pediatric" : "adult")) === "mixed"
												? "bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)] font-black shadow-xs"
												: "text-[var(--odontogram-ink-muted,#64748b)] hover:text-[var(--odontogram-ink,#0f172a)] hover:bg-[var(--odontogram-surface-hover,#f1f5f9)]"
										}`}
										title="Сменный прикус: 20 молочных + 4 первых постоянных моляра (24 зуба)"
										data-testid="toolbar-dentition-mixed"
									>
										<span>Сменный прикус</span>
										{(dentitionMode ?? (pediatricMode ? "pediatric" : "adult")) === "mixed" && <Check size={12} className="shrink-0" />}
									</button>
								</div>
							</details>
						)}

						{/* 1-Click Total Sanitation */}
						{onQuickStateChange && (
							<button
								type="button"
								onClick={handleMarkIntactDentition}
								className="h-8 px-2 sm:px-2.5 rounded-lg text-xs font-black bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-800 dark:text-emerald-200 border border-emerald-500/30 transition-all cursor-pointer shadow-xs flex items-center gap-1 sm:gap-1.5 shrink-0 active:scale-98 whitespace-nowrap"
								title="1-клик Санирован: вся зубная формула отмечается интактной"
								data-testid="mark-intact-dentition-btn"
							>
								<Zap size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
								<span className="whitespace-nowrap shrink-0">Санирован</span>
							</button>
						)}
					</div>

					{/* Правая группа: 043/у + Касса/Смета + Аллергии + ЗТЛ + Смета + План + Пульт + Действия + Ещё */}
					<div className="flex items-center gap-1 shrink-0 flex-nowrap min-w-0 ml-auto">
						{/* 1-клик перенос клинического статуса зубной формулы в Дневник 043/у */}
						{onSyncAllToDiary && (
							<button
								type="button"
								onClick={onSyncAllToDiary}
								className="h-7 px-2 rounded-md text-xs font-bold bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white transition-all flex items-center justify-center gap-1 cursor-pointer shrink-0 shadow-xs whitespace-nowrap"
								title="Перенести клинический статус зубной формулы в Дневник 043/у в 1 клик"
								data-testid="btn-hotpath-sync-all-to-diary"
							>
								<FileText size={12} className="shrink-0" />
								<span>043/у</span>
							</button>
						)}

						{/* Компактный финансовый бейдж приема (Tier 1, 1-Click FastCheckout Modal) */}
						{liveGrossTotalRub !== undefined && (
							<div
								className="flex items-center gap-1 px-1.5 h-7 rounded-md bg-teal-500/10 dark:bg-teal-950/40 border border-teal-500/30 text-teal-900 dark:text-teal-200 text-xs font-bold shrink-0 shadow-2xs whitespace-nowrap"
								data-testid="odontogram-compact-bill-badge"
							>
								<Coins className="w-3 h-3 text-teal-600 dark:text-teal-400 shrink-0" />
								<strong className="font-mono font-black text-xs text-teal-800 dark:text-teal-200 shrink-0 whitespace-nowrap">
									{liveGrossTotalRub.toLocaleString("ru-RU", { minimumFractionDigits: 0 })} ₽
								</strong>
								{onOpenFastCheckout && (
									<button
										type="button"
										onClick={onOpenFastCheckout}
										className="ml-0.5 px-1.5 h-5 rounded bg-teal-600 hover:bg-teal-700 active:scale-95 text-white font-bold text-[10px] flex items-center gap-0.5 transition-all cursor-pointer shadow-2xs shrink-0"
										title="Открыть быструю кассу приема (54-ФЗ)"
										data-testid="btn-open-fast-checkout"
									>
										<span>Оплатить</span>
									</button>
								)}
							</div>
						)}

						{/* Критический аллерго-бейдж безопасности */}
						{allergyText && (
							<span
								className="h-7 px-1.5 rounded-md bg-rose-600 text-white font-mono font-black text-xs inline-flex items-center gap-1 shrink-0 whitespace-nowrap"
								data-testid="badge-critical-allergy-tier1"
								title={allergyText}
							>
								<AlertTriangle size={12} className="shrink-0" />
								<span className="truncate max-w-[100px]">{allergyText}</span>
							</span>
						)}

						{/* Наряд в ЗТЛ при выделенных зубах */}
						{selectedTeeth && selectedTeeth.length > 0 && onOneClickLabOrder && (
							<button
								type="button"
								onClick={() => onOneClickLabOrder(selectedTeeth)}
								className="h-7 px-2 rounded-md text-xs font-black text-amber-900 dark:text-amber-100 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 flex items-center gap-1 cursor-pointer shrink-0 transition-all active:scale-95 shadow-2xs whitespace-nowrap"
								title="Оформить наряд в зуботехническую лабораторию для выбранных зубов в 1 клик"
								data-testid="selected-teeth-lab-order-btn"
							>
								<FlaskConical size={12} className="text-amber-600 dark:text-amber-400 shrink-0" />
								<span>ЗТЛ ({selectedTeeth.length})</span>
							</button>
						)}

						<button
							type="button"
							onClick={() => {
								if (onToggleEstimator) {
									onToggleEstimator();
								} else {
									setIsLiveInvoiceOpen((prev) => !prev);
								}
							}}
							className={`h-7 flex items-center gap-1 px-2 rounded-md text-xs font-bold whitespace-nowrap border transition-all shrink-0 cursor-pointer ${
								(isEstimatorOpen ?? isLiveInvoiceOpen)
									? "bg-[var(--teal)] text-[var(--on-teal,#ffffff)] border-[var(--teal-dark,var(--teal))] shadow-sm font-black"
									: "bg-[var(--teal-soft,rgba(13,148,136,0.1))] text-[var(--teal)] border-[var(--teal)]/30 hover:bg-[var(--teal-soft,rgba(13,148,136,0.2))]"
							}`}
							title="Открыть живой калькулятор сметы лечения"
						>
							<Coins size={12} />
							<span className="hidden sm:inline">Смета</span>
						</button>

						<button
							type="button"
							onClick={() => setIsPlanWizardOpen(true)}
							className="hidden sm:flex h-7 items-center gap-1 px-2 rounded-md text-xs font-black whitespace-nowrap border border-indigo-500/40 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/20 transition-all shrink-0 cursor-pointer shadow-xs active:scale-95"
							title="Сформировать черновой план лечения по номенклатуре 804н"
							data-testid="create-plan-from-pathologies-btn"
						>
							<FileText size={12} className="text-indigo-600 dark:text-indigo-400" />
							<span className="hidden 2xl:inline">План из патологий</span>
							<span className="2xl:hidden">План</span>
						</button>

						<button
							type="button"
							onClick={() => {
								if (onOpenVoiceDictation) {
									onOpenVoiceDictation();
								} else {
									globalDentalVoiceEngine.toggle();
								}
							}}
							className={`h-7 flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-md text-xs font-black whitespace-nowrap shadow-xs shrink-0 flex-shrink-0 min-w-max cursor-pointer transition-all active:scale-95 ${
								isVoiceListening
									? "bg-rose-600 hover:bg-rose-500 text-white animate-pulse ring-2 ring-rose-500/30"
									: "bg-indigo-600 hover:bg-indigo-500 text-white"
							}`}
							title={isVoiceListening ? "Остановить диктовку" : "Пульт голосовой диктовки зубной формулы"}
							aria-pressed={isVoiceListening}
							data-testid="odontogram-voice-dictation-btn"
						>
							{isVoiceListening ? <MicOff size={12} className="shrink-0" /> : <Mic size={12} className="shrink-0" />}
							<span className="hidden xl:inline shrink-0">{isVoiceListening ? "Слушаю..." : "Пульт"}</span>
						</button>

						{/* Quick Actions Dropdown (Действия: без 8-ок, квадранты, челюсти) */}
						<details className="relative shrink-0">
							<summary
								className="list-none h-7 px-2 sm:px-2.5 rounded-md bg-[var(--odontogram-surface-hover,#f1f5f9)] border border-[var(--odontogram-border-subtle,#e2e8f0)] hover:text-indigo-600 text-[var(--odontogram-ink-muted,#64748b)] text-xs font-bold flex items-center gap-1 cursor-pointer select-none transition-all shrink-0"
								title="Быстрые действия: санация, без 8-ок, квадранты, челюсти"
								data-testid="odontogram-quick-actions-menu"
							>
								<Layers size={13} className="shrink-0 text-indigo-600 dark:text-indigo-400" />
								<span className="hidden sm:inline">Действия</span>
								<ChevronDown size={11} className="shrink-0 opacity-70" />
							</summary>
							<div className="absolute right-0 top-full mt-1.5 z-40 w-72 p-2 rounded-xl shadow-xl bg-[var(--paper,#ffffff)] dark:bg-zinc-900 border border-[var(--odontogram-border-subtle,#e2e8f0)] dark:border-zinc-800 flex flex-col gap-2">
								{onQuickStateChange && (
									<div>
										<div className="text-[10px] font-bold uppercase tracking-wider text-[var(--odontogram-ink-muted,#64748b)] px-1 mb-1 select-none">
											Пакетные операции (1 клик)
										</div>
										<div className="flex items-center gap-1.5">
											<button
												type="button"
												onClick={(e) => {
													const details = e.currentTarget.closest("details");
													if (details) details.open = false;
													handleMarkIntactDentition();
												}}
												className="flex-1 h-7 px-2 rounded-lg text-xs font-black bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-800 dark:text-emerald-200 border border-emerald-500/30 transition-all cursor-pointer shadow-xs flex items-center justify-center gap-1 active:scale-98"
												title="1-клик Санирован / Интактный зубной ряд: все 32 зуба моментально помечаются здоровыми"
												data-testid="mark-intact-dentition-dropdown-btn mark-intact-dentition-btn"
											>
												<Zap size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
												<span>Санирован</span>
											</button>

											{!pediatricMode && (
												<button
													type="button"
													onClick={(e) => {
														const details = e.currentTarget.closest("details");
														if (details) details.open = false;
														handleMarkWisdomTeethMissing();
													}}
													className="flex-1 h-7 px-2 rounded-lg text-xs font-black bg-zinc-500/15 hover:bg-zinc-500/25 text-zinc-800 dark:text-zinc-200 border border-zinc-500/30 transition-all cursor-pointer shadow-xs flex items-center justify-center gap-1 active:scale-98"
													title="1-клик Адентия зубов мудрости: зубы 18, 28, 38, 48 моментально помечаются отсутствующими"
													data-testid="mark-wisdom-missing-btn"
												>
													<Zap size={13} className="text-zinc-500 shrink-0" />
													<span>Без 8-ок</span>
												</button>
											)}
										</div>
									</div>
								)}

								<div>
									<div className="text-[10px] font-bold uppercase tracking-wider text-[var(--odontogram-ink-muted,#64748b)] px-1 mb-1 select-none">
										Выбор квадрантов и фронта
									</div>
									<div className="flex items-center gap-1">
										{isPediatricEffective ? (
											<>
												<button
													type="button"
													onClick={(e) => {
														const details = e.currentTarget.closest("details");
														if (details) details.open = false;
														handleBatchSelectGroup(PEDIATRIC_Q5);
													}}
													className="flex-1 h-7 rounded text-[11px] font-bold text-[var(--odontogram-ink-muted,#64748b)] hover:text-[var(--odontogram-ink,#0f172a)] hover:bg-[var(--odontogram-surface,#ffffff)] border border-[var(--odontogram-border-subtle,#e2e8f0)] transition-all cursor-pointer select-none text-center"
													title="Выделить Q5 (55–51, В/Ч Правый)"
													data-testid="batch-select-q5-btn"
												>
													Q5
												</button>
												<button
													type="button"
													onClick={(e) => {
														const details = e.currentTarget.closest("details");
														if (details) details.open = false;
														handleBatchSelectGroup(PEDIATRIC_Q6);
													}}
													className="flex-1 h-7 rounded text-[11px] font-bold text-[var(--odontogram-ink-muted,#64748b)] hover:text-[var(--odontogram-ink,#0f172a)] hover:bg-[var(--odontogram-surface,#ffffff)] border border-[var(--odontogram-border-subtle,#e2e8f0)] transition-all cursor-pointer select-none text-center"
													title="Выделить Q6 (61–65, В/Ч Левый)"
													data-testid="batch-select-q6-btn"
												>
													Q6
												</button>
												<button
													type="button"
													onClick={(e) => {
														const details = e.currentTarget.closest("details");
														if (details) details.open = false;
														handleBatchSelectGroup(PEDIATRIC_Q7);
													}}
													className="flex-1 h-7 rounded text-[11px] font-bold text-[var(--odontogram-ink-muted,#64748b)] hover:text-[var(--odontogram-ink,#0f172a)] hover:bg-[var(--odontogram-surface,#ffffff)] border border-[var(--odontogram-border-subtle,#e2e8f0)] transition-all cursor-pointer select-none text-center"
													title="Выделить Q7 (71–75, Н/Ч Левый)"
													data-testid="batch-select-q7-btn"
												>
													Q7
												</button>
												<button
													type="button"
													onClick={(e) => {
														const details = e.currentTarget.closest("details");
														if (details) details.open = false;
														handleBatchSelectGroup(PEDIATRIC_Q8);
													}}
													className="flex-1 h-7 rounded text-[11px] font-bold text-[var(--odontogram-ink-muted,#64748b)] hover:text-[var(--odontogram-ink,#0f172a)] hover:bg-[var(--odontogram-surface,#ffffff)] border border-[var(--odontogram-border-subtle,#e2e8f0)] transition-all cursor-pointer select-none text-center"
													title="Выделить Q8 (85–81, Н/Ч Правый)"
													data-testid="batch-select-q8-btn"
												>
													Q8
												</button>
												<button
													type="button"
													onClick={(e) => {
														const details = e.currentTarget.closest("details");
														if (details) details.open = false;
														handleBatchSelectGroup(PEDIATRIC_FRONT);
													}}
													className="flex-1 h-7 rounded text-[11px] font-bold text-amber-700 dark:text-amber-300 hover:bg-amber-500/15 border border-amber-500/30 transition-all cursor-pointer select-none text-center"
													title="Выделить детскую фронтальную группу (53–63, 83–73)"
													data-testid="batch-select-front-btn"
												>
													Фронт
												</button>
											</>
										) : (
											<>
												<button
													type="button"
													onClick={(e) => {
														const details = e.currentTarget.closest("details");
														if (details) details.open = false;
														handleBatchSelectGroup(ADULT_Q1);
													}}
													className="flex-1 h-7 rounded text-[11px] font-bold text-[var(--odontogram-ink-muted,#64748b)] hover:text-[var(--odontogram-ink,#0f172a)] hover:bg-[var(--odontogram-surface,#ffffff)] border border-[var(--odontogram-border-subtle,#e2e8f0)] transition-all cursor-pointer select-none text-center"
													title="Выделить Q1 (18–11, В/Ч Правый)"
													data-testid="batch-select-q1-btn"
												>
													Q1
												</button>
												<button
													type="button"
													onClick={(e) => {
														const details = e.currentTarget.closest("details");
														if (details) details.open = false;
														handleBatchSelectGroup(ADULT_Q2);
													}}
													className="flex-1 h-7 rounded text-[11px] font-bold text-[var(--odontogram-ink-muted,#64748b)] hover:text-[var(--odontogram-ink,#0f172a)] hover:bg-[var(--odontogram-surface,#ffffff)] border border-[var(--odontogram-border-subtle,#e2e8f0)] transition-all cursor-pointer select-none text-center"
													title="Выделить Q2 (21–28, В/Ч Левый)"
													data-testid="batch-select-q2-btn"
												>
													Q2
												</button>
												<button
													type="button"
													onClick={(e) => {
														const details = e.currentTarget.closest("details");
														if (details) details.open = false;
														handleBatchSelectGroup(ADULT_Q3);
													}}
													className="flex-1 h-7 rounded text-[11px] font-bold text-[var(--odontogram-ink-muted,#64748b)] hover:text-[var(--odontogram-ink,#0f172a)] hover:bg-[var(--odontogram-surface,#ffffff)] border border-[var(--odontogram-border-subtle,#e2e8f0)] transition-all cursor-pointer select-none text-center"
													title="Выделить Q3 (31–38, Н/Ч Левый)"
													data-testid="batch-select-q3-btn"
												>
													Q3
												</button>
												<button
													type="button"
													onClick={(e) => {
														const details = e.currentTarget.closest("details");
														if (details) details.open = false;
														handleBatchSelectGroup(ADULT_Q4);
													}}
													className="flex-1 h-7 rounded text-[11px] font-bold text-[var(--odontogram-ink-muted,#64748b)] hover:text-[var(--odontogram-ink,#0f172a)] hover:bg-[var(--odontogram-surface,#ffffff)] border border-[var(--odontogram-border-subtle,#e2e8f0)] transition-all cursor-pointer select-none text-center"
													title="Выделить Q4 (48–41, Н/Ч Правый)"
													data-testid="batch-select-q4-btn"
												>
													Q4
												</button>
												<button
													type="button"
													onClick={(e) => {
														const details = e.currentTarget.closest("details");
														if (details) details.open = false;
														handleBatchSelectGroup(ADULT_FRONT);
													}}
													className="flex-1 h-7 rounded text-[11px] font-bold text-amber-700 dark:text-amber-300 hover:bg-amber-500/15 border border-amber-500/30 transition-all cursor-pointer select-none text-center"
													title="Выделить фронтальную группу (13–23, 43–33)"
													data-testid="batch-select-front-btn"
												>
													Фронт
												</button>
											</>
										)}
									</div>
								</div>

								<div>
									<div className="text-[10px] font-bold uppercase tracking-wider text-[var(--odontogram-ink-muted,#64748b)] px-1 mb-1 select-none">
										Челюсти и прикус
									</div>
									<div className="flex items-center gap-1.5">
										<button
											type="button"
											onClick={(e) => {
												const details = e.currentTarget.closest("details");
												if (details) details.open = false;
												setActiveJawModalTarget("JU");
											}}
											className="flex-1 h-7 rounded-lg text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 transition-all cursor-pointer select-none text-center"
											title="Верхняя челюсть (JU / Maxilla): адентия, атрофия, синус-лифтинг"
											data-testid="view-toolbar-jaw-ju-btn"
										>
											В/Ч
										</button>
										<button
											type="button"
											onClick={(e) => {
												const details = e.currentTarget.closest("details");
												if (details) details.open = false;
												setActiveJawModalTarget("JL");
											}}
											className="flex-1 h-7 rounded-lg text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 transition-all cursor-pointer select-none text-center"
											title="Нижняя челюсть (JL / Mandibula): адентия, атрофия, экзостозы"
											data-testid="view-toolbar-jaw-jl-btn"
										>
											Н/Ч
										</button>
										<button
											type="button"
											onClick={(e) => {
												const details = e.currentTarget.closest("details");
												if (details) details.open = false;
												setActiveJawModalTarget("C");
											}}
											className="flex-1 h-7 rounded-lg text-xs font-bold text-purple-700 dark:text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 transition-all cursor-pointer select-none text-center"
											title="Прикус / Окклюзия (C): ортогнатический, дистальный, мезиальный, глубокий"
											data-testid="view-toolbar-jaw-c-btn"
										>
											Прикус
										</button>
									</div>
								</div>
							</div>
						</details>

						{/* "Ещё..." Dropdown Menu for Secondary Tools & Modules */}
						<div className="relative shrink-0" ref={moreMenuRef}>
							<button
								type="button"
								onClick={() => setIsMoreMenuOpen((prev) => !prev)}
								className={`h-7 flex items-center gap-1.5 px-2.5 rounded-lg text-xs font-bold whitespace-nowrap border transition-all shrink-0 cursor-pointer ${
									isMoreMenuOpen || activeStampTool === "Crown" || activeStampTool === "Missing" || isFastExtractMode || isMultiSelectMode || isPerioOpen || isOrthoCephOpen
										? "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-400/40 shadow-xs font-black"
										: "bg-[var(--odontogram-surface-hover,#f1f5f9)] text-[var(--odontogram-ink-muted,#64748b)] border-[var(--odontogram-border-subtle,#e2e8f0)] hover:text-indigo-600 dark:hover:text-indigo-400"
								}`}
								title="Дополнительные инструменты, штампы и модули анализа"
								data-testid="btn-odontogram-more-menu"
								aria-expanded={isMoreMenuOpen}
								aria-haspopup="true"
							>
								<MoreHorizontal size={13} className="shrink-0" />
								<span>Ещё</span>
								<ChevronDown size={12} className={`shrink-0 transition-transform ${isMoreMenuOpen ? "rotate-180" : ""}`} />
								{(activeStampTool === "Crown" || activeStampTool === "Missing" || isFastExtractMode || isMultiSelectMode) && (
									<span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse shrink-0" />
								)}
							</button>

							{isMoreMenuOpen && (
								<div
									className="absolute right-0 top-full mt-1.5 z-50 w-72 p-2 rounded-xl shadow-xl bg-[var(--paper,#ffffff)] dark:bg-zinc-900 border border-[var(--odontogram-border-subtle,#e2e8f0)] dark:border-zinc-800 flex flex-col gap-2 max-h-[80vh] overflow-y-auto"
									role="menu"
									aria-label="Дополнительные инструменты"
								>
									{/* Subgroup: Batch Presets (1-Click) */}
									<div>
										<div className="text-[10px] font-bold uppercase tracking-wider text-[var(--odontogram-ink-muted,#64748b)] px-2 py-1 select-none">
											Пакетные операции (1 клик)
										</div>
										<div className="flex flex-col gap-1">
											<button
												type="button"
												onClick={() => {
													handleMarkIntactDentition();
													setIsMoreMenuOpen(false);
												}}
												className="min-h-[44px] sm:min-h-[32px] sm:h-[32px] px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer select-none text-left flex items-center gap-2 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-500/20 border border-emerald-500/30"
												title="Санация: отметить всю зубную формулу здоровой в 1 клик"
												data-testid="btn-odontogram-all-healthy"
											>
												<Check size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
												<span>Санация: все здоровы (1 клик)</span>
											</button>
											<button
												type="button"
												onClick={() => {
													handleMarkWisdomTeethMissing();
													setIsMoreMenuOpen(false);
												}}
												className="min-h-[44px] sm:min-h-[32px] sm:h-[32px] px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer select-none text-left flex items-center gap-2 bg-rose-500/10 text-rose-800 dark:text-rose-200 hover:bg-rose-500/20 border border-rose-500/30"
												title="Адентия 8-ок: отметить зубы 18, 28, 38, 48 отсутствующими"
												data-testid="btn-odontogram-wisdom-missing"
											>
												<Trash2 size={14} className="text-rose-600 dark:text-rose-400 shrink-0" />
												<span>Адентия 8-ок (18, 28, 38, 48)</span>
											</button>

											<button
												type="button"
												onClick={() => {
													setIsPlanWizardOpen(true);
													setIsMoreMenuOpen(false);
												}}
												className="min-h-[44px] sm:min-h-[32px] sm:h-[32px] px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer select-none text-left flex items-center gap-2 bg-indigo-500/10 text-indigo-800 dark:text-indigo-200 hover:bg-indigo-500/20 border border-indigo-500/30"
												title="Сформировать черновой план лечения по МКБ-10 и номенклатуре 804н на основе всех патологий"
												data-testid="more-menu-plan-from-pathologies"
											>
												<FileText size={14} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
												<span>План лечения из патологий (804н)</span>
											</button>

											<button
												type="button"
												onClick={() => {
													if (onOpenVoiceDictation) {
														onOpenVoiceDictation();
													} else {
														globalDentalVoiceEngine.toggle();
													}
													setIsMoreMenuOpen(false);
												}}
												className="min-h-[44px] sm:min-h-[32px] sm:h-[32px] px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer select-none text-left flex items-center gap-2 bg-indigo-500/10 text-indigo-800 dark:text-indigo-200 hover:bg-indigo-500/20 border border-indigo-500/30"
												title="Голосовая диктовка зубной формулы"
												data-testid="more-menu-voice-dictation"
											>
												<Mic size={14} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
												<span>{isVoiceListening ? "Остановить диктовку" : "Голосовой пульт (диктовка)"}</span>
											</button>

											<button
												type="button"
												onClick={() => {
													const targetTooth = selectedTeeth && selectedTeeth.length > 0 ? selectedTeeth[0]! : (isPediatricEffective ? 55 : 16);
													setCardModalTooth(targetTooth);
													setIsMoreMenuOpen(false);
												}}
												className="min-h-[44px] sm:min-h-[32px] sm:h-[32px] px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer select-none text-left flex items-center gap-2 bg-blue-500/10 text-blue-800 dark:text-blue-200 hover:bg-blue-500/20 border border-blue-500/30"
												title="Открыть подробную карточку зуба с поверхностями и протоколами"
												data-testid="more-menu-tooth-card"
											>
												<Stethoscope size={14} className="text-blue-600 dark:text-blue-400 shrink-0" />
												<span>Детальная карточка зуба</span>
											</button>
										</div>
									</div>

									<div className="h-[1px] bg-[var(--odontogram-border-subtle,#e2e8f0)] dark:bg-zinc-800" />

									{/* Subgroup: Additional Stamps */}
									<div>
										<div className="text-[10px] font-bold uppercase tracking-wider text-[var(--odontogram-ink-muted,#64748b)] px-2 py-1 select-none">
											Дополнительные штампы
										</div>
										<div className="grid grid-cols-2 gap-1">
											<button
												type="button"
												onClick={() => {
													setActiveStampTool((prev) => (prev === "Crown" ? null : "Crown"));
													setIsMoreMenuOpen(false);
												}}
												className={`min-h-[44px] sm:min-h-[32px] sm:h-[32px] px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer select-none text-left flex items-center justify-between ${
													activeStampTool === "Crown"
														? "bg-[var(--brand-500,#3b82f6)] text-white font-black shadow-xs ring-2 ring-[var(--brand-500,#3b82f6)]/60"
														: "bg-[var(--brand-500,#3b82f6)]/10 text-[var(--brand-500,#3b82f6)] hover:bg-[var(--brand-500,#3b82f6)]/20 border border-[var(--brand-500,#3b82f6)]/30"
												}`}
												title="Штамп: Коронка (Клик по зубу без меню)"
												data-testid="stamp-crown-btn"
											>
												<span>Коронка (Ц)</span>
												{activeStampTool === "Crown" && <Check size={12} className="shrink-0" />}
											</button>
											<button
												type="button"
												onClick={() => {
													setActiveStampTool((prev) => (prev === "Missing" ? null : "Missing"));
													setIsMoreMenuOpen(false);
												}}
												className={`min-h-[44px] sm:min-h-[32px] sm:h-[32px] px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer select-none text-left flex items-center justify-between ${
													activeStampTool === "Missing"
														? "bg-rose-700 text-white font-black shadow-xs ring-2 ring-rose-500"
														: "bg-rose-500/10 text-rose-800 dark:text-rose-200 hover:bg-rose-500/20 border border-rose-500/20"
												}`}
												title="Штамп: Удален (Клик по зубу без меню)"
												data-testid="stamp-missing-btn"
											>
												<span>Удален (0)</span>
												{activeStampTool === "Missing" && <Check size={12} className="shrink-0" />}
											</button>
										</div>
									</div>

									<div className="h-[1px] bg-[var(--odontogram-border-subtle,#e2e8f0)] dark:bg-zinc-800" />

									{/* Subgroup: Clinical Modules */}
									<div>
										<div className="text-[10px] font-bold uppercase tracking-wider text-[var(--odontogram-ink-muted,#64748b)] px-2 py-1 select-none">
											Клинические модули
										</div>
										<div className="flex flex-col gap-1">
											{/* Pediatric Mixed Dentition Modal */}
											{onOpenPediatricModal && (
												<button
													type="button"
													onClick={() => {
														onOpenPediatricModal();
														setIsMoreMenuOpen(false);
													}}
													className="min-h-[44px] sm:min-h-[32px] sm:h-[32px] flex items-center gap-2 px-2.5 py-1 text-xs font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 hover:bg-amber-500/20 rounded-lg transition-colors shrink-0 cursor-pointer select-none text-left"
													title="Сменный прикус: сроки прорезывания, стадии резорбции корней и Кариограмма Браттхолла"
												>
													<Sparkles size={14} className="text-amber-500 shrink-0" />
													<span>Сменный прикус</span>
												</button>
											)}

											{/* Periodontal Charting Module */}
											<button
												type="button"
												onClick={() => {
													if (onTogglePerio) onTogglePerio();
													setIsMoreMenuOpen(false);
												}}
												className={`min-h-[44px] sm:min-h-[32px] sm:h-[32px] flex items-center gap-2 px-2.5 py-1 text-xs font-bold rounded-lg border transition-all shrink-0 cursor-pointer select-none text-left ${
													isPerioOpen
														? "bg-[var(--teal-soft,rgba(13,148,136,0.2))] text-[var(--teal)] border-[var(--teal)]/50 shadow-xs font-black"
														: "bg-[var(--teal-soft,rgba(13,148,136,0.1))] text-[var(--teal)] border-[var(--teal)]/30 hover:bg-[var(--teal-soft,rgba(13,148,136,0.2))]"
												}`}
												title="Пародонтологическая карта: 6 точек зондирования Florida Probe, индексы OHI-S / PLI / SBI, скрининг CPITN"
												data-testid="btn-open-perio-chart"
											>
												<Activity size={14} className="text-[var(--teal)] shrink-0" />
												<span>Пародонтограмма</span>
											</button>

											{/* Orthodontic Cephalometry TRG Module */}
											<button
												type="button"
												onClick={() => {
													setIsOrthoCephOpen((prev) => !prev);
													setIsMoreMenuOpen(false);
												}}
												className={`min-h-[44px] sm:min-h-[32px] sm:h-[32px] flex items-center gap-2 px-2.5 py-1 text-xs font-bold rounded-lg border transition-all shrink-0 cursor-pointer select-none text-left ${
													isOrthoCephOpen
														? "bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/50 shadow-xs font-black"
														: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30 hover:bg-purple-500/20"
												}`}
												title="Цефалометрия ТРГ: анализ Штайнера, Твида, Wits-число и углы SNA/SNB/ANB"
												data-testid="btn-open-ortho-ceph"
											>
												<Sparkles size={14} className="text-purple-500 shrink-0" />
												<span>Цефалометрия ТРГ</span>
											</button>

											{/* Diagnocat AI Report */}
											{onLoadDiagnocat && (
												<button
													type="button"
													onClick={() => {
														onLoadDiagnocat();
														setIsMoreMenuOpen(false);
													}}
													disabled={diagnocatLoading}
													className="min-h-[44px] sm:min-h-[32px] sm:h-[32px] flex items-center gap-2 px-2.5 py-1 text-xs font-bold bg-[var(--brand-500,#3b82f6)]/10 text-[var(--brand-500,#3b82f6)] border border-[var(--brand-500,#3b82f6)]/30 hover:bg-[var(--brand-500,#3b82f6)]/20 rounded-lg transition-colors shrink-0 cursor-pointer select-none text-left"
													title="Загрузить отчёт Diagnocat AI"
												>
													<Stethoscope size={14} className="text-[var(--brand-500,#3b82f6)] shrink-0" />
													<span>{diagnocatLoading ? "Загрузка..." : "Diagnocat AI"}</span>
												</button>
											)}
											{/* Print Odontogram A4 */}
											<button
												type="button"
												onClick={() => {
													setIsMoreMenuOpen(false);
													window.print();
												}}
												className="min-h-[44px] sm:min-h-[32px] sm:h-[32px] flex items-center gap-2 px-2.5 py-1 text-xs font-bold bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 border border-zinc-500/20 hover:bg-zinc-500/20 rounded-lg transition-colors shrink-0 cursor-pointer select-none text-left"
												title="Распечатать графическую одонтограмму со всеми патологиями на лист A4 для вклейки в амбулаторную карту"
												data-testid="print-odontogram-a4-btn"
											>
												<Printer size={14} className="text-zinc-500 shrink-0" />
												<span>Печать зубной формулы (А4)</span>
											</button>
										</div>
									</div>

									<div className="h-[1px] bg-[var(--odontogram-border-subtle,#e2e8f0)] dark:bg-zinc-800" />

									{/* Subgroup: Display & Modes */}
									<div>
										<div className="text-[10px] font-bold uppercase tracking-wider text-[var(--odontogram-ink-muted,#64748b)] px-2 py-1 select-none">
											Отображение и режимы
										</div>
										<div className="flex flex-col gap-1">
											{/* Shift Multi-Select Checkbox */}
											{onToggleMultiSelect && (
												<label
													className={`flex items-center justify-between min-h-[44px] sm:min-h-[32px] sm:h-[32px] text-xs font-bold cursor-pointer select-none px-2.5 py-1 rounded-lg border transition-colors ${
														isMultiSelectMode
															? "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30 font-black"
															: "bg-[var(--odontogram-surface-hover,#f1f5f9)] text-[var(--odontogram-ink-muted,#64748b)] border-[var(--odontogram-border-subtle,#e2e8f0)]"
													}`}
												>
													<span>Групповое выделение (Shift)</span>
													<input
														type="checkbox"
														checked={isMultiSelectMode ?? false}
														onChange={(e) => onToggleMultiSelect(e.target.checked)}
														className="accent-indigo-500 rounded cursor-pointer shrink-0 ml-2"
													/>
												</label>
											)}

											{/* Wisdom Teeth Toggle */}
											<button
												type="button"
												onClick={() => setShowWisdomTeeth((prev) => !prev)}
												className={`min-h-[44px] sm:min-h-[32px] sm:h-[32px] flex items-center justify-between px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
													showWisdomTeeth
														? "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-400/40 shadow-xs font-black"
														: "bg-[var(--odontogram-surface-hover,#f1f5f9)] text-[var(--odontogram-ink-muted,#64748b)] border-[var(--odontogram-border-subtle,#e2e8f0)] opacity-80"
												}`}
												title="Показать или скрыть зубы мудрости (18, 28, 38, 48)"
											>
												<span className="flex items-center gap-2">
													{showWisdomTeeth ? <Eye size={14} /> : <EyeOff size={14} />}
													<span>Зубы мудрости (8-ки)</span>
												</span>
												<span className="text-[10px] font-mono opacity-60">{showWisdomTeeth ? "ВКЛ" : "ВЫКЛ"}</span>
											</button>

											{/* Pulp & Root Canals X-Ray Toggle */}
											{activeMode === "anatomical_svg" && (
												<button
													type="button"
													onClick={() => setShowPulpAndCanals((prev) => !prev)}
													className={`min-h-[44px] sm:min-h-[32px] sm:h-[32px] flex items-center justify-between px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
														showPulpAndCanals
															? "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-400/40 shadow-xs font-black"
															: "bg-[var(--odontogram-surface-hover,#f1f5f9)] text-[var(--odontogram-ink-muted,#64748b)] border-[var(--odontogram-border-subtle,#e2e8f0)] opacity-80"
													}`}
													title="Рентген-прозрачность эмали для просмотра корневых каналов и пульпы"
												>
													<span className="flex items-center gap-2">
														<Activity size={14} />
														<span>Каналы и пульпа</span>
													</span>
													<span className="text-[10px] font-mono opacity-60">{showPulpAndCanals ? "ВКЛ" : "ВЫКЛ"}</span>
												</button>
											)}

											{/* Fast Extraction Mode */}
											<button
												type="button"
												onClick={() => setIsFastExtractMode((prev) => !prev)}
												className={`min-h-[44px] sm:min-h-[32px] sm:h-[32px] flex items-center justify-between px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
													isFastExtractMode
														? "bg-rose-600 text-white border-rose-700 shadow-md animate-pulse font-black"
														: "bg-[var(--odontogram-surface-hover,#f1f5f9)] text-[var(--odontogram-ink-muted,#64748b)] border-[var(--odontogram-border-subtle,#e2e8f0)] hover:text-rose-600 dark:hover:text-rose-400"
												}`}
												title="Режим быстрого удаления зубов в 1 клик"
											>
												<span className="flex items-center gap-2">
													<Trash2 size={14} />
													<span>Быстрое удаление зубов</span>
												</span>
												<span className="text-[10px] font-mono opacity-60">{isFastExtractMode ? "ВКЛ" : "ВЫКЛ"}</span>
											</button>
										</div>
									</div>
								</div>
							)}
						</div>
					</div>
				</div>
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
				<div className="odontogram-active-view-slot w-full flex-1 min-w-0">
					{activeMode === "anatomical_svg" && (
						<AnatomicalSvgOdontogram {...sharedViewProps} />
					)}
					{activeMode === "compact_clinical" && (
						<ToothChart {...sharedViewProps} />
					)}
					{activeMode === "classic_gost" && (
						<ClassicGostOdontogram {...sharedViewProps} />
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

			{/* Radial Context Menu Modal */}
			{radialMenuData && (
				<ToothRadialMenu
					toothNumber={radialMenuData.toothNumber}
					anchorRect={radialMenuData.rect}
					currentState={radialMenuData.currentState}
					surfaces={radialMenuData.surfaces}
					onSelectState={handleRadialSelectState}
					onAddToInvoice={() => setIsLiveInvoiceOpen(true)}
					onOpenTherapy={() => {
						setCardModalTooth(radialMenuData.toothNumber);
						setRadialMenuData(null);
					}}
					onClose={() => setRadialMenuData(null)}
				/>
			)}

			{/* 1-Click Treatment Plan Wizard (StomX/IDENT Parity) */}
			<TreatmentPlanWizard
				isOpen={isPlanWizardOpen}
				onClose={() => setIsPlanWizardOpen(false)}
				teethData={teethData}
				patientId={patientId}
				patientName={patientId ? `Пациент #${patientId}` : undefined}
				onPlanCreated={(planId, totalRub) => {
					showToast(`План лечения #${planId} сформирован (${totalRub} ₽)`, "success");
				}}
			/>

			{/* Detailed Tooth Card Modal */}
			{cardModalTooth !== null && (
				<ToothCardModal
					isOpen={cardModalTooth !== null}
					toothNumber={cardModalTooth}
					toothData={teethData?.find((t) => t.toothNumber === cardModalTooth)}
					onClose={() => setCardModalTooth(null)}
					onUpdateTooth={(toothNum, updates) => {
						if (updates.state) {
							onQuickStateChange?.([toothNum], updates.state, updates.surfaces);
							showToast(`Зуб ${toothNum}: состояние «${updates.state}» сохранено`, "success");
						}
					}}
				/>
			)}

			{/* Tier 2 Context Drawer for Selected Tooth */}
			{contextDrawerTooth !== null && (
				<ToothContextDrawer
					isOpen={contextDrawerTooth !== null}
					onClose={() => setContextDrawerTooth(null)}
					toothNumber={contextDrawerTooth}
					toothData={teethData?.find((t) => t.toothNumber === contextDrawerTooth)}
					onUpdateTooth={(num, updates) => {
						if (updates.state) {
							onQuickStateChange?.([num], updates.state, updates.surfaces);
						}
					}}
				/>
			)}

			{/* Tier 2 Endo Canal Measurement Drawer */}
			{endoDrawerTooth !== null && (
				<EndoCanalMeasurementDrawer
					isOpen={endoDrawerTooth !== null}
					onClose={() => setEndoDrawerTooth(null)}
					toothNumber={endoDrawerTooth}
					toothState={teethData?.find((t) => t.toothNumber === endoDrawerTooth)?.state}
					patientId={patientId}
				/>
			)}

			{/* Tier 3 Orthodontic Cephalometry TRG Tracker Modal */}
			<CephalometricAnalysisModal
				isOpen={isOrthoCephOpen}
				onClose={() => setIsOrthoCephOpen(false)}
				patientId={patientId}
				patientName={patientId ? `Пациент #${patientId}` : undefined}
			/>

			{/* Tier 2 Jaw & Centric Occlusion Clinical Modal (JU, JL, C) */}
			{activeJawModalTarget !== null && (
				<JawOcclusionModal
					isOpen={activeJawModalTarget !== null}
					initialTarget={activeJawModalTarget}
					onClose={() => setActiveJawModalTarget(null)}
				/>
			)}
		</div>
	);
}, areOdontogramViewContainerPropsEqual);
OdontogramViewContainer.displayName = "OdontogramViewContainer";
