import {
	calculateAapEfpStagingAndGrading,
	calculateClinicalAttachmentLevel,
	calculateOlearyFromPerioTeeth,
	calculatePerioIndices,
	calculatePsrSextants,
	createDefaultPerioTeeth,
	FURCATION_GRADES,
	formatPsrSextantsSummary,
	generateComprehensivePerio043Text,
	generateFullMouthProbingSequence,
	isFurcationEligibleTooth,
	MOBILITY_GRADES,
	PERIO_LOWER_ARCH_TEETH,
	PERIO_SITE_KEYS,
	PERIO_SITES_CONFIG,
	PERIO_UPPER_ARCH_TEETH,
	type PerioChartSummary,
	type PerioSiteKey,
	type PerioToothRecord,
	type ProbingStep,
	PSR_SEXTANTS,
} from "@dental/shared";
import {
	Activity,
	AlertCircle,
	AlertTriangle,
	Check,
	ChevronDown,
	ChevronUp,
	Clipboard,
	Droplets,
	FileText,
	HelpCircle,
	Layers,
	RotateCcw,
	ShieldAlert,
	ShieldCheck,
	Sparkles,
	X,
	Zap,
} from "lucide-react";
import React from "react";
import {
	useCallback,
	useEffect,
	useId,
	useMemo,
	useRef,
	useState,
} from "react";
import {
	getToothFolkAndAnatomicalNameRu,
	PERIO_PATHOLOGY_PRESETS,
} from "../../lib/clinicalProtocols043";
import { useVisitStore } from "../../store/visitStore";
import { showToast } from "../GlobalToast";
import { HygieneIndicesPanel } from "../hygiene/HygieneIndicesPanel";
import {
	applyGingivitisPreset,
	applyHealthyPeriodontiumPreset,
	applyPeriodontitisMildPreset,
	applyPeriodontitisModeratePreset,
	applyPeriodontitisSeverePreset,
	applyPsrSextantCode,
	PERIO_EXPRESS_PRESETS,
	type PerioExpressPresetId,
	PSR_CODE_DEFINITIONS,
	type PsrCode,
} from "./perioMath";
import {
	probingDepthClasses,
	probingDepthHex,
	probingDepthTone,
} from "./perioHeatmap";

export interface PeriodontogramChartProps {
	readonly patientId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly organizationId?: string | undefined;
	readonly doctorId?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly initialTeeth?: readonly PerioToothRecord[] | undefined;
	readonly onChange?:
		| ((teeth: PerioToothRecord[], summary: PerioChartSummary) => void)
		| undefined;
	readonly onInsertToProtocol?: ((protocolText: string) => void) | undefined;
	readonly readOnly?: boolean | undefined;
	readonly compactMode?: boolean | undefined;
	readonly initialTier3Expanded?: boolean | undefined;
	readonly initialProbeKeyboardEnabled?: boolean | undefined;
}

