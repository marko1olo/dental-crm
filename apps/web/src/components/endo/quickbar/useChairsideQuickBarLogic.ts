import { useState, useEffect, useMemo, useCallback } from "react";
import { showToast } from "../../GlobalToast";
import { useVisitStore } from "../../../store/visitStore";
import { getToothAnatomicalNameRu } from "../../../lib/clinicalProtocols";
import type { ChairsideEndoQuickBarProps, QuickCanalState } from "./types";
import { getChairsideDefaultCanals } from "./anatomyPresets";
import { executeChairsideTransferToDiary } from "./quickBarTransferExecutor";

export function useChairsideQuickBarLogic({
	activeTooth: propActiveTooth,
	toothState,
	patientId,
	onInsertToDiary,
}: ChairsideEndoQuickBarProps) {
	const storeActiveTooth = useVisitStore((s) => s.activeToothNumber);
	const effectiveTooth = propActiveTooth || storeActiveTooth || 16;
	const [activeTooth, setActiveTooth] = useState<number>(effectiveTooth);

	useEffect(() => {
		if (propActiveTooth && propActiveTooth > 0) setActiveTooth(propActiveTooth);
		else if (storeActiveTooth && storeActiveTooth > 0) setActiveTooth(storeActiveTooth);
	}, [propActiveTooth, storeActiveTooth]);

	const [canals, setCanals] = useState<QuickCanalState[]>(() =>
		getChairsideDefaultCanals(effectiveTooth),
	);

	useEffect(() => {
		setCanals(getChairsideDefaultCanals(activeTooth));
	}, [activeTooth]);

	const toothAnatomicalName = useMemo(() => getToothAnatomicalNameRu(activeTooth), [activeTooth]);

	const handleUpdateCanal = useCallback((id: string, updates: Partial<QuickCanalState>) => {
		setCanals((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
	}, []);

	const handleAdjustLength = useCallback((id: string, delta: number) => {
		setCanals((prev) =>
			prev.map((c) => {
				if (c.id !== id) return c;
				const next = Math.max(0, Math.min(40, Math.round((c.workingLengthMm + delta) * 2) / 2));
				return { ...c, workingLengthMm: next, isObliterated: false };
			}),
		);
	}, []);

	const handleToggleObliterated = useCallback((id: string) => {
		setCanals((prev) =>
			prev.map((c) => {
				if (c.id !== id) return c;
				const nextObliterated = !c.isObliterated;
				return { ...c, isObliterated: nextObliterated, workingLengthMm: nextObliterated ? 0 : (c.workingLengthMm || 21.0) };
			}),
		);
	}, []);

	const handleAddCanal = useCallback(() => {
		const existingNames = new Set(canals.map((c) => c.name.toUpperCase()));
		let newName = "Канал";
		if (!existingNames.has("MB2") && canals.some((c) => c.name.toUpperCase().includes("MB"))) newName = "MB2";
		else if (!existingNames.has("ML") && canals.some((c) => c.name.toUpperCase() === "M")) newName = "ML";
		else newName = `K${canals.length + 1}`;
		setCanals((prev) => [...prev, { id: `c-added-${Date.now()}`, name: newName, workingLengthMm: 20.5, masterApicalFile: "#25", taper: ".04", obturationType: "gutta_sealer", sealer: "AH Plus" }]);
	}, [canals]);

	const handleRemoveCanal = useCallback((id: string) => {
		setCanals((prev) => (prev.length > 1 ? prev.filter((c) => c.id !== id) : prev));
	}, []);

	const handleApplyPulpitis1VisitPreset = useCallback(() => {
		setCanals((prev) => prev.map((c) => ({ ...c, workingLengthMm: 21.5, masterApicalFile: "#25", taper: ".04", obturationType: "gutta_sealer" as const, sealer: "AH Plus", isObliterated: false })));
		showToast("Применён экспресс-пресет: Пульпит в 1 визит (21.5 мм · 25/.04 · AH Plus)", "success");
	}, []);

	const handleApplyPeriodontitisBioceramicPreset = useCallback(() => {
		setCanals((prev) => prev.map((c) => ({ ...c, workingLengthMm: 21.0, masterApicalFile: "#30", taper: ".04", obturationType: "bioceramic" as const, sealer: "Биокерамика (BioRoot)", isObliterated: false, isRetreatment: false })));
		showToast("Применён экспресс-пресет: Периодонтит / Биокерамика (21 мм · 30/.04 · BioRoot)", "success");
	}, []);

	const handleApplyCaOh2Preset = useCallback(() => {
		setCanals((prev) => prev.map((c) => ({ ...c, obturationType: "temp_caoh2" as const, sealer: "Каласепт (Ca(OH)2)", isRetreatment: false })));
		showToast("Применён экспресс-пресет: Временная повязка Ca(OH)2 (Каласепт) на 10-14 дней", "info");
	}, []);

	const handleApplyRetreatmentPreset = useCallback(() => {
		setCanals((prev) => prev.map((c) => ({ ...c, masterApicalFile: "#25", taper: ".06", obturationType: "temp_caoh2" as const, sealer: "Каласепт (Ca(OH)2)", isObliterated: false, isRetreatment: true })));
		showToast("Применён экспресс-пресет: Распломбировка ранее леченых каналов (резорцин/цемент) + Каласепт", "info");
	}, []);

	const handleApplyAnatomicalNorm = useCallback(() => {
		setCanals(getChairsideDefaultCanals(activeTooth));
		showToast(`Каналы зуба #${activeTooth} сброшены к анатомической норме`, "info");
	}, [activeTooth]);

	const handleTransferToDiary = useCallback(() => {
		executeChairsideTransferToDiary({ activeTooth, toothAnatomicalName, toothState, canals, patientId, onInsertToDiary });
	}, [activeTooth, toothAnatomicalName, toothState, canals, patientId, onInsertToDiary]);

	return { activeTooth, toothAnatomicalName, canals, handleUpdateCanal, handleAdjustLength, handleToggleObliterated, handleAddCanal, handleRemoveCanal, handleApplyPulpitis1VisitPreset, handleApplyPeriodontitisBioceramicPreset, handleApplyCaOh2Preset, handleApplyRetreatmentPreset, handleApplyAnatomicalNorm, handleTransferToDiary };
}
