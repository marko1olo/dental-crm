import type React from "react";
import type { EndoCanalData } from "@dental/shared";
import {
	getDefaultCanalsForTooth,
	OBTURATION_TECHNIQUE_OPTIONS,
	REFERENCE_POINT_OPTIONS,
	TAPER_OPTIONS,
	type EndoStageStamp,
} from "../endoCanalConstants";
import { showToast } from "../../GlobalToast";

interface UseEndoCanalActionsProps {
	readonly activeTooth: number;
	readonly stageStamp: EndoStageStamp;
	readonly canals: EndoCanalData[];
	readonly setCanals: React.Dispatch<React.SetStateAction<EndoCanalData[]>>;
}

export function useEndoCanalActions({
	activeTooth,
	stageStamp,
	canals,
	setCanals,
}: UseEndoCanalActionsProps) {
	const handleCanalChange = (id: string, field: keyof EndoCanalData, value: string | number) => {
		setCanals((prev) => prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
	};

	const handleCanalLengthInputChange = (id: string, rawVal: string) => {
		const trimmed = rawVal.trim();
		if (!trimmed) {
			setCanals((prev) => prev.map((c) => (c.id === id ? { ...c, workingLengthMm: "" } : c)));
			return;
		}
		const num = Number.parseFloat(trimmed);
		if (Number.isNaN(num) || !Number.isFinite(num)) return;
		const clamped = Math.max(0, Math.min(40, Math.round(num * 2) / 2));
		setCanals((prev) => prev.map((c) => (c.id === id ? { ...c, workingLengthMm: clamped } : c)));
	};

	const handleAdjustCanalLength = (id: string, delta: number) => {
		setCanals((prev) =>
			prev.map((c) => {
				if (c.id !== id) return c;
				const curr = typeof c.workingLengthMm === "number" && !Number.isNaN(c.workingLengthMm)
					? c.workingLengthMm
					: Number.parseFloat(String(c.workingLengthMm)) || 21.0;
				const next = Math.max(0, Math.min(40, Math.round((curr + delta) * 2) / 2));
				return { ...c, workingLengthMm: next };
			}),
		);
	};

	const handleToggleCanalObliteration = (id: string) => {
		setCanals((prev) =>
			prev.map((c) => {
				if (c.id !== id) return c;
				const nextObliterated = !c.isObliterated;
				return {
					...c,
					isObliterated: nextObliterated,
					workingLengthMm: nextObliterated ? 0 : (c.workingLengthMm || 21.0),
				};
			}),
		);
	};

	const handleSetCanalLength = (id: string, length: number) => {
		const clamped = Math.max(0, Math.min(40, Math.round(length * 2) / 2));
		setCanals((prev) => prev.map((c) => (c.id === id ? { ...c, workingLengthMm: clamped } : c)));
	};

	const handleAddCanal = () => {
		const newId = `canal-custom-${Date.now()}`;
		const defaultAnatomy = getDefaultCanalsForTooth(activeTooth);
		const existingNames = new Set(canals.map((c) => c.canalName.trim().toUpperCase()));
		const missingDefault = defaultAnatomy.find((dc) => !existingNames.has(dc.canalName.trim().toUpperCase()));

		const newCanal: EndoCanalData = {
			id: newId,
			canalName: missingDefault ? missingDefault.canalName : `Канал ${canals.length + 1}`,
			referencePoint: missingDefault ? missingDefault.referencePoint : REFERENCE_POINT_OPTIONS[0],
			workingLengthMm: missingDefault ? missingDefault.workingLengthMm : 21.0,
			masterApicalFile: missingDefault?.masterApicalFile || "ISO 25 (#25 красный)",
			taper: missingDefault?.taper || TAPER_OPTIONS[2],
			obturationTechnique: stageStamp === "TEMP_CAOH2"
				? "Временная обтурация Ca(OH)2 (Metapex / Calcept)"
				: OBTURATION_TECHNIQUE_OPTIONS[0],
		};
		setCanals((prev) => [...prev, newCanal]);
	};

	const handleRemoveCanal = (id: string) => {
		if (canals.length <= 1) {
			showToast("Должен оставаться хотя бы один корневой канал", "warning");
			return;
		}
		setCanals((prev) => prev.filter((c) => c.id !== id));
	};

	const handleResetToDefaults = () => {
		setCanals(getDefaultCanalsForTooth(activeTooth));
		showToast(`Параметры сброшены к стандарту зуба #${activeTooth}`, "info");
	};

	return {
		handleCanalChange,
		handleCanalLengthInputChange,
		handleAdjustCanalLength,
		handleToggleCanalObliteration,
		handleSetCanalLength,
		handleAddCanal,
		handleRemoveCanal,
		handleResetToDefaults,
	};
}