export const PeriodontogramChart: React.FC<PeriodontogramChartProps> = React.memo(({
	patientId: _patientId,
	patientName: _patientName,
	organizationId: _organizationId,
	doctorId: _doctorId,
	doctorName,
	initialTeeth,
	onChange,
	onInsertToProtocol,
	readOnly = false,
	compactMode = false,
	initialTier3Expanded = false,
	initialProbeKeyboardEnabled = false,
}) => {
	const chartContainerId = useId();

	// Active dentition state
	const [teeth, setTeeth] = useState<PerioToothRecord[]>(() => {
		if (
			initialTeeth &&
			Array.isArray(initialTeeth) &&
			initialTeeth.length > 0
		) {
			const map = new Map<number, PerioToothRecord>();
			for (const t of initialTeeth) {
				map.set(t.toothNumber, t);
			}
			const defaults = createDefaultPerioTeeth(2);
			return defaults.map((def) => map.get(def.toothNumber) ?? def);
		}
		return createDefaultPerioTeeth(2);
	});

	// Selected tooth for warm context inspector
	const [selectedToothNumber, setSelectedToothNumber] = useState<number>(16);

	// Focused site for continuous keyboard entry
	const [focusedSite, setFocusedSite] = useState<{
		toothNumber: number;
		siteKey: PerioSiteKey;
	} | null>(null);

	// Diagnostic breakdown accordion
	const [isDiagnosticsExpanded, setIsDiagnosticsExpanded] =
		useState<boolean>(false);
	const [isHygieneExpanded, setIsHygieneExpanded] = useState<boolean>(false);
	const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);
	const [copyStatus, setCopyStatus] = useState<boolean>(false);
	const [insertStatus, setInsertStatus] = useState<boolean>(false);
	// Detailed 6-point probing table is on-demand for periodontists (Tier 3)
	const [isTier3ProbingExpanded, setIsTier3ProbingExpanded] =
		useState<boolean>(initialTier3Expanded);
	// Hardware electronic probe / Numpad keyboard capture: OFF by default (Mandates 8e, 8k)
	const [isProbeKeyboardEnabled, setIsProbeKeyboardEnabled] = useState<boolean>(
		initialProbeKeyboardEnabled,
	);
	// Compact jaw and sextant filter (All / Upper / Lower / S1..S6) per Hick's Law & Mandate 8d
	const [archFilter, setArchFilter] = useState<
		"all" | "upper" | "lower" | "S1" | "S2" | "S3" | "S4" | "S5" | "S6"
	>("all");

	const containerRef = useRef<HTMLDivElement>(null);

	// ─── Mathematical Indices Computation via @dental/shared ─────────────────
	const summary: PerioChartSummary = useMemo(() => {
		return calculatePerioIndices(teeth);
	}, [teeth]);

	const psrSextants = useMemo(() => {
		return calculatePsrSextants(teeth);
	}, [teeth]);

	const psrSummaryText = useMemo(() => {
		return formatPsrSextantsSummary(psrSextants);
	}, [psrSextants]);

	const olearyPcr = useMemo(() => {
		return calculateOlearyFromPerioTeeth(teeth);
	}, [teeth]);

	const aapDiagnosis = useMemo(() => {
		return calculateAapEfpStagingAndGrading(teeth, summary);
	}, [teeth, summary]);

	const probingSequence = useMemo<ProbingStep[]>(() => {
		return generateFullMouthProbingSequence(teeth);
	}, [teeth]);

	// Broadcast change upward
	useEffect(() => {
		if (onChange) {
			onChange(teeth, summary);
		}
	}, [teeth, summary, onChange]);

	// Tooth map lookup for high-speed rendering
	const toothMap = useMemo(() => {
		const map = new Map<number, PerioToothRecord>();
		for (const t of teeth) {
			map.set(t.toothNumber, t);
		}
		return map;
	}, [teeth]);

	// ─── Tooth & Site Mutations ──────────────────────────────────────────────
	const updateToothSite = useCallback(
		(
			toothNumber: number,
			siteKey: PerioSiteKey,
			updater: (
				prev: PerioToothRecord[PerioSiteKey],
			) => Partial<PerioToothRecord[PerioSiteKey]>,
		) => {
			if (readOnly) return;
			setTeeth((prevTeeth) =>
				prevTeeth.map((tooth) => {
					if (tooth.toothNumber !== toothNumber) return tooth;
					const currentSite = tooth[siteKey] ?? {
						probingDepthMm: 2,
						gingivalMarginMm: 0,
						bleedingOnProbing: false,
						suppuration: false,
						plaque: false,
						calculus: false,
					};
					const patch = updater(currentSite);
					const merged = { ...currentSite, ...patch };
					const pd = merged.probingDepthMm ?? 0;
					const gm = merged.gingivalMarginMm ?? 0;
					const calMm = calculateClinicalAttachmentLevel(pd, gm);
					return {
						...tooth,
						[siteKey]: { ...merged, calMm },
					};
				}),
			);
		},
		[readOnly],
	);

	const updateToothProperties = useCallback(
		(
			toothNumber: number,
			patch: Partial<
				Pick<
					PerioToothRecord,
					"isMissing" | "isImplant" | "mobility" | "furcation"
				>
			>,
		) => {
			if (readOnly) return;
			setTeeth((prevTeeth) =>
				prevTeeth.map((tooth) => {
					if (tooth.toothNumber !== toothNumber) return tooth;
					return { ...tooth, ...patch };
				}),
			);
		},
		[readOnly],
	);

	// ─── Continuous Probing Navigation ───────────────────────────────────────
	const moveToNextSite = useCallback(() => {
		if (!focusedSite) {
			if (probingSequence.length > 0) {
				setFocusedSite({
					toothNumber: probingSequence[0]!.toothNumber,
					siteKey: probingSequence[0]!.siteKey,
				});
				setSelectedToothNumber(probingSequence[0]!.toothNumber);
			}
			return;
		}

		const currentIndex = probingSequence.findIndex(
			(s) =>
				s.toothNumber === focusedSite.toothNumber &&
				s.siteKey === focusedSite.siteKey,
		);

		if (currentIndex >= 0 && currentIndex < probingSequence.length - 1) {
			const next = probingSequence[currentIndex + 1]!;
			setFocusedSite({ toothNumber: next.toothNumber, siteKey: next.siteKey });
			setSelectedToothNumber(next.toothNumber);
		} else if (probingSequence.length > 0) {
			// Loop around
			const first = probingSequence[0]!;
			setFocusedSite({
				toothNumber: first.toothNumber,
				siteKey: first.siteKey,
			});
			setSelectedToothNumber(first.toothNumber);
		}
	}, [focusedSite, probingSequence]);

	const moveToPreviousSite = useCallback(() => {
		if (!focusedSite) return;
		const currentIndex = probingSequence.findIndex(
			(s) =>
				s.toothNumber === focusedSite.toothNumber &&
				s.siteKey === focusedSite.siteKey,
		);
		if (currentIndex > 0) {
			const prev = probingSequence[currentIndex - 1]!;
			setFocusedSite({ toothNumber: prev.toothNumber, siteKey: prev.siteKey });
			setSelectedToothNumber(prev.toothNumber);
		}
	}, [focusedSite, probingSequence]);

	// ─── Direct Keypad / NumPad Probing Input ────────────────────────────────
	const handleKeypadDepth = useCallback(
		(depth: number) => {
			if (readOnly) return;
			let target = focusedSite;
			if (!target) {
				if (probingSequence.length > 0) {
					target = {
						toothNumber: probingSequence[0]!.toothNumber,
						siteKey: probingSequence[0]!.siteKey,
					};
					setFocusedSite(target);
					setSelectedToothNumber(target.toothNumber);
				} else {
					return;
				}
			}
			updateToothSite(target.toothNumber, target.siteKey, () => ({
				probingDepthMm: depth,
			}));
			moveToNextSite();
		},
		[readOnly, focusedSite, probingSequence, updateToothSite, moveToNextSite],
	);

	const handleKeypadGingivalMargin = useCallback(
		(delta: number) => {
			if (readOnly || !focusedSite) return;
			updateToothSite(focusedSite.toothNumber, focusedSite.siteKey, (prev) => ({
				gingivalMarginMm: (prev.gingivalMarginMm ?? 0) + delta,
			}));
		},
		[readOnly, focusedSite, updateToothSite],
	);

	const handleKeypadToggleBop = useCallback(() => {
		if (readOnly) return;
		let target = focusedSite;
		if (!target) {
			const toothNumber =
				selectedToothNumber || (probingSequence[0]?.toothNumber ?? 16);
			const siteKey = probingSequence[0]?.siteKey ?? "midBuccal";
			target = { toothNumber, siteKey };
			setFocusedSite(target);
			setSelectedToothNumber(target.toothNumber);
		}
		if (!target) return;
		updateToothSite(target.toothNumber, target.siteKey, (prev) => ({
			bleedingOnProbing: !prev.bleedingOnProbing,
		}));
	}, [
		readOnly,
		focusedSite,
		selectedToothNumber,
		probingSequence,
		updateToothSite,
	]);

	const handleKeypadTogglePlaque = useCallback(() => {
		if (readOnly) return;
		let target = focusedSite;
		if (!target) {
			const toothNumber =
				selectedToothNumber || (probingSequence[0]?.toothNumber ?? 16);
			const siteKey = probingSequence[0]?.siteKey ?? "midBuccal";
			target = { toothNumber, siteKey };
			setFocusedSite(target);
			setSelectedToothNumber(target.toothNumber);
		}
		if (!target) return;
		updateToothSite(target.toothNumber, target.siteKey, (prev) => ({
			plaque: !prev.plaque,
		}));
	}, [
		readOnly,
		focusedSite,
		selectedToothNumber,
		probingSequence,
		updateToothSite,
	]);

	const handleKeypadToggleSuppuration = useCallback(() => {
		if (readOnly) return;
		let target = focusedSite;
		if (!target) {
			const toothNumber =
				selectedToothNumber || (probingSequence[0]?.toothNumber ?? 16);
			const siteKey = probingSequence[0]?.siteKey ?? "midBuccal";
			target = { toothNumber, siteKey };
			setFocusedSite(target);
			setSelectedToothNumber(target.toothNumber);
		}
		if (!target) return;
		updateToothSite(target.toothNumber, target.siteKey, (prev) => ({
			suppuration: !prev.suppuration,
		}));
	}, [
		readOnly,
		focusedSite,
		selectedToothNumber,
		probingSequence,
		updateToothSite,
	]);

	// 1-Click Mobility cycling on grid (0 -> I -> II -> III -> 0 по Энтину)
	const handleCycleMobility = useCallback(
		(toothNumber: number) => {
			if (readOnly) return;
			const current = toothMap.get(toothNumber)?.mobility ?? 0;
			const next = ((current + 1) % 4) as 0 | 1 | 2 | 3;
			updateToothProperties(toothNumber, { mobility: next });
		},
		[readOnly, toothMap, updateToothProperties],
	);

	// 1-Click Furcation cycling on grid (0 -> I -> II -> III -> IV -> 0)
	const handleCycleFurcation = useCallback(
		(toothNumber: number) => {
			if (readOnly) return;
			if (!isFurcationEligibleTooth(toothNumber)) return;
			const current = toothMap.get(toothNumber)?.furcation ?? 0;
			const next = ((current + 1) % 5) as 0 | 1 | 2 | 3 | 4;
			updateToothProperties(toothNumber, { furcation: next });
		},
		[readOnly, toothMap, updateToothProperties],
	);

	// ─── Keyboard Event Handling (Arrows, 0-9, NumPad, B, P, S, M, F) ─────────
	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLDivElement>) => {
			if (readOnly || !isProbeKeyboardEnabled) return;

			// If focus is inside a standard text input, do not hijack typing
			if (
				e.target instanceof HTMLInputElement ||
				e.target instanceof HTMLTextAreaElement
			) {
				return;
			}

			const isNumpadOrDigit =
				/^[0-9]$/.test(e.key) || /^Numpad[0-9]$/.test(e.code);

			if (!focusedSite) {
				if (isNumpadOrDigit) {
					e.preventDefault();
					const rawChar = /^[0-9]$/.test(e.key)
						? e.key
						: e.code.replace("Numpad", "");
					const num = Number.parseInt(rawChar, 10);
					const depth = num === 0 ? 10 : num;
					if (probingSequence.length > 0) {
						const first = probingSequence[0]!;
						updateToothSite(first.toothNumber, first.siteKey, () => ({
							probingDepthMm: depth,
						}));
						if (probingSequence.length > 1) {
							const next = probingSequence[1]!;
							setFocusedSite({
								toothNumber: next.toothNumber,
								siteKey: next.siteKey,
							});
							setSelectedToothNumber(next.toothNumber);
						}
					}
					return;
				}
				if (
					["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp", "Tab"].includes(
						e.key,
					)
				) {
					e.preventDefault();
					moveToNextSite();
				}
				return;
			}

			const { toothNumber, siteKey } = focusedSite;

			// Number entry (1..9, 0, NumPad 0..9) for direct probing depth
			if (isNumpadOrDigit) {
				e.preventDefault();
				const rawChar = /^[0-9]$/.test(e.key)
					? e.key
					: e.code.replace("Numpad", "");
				const num = Number.parseInt(rawChar, 10);
				const depth = num === 0 ? 10 : num; // '0' maps to 10mm pocket depth
				updateToothSite(toothNumber, siteKey, () => ({
					probingDepthMm: depth,
				}));
				moveToNextSite();
				return;
			}

			// Keypad +/- for Gingival Margin / Depth adjust
			if (e.key === "+" || e.code === "NumpadAdd") {
				e.preventDefault();
				updateToothSite(toothNumber, siteKey, (prev) => ({
					probingDepthMm: Math.min(15, (prev.probingDepthMm ?? 0) + 1),
				}));
				return;
			}
			if (e.key === "-" || e.code === "NumpadSubtract") {
				e.preventDefault();
				updateToothSite(toothNumber, siteKey, (prev) => ({
					probingDepthMm: Math.max(0, (prev.probingDepthMm ?? 0) - 1),
				}));
				return;
			}

			// Key 'b' / 'B' / 'и' / 'И' toggles Bleeding on Probing
			if (e.key === "b" || e.key === "B" || e.key === "и" || e.key === "И") {
				e.preventDefault();
				updateToothSite(toothNumber, siteKey, (prev) => ({
					bleedingOnProbing: !prev.bleedingOnProbing,
				}));
				return;
			}

			// Key 'p' / 'P' / 'з' / 'З' toggles Plaque
			if (e.key === "p" || e.key === "P" || e.key === "з" || e.key === "З") {
				e.preventDefault();
				updateToothSite(toothNumber, siteKey, (prev) => ({
					plaque: !prev.plaque,
				}));
				return;
			}

			// Key 's' / 'S' / 'ы' / 'Ы' toggles Suppuration
			if (e.key === "s" || e.key === "S" || e.key === "ы" || e.key === "Ы") {
				e.preventDefault();
				updateToothSite(toothNumber, siteKey, (prev) => ({
					suppuration: !prev.suppuration,
				}));
				return;
			}

			// Key 'c' / 'C' / 'с' / 'С' toggles Calculus
			if (e.key === "c" || e.key === "C" || e.key === "с" || e.key === "С") {
				e.preventDefault();
				updateToothSite(toothNumber, siteKey, (prev) => ({
					calculus: !prev.calculus,
				}));
				return;
			}

			// Key 'm' / 'M' / 'ь' / 'Ь' cycles tooth mobility
			if (e.key === "m" || e.key === "M" || e.key === "ь" || e.key === "Ь") {
				e.preventDefault();
				const currentMobility = toothMap.get(toothNumber)?.mobility ?? 0;
				const nextMobility = ((currentMobility + 1) % 4) as 0 | 1 | 2 | 3;
				updateToothProperties(toothNumber, { mobility: nextMobility });
				return;
			}

			// Key 'f' / 'F' / 'а' / 'А' cycles furcation
			if (e.key === "f" || e.key === "F" || e.key === "а" || e.key === "А") {
				e.preventDefault();
				if (isFurcationEligibleTooth(toothNumber)) {
					const currentFurcation = toothMap.get(toothNumber)?.furcation ?? 0;
					const nextFurcation = ((currentFurcation + 1) % 5) as
						| 0
						| 1
						| 2
						| 3
						| 4;
					updateToothProperties(toothNumber, { furcation: nextFurcation });
				}
				return;
			}

			// Navigation
			if (e.key === "ArrowRight" || (e.key === "Tab" && !e.shiftKey)) {
				e.preventDefault();
				moveToNextSite();
			} else if (e.key === "ArrowLeft" || (e.key === "Tab" && e.shiftKey)) {
				e.preventDefault();
				moveToPreviousSite();
			} else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
				e.preventDefault();
				// Toggle between buccal and lingual aspect
				const isBuccal =
					siteKey === "distoBuccal" ||
					siteKey === "midBuccal" ||
					siteKey === "mesioBuccal";
				const newSiteKey: PerioSiteKey = isBuccal
					? siteKey === "distoBuccal"
						? "distoLingual"
						: siteKey === "midBuccal"
							? "midLingual"
							: "mesioLingual"
					: siteKey === "distoLingual"
						? "distoBuccal"
						: siteKey === "midLingual"
							? "midBuccal"
							: "mesioBuccal";
				setFocusedSite({ toothNumber, siteKey: newSiteKey });
			} else if (e.key === "Escape") {
				setFocusedSite(null);
			}
		},
		[
			readOnly,
			isProbeKeyboardEnabled,
			focusedSite,
			probingSequence,
			toothMap,
			updateToothSite,
			updateToothProperties,
			moveToNextSite,
			moveToPreviousSite,
		],
	);

	// ─── 1-Click PSR Screening & Clinical Presets (Mandates 8e, 8k) ───────────
	const handleApplyExpressPreset = useCallback(
		(presetId: PerioExpressPresetId) => {
			if (readOnly) return;
			let updatedTeeth: PerioToothRecord[] = teeth;
			let protocolText = "";

			switch (presetId) {
				case "perio_norm_express":
					updatedTeeth = applyHealthyPeriodontiumPreset(teeth);
					protocolText =
						PERIO_EXPRESS_PRESETS.perio_norm_express.defaultProtocolRu;
					break;
				case "pro_hygiene_express":
					updatedTeeth = applyHealthyPeriodontiumPreset(teeth);
					protocolText =
						PERIO_EXPRESS_PRESETS.pro_hygiene_express.defaultProtocolRu;
					break;
				case "gingivitis_express":
					updatedTeeth = applyGingivitisPreset(teeth);
					protocolText =
						PERIO_EXPRESS_PRESETS.gingivitis_express.defaultProtocolRu;
					break;
				case "periodontitis_mild_express":
					updatedTeeth = applyPeriodontitisMildPreset(teeth);
					protocolText =
						PERIO_EXPRESS_PRESETS.periodontitis_mild_express.defaultProtocolRu;
					break;
				case "periodontitis_moderate_express":
					updatedTeeth = applyPeriodontitisModeratePreset(teeth);
					protocolText =
						PERIO_EXPRESS_PRESETS.periodontitis_moderate_express.defaultProtocolRu;
					break;
				case "periodontitis_severe_express":
					updatedTeeth = applyPeriodontitisSeverePreset(teeth);
					protocolText =
						PERIO_EXPRESS_PRESETS.periodontitis_severe_express.defaultProtocolRu;
					break;
			}

			setTeeth(updatedTeeth);

			useVisitStore.getState().setVisitNoteForm((prev) => ({
				...prev,
				objectiveStatus: prev.objectiveStatus
					? `${prev.objectiveStatus}\n\n${protocolText}`
					: protocolText,
			}));

			window.dispatchEvent(
				new CustomEvent("dente-apply-soap-protocol", {
					detail: {
						soap: protocolText,
						mode: "smart_append",
					},
				}),
			);

			if (presetId === "pro_hygiene_express") {
				window.dispatchEvent(
					new CustomEvent("dente-add-estimate-service", {
						detail: {
							code: "A16.07.051",
							name: "Профгигиена полости рта: УЗ-скейлинг над- и поддесневых отложений + Air-Flow порошком на основе глицина + полировка абразивной пастой Detartrine + глубокое фторирование эмали Bifluorid 12",
							price: 5500,
							category: "hygiene",
						},
					}),
				);
			}

			if (onInsertToProtocol) {
				onInsertToProtocol(protocolText);
			}

			if (typeof navigator !== "undefined" && navigator.clipboard) {
				void navigator.clipboard.writeText(protocolText);
			}

			const presetInfo = PERIO_EXPRESS_PRESETS[presetId];
			showToast(
				`Статус зафиксирован: «${presetInfo?.titleRu ?? presetId}». Протокол перенесён в дневник 043/у.`,
				"success",
				4500,
			);
		},
		[readOnly, teeth, onInsertToProtocol],
	);

	const handleApplySextantCode = useCallback(
		(sextantName: string, code: PsrCode, asterisk = false) => {
			if (readOnly) return;
			setTeeth((prev) =>
				applyPsrSextantCode(prev, sextantName, code, asterisk),
			);
			showToast(
				`Секстант ${sextantName}: установлен Код ${code}${asterisk ? "*" : ""} (PSR)`,
				"info",
				2500,
			);
		},
		[readOnly],
	);

	// ─── 1-Click Fast Presets ────────────────────────────────────────────────
	const handleSetAllIntact = useCallback(() => {
		if (readOnly) return;
		setTeeth(createDefaultPerioTeeth(2));
		showToast(
			"Все 32 зуба установлены как интактные (глубина 2 мм, BOP 0%)",
			"success",
			4000,
		);
	}, [readOnly]);

	const handleMarkSelectedToothPathology = useCallback(
		(depth = 5, hasBop = true) => {
			if (readOnly) return;
			setTeeth((prevTeeth) =>
				prevTeeth.map((tooth) => {
					if (tooth.toothNumber !== selectedToothNumber || tooth.isMissing)
						return tooth;
					const updatedTooth = { ...tooth };
					for (const key of PERIO_SITE_KEYS) {
						const site = tooth[key] ?? {
							probingDepthMm: 2,
							gingivalMarginMm: 0,
							bleedingOnProbing: false,
							suppuration: false,
							plaque: false,
							calculus: false,
						};
						const gm = site.gingivalMarginMm || 0;
						const calMm = calculateClinicalAttachmentLevel(depth, gm);
						updatedTooth[key] = {
							...site,
							probingDepthMm: depth,
							bleedingOnProbing: hasBop,
							calMm,
						};
					}
					return updatedTooth;
				}),
			);
			showToast(
				`Зуб #${selectedToothNumber}: карман ${depth} мм с кровоточивостью (BOP) зафиксирован в 1 клик`,
				"info",
				3500,
			);
		},
		[readOnly, selectedToothNumber],
	);

	const handleMarkBopOnDeepPockets = useCallback(() => {
		if (readOnly) return;
		let marked = 0;
		setTeeth((prevTeeth) =>
			prevTeeth.map((tooth) => {
				if (tooth.isMissing) return tooth;
				const updatedTooth = { ...tooth };
				for (const key of PERIO_SITE_KEYS) {
					const site = tooth[key];
					if (site && site.probingDepthMm >= 4) {
						updatedTooth[key] = { ...site, bleedingOnProbing: true };
						marked++;
					}
				}
				return updatedTooth;
			}),
		);
		showToast(
			`Кровоточивость (BOP) отмечена на всех карманах ≥ 4 мм (${marked} участков)`,
			"info",
			4000,
		);
	}, [readOnly]);

	const handleClearPlaque = useCallback(() => {
		if (readOnly) return;
		setTeeth((prevTeeth) =>
			prevTeeth.map((tooth) => {
				const updatedTooth = { ...tooth };
				for (const key of PERIO_SITE_KEYS) {
					const site = tooth[key];
					if (site) {
						updatedTooth[key] = { ...site, plaque: false };
					}
				}
				return updatedTooth;
			}),
		);
		showToast("Зубной налет очищен (индекс гигиены 100%)", "success", 4000);
	}, [readOnly]);

	// 1-Click Fast Therapist Pathology Preset: Zero manual 192-point barrier
	const handleApplyTherapistPreset = useCallback(
		(presetId: string) => {
			if (readOnly) return;
			const targetPreset =
				PERIO_PATHOLOGY_PRESETS.find((p) => p.id === presetId) ??
				(presetId === "gingivitis_catarrhal"
					? {
							id: "gingivitis_catarrhal",
							label: "Катаральный гингивит (K05.1)",
							badge: "K05.1",
							defaultIcd10: "K05.1",
							statusLocalis:
								"Десна отечна, гиперемирована, валикообразно утолщена, выраженная кровоточивость сосочков при зондировании (BOP > 25%). Глубина зубодесневой бороздки 2–3 мм за счет отека десны (ложные карманы). Зубодесневое прикрепление сохранено, костные карманы отсутствуют. Патологической подвижности зубов нет (подвижность 0). Мягкий зубной налет, локальный наддесневой зубной камень.",
							treatmentDescription:
								"Профессиональная гигиена полости рта (ультразвуковое снятие отложений + Air-Flow). Антисептическая обработка полости рта (хлоргексидин 0.05%). Местная противовоспалительная терапия: аппликации стоматологического геля (Холисал / Метрогил Дента) на десны 2 раза в день в течение 7–10 дней. Обучение гигиене полости рта, индивидуальный подбор средств гигиены.",
						}
					: presetId === "perio_norm_express"
						? {
								id: "perio_norm_express",
								label: "Норма пародонта (физиологическая норма)",
								badge: "Z01.2",
								defaultIcd10: "Z01.2",
								statusLocalis:
									"Пародонт: десна бледно-розовая, плотная, зубодесневая борозда до 2 мм, кровоточивость отсутствует, подвижности зубов нет. Соматически здоров / глубина карманов 1-2 мм / кровоточивость 0 / зубной камень отсутствует / индекс PSR 0 / норма. Зубодесневая бороздка <= 2 мм, десна бледно-розовая плотная, кровоточивости нет (BOP 0%), патологических карманов нет, подвижность 0.",
								treatmentDescription:
									"Профилактический осмотр через 6 месяцев, стандартная индивидуальная гигиена полости рта.",
							}
						: presetId === "hygiene_pro_done_express" ||
							presetId === "pro_hygiene_express"
							? {
									id: "hygiene_pro_done_express",
									label: "Профгигиена полости рта (A16.07.051)",
									badge: "A16.07.051",
									defaultIcd10: "Z01.2",
									statusLocalis:
										"Профгигиена полости рта: УЗ-скейлинг над- и поддесневых отложений + Air-Flow порошком на основе глицина + полировка абразивной пастой Detartrine + глубокое фторирование эмали Bifluorid 12. Зубные отложения удалены полностью, эмаль гладкая блестящая, десна бледно-розовая плотная, кровоточивости нет (BOP 0%).",
									treatmentDescription:
										"1. Ультразвуковой скейлинг над- и поддесневых отложений Piezon (EMS). 2. Снятие биопленки и налета Air-Flow порошком на основе глицина 25 мкм. 3. Полировка абразивной пастой Detartrine. 4. Обработка хлоргексидином 0.05%. 5. Ремотерапия и фторирование эмали препаратом Bifluorid 12.",
								}
							: null);
			if (!targetPreset) return;

			setTeeth((prevTeeth) =>
				prevTeeth.map((tooth) => {
					if (tooth.isMissing) return tooth;
					const num = tooth.toothNumber;
					const isLowerAnterior = [31, 32, 41, 42].includes(num);
					const isMolar = [16, 17, 26, 27, 36, 37, 46, 47].includes(num);
					const updated = { ...tooth };

					let depth = 2;
					let hasBop = false;
					let hasCalculus = false;
					let hasPlaque = false;
					let mobility: 0 | 1 | 2 | 3 = 0;
					let furcation: 0 | 1 | 2 | 3 | 4 = 0;

					switch (presetId) {
						case "perio_norm_express":
						case "perio_intact":
						case "hygiene_pro_done_express":
						case "hygiene_airflow_ultrasound":
							depth = 2;
							hasBop = false;
							hasCalculus = false;
							hasPlaque = false;
							mobility = 0;
							furcation = 0;
							break;

						case "gingivitis_catarrhal":
							depth = isLowerAnterior || isMolar ? 3 : 2;
							hasBop = true;
							hasCalculus = isLowerAnterior;
							hasPlaque = true;
							mobility = 0;
							furcation = 0;
							break;

						case "gingivitis_localized":
							depth = isLowerAnterior ? 3 : 2;
							hasBop = isLowerAnterior;
							hasCalculus = isLowerAnterior;
							hasPlaque = isLowerAnterior;
							mobility = 0;
							furcation = 0;
							break;

						case "gingivitis_generalized":
							depth = 3;
							hasBop = true;
							hasCalculus = isLowerAnterior || isMolar;
							hasPlaque = true;
							mobility = 0;
							furcation = 0;
							break;

						case "dental_calculus":
							depth = isLowerAnterior ? 3 : 2;
							hasBop = isLowerAnterior || isMolar;
							hasCalculus = isLowerAnterior || isMolar;
							hasPlaque = true;
							mobility = 0;
							furcation = 0;
							break;

						case "periodontitis_mild":
							depth = isMolar || isLowerAnterior ? 4 : 3;
							hasBop = isMolar || isLowerAnterior;
							hasCalculus = true;
							hasPlaque = true;
							mobility = isLowerAnterior ? 1 : 0;
							furcation = 0;
							break;

						case "periodontitis_moderate":
							depth = isMolar ? 5 : 4;
							hasBop = true;
							hasCalculus = true;
							hasPlaque = true;
							mobility = isLowerAnterior ? 1 : 0;
							furcation = isMolar && isFurcationEligibleTooth(num) ? 1 : 0;
							break;

						case "periodontitis_severe":
							depth = isMolar ? 7 : isLowerAnterior ? 6 : 5;
							hasBop = true;
							hasCalculus = true;
							hasPlaque = true;
							mobility = isLowerAnterior ? 2 : isMolar ? 1 : 0;
							furcation = isMolar && isFurcationEligibleTooth(num) ? 2 : 0;
							break;

						default:
							depth = 2;
							break;
					}

					updated.mobility = mobility;
					updated.furcation = furcation;

					for (const key of PERIO_SITE_KEYS) {
						const site = tooth[key] ?? {
							probingDepthMm: 2,
							gingivalMarginMm: 0,
							bleedingOnProbing: false,
							suppuration: false,
							plaque: false,
							calculus: false,
						};
						const gm =
							presetId === "periodontitis_moderate"
								? 1
								: site.gingivalMarginMm || 0;
						const calMm = calculateClinicalAttachmentLevel(depth, gm);
						updated[key] = {
							...site,
							probingDepthMm: depth,
							gingivalMarginMm: gm,
							bleedingOnProbing: hasBop,
							calculus: hasCalculus,
							plaque: hasPlaque,
							calMm,
						};
					}
					return updated;
				}),
			);

			let protocolText = "";
			if (presetId === "perio_norm_express") {
				protocolText =
					"• Пародонтологический осмотр: Норма пародонта (физиологическая норма, Z01.2).\n" +
					"• Status localis: Пародонт: десна бледно-розовая, плотная, зубодесневая борозда до 2 мм, кровоточивость отсутствует, подвижности зубов нет. Соматически здоров / глубина карманов 1-2 мм / кровоточивость 0 / зубной камень отсутствует / индекс PSR 0 / норма. Зубодесневая бороздка <= 2 мм, десна бледно-розовая плотная, кровоточивости нет (BOP 0%), патологических карманов нет, подвижность 0.\n" +
					"• Диагноз: Здоров / Пародонт интактен (Z01.2).\n" +
					"• Рекомендации: Профилактический осмотр через 6 месяцев, стандартная индивидуальная гигиена полости рта.";
			} else if (presetId === "gingivitis_catarrhal") {
				protocolText =
					"• Пародонтологический осмотр: Хронический катаральный гингивит (K05.1).\n" +
					"• Status localis: Отек десневых сосочков, гиперемия и цианоз маргинального края десны, выраженная кровоточивость при зондировании (BOP+), истинных пародонтальных карманов нет (глубина бороздок до 3 мм за счет отека десны), определяются наддесневые зубные отложения и мягкий зубной налет. Подвижности нет (0 ст.).\n" +
					"• Рекомендованное лечение: Профессиональная гигиена полости рта (УЗ + AirFlow), противовоспалительная терапия, аппликации дентального геля.";
			} else if (presetId === "periodontitis_mild") {
				protocolText =
					"• Пародонтологический осмотр: Хронический генерализованный пародонтит легкой степени тяжести (K05.3, Stage I Grade A).\n" +
					"• Status localis: Десна умеренно гиперемирована, пастозна, с цианотичным оттенком, кровоточивость при зондировании (BOP+), глубина пародонтальных карманов 3-4 мм преимущественно в межзубных промежутках, рецессия десны до 1 мм, умеренные над- и поддесневые зубные отложения, патологическая подвижность зубов отсутствует (0 ст.). На рентгенограмме/КЛКТ: деструкция кортикальной пластинки и вершин межальвеолярных перегородок до 1/3 длины корней.\n" +
					"• Рекомендованное лечение: Профессиональная гигиена полости рта (УЗ Piezon + субгингивальный AirFlow), закрытый кюретаж карманов, антисептическая обработка десны, обучение индивидуальной гигиене.";
			} else if (presetId === "periodontitis_moderate") {
				protocolText =
					"• Пародонтологический осмотр: Хронический генерализованный пародонтит средней степени тяжести (K05.3, Stage II/III Grade B).\n" +
					"• Status localis: Глубина пародонтальных карманов 4-5 мм с серозным экссудатом при зондировании, рецессия десны 1-2 мм, массивный над- и поддесневой зубной камень, патологическая подвижность I ст. На рентгенограмме/КЛКТ: резорбция костной ткани межальвеолярных перегородок от 1/3 до 1/2 длины корней.\n" +
					"• Рекомендованное лечение: Комплексная пародонтальная терапия, поддесневой скейлинг SRP, Vector-терапия, антимикробная обработка карманов, шинирование по показаниям.";
			} else if (
				presetId === "hygiene_pro_done_express" ||
				presetId === "hygiene_airflow_ultrasound" ||
				presetId === "pro_hygiene_express"
			) {
				protocolText =
					"• Профгигиена полости рта: УЗ-скейлинг над- и поддесневых отложений + Air-Flow порошком на основе глицина + полировка абразивной пастой Detartrine + глубокое фторирование эмали Bifluorid 12\n" +
					"• Процедура: Профгигиена полости рта выполнена в полном объеме (A16.07.051).\n" +
					"1. Удаление над- и поддесневых зубных отложений ультразвуковым пьезоэлектрическим скейлером Piezon (EMS).\n" +
					"2. Снятие пигментированного зубного налета и биопленки воздушно-абразивным методом Air-Flow порошком на основе глицина 25 мкм.\n" +
					"3. Полировка всех поверхностей зубов абразивной пастой Detartrine с циркулярными щеточками и резиновыми чашечками, апроксимальные поверхности обработаны штрипсами.\n" +
					"4. Антисептическая медикаментозная обработка слизистой оболочки десны 0.05% раствором хлоргексидина биглюконата.\n" +
					"5. Глубокое фторирование эмали препаратом Bifluorid 12.\n" +
					"• Status localis: Зубные отложения удалены полностью, эмаль гладкая блестящая, десна бледно-розовая, плотная, зубодесневая борозда до 2 мм, кровоточивость отсутствует, подвижности зубов нет.\n" +
					"• Рекомендации: «Белая диета» 2-3 часа, смена зубной щетки, индивидуальный подбор средств гигиены.";
			} else {
				protocolText = `• Пародонтологический осмотр: ${targetPreset.label}\n• Status localis: ${targetPreset.statusLocalis}\n• Рекомендованное лечение: ${targetPreset.treatmentDescription}`;
			}

			// In addition, inject into useVisitStore if available
			useVisitStore.getState().setVisitNoteForm((prev) => ({
				...prev,
				objectiveStatus: prev.objectiveStatus
					? `${prev.objectiveStatus}\n\n${protocolText}`
					: protocolText,
				treatmentPlan: targetPreset.treatmentDescription
					? prev.treatmentPlan
						? `${prev.treatmentPlan}\n\n${targetPreset.treatmentDescription}`
						: targetPreset.treatmentDescription
					: prev.treatmentPlan,
			}));

			window.dispatchEvent(
				new CustomEvent("dente-apply-soap-protocol", {
					detail: {
						soap: protocolText,
						mode: "smart_append",
					},
				}),
			);

			if (
				presetId === "hygiene_pro_done_express" ||
				presetId === "hygiene_airflow_ultrasound" ||
				presetId === "pro_hygiene_express"
			) {
				window.dispatchEvent(
					new CustomEvent("dente-add-estimate-service", {
						detail: {
							code: "A16.07.051",
							name: "Профгигиена полости рта: УЗ-скейлинг над- и поддесневых отложений + Air-Flow порошком на основе глицина + полировка абразивной пастой Detartrine + глубокое фторирование эмали Bifluorid 12",
							price: 5500,
							category: "hygiene",
						},
					}),
				);
			}

			if (onInsertToProtocol) {
				onInsertToProtocol(protocolText);
			}

			// Also copy to clipboard for seamless fail-safe paste
			if (typeof navigator !== "undefined" && navigator.clipboard) {
				void navigator.clipboard.writeText(protocolText);
			}

			showToast(
				`Статус пародонта зафиксирован: «${targetPreset.label}». Протокол перенесён в дневник 043/у.`,
				"success",
				5000,
			);
		},
		[readOnly, onInsertToProtocol],
	);

	// ─── Protocol Generation & Clipboard Export ──────────────────────────────
	const generateProtocolText = useCallback((): string => {
		return generateComprehensivePerio043Text(teeth, summary, {
			doctorName: doctorName ?? undefined,
			patientAgeYears: 45,
		});
	}, [teeth, summary, doctorName]);

	const handleInsertToProtocol = useCallback(() => {
		const text = generateProtocolText();

		// 1. Instantly update visit store
		useVisitStore.getState().setVisitNoteForm((prev) => ({
			...prev,
			objectiveStatus: prev.objectiveStatus
				? `${prev.objectiveStatus}\n\n${text}`
				: text,
		}));

		// 2. Dispatch SOAP custom event
		window.dispatchEvent(
			new CustomEvent("dente-apply-soap-protocol", {
				detail: {
					soap: text,
					mode: "smart_append",
				},
			}),
		);

		// 3. Invoke prop callback if supplied
		if (onInsertToProtocol) {
			onInsertToProtocol(text);
		}

		// 4. Also copy to clipboard for fail-safe resilience
		if (typeof navigator !== "undefined" && navigator.clipboard) {
			void navigator.clipboard.writeText(text);
		}

		setInsertStatus(true);
		setTimeout(() => setInsertStatus(false), 2500);
		showToast(
			"Протокол пародонтограммы успешно добавлен в дневник 043/у",
			"success",
			4000,
		);
	}, [generateProtocolText, onInsertToProtocol]);

	const handleCopyProtocol = useCallback(() => {
		const text = generateProtocolText();
		if (typeof navigator !== "undefined" && navigator.clipboard) {
			void navigator.clipboard.writeText(text);
			setCopyStatus(true);
			setTimeout(() => setCopyStatus(false), 2000);
			showToast(
				"Полный текст пародонтограммы 043/у скопирован",
				"success",
				3000,
			);
		}
	}, [generateProtocolText]);

	// Helper to get selected tooth record
	const selectedTooth = useMemo(() => {
		return toothMap.get(selectedToothNumber) ?? null;
	}, [toothMap, selectedToothNumber]);

	return (
		<div
			id={chartContainerId}
			ref={containerRef}
			tabIndex={isProbeKeyboardEnabled ? 0 : -1}
			onKeyDown={handleKeyDown}
			className={`perio-chart-root w-full flex flex-col ${
				compactMode ? "gap-2.5 p-3 sm:p-4" : "gap-4 p-4 sm:p-5"
			} rounded-2xl bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] shadow-sm outline-none focus:ring-1 focus:ring-teal-500/50 select-none transition-all`}
			data-testid="interactive-periodontogram"
		>
			{/* ═══════════════════════════════════════════════════════════════════
			    TIER 1: TOP DIAGNOSTICS & TELEMETRY COCKPIT (0-CLICK OVERVIEW)
			    ═══════════════════════════════════════════════════════════════════ */}
			<div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-[var(--line)]">
				<div className="flex items-center gap-3 min-w-0">
					<div className="p-2.5 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 shrink-0">
						<Activity size={22} />
					</div>
					<div className="min-w-0">
						<div className="flex items-center gap-2 flex-wrap sm:flex-nowrap min-w-0">
							<h3 className="text-base font-bold text-[var(--ink)] truncate">
								Пародонтологический осмотр (Скрининг PSR / CPITN & Статус 043/у)
							</h3>
							<span
								className={`px-2.5 py-0.5 rounded-full text-xs font-bold border truncate max-w-xs shrink-0 ${
									aapDiagnosis.severity === "intact"
										? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
										: aapDiagnosis.severity === "gingivitis"
											? "bg-amber-500/10 text-amber-400 border-amber-500/30"
											: aapDiagnosis.severity === "moderate"
												? "bg-orange-500/10 text-orange-400 border-orange-500/30"
												: "bg-rose-500/15 text-rose-400 border-rose-500/30 animate-pulse"
								}`}
							>
								{aapDiagnosis.icd10Code} •{" "}
								{aapDiagnosis.diagnosisNameRu.split("(")[0]}
							</span>
						</div>
						<p className="text-xs text-[var(--muted)] mt-0.5 truncate">
							{aapDiagnosis.stageDescriptionRu}
						</p>
					</div>
				</div>

				{/* 1-Click Fast Action Presets (1 Row 32-36px Toolbar, Mandates 8d, 8e, 8k, HIG) */}
				{!readOnly && (
					<div className="flex items-center gap-1.5 flex-nowrap overflow-x-auto py-0.5 shrink-0 h-9 min-h-[36px]">
						{/* 1-Click Norm Express: Instant PSR 0, Healthy Tissues & Form 043/u Protocol */}
						<button
							type="button"
							onClick={() => handleApplyExpressPreset("perio_norm_express")}
							className="h-9 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer min-h-[44px] min-w-[44px] whitespace-nowrap shrink-0"
							title="1-клик: Вся десна здорова (Норма) (PSR 0, глубина <= 2 мм, BOP 0, протокол в 043/у)"
							data-testid="perio-toolbar-norm-1click-btn"
						>
							<ShieldCheck size={16} className="shrink-0" />
							<span>1-клик: Здоровый пародонт (Норма)</span>
						</button>

						{/* 1-Click Pro-Hygiene: Ultrasonic, Air-Flow Glycine & Service A16.07.051 */}
						<button
							type="button"
							onClick={() => handleApplyExpressPreset("pro_hygiene_express")}
							className="h-9 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer min-h-[44px] min-w-[44px] whitespace-nowrap shrink-0"
							title="Профгигиена в 1 клик (УЗ + Air-Flow глицин + полировка + фторирование + услуга A16.07.051)"
							data-testid="perio-toolbar-prophy-1click-btn"
						>
							<Sparkles size={16} className="shrink-0" />
							<span>Профгигиена</span>
						</button>

						<button
							type="button"
							onClick={handleSetAllIntact}
							className="h-9 px-2.5 rounded-lg bg-[var(--paper-soft)] hover:bg-emerald-500/15 hover:text-emerald-400 border border-[var(--line)] text-xs font-semibold text-[var(--ink)] flex items-center gap-1.5 transition-all cursor-pointer min-h-[44px] min-w-[44px] whitespace-nowrap shrink-0"
							title="Пародонт интактен / норма (все 32 зуба: глубина 2 мм, рецессия 0 мм, BOP 0%)"
							data-testid="perio-healthy-norm-btn"
						>
							<ShieldCheck size={14} className="text-emerald-400 shrink-0" />
							<span>Пародонт интактен / норма</span>
						</button>

						<button
							type="button"
							onClick={() => handleMarkSelectedToothPathology(5, true)}
							className="h-9 px-2.5 rounded-lg bg-[var(--paper-soft)] hover:bg-rose-500/15 hover:text-rose-400 border border-[var(--line)] text-xs font-semibold text-[var(--ink)] hidden md:flex items-center gap-1.5 transition-all cursor-pointer min-h-[44px] min-w-[44px] whitespace-nowrap shrink-0"
							title={`Быстрая разметка пародонтита: карман 5 мм + кровоточивость для выбранного зуба #${selectedToothNumber}`}
							data-testid="perio-preset-tooth-pathology"
						>
							<Droplets size={14} className="text-rose-400 shrink-0" />
							<span>#{selectedToothNumber} 5мм+BOP</span>
						</button>

						<button
							type="button"
							onClick={handleMarkBopOnDeepPockets}
							className="h-9 px-2.5 rounded-lg bg-[var(--paper-soft)] hover:bg-rose-500/15 hover:text-rose-400 border border-[var(--line)] text-xs font-semibold text-[var(--ink)] hidden lg:flex items-center gap-1.5 transition-all cursor-pointer min-h-[44px] min-w-[44px] whitespace-nowrap shrink-0"
							title="Автоматически проставить кровоточивость на всех карманах глубиной ≥ 4 мм"
							data-testid="perio-preset-bop-pockets"
						>
							<Droplets size={14} className="text-rose-400 shrink-0" />
							<span>BOP ≥ 4мм</span>
						</button>

						<button
							type="button"
							onClick={handleClearPlaque}
							className="h-9 px-2.5 rounded-lg bg-[var(--paper-soft)] hover:bg-teal-500/15 hover:text-teal-400 border border-[var(--line)] text-xs font-semibold text-[var(--ink)] hidden xl:flex items-center gap-1.5 transition-all cursor-pointer min-h-[44px] min-w-[44px] whitespace-nowrap shrink-0"
							title="Очистить весь зубной налет"
							data-testid="perio-preset-clear-plaque"
						>
							<RotateCcw size={14} className="text-teal-400 shrink-0" />
							<span>Очистить налет</span>
						</button>

						<button
							type="button"
							onClick={() => setIsHygieneExpanded((prev) => !prev)}
							className={`h-9 px-2.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer min-h-[44px] min-w-[44px] whitespace-nowrap shrink-0 ${
								isHygieneExpanded
									? "bg-teal-600 text-white border-teal-500 shadow-xs"
									: "bg-[var(--paper-soft)] hover:bg-teal-500/15 hover:text-teal-400 border-[var(--line)] text-[var(--ink)]"
							}`}
							title="Открыть экспресс-расчет индексов гигиены (OHI-S, PMA, КПИ)"
							data-testid="perio-hygiene-indices-btn"
						>
							<ShieldCheck
								size={14}
								className={isHygieneExpanded ? "text-white" : "text-teal-400"}
							/>
							<span>Индексы гигиены</span>
							{isHygieneExpanded ? (
								<ChevronUp size={12} />
							) : (
								<ChevronDown size={12} />
							)}
						</button>

						{/* 1-Click Insert into 043/u: ALWAYS VISIBLE AND ACTIVE */}
						<button
							type="button"
							onClick={handleInsertToProtocol}
							className="h-9 px-3.5 rounded-lg bg-teal-600 hover:bg-teal-700 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer min-h-[44px] min-w-[44px] whitespace-nowrap shrink-0"
							title="Сформировать и вставить протокол пародонтограммы в дневник 043/у"
							data-testid="perio-insert-protocol-btn"
						>
							{insertStatus ? <Check size={14} /> : <FileText size={14} />}
							<span>
								{insertStatus ? "Внесено в 043/у!" : "Внести в дневник 043/у"}
							</span>
						</button>

						<button
							type="button"
							onClick={handleCopyProtocol}
							className="h-9 w-9 rounded-lg bg-[var(--paper-soft)] hover:bg-[var(--line)] border border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] flex items-center justify-center transition-all cursor-pointer min-h-[44px] min-w-[44px] shrink-0"
							title="Копировать текст протокола в буфер"
							aria-label="Копировать текст протокола"
						>
							{copyStatus ? (
								<Check size={16} className="text-emerald-400" />
							) : (
								<Clipboard size={16} />
							)}
						</button>

						<button
							type="button"
							onClick={() => setIsHelpOpen((prev) => !prev)}
							className="h-9 w-9 rounded-lg bg-[var(--paper-soft)] hover:bg-[var(--line)] border border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] flex items-center justify-center transition-all cursor-pointer min-h-[44px] min-w-[44px] shrink-0"
							title="Справка по горячим клавишам пародонтограммы"
							aria-label="Справка по горячим клавишам"
						>
							<HelpCircle size={16} />
						</button>
					</div>
				)}
			</div>

			{/* ═══════════════════════════════════════════════════════════════════
			    1-CLICK PSR SCREENING & CLINICAL PRESETS (MANDATES 8e, 8i, 8k, 8n)
			    ═══════════════════════════════════════════════════════════════════ */}
			<div className="flex flex-col gap-3.5 p-4 rounded-xl bg-teal-500/10 border border-teal-500/30 text-[var(--ink)] shadow-xs">
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-teal-500/20">
					<div className="flex items-center gap-2 min-w-0">
						<Activity size={18} className="text-teal-400 shrink-0" />
						<h4 className="text-sm font-black text-teal-300 truncate">
							Экспресс-скрининг пародонта PSR / CPITN (ВОЗ / СтАР) и 1-клик
							пресеты
						</h4>
					</div>

					<div className="flex items-center gap-2.5 flex-wrap">
						{/* Hardware Probe / Numpad capture toggle (OFF by default, Mandate 8k) */}
						<label
							className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold px-2.5 min-h-[44px] rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] hover:bg-[var(--line)]/60 transition-colors"
							title="Включить перехват Numpad и клавиш электронного зонда (по умолчанию выключен, чтобы не ломать набор текста)"
						>
							<input
								type="checkbox"
								checked={isProbeKeyboardEnabled}
								onChange={(e) => setIsProbeKeyboardEnabled(e.target.checked)}
								className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer accent-teal-500"
								data-testid="perio-probe-keyboard-toggle"
							/>
							<span className="text-[11px]">
								Режим электронного зонда / Numpad
							</span>
						</label>

						{!readOnly && (
							<button
								type="button"
								onClick={handleInsertToProtocol}
								className="min-h-[44px] px-3 rounded-lg bg-teal-600 hover:bg-teal-700 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
								title="Внести текущее заключение пародонтограммы в дневник 043/у"
								data-testid="perio-express-insert-043-btn"
							>
								{insertStatus ? <Check size={14} /> : <FileText size={14} />}
								<span>
									{insertStatus ? "Внесено в 043/у!" : "Внести в дневник 043/у"}
								</span>
							</button>
						)}

						<button
							type="button"
							onClick={() => setIsTier3ProbingExpanded((prev) => !prev)}
							className="text-xs text-teal-400 hover:text-teal-300 font-bold flex items-center gap-1 cursor-pointer transition-colors min-h-[44px] px-2.5 rounded-lg hover:bg-teal-500/15"
							data-testid="perio-tier3-toggle-header-btn"
						>
							<span>
								{isTier3ProbingExpanded
									? "Скрыть детальные точки (Tier 3)"
									: "Детальные 192 точки (Tier 3, по требованию)"}
							</span>
							{isTier3ProbingExpanded ? (
								<ChevronUp size={14} />
							) : (
								<ChevronDown size={14} />
							)}
						</button>
					</div>
				</div>

				{/* 6 Dominant 1-Click Express Presets (Mandates 8e, 8k, Touch >= 44x44px, Zero Emojis) */}
				<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
					{/* Preset 1: Норма пародонта */}
					<button
						type="button"
						disabled={readOnly}
						onClick={() => handleApplyExpressPreset("perio_norm_express")}
						className="min-h-[50px] p-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-200 border border-emerald-500/40 transition-all cursor-pointer text-left active:scale-[0.98] shadow-xs flex flex-col justify-center min-w-0"
						title={
							readOnly
								? "Режим только для чтения (закрытый визит / архив)"
								: "Норма пародонта: PSR 0 во всех секстантах, глубина <= 2 мм, BOP 0, десна плотная бледно-розовая, подвижность 0"
						}
						data-testid="perio-preset-norm-card"
					>
						<div className="flex items-center justify-between gap-1.5 font-black text-xs min-w-0">
							<span className="flex items-center gap-1.5 text-emerald-300 min-w-0 truncate">
								<ShieldCheck size={16} className="text-emerald-400 shrink-0" />
								<span className="truncate">Норма (PSR 0)</span>
							</span>
							<span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
								Z01.2
							</span>
						</div>
						<span className="text-[11px] text-emerald-200/80 leading-tight mt-1 line-clamp-2">
							PSR 0, глубина &le; 2 мм, BOP 0, десна плотная
						</span>
					</button>

					{/* Preset 2: Профгигиена полости рта */}
					<button
						type="button"
						disabled={readOnly}
						onClick={() => handleApplyExpressPreset("pro_hygiene_express")}
						className="min-h-[50px] p-3 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-500/40 transition-all cursor-pointer text-left active:scale-[0.98] shadow-xs flex flex-col justify-center min-w-0"
						title={
							readOnly
								? "Режим только для чтения (закрытый визит / архив)"
								: "Профгигиена: УЗ-скейлинг + Air-Flow глицин + полировка Detartrine + глубокое фторирование Bifluorid 12"
						}
						data-testid="perio-preset-prophy-card"
					>
						<div className="flex items-center justify-between gap-1.5 font-black text-xs min-w-0">
							<span className="flex items-center gap-1.5 text-cyan-300 min-w-0 truncate">
								<Sparkles size={16} className="text-cyan-400 shrink-0" />
								<span className="truncate">Профгигиена</span>
							</span>
							<span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shrink-0">
								A16.07.051
							</span>
						</div>
						<span className="text-[11px] text-cyan-200/80 leading-tight mt-1 line-clamp-2">
							УЗ + Air-Flow глицин + полировка + фторирование
						</span>
					</button>

					{/* Preset 3: Гингивит */}
					<button
						type="button"
						disabled={readOnly}
						onClick={() => handleApplyExpressPreset("gingivitis_express")}
						className="min-h-[50px] p-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 transition-all cursor-pointer text-left active:scale-[0.98] shadow-xs flex flex-col justify-center min-w-0"
						title={
							readOnly
								? "Режим только для чтения (закрытый визит / архив)"
								: "Гингивит: PSR 1-2, карманы < 3.5 мм, диффузная кровоточивость при зондировании, наддесневой камень"
						}
						data-testid="perio-preset-gingivitis-card"
					>
						<div className="flex items-center justify-between gap-1.5 font-black text-xs min-w-0">
							<span className="flex items-center gap-1.5 text-amber-300 min-w-0 truncate">
								<Activity size={16} className="text-amber-400 shrink-0" />
								<span className="truncate">Гингивит (PSR 1-2)</span>
							</span>
							<span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
								K05.1
							</span>
						</div>
						<span className="text-[11px] text-amber-200/80 leading-tight mt-1 line-clamp-2">
							карманы &lt; 3.5 мм, BOP+, отек сосочков
						</span>
					</button>

					{/* Preset 4: Пародонтит лёгкой степени */}
					<button
						type="button"
						disabled={readOnly}
						onClick={() =>
							handleApplyExpressPreset("periodontitis_mild_express")
						}
						className="min-h-[50px] p-3 rounded-xl bg-rose-600/15 hover:bg-rose-600/30 text-rose-200 border border-rose-500/40 transition-all cursor-pointer text-left active:scale-[0.98] shadow-xs flex flex-col justify-center min-w-0"
						title={
							readOnly
								? "Режим только для чтения (закрытый визит / архив)"
								: "Пародонтит лёгкой степени: PSR 2-3, карманы 3.5-4 мм, BOP+, над/поддесневой камень, подвижность 0"
						}
						data-testid="perio-preset-mild-periodontitis-card"
					>
						<div className="flex items-center justify-between gap-1.5 font-black text-xs min-w-0">
							<span className="flex items-center gap-1.5 text-rose-300 min-w-0 truncate">
								<AlertTriangle size={16} className="text-rose-400 shrink-0" />
								<span className="truncate">Пародонтит легкий</span>
							</span>
							<span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 shrink-0">
								K05.30
							</span>
						</div>
						<span className="text-[11px] text-rose-200/80 leading-tight mt-1 line-clamp-2">
							карманы 3.5–4 мм, BOP+, зубной камень
						</span>
					</button>

					{/* Preset 5: Пародонтит средней степени */}
					<button
						type="button"
						disabled={readOnly}
						onClick={() =>
							handleApplyExpressPreset("periodontitis_moderate_express")
						}
						className="min-h-[50px] p-3 rounded-xl bg-orange-600/20 hover:bg-orange-600/35 text-orange-200 border border-orange-500/45 transition-all cursor-pointer text-left active:scale-[0.98] shadow-xs flex flex-col justify-center min-w-0"
						title={
							readOnly
								? "Режим только для чтения (закрытый визит / архив)"
								: "Пародонтит средней степени: PSR 3, карманы 3.5 - 5.5 мм, рецессия 1-2 мм, зубной камень, подвижность I ст."
						}
						data-testid="perio-preset-periodontitis-card"
					>
						<div className="flex items-center justify-between gap-1.5 font-black text-xs min-w-0">
							<span className="flex items-center gap-1.5 text-orange-300 min-w-0 truncate">
								<ShieldAlert size={16} className="text-orange-400 shrink-0" />
								<span className="truncate">Пародонтит средний</span>
							</span>
							<span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300 border border-orange-500/30 shrink-0">
								K05.31
							</span>
						</div>
						<span className="text-[11px] text-orange-200/80 leading-tight mt-1 line-clamp-2">
							карманы 4–5 мм, рецессия 1–2 мм, подвижность I
						</span>
					</button>

					{/* Preset 6: Пародонтит тяжёлой степени */}
					<button
						type="button"
						disabled={readOnly}
						onClick={() =>
							handleApplyExpressPreset("periodontitis_severe_express")
						}
						className="min-h-[50px] p-3 rounded-xl bg-red-700/20 hover:bg-red-700/35 text-red-200 border border-red-600/45 transition-all cursor-pointer text-left active:scale-[0.98] shadow-xs flex flex-col justify-center min-w-0"
						title={
							readOnly
								? "Режим только для чтения (закрытый визит / архив)"
								: "Пародонтит тяжёлой степени: PSR 4*, карманы >= 6 мм, гноетечение, рецессия, подвижность II-III ст."
						}
						data-testid="perio-preset-severe-periodontitis-card"
						data-preset-action="perio-preset-severe-btn"
					>
						<div className="flex items-center justify-between gap-1.5 font-black text-xs min-w-0">
							<span className="flex items-center gap-1.5 text-red-300 min-w-0 truncate">
								<ShieldAlert size={16} className="text-red-400 shrink-0" />
								<span className="truncate">Пародонтит тяжелый</span>
							</span>
							<span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30 shrink-0">
								K05.32
							</span>
						</div>
						<span className="text-[11px] text-red-200/80 leading-tight mt-1 line-clamp-2">
							карманы &ge;6 мм, гноетечение, подвижность II-III
						</span>
					</button>
				</div>

				{/* 6-Sextants Rapid Interactive PSR Grid */}
				<div className="flex flex-col gap-2 pt-2 border-t border-teal-500/20">
					<div className="flex items-center justify-between flex-wrap gap-1.5">
						<span className="text-xs font-bold text-teal-200 flex items-center gap-1.5">
							<Layers size={14} className="text-teal-400" />
							Секстанты PSR (по 6 участкам зубного ряда):
						</span>
						<span className="font-mono text-xs font-bold text-teal-300 bg-[var(--paper)] px-2 py-0.5 rounded border border-teal-500/30">
							{psrSummaryText}
						</span>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2">
						{PSR_SEXTANTS.map((sextant) => {
							const res = psrSextants[sextant.name];
							const currentCode = res?.code ?? 0;
							const hasAsterisk = res?.asterisk ?? false;

							return (
								<div
									key={sextant.name}
									className="p-2.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] flex flex-col gap-2 shadow-2xs min-w-0"
									data-testid={`psr-sextant-card-${sextant.name}`}
								>
									<div className="flex items-center justify-between min-w-0 gap-1">
										<span className="font-bold text-xs text-[var(--ink)] truncate">
											{sextant.name} ({sextant.teeth[0]}-
											{sextant.teeth[sextant.teeth.length - 1]})
										</span>
										<span
											className={`font-mono font-black text-xs px-1.5 py-0.5 rounded border shrink-0 ${
												currentCode === 0
													? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
													: currentCode === 1
														? "bg-amber-500/20 text-amber-300 border-amber-500/30"
														: currentCode === 2
															? "bg-sky-500/20 text-sky-300 border-sky-500/30"
															: currentCode === 3
																? "bg-orange-500/20 text-orange-300 border-orange-500/30"
																: "bg-rose-500/25 text-rose-300 border-rose-500/40"
											}`}
										>
											Код {currentCode}
											{hasAsterisk ? "*" : ""}
										</span>
									</div>

									{/* 1-Tap PSR Code Selector (Touch-friendly >= 44px hit envelope, 32px visual) */}
									<div className="grid grid-cols-6 gap-1">
										{([0, 1, 2, 3, 4] as const).map((codeVal) => {
											const isSelected = currentCode === codeVal;
											const def = PSR_CODE_DEFINITIONS[codeVal];
											return (
												<button
													key={codeVal}
													type="button"
													disabled={readOnly}
													onClick={() =>
														handleApplySextantCode(
															sextant.name,
															codeVal,
															hasAsterisk,
														)
													}
													className={`min-h-[44px] min-w-[32px] sm:min-w-[36px] rounded-lg font-black text-xs flex items-center justify-center transition-all cursor-pointer touch-manipulation border ${
														isSelected
															? def.badgeClass +
																" ring-1 ring-white/50 scale-105"
															: "bg-[var(--paper-soft)] text-[var(--muted)] hover:text-white border-[var(--line)]"
													}`}
													title={
														readOnly
															? "Режим только для чтения (закрытый визит / архив)"
															: `${def.labelRu}: ${def.descriptionRu}`
													}
													data-testid={`psr-${sextant.name}-code-${codeVal}`}
												>
													{codeVal}
												</button>
											);
										})}

										{/* Asterisk (*) toggle */}
										<button
											type="button"
											disabled={readOnly}
											onClick={() =>
												handleApplySextantCode(
													sextant.name,
													currentCode,
													!hasAsterisk,
												)
											}
											className={`min-h-[44px] min-w-[32px] sm:min-w-[36px] rounded-lg font-black text-xs flex items-center justify-center transition-all cursor-pointer touch-manipulation border ${
												hasAsterisk
													? "bg-rose-500 text-white border-rose-400 ring-1 ring-white/50"
													: "bg-[var(--paper-soft)] text-[var(--muted)] hover:text-rose-400 border-[var(--line)]"
											}`}
											title={
												readOnly
													? "Режим только для чтения (закрытый визит / архив)"
													: "Астериск (*): патологическая подвижность >= II ст. или поражение фуркации"
											}
											data-testid={`psr-${sextant.name}-code-asterisk`}
										>
											*
										</button>
									</div>

									<span className="text-[10px] text-[var(--muted)] leading-tight truncate">
										{PSR_CODE_DEFINITIONS[currentCode]?.shortTitleRu ?? ""}
									</span>
								</div>
							);
						})}
					</div>
				</div>

				{/* Secondary Granular Presets Row */}
				<div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-[var(--line)]/50">
					<span className="text-[11px] text-[var(--muted)] font-semibold mr-1 shrink-0">
						Дополнительные шаблоны:
					</span>
					<button
						type="button"
						disabled={readOnly}
						onClick={() =>
							handleApplyExpressPreset("pro_hygiene_express")
						}
						className="min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-bold bg-[var(--paper-soft)] hover:bg-cyan-500/15 text-cyan-300 border border-[var(--line)] transition-all cursor-pointer touch-manipulation flex items-center gap-1 shrink-0"
						title={
							readOnly
								? "Режим только для чтения (закрытый визит / архив)"
								: "Профгигиена полости рта: УЗ-скейлинг над- и поддесневых отложений + Air-Flow порошком на основе глицина + полировка абразивной пастой Detartrine + глубокое фторирование эмали Bifluorid 12"
						}
						data-testid="perio-preset-pro-hygiene-card"
					>
						<Sparkles size={12} className="text-cyan-400" />
						<span>Профгигиена (полный протокол)</span>
					</button>
					<button
						type="button"
						disabled={readOnly}
						onClick={() => handleApplyTherapistPreset("gingivitis_localized")}
						className="min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-bold bg-[var(--paper-soft)] hover:bg-amber-500/15 text-amber-300 border border-[var(--line)] transition-all cursor-pointer touch-manipulation flex items-center shrink-0"
						title={
							readOnly
								? "Режим только для чтения (закрытый визит / архив)"
								: "Гингивит локализованный: отек и кровоточивость межзубных сосочков во фронтальном отделе (BOP+)"
						}
					>
						Гингивит лок.
					</button>
					<button
						type="button"
						disabled={readOnly}
						onClick={() => handleApplyTherapistPreset("gingivitis_generalized")}
						className="min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-bold bg-[var(--paper-soft)] hover:bg-amber-500/15 text-amber-200 border border-[var(--line)] transition-all cursor-pointer touch-manipulation flex items-center shrink-0"
						title={
							readOnly
								? "Режим только для чтения (закрытый визит / архив)"
								: "Гингивит генерализованный: диффузный отек и кровоточивость десен обеих челюстей (BOP > 30%)"
						}
					>
						Гингивит генер.
					</button>
					<button
						type="button"
						disabled={readOnly}
						onClick={() => handleApplyTherapistPreset("periodontitis_mild")}
						className="min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-bold bg-[var(--paper-soft)] hover:bg-orange-500/15 text-orange-300 border border-[var(--line)] transition-all cursor-pointer touch-manipulation flex items-center shrink-0"
						title={
							readOnly
								? "Режим только для чтения (закрытый визит / архив)"
								: "Хронический пародонтит лёгкой степени: карманы 3.5–4 мм, BOP+, над/поддесневой камень"
						}
					>
						Пародонтит I ст.
					</button>
					<button
						type="button"
						disabled={readOnly}
						onClick={() => handleApplyTherapistPreset("periodontitis_severe")}
						className="min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-bold bg-[var(--paper-soft)] hover:bg-rose-500/15 text-rose-300 border border-[var(--line)] transition-all cursor-pointer touch-manipulation flex items-center shrink-0"
						title={
							readOnly
								? "Режим только для чтения (закрытый визит / архив)"
								: "Хронический пародонтит тяжёлой степени: карманы >6 мм, гноетечение, подвижность II-III"
						}
					>
						Пародонтит III ст.
					</button>
					<button
						type="button"
						disabled={readOnly}
						onClick={() => handleApplyTherapistPreset("dental_calculus")}
						className="min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-bold bg-[var(--paper-soft)] hover:bg-sky-500/15 text-sky-300 border border-[var(--line)] transition-all cursor-pointer touch-manipulation flex items-center shrink-0"
						title={
							readOnly
								? "Режим только для чтения (закрытый визит / архив)"
								: "Зубные отложения: массивный над- и поддесневой зубной камень на резцах и молярах (K03.6)"
						}
					>
						Зубные отложения
					</button>
				</div>
			</div>

			{/* ═══════════════════════════════════════════════════════════════════
			    REAL-TIME KPI STRIP: FMBS (BOP), FMPS (Plaque), Pockets, PSR
			    ═══════════════════════════════════════════════════════════════════ */}
			<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
				{/* 1. FMBS (BOP %) */}
				<div className="p-2.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col gap-0.5 min-w-0">
					<span className="text-[11px] text-[var(--muted)] font-semibold flex items-center gap-1 min-w-0 truncate">
						<span className="w-2 h-2 rounded-full bg-rose-500 inline-block shrink-0" />
						<span className="truncate">FMBS (BOP %)</span>
					</span>
					<div className="flex items-baseline gap-1.5 min-w-0">
						<span
							className={`text-lg font-black shrink-0 ${
								summary.fmbsPercent <= 10
									? "text-emerald-400"
									: summary.fmbsPercent <= 25
										? "text-amber-400"
										: "text-rose-400"
							}`}
						>
							{summary.fmbsPercent}%
						</span>
						<span className="text-[10px] text-[var(--muted)] truncate">
							{summary.fmbsPercent <= 10 ? "Норма ≤10%" : "Воспаление"}
						</span>
					</div>
				</div>

				{/* 2. FMPS (Plaque %) / O'Leary PCR */}
				<div className="p-2.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col gap-0.5 min-w-0">
					<span className="text-[11px] text-[var(--muted)] font-semibold flex items-center gap-1 min-w-0 truncate">
						<span className="w-2 h-2 rounded-full bg-amber-400 inline-block shrink-0" />
						<span className="truncate">FMPS / O&apos;Leary</span>
					</span>
					<div className="flex items-baseline gap-1.5 min-w-0">
						<span
							className={`text-lg font-black shrink-0 ${
								olearyPcr.pcrPercent <= 15
									? "text-emerald-400"
									: olearyPcr.pcrPercent <= 30
										? "text-amber-400"
										: "text-rose-400"
							}`}
						>
							{olearyPcr.pcrPercent}%
						</span>
						<span className="text-[10px] text-[var(--muted)] truncate">
							{olearyPcr.isSurgicalClearanceMet
								? "Допуск к оп."
								: "Тренинг гиг."}
						</span>
					</div>
				</div>

				{/* 3. Deep Pockets (PD >= 5 mm) */}
				<div className="p-2.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col gap-0.5 min-w-0">
					<span className="text-[11px] text-[var(--muted)] font-semibold flex items-center gap-1 min-w-0 truncate">
						<AlertCircle size={12} className="text-rose-400 shrink-0" />
						<span className="truncate">Карманы ≥ 5 мм</span>
					</span>
					<div className="flex items-baseline gap-1.5 min-w-0">
						<span
							className={`text-lg font-black shrink-0 ${
								summary.deepPocketsCount === 0
									? "text-emerald-400"
									: "text-rose-400"
							}`}
						>
							{summary.deepPocketsCount}
						</span>
						<span className="text-[10px] text-[var(--muted)] truncate">
							умеренных 4мм: {summary.moderatePocketsCount}
						</span>
					</div>
				</div>

				{/* 4. Max PD & Max CAL */}
				<div className="p-2.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col gap-0.5 min-w-0">
					<span className="text-[11px] text-[var(--muted)] font-semibold truncate">
						Макс. PD / CAL
					</span>
					<div className="flex items-baseline gap-1.5 min-w-0">
						<span className="text-lg font-black text-[var(--ink)] shrink-0">
							{summary.maxPocketDepthMm} / {summary.maxCalMm}
						</span>
						<span className="text-[10px] text-[var(--muted)] truncate">мм</span>
					</div>
				</div>

				{/* 5. Mobility & Furcations */}
				<div className="p-2.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col gap-0.5 min-w-0">
					<span className="text-[11px] text-[var(--muted)] font-semibold truncate">
						Подвижность / Фуркации
					</span>
					<div className="flex items-baseline gap-1.5 min-w-0">
						<span className="text-lg font-black text-amber-400 shrink-0">
							{summary.teethWithMobilityCount} /{" "}
							{summary.teethWithFurcationCount}
						</span>
						<span className="text-[10px] text-[var(--muted)] truncate">
							зубов
						</span>
					</div>
				</div>

				{/* 6. WHO PSR / CPITN Sextants Summary */}
				<div
					onClick={() => setIsDiagnosticsExpanded((prev) => !prev)}
					className="p-2.5 rounded-xl bg-[var(--paper-soft)] hover:bg-[var(--line)] border border-[var(--line)] flex flex-col gap-0.5 cursor-pointer transition-all min-w-0"
					title="Нажмите для открытия подробного отчета по секстантам PSR и матрице O'Leary"
				>
					<div className="flex items-center justify-between text-[11px] text-[var(--muted)] font-semibold min-w-0 gap-1">
						<span className="truncate">Скрининг PSR</span>
						{isDiagnosticsExpanded ? (
							<ChevronUp size={12} className="shrink-0" />
						) : (
							<ChevronDown size={12} className="shrink-0" />
						)}
					</div>
					<div className="font-mono text-xs font-bold text-teal-400 truncate">
						{psrSummaryText}
					</div>
				</div>
			</div>

			{/* ═══════════════════════════════════════════════════════════════════
			    KEYBOARD SHORTCUTS ACCORDION / HELP
			    ═══════════════════════════════════════════════════════════════════ */}
			{isHelpOpen && (
				<div className="p-3.5 rounded-xl bg-[var(--paper-soft)] border border-teal-500/30 text-xs text-[var(--ink)] flex flex-col gap-2.5 animate-in fade-in duration-150 shadow-xs">
					<div className="flex items-center justify-between font-bold text-teal-400 pb-1 border-b border-[var(--line)]/50">
						<span className="flex items-center gap-1.5">
							<Zap size={14} />
							Быстрый клавиатурный ввод зондирования:
						</span>
						<button
							type="button"
							onClick={() => setIsHelpOpen(false)}
							className="min-h-[44px] min-w-[44px] flex items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer touch-manipulation"
							aria-label="Закрыть справку"
						>
							<X size={16} />
						</button>
					</div>
					<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
						<div>
							<kbd className="px-1.5 py-0.5 bg-[var(--paper)] rounded border border-[var(--line)] font-mono text-teal-400 font-bold">
								1..9, 0
							</kbd>{" "}
							<span className="text-[var(--muted)]">— ввод глубины кармана (мм) + авто-переход</span>
						</div>
						<div>
							<kbd className="px-1.5 py-0.5 bg-[var(--paper)] rounded border border-[var(--line)] font-mono text-rose-400 font-bold">
								B
							</kbd>{" "}
							<span className="text-[var(--muted)]">— вкл/выкл кровоточивость (BOP)</span>
						</div>
						<div>
							<kbd className="px-1.5 py-0.5 bg-[var(--paper)] rounded border border-[var(--line)] font-mono text-amber-400 font-bold">
								P
							</kbd>{" "}
							<span className="text-[var(--muted)]">— вкл/выкл зубной налет (Plaque)</span>
						</div>
						<div>
							<kbd className="px-1.5 py-0.5 bg-[var(--paper)] rounded border border-[var(--line)] font-mono text-indigo-400 font-bold">
								S
							</kbd>{" "}
							<span className="text-[var(--muted)]">— нагноение (Suppuration)</span>
						</div>
						<div>
							<kbd className="px-1.5 py-0.5 bg-[var(--paper)] rounded border border-[var(--line)] font-mono text-emerald-400 font-bold">
								M
							</kbd>{" "}
							<span className="text-[var(--muted)]">— подвижность зуба (0..III по Энтину)</span>
						</div>
						<div>
							<kbd className="px-1.5 py-0.5 bg-[var(--paper)] rounded border border-[var(--line)] font-mono text-emerald-400 font-bold">
								F
							</kbd>{" "}
							<span className="text-[var(--muted)]">— фуркационный дефект (0..IV)</span>
						</div>
						<div>
							<kbd className="px-1.5 py-0.5 bg-[var(--paper)] rounded border border-[var(--line)] font-mono text-[var(--ink)] font-bold">
								Стрелки / Tab
							</kbd>{" "}
							<span className="text-[var(--muted)]">— навигация по точкам</span>
						</div>
						<div>
							<kbd className="px-1.5 py-0.5 bg-[var(--paper)] rounded border border-[var(--line)] font-mono text-[var(--ink)] font-bold">
								Esc
							</kbd>{" "}
							<span className="text-[var(--muted)]">— снять фокус с точки</span>
						</div>
					</div>
				</div>
			)}

			{/* ═══════════════════════════════════════════════════════════════════
			    HYGIENE INDICES PANEL (OHI-S, PMA, KPI LEUS)
			    ═══════════════════════════════════════════════════════════════════ */}
			{isHygieneExpanded && (
				<div className="animate-in fade-in duration-150">
					<HygieneIndicesPanel
						perioTeeth={teeth}
						readOnly={readOnly}
						onInsertToProtocol={onInsertToProtocol}
					/>
				</div>
			)}

			{/* ═══════════════════════════════════════════════════════════════════
			    TIER 3: DETAILED PERIODONTAL CHARTING (6 POINTS PER TOOTH)
			    ═══════════════════════════════════════════════════════════════════ */}
			{isTier3ProbingExpanded ? (
				<div className="flex flex-col gap-4 animate-in fade-in duration-200">
					{/* FAST NUMPAD & PROBING TOOLBAR (0-MODAL / GLOVE-FRIENDLY) */}
					<div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-[var(--paper-soft)] border border-teal-500/30 shadow-xs">
						{/* Active Probe Site Info Badge */}
						<div className="flex items-center gap-2 flex-wrap">
							<div className="px-2.5 py-1 rounded-lg bg-teal-500/20 border border-teal-500/40 text-teal-300 font-mono text-xs font-bold flex items-center gap-1.5">
								<Zap size={14} className="text-teal-400 shrink-0" />
								<span>
									{focusedSite ? (
										<>
											Зуб{" "}
											<strong className="text-[var(--ink)] text-sm">
												{focusedSite.toothNumber}
											</strong>{" "}
											•{" "}
											{
												PERIO_SITES_CONFIG.find(
													(s) => s.key === focusedSite.siteKey,
												)?.shortKey
											}{" "}
											(
											{PERIO_SITES_CONFIG.find(
												(s) => s.key === focusedSite.siteKey,
											)
												?.labelRu.split("(")[0]
												?.trim()}
											)
										</>
									) : (
										"Пародонтограмма: Выберите точку или нажмите 1..9 для старта"
									)}
								</span>
							</div>
							{focusedSite && (
								<span className="text-xs font-mono font-bold text-[var(--ink)]">
									Глубина:{" "}
									<strong
										className={`text-sm ${
											probingDepthTone(
												toothMap.get(focusedSite.toothNumber)?.[
													focusedSite.siteKey
												]?.probingDepthMm,
											) === "success"
												? "text-emerald-400"
												: probingDepthTone(
															toothMap.get(focusedSite.toothNumber)?.[
																focusedSite.siteKey
															]?.probingDepthMm,
													  ) === "warning-low"
													? "text-amber-400"
													: probingDepthTone(
																toothMap.get(focusedSite.toothNumber)?.[
																	focusedSite.siteKey
																]?.probingDepthMm,
														  ) === "warning-high"
														? "text-orange-400"
														: "text-rose-400"
										}`}
									>
										{toothMap.get(focusedSite.toothNumber)?.[
											focusedSite.siteKey
										]?.probingDepthMm ?? 0}{" "}
										мм
									</strong>
								</span>
							)}

							{/* Numpad Keyboard intercept toggle in Tier 3 */}
							<label className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[var(--paper)] border border-[var(--line)] cursor-pointer text-xs select-none">
								<input
									type="checkbox"
									data-testid="perio-probe-keyboard-toggle-tier3"
									checked={isProbeKeyboardEnabled}
									onChange={(e) => setIsProbeKeyboardEnabled(e.target.checked)}
									className="accent-teal-500 w-3.5 h-3.5 rounded cursor-pointer"
								/>
								<span className="text-[var(--ink-soft)] font-medium">
									Клавиатура Numpad
								</span>
							</label>
						</div>

						{/* Large Touch/Glove NumPad 1..10 Buttons */}
						<div className="flex items-center gap-1 flex-wrap">
							<span className="text-[11px] font-bold text-[var(--muted)] mr-1 hidden sm:inline">
								NumPad:
							</span>
							{[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((numVal) => {
								const isNorm = numVal <= 3;
								const isMod = numVal <= 5;
								return (
									<button
										key={numVal}
										type="button"
										disabled={readOnly}
										onClick={() => handleKeypadDepth(numVal)}
										className={`min-w-[44px] min-h-[44px] sm:min-w-[38px] sm:min-h-0 sm:h-9 rounded-lg font-black text-xs sm:text-sm transition-all active:scale-95 cursor-pointer flex items-center justify-center border ${
											isNorm
												? "bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-300 border-emerald-500/30"
												: isMod
													? "bg-amber-500/15 hover:bg-amber-500/30 text-amber-300 border-amber-500/30"
													: "bg-rose-500/20 hover:bg-rose-500/35 text-rose-300 border-rose-500/40"
										}`}
										title={`Ввести глубину кармана ${numVal} мм и перейти к след. точке (также цифры 1..9, 0 на клавиатуре)`}
									>
										{numVal}
									</button>
								);
							})}

							<div className="h-6 w-[1px] bg-[var(--line)] mx-1 hidden sm:block" />

							{/* Quick Toggles: BOP, PLQ, PUS */}
							<button
								type="button"
								disabled={readOnly}
								onClick={handleKeypadToggleBop}
								className={`min-h-[44px] min-w-[44px] sm:min-h-0 sm:h-9 px-2.5 rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer border ${
									focusedSite &&
									toothMap.get(focusedSite.toothNumber)?.[focusedSite.siteKey]
										?.bleedingOnProbing
										? "bg-rose-500 text-white border-rose-400 shadow-xs"
										: "bg-[var(--paper)] hover:bg-rose-500/20 text-rose-300 border-[var(--line)]"
								}`}
								title="Переключить кровоточивость (BOP) на активной точке (хоткей: B)"
							>
								<Droplets size={14} />
								<span>BOP</span>
							</button>

							<button
								type="button"
								disabled={readOnly}
								onClick={handleKeypadTogglePlaque}
								className={`min-h-[44px] min-w-[44px] sm:min-h-0 sm:h-9 px-2.5 rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer border ${
									focusedSite &&
									toothMap.get(focusedSite.toothNumber)?.[focusedSite.siteKey]
										?.plaque
										? "bg-amber-500 text-slate-950 font-black border-amber-400 shadow-xs"
										: "bg-[var(--paper)] hover:bg-amber-500/20 text-amber-300 border-[var(--line)]"
								}`}
								title="Переключить налет (Plaque) на активной точке (хоткей: P)"
							>
								<span>PLQ</span>
							</button>

							<button
								type="button"
								disabled={readOnly}
								onClick={handleKeypadToggleSuppuration}
								className={`min-h-[44px] min-w-[44px] sm:min-h-0 sm:h-9 px-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer border ${
									focusedSite &&
									toothMap.get(focusedSite.toothNumber)?.[focusedSite.siteKey]
										?.suppuration
										? "bg-indigo-500 text-white border-indigo-400 shadow-xs"
										: "bg-[var(--paper)] hover:bg-indigo-500/20 text-indigo-300 border-[var(--line)]"
								}`}
								title="Нагноение (хоткей: S)"
							>
								<span>PUS</span>
							</button>

							<div className="h-6 w-[1px] bg-[var(--line)] mx-1 hidden sm:block" />

							{/* Step Prev / Next Buttons */}
							<button
								type="button"
								onClick={moveToPreviousSite}
								className="min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 sm:w-8 sm:h-9 rounded-lg bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] border border-[var(--line)] font-bold text-xs flex items-center justify-center cursor-pointer"
								title="Предыдущая точка (хоткей: Стрелка влево / Shift+Tab)"
							>
								←
							</button>
							<button
								type="button"
								onClick={moveToNextSite}
								className="min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 sm:w-8 sm:h-9 rounded-lg bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-teal-300 border border-[var(--line)] font-bold text-xs flex items-center justify-center cursor-pointer"
								title="Следующая точка (хоткей: Стрелка вправо / Tab)"
							>
								→
							</button>
						</div>
					</div>

					{/* ═══════════════════════════════════════════════════════════════════
			    MAIN 6-POINT INTERACTIVE DENTITION GRIDS
			    ═══════════════════════════════════════════════════════════════════ */}
					<div className="flex flex-col gap-4 overflow-x-auto pb-2">
						{/* Compact Jaw & Sextant Switcher (Mandates 8d, 8e, Hick's Law: Strictly 1 Row 32-36px) */}
						<div className="flex items-center justify-between gap-2 overflow-x-auto h-9 min-h-[36px] max-h-9 py-0.5 px-1 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] text-xs font-semibold shrink-0 select-none">
							<div className="flex items-center gap-1 shrink-0">
								<button
									type="button"
									onClick={() => setArchFilter("all")}
									className={`px-2.5 py-1 rounded-md text-xs transition-all cursor-pointer h-7 flex items-center ${
										archFilter === "all"
											? "bg-teal-500/20 text-teal-300 font-bold shadow-2xs border border-teal-500/30"
											: "text-[var(--muted)] hover:text-[var(--ink)]"
									}`}
									data-testid="perio-arch-filter-all"
								>
									Обе челюсти (18–48)
								</button>
								<button
									type="button"
									onClick={() => setArchFilter("upper")}
									className={`px-2.5 py-1 rounded-md text-xs transition-all cursor-pointer h-7 flex items-center ${
										archFilter === "upper"
											? "bg-teal-500/20 text-teal-300 font-bold shadow-2xs border border-teal-500/30"
											: "text-[var(--muted)] hover:text-[var(--ink)]"
									}`}
									data-testid="perio-arch-filter-upper"
								>
									Верхняя (18–28)
								</button>
								<button
									type="button"
									onClick={() => setArchFilter("lower")}
									className={`px-2.5 py-1 rounded-md text-xs transition-all cursor-pointer h-7 flex items-center ${
										archFilter === "lower"
											? "bg-teal-500/20 text-teal-300 font-bold shadow-2xs border border-teal-500/30"
											: "text-[var(--muted)] hover:text-[var(--ink)]"
									}`}
									data-testid="perio-arch-filter-lower"
								>
									Нижняя (48–38)
								</button>
							</div>

							<div className="h-4 w-[1px] bg-[var(--line)] mx-0.5 shrink-0 hidden sm:block" />

							{/* Rapid Sextant Jump Chips (S1..S6 per Hick's Law) */}
							<div className="flex items-center gap-1 shrink-0">
								{(["S1", "S2", "S3", "S4", "S5", "S6"] as const).map((sName) => (
									<button
										key={sName}
										type="button"
										onClick={() =>
											setArchFilter(archFilter === sName ? "all" : sName)
										}
										className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold transition-all cursor-pointer h-7 flex items-center ${
											archFilter === sName
												? "bg-teal-600 text-white shadow-xs"
												: "bg-[var(--paper)] text-[var(--muted)] hover:text-teal-300 border border-[var(--line)]"
										}`}
										title={`Секстант ${sName}: быстрый фокус на участке зубного ряда`}
									>
										{sName}
									</button>
								))}
							</div>

							<div className="text-[11px] text-[var(--muted)] flex items-center gap-2 shrink-0 ml-auto pl-2">
								<span className="truncate">
									{archFilter === "all"
										? "32 зуба (192 точки)"
										: archFilter === "upper"
											? "Верхняя челюсть (96 точек)"
											: archFilter === "lower"
												? "Нижняя челюсть (96 точек)"
												: `Секстант ${archFilter}`}
								</span>
							</div>
						</div>

						{/* ─── UPPER ARCH (18..11 | 21..28) ────────────────────────────── */}
						{(archFilter === "all" ||
							archFilter === "upper" ||
							archFilter === "S1" ||
							archFilter === "S2" ||
							archFilter === "S3") && (
							<div className="flex flex-col gap-1 min-w-[760px]">
								<div className="flex items-center justify-between px-2 py-1 bg-[var(--paper-soft)] rounded-t-lg border-b border-[var(--line)] text-xs font-bold text-teal-400">
									<span>ВЕРХНЯЯ ЧЕЛЮСТЬ (МАКСИЛЛА) • 18–11 | 21–28</span>
									<span className="text-[10px] text-[var(--muted)]">
										Вестибулярно (DB • B • MB) / Небно (DL • L • ML)
									</span>
								</div>

								<div className="grid grid-cols-16 gap-1 bg-[var(--paper-soft)]/40 p-2 rounded-b-xl border border-[var(--line)]">
									{PERIO_UPPER_ARCH_TEETH.map((toothNumber) => {
										const tooth = toothMap.get(toothNumber);
										if (!tooth) return null;
										return (
											<PerioToothCard
												key={toothNumber}
												tooth={tooth}
												isUpper={true}
												isSelected={selectedToothNumber === toothNumber}
												focusedSiteKey={
													focusedSite?.toothNumber === toothNumber
														? focusedSite.siteKey
														: null
												}
												readOnly={readOnly}
												onSelectTooth={() => setSelectedToothNumber(toothNumber)}
												onFocusSite={(siteKey) => {
													setFocusedSite({ toothNumber, siteKey });
													setSelectedToothNumber(toothNumber);
												}}
												onCycleMobility={() => handleCycleMobility(toothNumber)}
												onCycleFurcation={() => handleCycleFurcation(toothNumber)}
												onToggleBop={(siteKey) => {
													updateToothSite(toothNumber, siteKey, (prev) => ({
														bleedingOnProbing: !prev.bleedingOnProbing,
													}));
												}}
												onTogglePlaque={(siteKey) => {
													updateToothSite(toothNumber, siteKey, (prev) => ({
														plaque: !prev.plaque,
													}));
												}}
												onToggleSuppuration={(siteKey) => {
													updateToothSite(toothNumber, siteKey, (prev) => ({
														suppuration: !prev.suppuration,
													}));
												}}
												onSetProbingDepth={(siteKey, depth) => {
													updateToothSite(toothNumber, siteKey, () => ({
														probingDepthMm: depth,
													}));
												}}
												onSetGingivalMargin={(siteKey, gm) => {
													updateToothSite(toothNumber, siteKey, () => ({
														gingivalMarginMm: gm,
													}));
												}}
											/>
										);
									})}
								</div>
							</div>
						)}

						{/* ─── LOWER ARCH (48..41 | 31..38) ────────────────────────────── */}
						{(archFilter === "all" ||
							archFilter === "lower" ||
							archFilter === "S4" ||
							archFilter === "S5" ||
							archFilter === "S6") && (
							<div className="flex flex-col gap-1 min-w-[760px]">
								<div className="flex items-center justify-between px-2 py-1 bg-[var(--paper-soft)] rounded-t-lg border-b border-[var(--line)] text-xs font-bold text-teal-400">
									<span>НИЖНЯЯ ЧЕЛЮСТЬ (МАНДИБУЛА) • 48–41 | 31–38</span>
									<span className="text-[10px] text-[var(--muted)]">
										Вестибулярно (DB • B • MB) / Язычно (DL • L • ML)
									</span>
								</div>

								<div className="grid grid-cols-16 gap-1 bg-[var(--paper-soft)]/40 p-2 rounded-b-xl border border-[var(--line)]">
									{PERIO_LOWER_ARCH_TEETH.map((toothNumber) => {
										const tooth = toothMap.get(toothNumber);
										if (!tooth) return null;
										return (
											<PerioToothCard
												key={toothNumber}
												tooth={tooth}
												isUpper={false}
												isSelected={selectedToothNumber === toothNumber}
												focusedSiteKey={
													focusedSite?.toothNumber === toothNumber
														? focusedSite.siteKey
														: null
												}
												readOnly={readOnly}
												onSelectTooth={() => setSelectedToothNumber(toothNumber)}
												onFocusSite={(siteKey) => {
													setFocusedSite({ toothNumber, siteKey });
													setSelectedToothNumber(toothNumber);
												}}
												onCycleMobility={() => handleCycleMobility(toothNumber)}
												onCycleFurcation={() => handleCycleFurcation(toothNumber)}
												onToggleBop={(siteKey) => {
													updateToothSite(toothNumber, siteKey, (prev) => ({
														bleedingOnProbing: !prev.bleedingOnProbing,
													}));
												}}
												onTogglePlaque={(siteKey) => {
													updateToothSite(toothNumber, siteKey, (prev) => ({
														plaque: !prev.plaque,
													}));
												}}
												onToggleSuppuration={(siteKey) => {
													updateToothSite(toothNumber, siteKey, (prev) => ({
														suppuration: !prev.suppuration,
													}));
												}}
												onSetProbingDepth={(siteKey, depth) => {
													updateToothSite(toothNumber, siteKey, () => ({
														probingDepthMm: depth,
													}));
												}}
												onSetGingivalMargin={(siteKey, gm) => {
													updateToothSite(toothNumber, siteKey, () => ({
														gingivalMarginMm: gm,
													}));
												}}
											/>
										);
									})}
								</div>
							</div>
						)}
					</div>
				</div>
			) : (
				<div className="p-4 rounded-2xl bg-[var(--paper-soft)]/70 border border-dashed border-teal-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
					<div className="flex items-center gap-3">
						<div className="p-2.5 rounded-xl bg-teal-500/15 text-teal-400 shrink-0">
							<Layers size={22} />
						</div>
						<div className="flex flex-col gap-0.5">
							<span className="text-sm font-black text-[var(--ink)]">
								Детальные 192 точки измерения (Tier 3, по требованию)
							</span>
							<span className="text-xs text-[var(--muted)]">
								Изолированы в Tier 3 для углублённого пародонтологического приёма. На обычном терапевтическом приёме используйте 1-клик кнопки экспресс-скрининга (Норма / Патология / Профгигиена) выше.
							</span>
						</div>
					</div>
					<button
						type="button"
						onClick={() => setIsTier3ProbingExpanded(true)}
						className="min-h-[44px] px-4 py-2 rounded-xl bg-teal-600/20 hover:bg-teal-600/30 text-teal-300 border border-teal-500/40 text-xs font-black transition-all cursor-pointer shrink-0 active:scale-95 flex items-center justify-center gap-1.5"
						data-testid="expand-perio-chart-tier3-btn"
					>
						<Activity size={16} />
						<span>Развернуть 192 точки (Tier 3)</span>
					</button>
				</div>
			)}

			{/* ═══════════════════════════════════════════════════════════════════
			    TIER 2: SELECTED TOOTH GRANULAR INSPECTOR (WARM CONTEXT DRAWER)
			    ═══════════════════════════════════════════════════════════════════ */}
			{selectedTooth && (
				<div className="p-3 sm:p-4 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col gap-3 min-w-0">
					<div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-[var(--line)]">
						<div className="flex items-center gap-2 min-w-0">
							<span className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-300 font-black text-sm flex items-center justify-center border border-teal-500/30 shrink-0">
								{selectedTooth.toothNumber}
							</span>
							<div className="min-w-0">
								<h4 className="text-xs sm:text-sm font-bold text-[var(--ink)] truncate">
									{getToothFolkAndAnatomicalNameRu(selectedTooth.toothNumber)}
								</h4>
								<span className="text-[10px] text-[var(--muted)] truncate block">
									{selectedTooth.isMissing
										? "Зуб отсутствует (адентия/удален)"
										: selectedTooth.isImplant
											? "Дентальный имплантат"
											: "Естественный зуб"}
								</span>
							</div>
						</div>

						{/* Quick Toggles */}
						{!readOnly && (
							<div className="flex items-center gap-2 flex-wrap text-xs">
								<button
									type="button"
									onClick={() =>
										updateToothProperties(selectedTooth.toothNumber, {
											isMissing: !selectedTooth.isMissing,
										})
									}
									className={`min-h-[44px] px-3 py-2 rounded-lg border text-xs font-semibold cursor-pointer transition-all touch-manipulation flex items-center gap-1.5 ${
										selectedTooth.isMissing
											? "bg-[var(--line-strong)] text-[var(--ink)] border-[var(--line)]"
											: "bg-[var(--paper)] text-[var(--muted)] border-[var(--line)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)]"
									}`}
								>
									<span>{selectedTooth.isMissing ? "Отсутствует" : "Отметить отсутствующим"}</span>
									{selectedTooth.isMissing && <Check size={14} className="text-[var(--ink)]" />}
								</button>

								<button
									type="button"
									onClick={() =>
										updateToothProperties(selectedTooth.toothNumber, {
											isImplant: !selectedTooth.isImplant,
										})
									}
									className={`min-h-[44px] px-3 py-2 rounded-lg border text-xs font-semibold cursor-pointer transition-all touch-manipulation flex items-center gap-1.5 ${
										selectedTooth.isImplant
											? "bg-amber-500/20 text-amber-300 border-amber-500/40"
											: "bg-[var(--paper)] text-[var(--muted)] border-[var(--line)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)]"
									}`}
								>
									<span>Имплантат</span>
									{selectedTooth.isImplant && <Check size={14} className="text-amber-300" />}
								</button>

								{/* Mobility Selector */}
								<div className="flex items-center gap-1 bg-[var(--paper)] px-2 py-1 rounded-lg border border-[var(--line)]">
									<span className="text-[11px] text-[var(--muted)]">
										Подвижность:
									</span>
									{([0, 1, 2, 3] as const).map((grade) => (
										<button
											key={grade}
											type="button"
											onClick={() =>
												updateToothProperties(selectedTooth.toothNumber, {
													mobility: grade,
												})
											}
											className={`px-1.5 py-0.5 rounded text-[11px] font-bold cursor-pointer transition-all ${
												selectedTooth.mobility === grade
													? "bg-teal-500 text-slate-950 font-black"
													: "text-[var(--muted)] hover:text-[var(--ink)]"
											}`}
											title={MOBILITY_GRADES[grade]?.nameRu}
										>
											{grade === 0 ? "0" : MOBILITY_GRADES[grade]?.codeRu}
										</button>
									))}
								</div>

								{/* Furcation Selector (for multi-rooted) */}
								{isFurcationEligibleTooth(selectedTooth.toothNumber) && (
									<div className="flex items-center gap-1 bg-[var(--paper)] px-2 py-1 rounded-lg border border-[var(--line)]">
										<span className="text-[11px] text-[var(--muted)]">
											Фуркация:
										</span>
										{([0, 1, 2, 3, 4] as const).map((grade) => (
											<button
												key={grade}
												type="button"
												onClick={() =>
													updateToothProperties(selectedTooth.toothNumber, {
														furcation: grade,
													})
												}
												className={`px-1.5 py-0.5 rounded text-[11px] font-bold cursor-pointer transition-all ${
													selectedTooth.furcation === grade
														? "bg-rose-500 text-white font-black"
														: "text-[var(--muted)] hover:text-[var(--ink)]"
												}`}
												title={FURCATION_GRADES[grade]?.nameRu}
											>
												{grade === 0 ? "0" : FURCATION_GRADES[grade]?.codeRu}
											</button>
										))}
									</div>
								)}
							</div>
						)}
					</div>

					{/* 6 Sites Granular Controls */}
					{!selectedTooth.isMissing && (
						<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
							{PERIO_SITES_CONFIG.map((siteCfg) => {
								const site = selectedTooth[siteCfg.key] ?? {
									probingDepthMm: 2,
									gingivalMarginMm: 0,
									bleedingOnProbing: false,
									suppuration: false,
									plaque: false,
									calculus: false,
								};
								const pd = site.probingDepthMm ?? 0;
								const gm = site.gingivalMarginMm ?? 0;
								const cal = calculateClinicalAttachmentLevel(pd, gm);

								return (
									<div
										key={siteCfg.key}
										className="p-2.5 rounded-lg bg-[var(--paper)] border border-[var(--line)] flex flex-col gap-1.5"
									>
										<div className="flex items-center justify-between text-[11px] font-bold text-teal-400">
											<span>{siteCfg.shortKey}</span>
											<span className="text-[10px] text-[var(--muted)] font-normal">
												CAL: {cal} мм
											</span>
										</div>

										{/* Probing Depth Stepper */}
										<div className="flex items-center justify-between text-xs">
											<span className="text-[10px] text-[var(--muted)]">
												PD (глубина):
											</span>
											<div className="flex items-center gap-1">
												{!readOnly && (
													<button
														type="button"
														onClick={() =>
															updateToothSite(
																selectedTooth.toothNumber,
																siteCfg.key,
																(prev) => ({
																	probingDepthMm: Math.max(
																		0,
																		(prev.probingDepthMm ?? 0) - 1,
																	),
																}),
															)
														}
														className="w-5 h-5 rounded bg-[var(--paper-soft)] text-[var(--ink)] hover:bg-[var(--line)] flex items-center justify-center font-bold text-xs cursor-pointer"
													>
														-
													</button>
												)}
												<span
													className={`w-6 text-center font-mono font-bold ${
														probingDepthTone(pd) === "success"
															? "text-emerald-400"
															: probingDepthTone(pd) === "warning-low"
																? "text-amber-400"
																: probingDepthTone(pd) === "warning-high"
																	? "text-orange-400"
																	: "text-rose-400"
													}`}
												>
													{pd}
												</span>
												{!readOnly && (
													<button
														type="button"
														onClick={() =>
															updateToothSite(
																selectedTooth.toothNumber,
																siteCfg.key,
																(prev) => ({
																	probingDepthMm: Math.min(
																		15,
																		(prev.probingDepthMm ?? 0) + 1,
																	),
																}),
															)
														}
														className="w-5 h-5 rounded bg-[var(--paper-soft)] text-[var(--ink)] hover:bg-[var(--line)] flex items-center justify-center font-bold text-xs cursor-pointer"
													>
														+
													</button>
												)}
											</div>
										</div>

										{/* Gingival Margin Stepper */}
										<div className="flex items-center justify-between text-xs">
											<span className="text-[10px] text-[var(--muted)]">
												GM (десна):
											</span>
											<div className="flex items-center gap-1">
												{!readOnly && (
													<button
														type="button"
														onClick={() =>
															updateToothSite(
																selectedTooth.toothNumber,
																siteCfg.key,
																(prev) => ({
																	gingivalMarginMm:
																		(prev.gingivalMarginMm ?? 0) - 1,
																}),
															)
														}
														className="w-5 h-5 rounded bg-[var(--paper-soft)] text-[var(--ink)] hover:bg-[var(--line)] flex items-center justify-center font-bold text-xs cursor-pointer"
													>
														-
													</button>
												)}
												<span className="w-6 text-center font-mono text-[11px] text-[var(--ink)]">
													{gm > 0 ? `+${gm}` : gm}
												</span>
												{!readOnly && (
													<button
														type="button"
														onClick={() =>
															updateToothSite(
																selectedTooth.toothNumber,
																siteCfg.key,
																(prev) => ({
																	gingivalMarginMm:
																		(prev.gingivalMarginMm ?? 0) + 1,
																}),
															)
														}
														className="w-5 h-5 rounded bg-[var(--paper-soft)] text-[var(--ink)] hover:bg-[var(--line)] flex items-center justify-center font-bold text-xs cursor-pointer"
													>
														+
													</button>
												)}
											</div>
										</div>

										{/* Toggles (BOP, Plaque, Suppuration) */}
										<div className="flex items-center justify-between pt-1 border-t border-[var(--line)] gap-1">
											<button
												type="button"
												disabled={readOnly}
												onClick={() =>
													updateToothSite(
														selectedTooth.toothNumber,
														siteCfg.key,
														(prev) => ({
															bleedingOnProbing: !prev.bleedingOnProbing,
														}),
													)
												}
												className={`flex-1 py-1 rounded text-[10px] font-bold flex items-center justify-center gap-0.5 cursor-pointer transition-all ${
													site.bleedingOnProbing
														? "bg-rose-500 text-white"
														: "bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--line)]"
												}`}
												title="Кровоточивость при зондировании (BOP)"
											>
												BOP
											</button>

											<button
												type="button"
												disabled={readOnly}
												onClick={() =>
													updateToothSite(
														selectedTooth.toothNumber,
														siteCfg.key,
														(prev) => ({
															plaque: !prev.plaque,
														}),
													)
												}
												className={`flex-1 py-1 rounded text-[10px] font-bold flex items-center justify-center gap-0.5 cursor-pointer transition-all ${
													site.plaque
														? "bg-amber-500 text-slate-950 font-black"
														: "bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--line)]"
												}`}
												title="Зубной налет (Plaque / Биопленка)"
											>
												PLQ
											</button>

											<button
												type="button"
												disabled={readOnly}
												onClick={() =>
													updateToothSite(
														selectedTooth.toothNumber,
														siteCfg.key,
														(prev) => ({
															suppuration: !prev.suppuration,
														}),
													)
												}
												className={`flex-1 py-1 rounded text-[10px] font-bold flex items-center justify-center gap-0.5 cursor-pointer transition-all ${
													site.suppuration
														? "bg-indigo-500 text-white"
														: "bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--line)]"
												}`}
												title="Нагноение из кармана (Suppuration / PUS)"
											>
												PUS
											</button>
										</div>
									</div>
								);
							})}
						</div>
					)}
				</div>
			)}

			{/* ═══════════════════════════════════════════════════════════════════
			    TIER 3 / DEEP DIVE: WHO PSR 6-SEXTANTS & O'LEARY INDEX REPORT
			    ═══════════════════════════════════════════════════════════════════ */}
			{isDiagnosticsExpanded && (
				<div className="p-4 rounded-xl bg-[var(--paper-soft)] border border-teal-500/20 flex flex-col gap-4 animate-in fade-in duration-150">
					<div className="flex items-center justify-between font-bold text-sm text-teal-400">
						<span className="flex items-center gap-2">
							<Layers size={16} />
							Скрининг PSR / CPITN по 6 секстантам и гигиеническая матрица
							O&apos;Leary PCR
						</span>
						<button
							type="button"
							onClick={() => setIsDiagnosticsExpanded(false)}
							className="min-h-[44px] px-2.5 py-1.5 rounded-lg text-[var(--muted)] hover:text-white hover:bg-[var(--line)]/30 text-xs font-medium cursor-pointer inline-flex items-center gap-1.5 transition-colors touch-manipulation"
						>
							<span>Свернуть</span>
							<ChevronUp size={14} />
						</button>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
						{/* 6 Sextants WHO PSR */}
						<div className="p-3 rounded-lg bg-[var(--paper)] border border-[var(--line)] flex flex-col gap-2">
							<h5 className="font-bold text-[var(--ink)] flex items-center justify-between">
								<span>Секстанты PSR (СтАР / ВОЗ)</span>
								<span className="text-teal-400 font-mono">
									{psrSummaryText}
								</span>
							</h5>
							<div className="grid grid-cols-3 gap-1.5 text-center text-[11px]">
								<div className="p-2 rounded bg-[var(--paper-soft)] border border-[var(--line)]">
									<div className="text-[var(--muted)]">S1 (17-14)</div>
									<div className="font-bold text-base text-teal-300">
										{psrSextants.S1?.code ?? 0}
										{psrSextants.S1?.asterisk ? "*" : ""}
									</div>
									<div className="text-[10px] text-[var(--muted)]">
										PD: {psrSextants.S1?.highestPocketDepthMm ?? 0}мм
									</div>
								</div>
								<div className="p-2 rounded bg-[var(--paper-soft)] border border-[var(--line)]">
									<div className="text-[var(--muted)]">S2 (13-23)</div>
									<div className="font-bold text-base text-teal-300">
										{psrSextants.S2?.code ?? 0}
										{psrSextants.S2?.asterisk ? "*" : ""}
									</div>
									<div className="text-[10px] text-[var(--muted)]">
										PD: {psrSextants.S2?.highestPocketDepthMm ?? 0}мм
									</div>
								</div>
								<div className="p-2 rounded bg-[var(--paper-soft)] border border-[var(--line)]">
									<div className="text-[var(--muted)]">S3 (24-27)</div>
									<div className="font-bold text-base text-teal-300">
										{psrSextants.S3?.code ?? 0}
										{psrSextants.S3?.asterisk ? "*" : ""}
									</div>
									<div className="text-[10px] text-[var(--muted)]">
										PD: {psrSextants.S3?.highestPocketDepthMm ?? 0}мм
									</div>
								</div>
								<div className="p-2 rounded bg-[var(--paper-soft)] border border-[var(--line)]">
									<div className="text-[var(--muted)]">S6 (47-44)</div>
									<div className="font-bold text-base text-teal-300">
										{psrSextants.S6?.code ?? 0}
										{psrSextants.S6?.asterisk ? "*" : ""}
									</div>
									<div className="text-[10px] text-[var(--muted)]">
										PD: {psrSextants.S6?.highestPocketDepthMm ?? 0}мм
									</div>
								</div>
								<div className="p-2 rounded bg-[var(--paper-soft)] border border-[var(--line)]">
									<div className="text-[var(--muted)]">S5 (43-33)</div>
									<div className="font-bold text-base text-teal-300">
										{psrSextants.S5?.code ?? 0}
										{psrSextants.S5?.asterisk ? "*" : ""}
									</div>
									<div className="text-[10px] text-[var(--muted)]">
										PD: {psrSextants.S5?.highestPocketDepthMm ?? 0}мм
									</div>
								</div>
								<div className="p-2 rounded bg-[var(--paper-soft)] border border-[var(--line)]">
									<div className="text-[var(--muted)]">S4 (34-37)</div>
									<div className="font-bold text-base text-teal-300">
										{psrSextants.S4?.code ?? 0}
										{psrSextants.S4?.asterisk ? "*" : ""}
									</div>
									<div className="text-[10px] text-[var(--muted)]">
										PD: {psrSextants.S4?.highestPocketDepthMm ?? 0}мм
									</div>
								</div>
							</div>
							<p className="text-[10px] text-[var(--muted)]">
								* — патологическая подвижность зубов ≥ II ст. или вовлечение
								фуркации корней
							</p>
						</div>

						{/* O'Leary Hygiene Report */}
						<div className="p-3 rounded-lg bg-[var(--paper)] border border-[var(--line)] flex flex-col gap-2">
							<h5 className="font-bold text-[var(--ink)] flex items-center justify-between">
								<span>Индекс гигиены O&apos;Leary PCR</span>
								<span
									className={`font-mono font-bold ${
										olearyPcr.pcrPercent <= 15
											? "text-emerald-400"
											: "text-rose-400"
									}`}
								>
									{olearyPcr.pcrPercent}%
								</span>
							</h5>
							<p className="text-[11px] text-[var(--muted)]">
								{olearyPcr.ratingDescriptionRu}
							</p>
							<div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
								<div className="p-2 rounded bg-[var(--paper-soft)]">
									<span className="text-[var(--muted)]">
										Апроксимальный налет:
									</span>
									<div className="font-bold text-amber-300">
										{olearyPcr.interproximalPlaquePercent}%
									</div>
								</div>
								<div className="p-2 rounded bg-[var(--paper-soft)]">
									<span className="text-[var(--muted)]">
										Гладкие поверхности:
									</span>
									<div className="font-bold text-amber-300">
										{olearyPcr.smoothSurfacePlaquePercent}%
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
});
PeriodontogramChart.displayName = "PeriodontogramChart";

// ═════════════════════════════════════════════════════════════════════════════
// SUBCOMPONENT: PERIO TOOTH CARD (ANATOMICAL COLUMN WITH 6 SITES)
// ═════════════════════════════════════════════════════════════════════════════

interface PerioToothCardProps {
	readonly tooth: PerioToothRecord;
	readonly isUpper: boolean;
	readonly isSelected: boolean;
	readonly focusedSiteKey: PerioSiteKey | null;
	readonly readOnly: boolean;
	readonly onSelectTooth: () => void;
	readonly onFocusSite: (siteKey: PerioSiteKey) => void;
	readonly onCycleMobility?: (() => void) | undefined;
	readonly onCycleFurcation?: (() => void) | undefined;
	readonly onToggleBop: (siteKey: PerioSiteKey) => void;
	readonly onTogglePlaque: (siteKey: PerioSiteKey) => void;
	readonly onToggleSuppuration: (siteKey: PerioSiteKey) => void;
	readonly onSetProbingDepth: (siteKey: PerioSiteKey, depth: number) => void;
	readonly onSetGingivalMargin: (siteKey: PerioSiteKey, gm: number) => void;
}

const PerioToothCard: React.FC<PerioToothCardProps> = ({
	tooth,
	isUpper,
	isSelected,
	focusedSiteKey,
	readOnly,
	onSelectTooth,
	onFocusSite,
	onCycleMobility,
	onCycleFurcation,
	onToggleBop,
	onTogglePlaque,
	onToggleSuppuration,
}) => {
	const isMissing = tooth.isMissing;
	const isImplant = tooth.isImplant;

	// Buccal sites: Disto-Buccal, Mid-Buccal, Mesio-Buccal
	// Standard FDI Quadrant orientation:
	// Q1 (18..11) & Q4 (48..41): right side -> DB is outer, MB is inner
	// Q2 (21..28) & Q3 (31..38): left side -> MB is inner, DB is outer
	const isRightQuadrant =
		(tooth.toothNumber >= 11 && tooth.toothNumber <= 18) ||
		(tooth.toothNumber >= 41 && tooth.toothNumber <= 48);

	const buccalSiteKeys: PerioSiteKey[] = isRightQuadrant
		? ["distoBuccal", "midBuccal", "mesioBuccal"]
		: ["mesioBuccal", "midBuccal", "distoBuccal"];

	const lingualSiteKeys: PerioSiteKey[] = isRightQuadrant
		? ["distoLingual", "midLingual", "mesioLingual"]
		: ["mesioLingual", "midLingual", "distoLingual"];

	return (
		<div
			onClick={onSelectTooth}
			className={`flex flex-col items-center p-1 rounded-lg border transition-all cursor-pointer min-h-[140px] sm:min-h-[150px] ${
				isMissing
					? "opacity-40 bg-[var(--paper-soft)] border-[var(--line)]"
					: isSelected
						? "bg-teal-500/10 border-teal-500 shadow-md ring-1 ring-teal-500/40"
						: "bg-[var(--paper)] hover:bg-[var(--paper-soft)] border-[var(--line)]"
			}`}
		>
			{/* Tooth Number Header & 1-Click Mobility / Furcation Chips */}
			<div className="w-full flex items-center justify-between text-[10px] font-bold px-0.5 mb-0.5 min-w-0">
				<span
					className={`truncate ${
						isSelected
							? "text-teal-300 font-black scale-105"
							: "text-[var(--ink)]"
					}`}
				>
					{tooth.toothNumber}
				</span>
				<div className="flex items-center gap-0.5 shrink-0">
					{isImplant && (
						<span
							className="text-[8px] font-bold text-amber-400 font-mono px-0.5 rounded bg-amber-500/10 border border-amber-500/30"
							title="Дентальный имплантат"
						>
							ИМП
						</span>
					)}

					{/* 1-Click Mobility Chip (по шкале Энтина 0..III) */}
					{!isMissing && onCycleMobility && (
						<button
							type="button"
							disabled={readOnly}
							onClick={(e) => {
								e.stopPropagation();
								onCycleMobility();
							}}
							className={`px-1 py-0.2 rounded text-[8px] font-black tracking-tight cursor-pointer transition-all border ${
								tooth.mobility === 0
									? "bg-[var(--paper-soft)] text-[var(--muted)] border-[var(--line)] hover:bg-amber-500/20 hover:text-amber-300"
									: tooth.mobility === 1
										? "bg-amber-500/25 text-amber-300 border-amber-500/40 ring-1 ring-amber-400/30"
										: tooth.mobility === 2
											? "bg-orange-500/30 text-orange-200 border-orange-500/50 ring-1 ring-orange-400/40"
											: "bg-rose-500/35 text-rose-200 border-rose-500/60 ring-1 ring-rose-400/50 font-black animate-pulse"
							}`}
							title={`Подвижность по Энтину: ${MOBILITY_GRADES[tooth.mobility]?.nameRu ?? "0"} (клик для смены 0 -> I -> II -> III)`}
							aria-label={`Подвижность зуба ${tooth.toothNumber}: ${tooth.mobility}`}
						>
							M{tooth.mobility}
						</button>
					)}

					{/* 1-Click Furcation Chip for Multi-Rooted Teeth (0..IV) */}
					{!isMissing &&
						isFurcationEligibleTooth(tooth.toothNumber) &&
						onCycleFurcation && (
							<button
								type="button"
								disabled={readOnly}
								onClick={(e) => {
									e.stopPropagation();
									onCycleFurcation();
								}}
								className={`px-1 py-0.2 rounded text-[8px] font-black tracking-tight cursor-pointer transition-all border ${
									tooth.furcation === 0
										? "bg-[var(--paper-soft)] text-[var(--muted)] border-[var(--line)] hover:bg-rose-500/20 hover:text-rose-300"
										: tooth.furcation === 1
											? "bg-amber-500/25 text-amber-300 border-amber-500/40 ring-1 ring-amber-400/30"
											: tooth.furcation === 2
												? "bg-orange-500/30 text-orange-200 border-orange-500/50 ring-1 ring-orange-400/40"
												: "bg-rose-600/35 text-rose-200 border-rose-500/60 ring-1 ring-rose-400/50 font-black"
								}`}
								title={`Вовлечение фуркации: ${FURCATION_GRADES[tooth.furcation]?.nameRu ?? "0"} (клик для смены 0 -> I -> II -> III -> IV)`}
								aria-label={`Фуркация зуба ${tooth.toothNumber}: ${tooth.furcation}`}
							>
								F{tooth.furcation}
							</button>
						)}
				</div>
			</div>

			{/* Vestibular / Buccal 3 Sites Row */}
			<div className="grid grid-cols-3 gap-0.5 w-full">
				{buccalSiteKeys.map((sKey) => {
					const site = tooth[sKey] ?? {
						probingDepthMm: 2,
						gingivalMarginMm: 0,
						bleedingOnProbing: false,
						suppuration: false,
						plaque: false,
						calculus: false,
					};
					const isFocused = focusedSiteKey === sKey;
					const pd = site.probingDepthMm ?? 0;

					return (
						<div
							key={sKey}
							onClick={(e) => {
								e.stopPropagation();
								onFocusSite(sKey);
							}}
							className={`flex flex-col items-center justify-center py-1 px-0.5 rounded border transition-all ${
								isFocused
									? "ring-2 ring-teal-400 bg-teal-500/25 border-teal-400 shadow-xs"
									: probingDepthClasses(pd)
							}`}
						>
							<span className="font-mono text-[10px] font-black leading-none">
								{pd}
							</span>

							{/* 1-Click BOP & Plaque Interactive Toggles */}
							<div className="flex items-center gap-1 mt-0.5">
								<button
									type="button"
									disabled={readOnly}
									onClick={(e) => {
										e.stopPropagation();
										onToggleBop(sKey);
									}}
									className={`w-3.5 h-3.5 rounded-full cursor-pointer transition-all flex items-center justify-center border ${
										site.bleedingOnProbing
											? "bg-rose-500 border-rose-300 text-white shadow-xs ring-1 ring-rose-300"
											: "bg-[var(--paper-soft)] border-[var(--line)] hover:bg-rose-500/50 hover:border-rose-400"
									}`}
									title={
										site.bleedingOnProbing
											? "BOP: Кровоточивость есть (клик для снятия)"
											: "BOP: Кровоточивости нет (клик для отметки)"
									}
									aria-label="BOP"
								>
									{site.bleedingOnProbing && (
										<span className="w-1.5 h-1.5 rounded-full bg-white block" />
									)}
								</button>
								<button
									type="button"
									disabled={readOnly}
									onClick={(e) => {
										e.stopPropagation();
										onTogglePlaque(sKey);
									}}
									className={`w-3.5 h-3.5 rounded-full cursor-pointer transition-all flex items-center justify-center border ${
										site.plaque
											? "bg-amber-400 border-amber-200 text-slate-950 shadow-xs ring-1 ring-amber-200"
											: "bg-[var(--paper-soft)] border-[var(--line)] hover:bg-amber-400/50 hover:border-amber-300"
									}`}
									title={
										site.plaque
											? "PLQ: Зубной налет есть (клик для снятия)"
											: "PLQ: Зубного налета нет (клик для отметки)"
									}
									aria-label="PLQ"
								>
									{site.plaque && (
										<span className="w-1.5 h-1.5 rounded-full bg-amber-950 block" />
									)}
								</button>
							</div>
						</div>
					);
				})}
			</div>

			{/* Tooth Root & Crown Visual Depth Gauge */}
			<div className="w-full my-1 flex items-center justify-center">
				<PerioToothVisual
					toothNumber={tooth.toothNumber}
					isUpper={isUpper}
					isMissing={isMissing}
					isImplant={isImplant}
					buccalPd={tooth.midBuccal?.probingDepthMm ?? 2}
					lingualPd={tooth.midLingual?.probingDepthMm ?? 2}
				/>
			</div>

			{/* Oral / Lingual / Palatal 3 Sites Row */}
			<div className="grid grid-cols-3 gap-0.5 w-full">
				{lingualSiteKeys.map((sKey) => {
					const site = tooth[sKey] ?? {
						probingDepthMm: 2,
						gingivalMarginMm: 0,
						bleedingOnProbing: false,
						suppuration: false,
						plaque: false,
						calculus: false,
					};
					const isFocused = focusedSiteKey === sKey;
					const pd = site.probingDepthMm ?? 0;

					return (
						<div
							key={sKey}
							onClick={(e) => {
								e.stopPropagation();
								onFocusSite(sKey);
							}}
							className={`flex flex-col items-center justify-center py-1 px-0.5 rounded border transition-all ${
								isFocused
									? "ring-2 ring-teal-400 bg-teal-500/25 border-teal-400 shadow-xs"
									: probingDepthClasses(pd)
							}`}
						>
							<span className="font-mono text-[10px] font-black leading-none">
								{pd}
							</span>

							{/* 1-Click BOP & Plaque Interactive Toggles */}
							<div className="flex items-center gap-1 mt-0.5">
								<button
									type="button"
									disabled={readOnly}
									onClick={(e) => {
										e.stopPropagation();
										onToggleBop(sKey);
									}}
									className={`w-3.5 h-3.5 rounded-full cursor-pointer transition-all flex items-center justify-center border ${
										site.bleedingOnProbing
											? "bg-rose-500 border-rose-300 text-white shadow-xs ring-1 ring-rose-300"
											: "bg-[var(--paper-soft)] border-[var(--line)] hover:bg-rose-500/50 hover:border-rose-400"
									}`}
									title={
										site.bleedingOnProbing
											? "BOP: Кровоточивость есть (клик для снятия)"
											: "BOP: Кровоточивости нет (клик для отметки)"
									}
									aria-label="BOP"
								>
									{site.bleedingOnProbing && (
										<span className="w-1.5 h-1.5 rounded-full bg-white block" />
									)}
								</button>
								<button
									type="button"
									disabled={readOnly}
									onClick={(e) => {
										e.stopPropagation();
										onTogglePlaque(sKey);
									}}
									className={`w-3.5 h-3.5 rounded-full cursor-pointer transition-all flex items-center justify-center border ${
										site.plaque
											? "bg-amber-400 border-amber-200 text-slate-950 shadow-xs ring-1 ring-amber-200"
											: "bg-[var(--paper-soft)] border-[var(--line)] hover:bg-amber-400/50 hover:border-amber-300"
									}`}
									title={
										site.plaque
											? "PLQ: Зубной налет есть (клик для снятия)"
											: "PLQ: Зубного налета нет (клик для отметки)"
									}
									aria-label="PLQ"
								>
									{site.plaque && (
										<span className="w-1.5 h-1.5 rounded-full bg-amber-950 block" />
									)}
								</button>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
};

// ═════════════════════════════════════════════════════════════════════════════
// SUBCOMPONENT: PERIO TOOTH VISUAL DIAGRAM
// ═════════════════════════════════════════════════════════════════════════════

interface PerioToothVisualProps {
	readonly toothNumber: number;
	readonly isUpper: boolean;
	readonly isMissing: boolean;
	readonly isImplant: boolean;
	readonly buccalPd: number;
	readonly lingualPd: number;
}

const PerioToothVisual: React.FC<PerioToothVisualProps> = React.memo(({
	toothNumber,
	isUpper,
	isMissing,
	isImplant,
	buccalPd,
	lingualPd,
}) => {
	const maxPd = Math.max(buccalPd, lingualPd);
	const isMolar =
		isFurcationEligibleTooth(toothNumber) &&
		(toothNumber % 10 === 6 ||
			toothNumber % 10 === 7 ||
			toothNumber % 10 === 8);

	if (isMissing) {
		return (
			<svg width="28" height="34" viewBox="0 0 28 34" className="text-[var(--muted)]">
				<line
					x1="4"
					y1="4"
					x2="24"
					y2="30"
					stroke="currentColor"
					strokeWidth="2"
				/>
				<line
					x1="24"
					y1="4"
					x2="4"
					y2="30"
					stroke="currentColor"
					strokeWidth="2"
				/>
			</svg>
		);
	}

	if (isImplant) {
		return (
			<svg
				width="28"
				height="34"
				viewBox="0 0 28 34"
				className="text-amber-400"
			>
				<rect
					x="7"
					y="4"
					width="14"
					height="26"
					rx="2"
					fill="currentColor"
					fillOpacity="0.15"
					stroke="currentColor"
					strokeWidth="1.5"
				/>
				<line
					x1="7"
					y1="9"
					x2="21"
					y2="9"
					stroke="currentColor"
					strokeWidth="1.5"
				/>
				<line
					x1="7"
					y1="14"
					x2="21"
					y2="14"
					stroke="currentColor"
					strokeWidth="1.5"
				/>
				<line
					x1="7"
					y1="19"
					x2="21"
					y2="19"
					stroke="currentColor"
					strokeWidth="1.5"
				/>
				<line
					x1="7"
					y1="24"
					x2="21"
					y2="24"
					stroke="currentColor"
					strokeWidth="1.5"
				/>
			</svg>
		);
	}

	// Dynamic pocket depth fill bar height
	const pocketFillRatio = Math.min(1, Math.max(0, (maxPd - 2) / 8));
	const pocketFillHeight = Math.round(pocketFillRatio * 18);

	const pocketColor = probingDepthHex(maxPd);

	return (
		<svg width="28" height="34" viewBox="0 0 28 34">
			{/* Crown */}
			<rect
				x="5"
				y={isUpper ? 20 : 2}
				width="18"
				height="12"
				rx="3"
				fill="var(--line-strong, #64748b)"
				fillOpacity="0.25"
				stroke="var(--line, #94a3b8)"
				strokeWidth="1.2"
			/>

			{/* Root(s) */}
			{isMolar ? (
				<>
					{/* Dual root appearance */}
					<path
						d={
							isUpper
								? "M7,20 L6,4 A2,2 0 0,1 11,4 L12,20 Z"
								: "M7,14 L6,30 A2,2 0 0,0 11,30 L12,14 Z"
						}
						fill="var(--line-strong, #64748b)"
						fillOpacity="0.2"
						stroke="var(--line, #64748b)"
						strokeWidth="1"
					/>
					<path
						d={
							isUpper
								? "M16,20 L17,4 A2,2 0 0,1 22,4 L21,20 Z"
								: "M16,14 L17,30 A2,2 0 0,0 22,30 L21,14 Z"
						}
						fill="var(--line-strong, #64748b)"
						fillOpacity="0.2"
						stroke="var(--line, #64748b)"
						strokeWidth="1"
					/>
				</>
			) : (
				/* Single conical root */
				<path
					d={
						isUpper
							? "M7,20 L12,3 A2,2 0 0,1 16,3 L21,20 Z"
							: "M7,14 L12,31 A2,2 0 0,0 16,31 L21,14 Z"
					}
					fill="var(--line-strong, #64748b)"
					fillOpacity="0.2"
					stroke="var(--line, #64748b)"
					strokeWidth="1"
				/>
			)}

			{/* Probing Depth Fill Indicator */}
			{pocketFillHeight > 0 && (
				<rect
					x="9"
					y={isUpper ? 20 - pocketFillHeight : 14}
					width="10"
					height={pocketFillHeight}
					rx="1"
					fill={pocketColor}
					fillOpacity="0.75"
				/>
			)}

			{/* Gingival Margin line */}
			<line
				x1="3"
				y1={isUpper ? 20 : 14}
				x2="25"
				y2={isUpper ? 20 : 14}
				stroke="var(--sky, #38bdf8)"
				strokeWidth="1.5"
				strokeDasharray="2 1"
			/>
		</svg>
	);
});
PerioToothVisual.displayName = "PerioToothVisual";
