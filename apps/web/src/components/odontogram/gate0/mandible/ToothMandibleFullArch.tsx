/**
 * DENTE Dental CRM — Complete Mandible Arch Component (16 Teeth 48..41 | 31..38)
 * Anatomical Wheeler alignment, live CRM data bridge & CariesBar (Mandate 8b <= 120 lines).
 */

import React, { useMemo, useState } from "react";
import type { ToothData } from "../../chart/types/toothRendererTypes";
import { Tooth46CariesBar } from "../Tooth46CariesBar";
import type { CariesDepth, CariesType, Tooth46LayerFlags } from "../tooth46Types";
import { MandibleMidlineNotch } from "./MandibleMidlineNotch";
import { MandibleToothCell } from "./MandibleToothCell";
import {
	MANDIBLE_TEETH,
	QUADRANT_3_TEETH,
	QUADRANT_4_TEETH,
	type MandibleToothNumber,
	type ToothMandibleFullArchProps,
} from "./mandibleTypes";
import { cariesToToothDataUpdate, toothDataToGate0Flags } from "./toothDataAdapter";

export const ToothMandibleFullArch: React.FC<ToothMandibleFullArchProps> = ({
	teethData,
	teethDataMap,
	layersMap,
	selectedTooth: controlledSelected,
	onSelectTooth,
	onUpdateToothLayers,
	onUpdateToothData,
	isDark = false,
	zoom = 0.54,
	badgeRadius = 11,
	className = "",
}) => {
	const [internalSelected, setInternalSelected] = useState<number | null>(46);
	const [localOverrides, setLocalOverrides] = useState<Record<number, Tooth46LayerFlags>>({});
	const selectedTooth = controlledSelected !== undefined ? controlledSelected : internalSelected;

	const teethDataLookup = useMemo(() => {
		const map = new Map<number, ToothData>();
		if (teethData) {
			for (const t of teethData) map.set(t.toothNumber, t);
		}
		if (teethDataMap) {
			if (teethDataMap instanceof Map) {
				teethDataMap.forEach((v, k) => map.set(k, v));
			} else {
				for (const [k, v] of Object.entries(teethDataMap)) {
					map.set(Number(k), v as ToothData);
				}
			}
		}
		return map;
	}, [teethData, teethDataMap]);

	const getToothLayers = (num: number): Tooth46LayerFlags => {
		if (localOverrides[num]) return localOverrides[num];
		if (layersMap) {
			const direct = layersMap instanceof Map ? layersMap.get(num) : layersMap[num];
			if (direct) return direct;
		}
		return toothDataToGate0Flags(teethDataLookup.get(num), num);
	};

	const handleSelect = (num: number) => {
		if (controlledSelected === undefined) setInternalSelected(num);
		onSelectTooth?.(num);
	};

	const handleCariesChange = (type?: CariesType, depth?: CariesDepth) => {
		if (!selectedTooth) return;
		const cur = getToothLayers(selectedTooth);
		const updated: Tooth46LayerFlags = {
			...cur,
			...(type ? { cariesType: type } : {}),
			...(depth ? { cariesDepth: depth } : {}),
		};
		setLocalOverrides((prev) => ({ ...prev, [selectedTooth]: updated }));
		onUpdateToothLayers?.(selectedTooth, updated);
		const existing = teethDataLookup.get(selectedTooth);
		const t = updated.cariesType ?? "class1";
		const d = updated.cariesDepth ?? "media";
		onUpdateToothData?.(selectedTooth, cariesToToothDataUpdate(selectedTooth, t, d, existing));
	};

	const selectedLayers = selectedTooth ? getToothLayers(selectedTooth) : null;
	const renderCell = (num: number) => (
		<MandibleToothCell
			key={num}
			toothNumber={num}
			layers={getToothLayers(num)}
			isSelected={selectedTooth === num}
			isDark={isDark}
			zoom={zoom}
			badgeRadius={badgeRadius}
			onClick={handleSelect}
		/>
	);

	return (
		<div
			data-testid="tooth-mandible-full-arch"
			className={`w-full max-w-6xl flex flex-col items-center gap-3 p-2 sm:p-4 rounded-3xl border border-current/10 bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur-xs ${className}`}
		>
			<div className="w-full overflow-x-auto pb-1 scrollbar-none flex justify-center">
				<div className="flex items-center gap-0.5 sm:gap-1.5 shrink-0 px-1">
					{QUADRANT_4_TEETH.map(renderCell)}
					<MandibleMidlineNotch isDark={isDark} />
					{QUADRANT_3_TEETH.map(renderCell)}
				</div>
			</div>

			{selectedTooth && selectedLayers?.caries && (
				<div className="w-full max-w-xl px-2 pt-1 animate-in fade-in slide-in-from-top-1 duration-150">
					<Tooth46CariesBar
						layers={selectedLayers}
						toothNumber={selectedTooth}
						onChangeCariesType={(type) => handleCariesChange(type, undefined)}
						onChangeCariesDepth={(depth) => handleCariesChange(undefined, depth)}
					/>
				</div>
			)}
		</div>
	);
};
