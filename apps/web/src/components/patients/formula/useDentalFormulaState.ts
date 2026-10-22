/**
 * apps/web/src/components/patients/formula/useDentalFormulaState.ts
 *
 * Хук состояния интерактивной одонтограммы (Мандаты 8e, 8b)
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { calculateAge } from "@dental/shared";
import type { ToothData, ToothState } from "../../odontogram/ToothChart";
import { loadStoredTeethData, saveStoredTeethData } from "../../odontogram/odontogramStorage";
import { showToast } from "../../GlobalToast";
import type { DentitionMode, RadialMenuState } from "./formulaTypes";
import { ALL_PERMANENT_TEETH, ALL_DECIDUOUS_TEETH, WISDOM_TEETH } from "./formulaConstants";
import { fetchPatientToothStates, savePatientToothStatesBatch, broadcastToothEvents } from "./formulaSyncService";
import { getInitialDentitionMode, getBaselineTeeth, calculateKpuStats, buildUpdatedTeethData, mergeServerTeeth } from "./formulaUtils";

export function useDentalFormulaState(
	patientId: string,
	patientBirthDate?: string | null | undefined,
	onApplyFindingToDiary?: ((toothNumber: number, state: ToothState, surfaces?: readonly string[]) => void) | undefined,
) {
	const patientAge = useMemo(() => (patientBirthDate ? calculateAge(patientBirthDate) : null), [patientBirthDate]);
	const [dentitionMode, setDentitionMode] = useState<DentitionMode>(() => getInitialDentitionMode(patientAge));
	const baselineTeeth = useMemo(() => getBaselineTeeth(dentitionMode), [dentitionMode]);
	const [teethData, setTeethData] = useState<ToothData[]>(() => {
		if (patientId) {
			const cached = loadStoredTeethData(patientId);
			if (cached && cached.length > 0) return cached;
		}
		return baselineTeeth;
	});
	const teethDataRef = useRef(teethData);
	teethDataRef.current = teethData;

	const [selectedTeeth, setSelectedTeeth] = useState<number[]>([]);
	const [activeStamp, setActiveStamp] = useState<ToothState | null>(null);
	const [lastSavedTime, setLastSavedTime] = useState<string>("");
	const [radialMenuData, setRadialMenuData] = useState<RadialMenuState | null>(null);

	useEffect(() => {
		if (!patientId) return;
		const cached = loadStoredTeethData(patientId);
		if (cached && cached.length > 0) setTeethData(cached);

		const ctrl = new AbortController();
		void fetchPatientToothStates(patientId, ctrl.signal).then((server) => {
			if (!server) return;
			setTeethData((prev) => {
				const merged = mergeServerTeeth(prev, server);
				saveStoredTeethData(patientId, merged, true);
				return merged;
			});
			setLastSavedTime(new Date().toLocaleTimeString("ru-RU"));
		});
		return () => ctrl.abort();
	}, [patientId]);

	const commitToothChanges = useCallback(
		async (targets: number[], nextState: ToothState, nextSurfaces?: readonly string[] | undefined) => {
			const nowIso = new Date().toISOString();
			const updated = buildUpdatedTeethData(teethDataRef.current, targets, nextState, nextSurfaces, nowIso);
			setTeethData(updated);
			saveStoredTeethData(patientId, updated);
			setLastSavedTime(new Date().toLocaleTimeString("ru-RU"));
			broadcastToothEvents(patientId, updated, targets, nextState, nextSurfaces, onApplyFindingToDiary);
			void savePatientToothStatesBatch(patientId, targets, nextState, nextSurfaces, nowIso);
		},
		[patientId, onApplyFindingToDiary],
	);

	const handleSurfacesChange = useCallback((targets: number[], surfaces: readonly string[]) => {
		for (const t of targets) {
			const cur = teethDataRef.current.find((item) => item.toothNumber === t)?.state || "Caries";
			void commitToothChanges([t], cur === "Healthy" ? "Caries" : cur, surfaces);
		}
	}, [commitToothChanges]);

	const handleToothClick = useCallback((arg1: React.MouseEvent | number, arg2?: number | DOMRect, surface?: string) => {
		const num = typeof arg1 === "number" ? arg1 : (typeof arg2 === "number" ? arg2 : 0);
		if (!num) return;
		if (activeStamp) return void commitToothChanges([num], activeStamp, surface ? [surface] : undefined);
		const isMulti = Boolean(typeof arg1 === "object" && arg1 !== null && (arg1.shiftKey || arg1.ctrlKey || arg1.metaKey));
		setSelectedTeeth((p) => (isMulti ? (p.includes(num) ? p.filter((n) => n !== num) : [...p, num]) : [num]));
		if (!isMulti) {
			const r = arg2 && typeof arg2 === "object" && "width" in arg2 ? (arg2 as DOMRect) : null;
			const anchorRect = { x: r?.left ?? r?.x ?? 400, y: r?.top ?? r?.y ?? 300, width: r?.width || 48, height: r?.height || 90 };
			const currentState = teethDataRef.current.find((t) => t.toothNumber === num)?.state ?? "Healthy";
			setRadialMenuData({ toothNumber: num, anchorRect, currentState });
		}
	}, [activeStamp, commitToothChanges]);

	const handleMarkIntact = useCallback(() => {
		const nums = dentitionMode === "pediatric" ? ALL_DECIDUOUS_TEETH : dentitionMode === "mixed" ? [...ALL_PERMANENT_TEETH, ...ALL_DECIDUOUS_TEETH] : ALL_PERMANENT_TEETH;
		void commitToothChanges([...nums], "Healthy", []);
		showToast("Вся зубная формула отмечена как санированная (интактная)", "success", 3000);
	}, [dentitionMode, commitToothChanges]);

	const handleMarkWisdom = useCallback(() => {
		void commitToothChanges([...WISDOM_TEETH], "Missing", []);
		showToast("Зубы мудрости (18, 28, 38, 48) отмечены как отсутствующие", "info", 3000);
	}, [commitToothChanges]);

	const handleSelectStamp = useCallback((state: ToothState) => {
		setActiveStamp((prev) => {
			if (prev === state) return null;
			if (selectedTeeth.length > 0) void commitToothChanges(selectedTeeth, state);
			return state;
		});
	}, [selectedTeeth, commitToothChanges]);

	return {
		patientAge, dentitionMode, setDentitionMode, teethData, teethDataRef, selectedTeeth,
		activeStamp, setActiveStamp, lastSavedTime, radialMenuData, setRadialMenuData,
		kpuStats: useMemo(() => calculateKpuStats(teethData), [teethData]),
		commitToothChanges, handleSurfacesChange, handleToothClick, handleMarkIntact, handleMarkWisdom, handleSelectStamp,
	};
}
