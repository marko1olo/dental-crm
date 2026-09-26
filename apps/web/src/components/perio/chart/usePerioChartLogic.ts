import {
	calculateAapEfpStagingAndGrading,
	calculateClinicalAttachmentLevel,
	calculateOlearyFromPerioTeeth,
	calculatePerioIndices,
	calculatePsrSextants,
	createDefaultPerioTeeth,
	formatPsrSextantsSummary,
	generateFullMouthProbingSequence,
	isFurcationEligibleTooth,
	PERIO_SITE_KEYS,
	type PerioChartSummary,
	type PerioSiteKey,
	type PerioToothRecord,
	type ProbingStep,
} from "@dental/shared";
import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { useVisitStore } from "../../../store/visitStore";
import { showToast } from "../../GlobalToast";
import {
	applyPsrSextantCode,
	type PerioExpressPresetId,
	type PsrCode,
} from "../perioMath";
import {
	applyExpressPerioPreset,
	applyTherapistPathologyPreset,
	dispatchPresetSideEffects,
	generatePerioProtocolText,
} from "./perioPresets";
import { usePerioKeyboardProbing } from "./usePerioKeyboardProbing";

export interface UsePerioChartLogicOptions {
	readonly initialTeeth?: readonly PerioToothRecord[] | undefined;
	readonly onChange?:
		| ((teeth: PerioToothRecord[], summary: PerioChartSummary) => void)
		| undefined;
	readonly onInsertToProtocol?: ((protocolText: string) => void) | undefined;
	readonly readOnly?: boolean | undefined;
	readonly initialTier3Expanded?: boolean | undefined;
	readonly initialProbeKeyboardEnabled?: boolean | undefined;
	readonly doctorName?: string | undefined;
}

export function usePerioChartLogic({
	initialTeeth,
	onChange,
	onInsertToProtocol,
	readOnly = false,
	initialTier3Expanded = false,
	initialProbeKeyboardEnabled = false,
	doctorName,
}: UsePerioChartLogicOptions) {
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

	// ─── Keyboard Event Handling (Hook) ───────────────────────────────────────
	const handleKeyDown = usePerioKeyboardProbing({
		readOnly,
		isProbeKeyboardEnabled,
		focusedSite,
		probingSequence,
		toothMap,
		updateToothSite,
		updateToothProperties,
		moveToNextSite,
		moveToPreviousSite,
		setFocusedSite,
		setSelectedToothNumber,
	});

	// ─── 1-Click PSR Screening & Clinical Presets (Mandates 8e, 8k) ───────────
	const handleApplyExpressPreset = useCallback(
		(presetId: PerioExpressPresetId) => {
			if (readOnly) return;
			const res = applyExpressPerioPreset(teeth, presetId);
			setTeeth(res.updatedTeeth);
			dispatchPresetSideEffects(res, onInsertToProtocol);
		},
		[readOnly, teeth, onInsertToProtocol],
	);

	// Explicit helper for severe periodontitis preset (Mandate 8e, 8k)
	const handleApplySeverePeriodontitisPreset = useCallback(() => {
		handleApplyExpressPreset("periodontitis_severe_express");
	}, [handleApplyExpressPreset]);

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
			const res = applyTherapistPathologyPreset(teeth, presetId);
			if (!res) return;
			setTeeth(res.updatedTeeth);
			dispatchPresetSideEffects(res, onInsertToProtocol);
		},
		[readOnly, teeth, onInsertToProtocol],
	);

	// ─── Protocol Generation & Clipboard Export ──────────────────────────────
	const generateProtocolText = useCallback((): string => {
		return generatePerioProtocolText(teeth, summary, doctorName ?? undefined);
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
		if (typeof window !== "undefined") {
			window.dispatchEvent(
				new CustomEvent("dente-apply-soap-protocol", {
					detail: {
						soap: text,
						mode: "smart_append",
					},
				}),
			);
		}

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

	return {
		teeth,
		setTeeth,
		selectedToothNumber,
		setSelectedToothNumber,
		focusedSite,
		setFocusedSite,
		isDiagnosticsExpanded,
		setIsDiagnosticsExpanded,
		isHygieneExpanded,
		setIsHygieneExpanded,
		isHelpOpen,
		setIsHelpOpen,
		copyStatus,
		insertStatus,
		isTier3ProbingExpanded,
		setIsTier3ProbingExpanded,
		isProbeKeyboardEnabled,
		setIsProbeKeyboardEnabled,
		archFilter,
		setArchFilter,
		containerRef,
		summary,
		psrSextants,
		psrSummaryText,
		olearyPcr,
		aapDiagnosis,
		probingSequence,
		toothMap,
		selectedTooth,
		updateToothSite,
		updateToothProperties,
		moveToNextSite,
		moveToPreviousSite,
		handleKeypadDepth,
		handleKeypadGingivalMargin,
		handleKeypadToggleBop,
		handleKeypadTogglePlaque,
		handleKeypadToggleSuppuration,
		handleCycleMobility,
		handleCycleFurcation,
		handleKeyDown,
		handleApplyExpressPreset,
		handleApplySeverePeriodontitisPreset,
		handleApplySextantCode,
		handleSetAllIntact,
		handleMarkSelectedToothPathology,
		handleMarkBopOnDeepPockets,
		handleClearPlaque,
		handleApplyTherapistPreset,
		generateProtocolText,
		handleInsertToProtocol,
		handleCopyProtocol,
	};
}
