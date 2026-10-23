/**
 * usePerioChartLogic.ts — Фасадный хук состояния пародонтограммы (Мандат 8b, <= 120 строк).
 * Архитектурный слой Layer 3: Hook Facade.
 */

import {
	calculateAapEfpStagingAndGrading, calculateClinicalAttachmentLevel,
	calculateOlearyFromPerioTeeth, calculatePerioIndices, calculatePsrSextants,
	createDefaultPerioTeeth, formatPsrSextantsSummary, generateFullMouthProbingSequence,
	type PerioChartSummary, type PerioSiteKey, type PerioToothRecord, type ProbingStep,
} from "@dental/shared";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { isDemoPatientId, isDemoShowcaseMode } from "../../../lib/demoMode";
import { applyPeriodontitisModeratePreset } from "../perioMath";
import { usePerioDraftPersistence } from "./usePerioDraftPersistence";
import { usePerioDynamics } from "./usePerioDynamics";
import { usePerioKeyboardProbing } from "./usePerioKeyboardProbing";
import { usePerioKeypadActions } from "./usePerioKeypadActions";
import { usePerioPresetActions } from "./usePerioPresetActions";
import { usePerioProtocolActions } from "./usePerioProtocolActions";

export interface UsePerioChartLogicOptions {
	readonly initialTeeth?: readonly PerioToothRecord[] | undefined;
	readonly patientId?: string | undefined; readonly visitId?: string | undefined;
	readonly initialSelectedTooth?: number | undefined;
	readonly previousSummary?: PerioChartSummary | null | undefined;
	readonly previousRecordedAt?: string | null | undefined;
	readonly onChange?: ((teeth: PerioToothRecord[], summary: PerioChartSummary) => void) | undefined;
	readonly onSave?: ((teeth: PerioToothRecord[], summary: PerioChartSummary) => void) | undefined;
	readonly onInsertToProtocol?: ((protocolText: string) => void) | undefined;
	readonly readOnly?: boolean | undefined; readonly initialTier3Expanded?: boolean | undefined;
	readonly initialProbeKeyboardEnabled?: boolean | undefined; readonly doctorName?: string | undefined;
}

export function usePerioChartLogic({
	initialTeeth, patientId, visitId, initialSelectedTooth, previousSummary, previousRecordedAt,
	onChange, onSave, onInsertToProtocol, readOnly = false, initialTier3Expanded = false,
	initialProbeKeyboardEnabled = false, doctorName,
}: UsePerioChartLogicOptions) {
	const [teeth, setTeeth] = useState<PerioToothRecord[]>(() => {
		if (initialTeeth?.length) {
			const map = new Map(initialTeeth.map((t) => [t.toothNumber, t]));
			return createDefaultPerioTeeth(2).map((def) => map.get(def.toothNumber) ?? def);
		}
		if (isDemoShowcaseMode() || isDemoPatientId(patientId)) {
			return applyPeriodontitisModeratePreset(createDefaultPerioTeeth(2));
		}
		return createDefaultPerioTeeth(2);
	});

	const [selectedToothNumber, setSelectedToothNumber] = useState<number>(initialSelectedTooth ?? 16);
	const [focusedSite, setFocusedSite] = useState<{ toothNumber: number; siteKey: PerioSiteKey } | null>(() =>
		initialSelectedTooth ? { toothNumber: initialSelectedTooth, siteKey: "midBuccal" } : null,
	);
	const [isDiagnosticsExpanded, setIsDiagnosticsExpanded] = useState<boolean>(false);
	const [isHygieneExpanded, setIsHygieneExpanded] = useState<boolean>(() =>
		typeof window !== "undefined" && (new URLSearchParams(window.location.search).has("hygiene") || window.location.hash.toLowerCase().includes("hygiene")),
	);
	const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);
	const [isTier3ProbingExpanded, setIsTier3ProbingExpanded] = useState<boolean>(initialTier3Expanded);
	const [isProbeKeyboardEnabled, setIsProbeKeyboardEnabled] = useState<boolean>(initialProbeKeyboardEnabled);
	const [archFilter, setArchFilter] = useState<"all" | "upper" | "lower" | "S1" | "S2" | "S3" | "S4" | "S5" | "S6">("all");
	const containerRef = useRef<HTMLDivElement>(null);

	const summary = useMemo(() => calculatePerioIndices(teeth), [teeth]);
	const psrSextants = useMemo(() => calculatePsrSextants(teeth), [teeth]);
	const psrSummaryText = useMemo(() => formatPsrSextantsSummary(psrSextants), [psrSextants]);
	const olearyPcr = useMemo(() => calculateOlearyFromPerioTeeth(teeth), [teeth]);
	const aapDiagnosis = useMemo(() => calculateAapEfpStagingAndGrading(teeth, summary), [teeth, summary]);
	const probingSequence = useMemo<ProbingStep[]>(() => generateFullMouthProbingSequence(teeth), [teeth]);
	const toothMap = useMemo(() => new Map(teeth.map((t) => [t.toothNumber, t])), [teeth]);
	const selectedTooth = useMemo(() => toothMap.get(selectedToothNumber) ?? null, [toothMap, selectedToothNumber]);

	const { dynamics, historicalSnapshots, refetchSnapshots } = usePerioDynamics({ patientId, summary, previousSummary, previousRecordedAt });

	useEffect(() => {
		if (onChange) onChange(teeth, summary);
		if (onSave) onSave(teeth, summary);
	}, [teeth, summary, onChange, onSave]);

	const updateToothSite = useCallback((num: number, key: PerioSiteKey, updater: (p: PerioToothRecord[PerioSiteKey]) => Partial<PerioToothRecord[PerioSiteKey]>) => {
		if (readOnly) return;
		setTeeth((prev) => prev.map((t) => {
			if (t.toothNumber !== num) return t;
			const s = t[key] ?? { probingDepthMm: 2, gingivalMarginMm: 0, bleedingOnProbing: false, suppuration: false, plaque: false, calculus: false };
			const merged = { ...s, ...updater(s) };
			return { ...t, [key]: { ...merged, calMm: calculateClinicalAttachmentLevel(merged.probingDepthMm ?? 0, merged.gingivalMarginMm ?? 0) } };
		}));
	}, [readOnly]);

	const updateToothProperties = useCallback((num: number, patch: Partial<Pick<PerioToothRecord, "isMissing" | "isImplant" | "mobility" | "furcation">>) => {
		if (readOnly) return;
		setTeeth((prev) => prev.map((t) => t.toothNumber === num ? { ...t, ...patch } : t));
	}, [readOnly]);

	const keypad = usePerioKeypadActions({ readOnly, focusedSite, selectedToothNumber, probingSequence, toothMap, setFocusedSite, setSelectedToothNumber, updateToothSite, updateToothProperties });
	const presets = usePerioPresetActions({ readOnly, teeth, selectedToothNumber, setTeeth, onInsertToProtocol });
	const handleKeyDown = usePerioKeyboardProbing({
		readOnly, isProbeKeyboardEnabled, focusedSite, probingSequence, toothMap, updateToothSite, updateToothProperties,
		moveToNextSite: keypad.moveToNextSite, moveToPreviousSite: keypad.moveToPreviousSite, setFocusedSite, setSelectedToothNumber, onSetAllIntact: presets.handleSetAllIntact,
	});
	const { draftSnapshotId, syncStatus, lastSavedAt, handleSaveDraft } = usePerioDraftPersistence({
		patientId, visitId, initialTeeth, readOnly, teeth, setTeeth, setSelectedToothNumber, setFocusedSite, generateProtocolText: () => protocol.generateProtocolText(), refetchSnapshots,
	});
	const protocol = usePerioProtocolActions({ teeth, summary, doctorName, dynamics, onInsertToProtocol, handleSaveDraft });

	return {
		teeth, setTeeth, selectedToothNumber, setSelectedToothNumber, focusedSite, setFocusedSite,
		isDiagnosticsExpanded, setIsDiagnosticsExpanded, isHygieneExpanded, setIsHygieneExpanded,
		isHelpOpen, setIsHelpOpen, isTier3ProbingExpanded, setIsTier3ProbingExpanded,
		isProbeKeyboardEnabled, setIsProbeKeyboardEnabled, archFilter, setArchFilter, containerRef,
		summary, psrSextants, psrSummaryText, olearyPcr, aapDiagnosis, probingSequence, toothMap, selectedTooth,
		updateToothSite, updateToothProperties, handleKeyDown, dynamics, historicalSnapshots, refetchSnapshots,
		draftSnapshotId, syncStatus, lastSavedAt, handleSaveDraft,
		...keypad, ...presets, ...protocol,
	};
}
