/**
 * DENTE Dental CRM — Complete Mandible Arch Component (16 Teeth 48..41 | 31..38)
 * Anatomical Wheeler alignment, live CRM data bridge & CariesBar (Mandate 8b <= 120 lines).
 */

import type React from "react";
import { useMemo, useState } from "react";
import type { ToothData } from "../../chart/types/toothRendererTypes";
import { DEFAULT_TOOTH46_LAYERS, type Tooth46LayerFlags } from "../tooth46Types";
import { Tooth46CariesBar } from "../Tooth46CariesBar";
import { MandibleMidlineNotch } from "./MandibleMidlineNotch";
import { MandibleQuickActionBar } from "./MandibleQuickActionBar";
import { MandibleToothCell } from "./MandibleToothCell";
import { QUADRANT_3_TEETH, QUADRANT_4_TEETH, type ToothMandibleFullArchProps } from "./mandibleTypes";
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
	zoom = 0.74,
	badgeRadius = 14,
	badgePlacement = "root_apex",
	className = "",
}) => {
	const [internalSelected, setInternalSelected] = useState<number | null>(46);
	const [localOverrides, setLocalOverrides] = useState<Record<number, Tooth46LayerFlags>>({
		46: { ...DEFAULT_TOOTH46_LAYERS, caries: true, cariesType: "class1", cariesDepth: "media" },
	});
	const selectedTooth = controlledSelected !== undefined ? controlledSelected : internalSelected;

	const teethDataLookup = useMemo(() => {
		const map = new Map<number, ToothData>();
		if (teethData) for (const t of teethData) map.set(t.toothNumber, t);
		if (teethDataMap instanceof Map) teethDataMap.forEach((v, k) => map.set(k, v));
		else if (teethDataMap) for (const [k, v] of Object.entries(teethDataMap)) map.set(Number(k), v as ToothData);
		return map;
	}, [teethData, teethDataMap]);

	const getToothLayers = (num: number): Tooth46LayerFlags => {
		if (localOverrides[num]) return localOverrides[num];
		const d = layersMap instanceof Map ? layersMap.get(num) : layersMap?.[num];
		return d ?? toothDataToGate0Flags(teethDataLookup.get(num), num);
	};

	const mutateSelected = (patch: Partial<Tooth46LayerFlags>) => {
		if (!selectedTooth) return;
		const updated = { ...getToothLayers(selectedTooth), ...patch };
		setLocalOverrides((prev) => ({ ...prev, [selectedTooth]: updated }));
		onUpdateToothLayers?.(selectedTooth, updated);
		onUpdateToothData?.(selectedTooth, cariesToToothDataUpdate(selectedTooth, updated.cariesType ?? "class1", updated.cariesDepth ?? "media", teethDataLookup.get(selectedTooth)));
	};

	const handleSelect = (num: number) => {
		if (controlledSelected === undefined) setInternalSelected(num);
		onSelectTooth?.(num);
	};

	const selectedLayers = selectedTooth ? getToothLayers(selectedTooth) : null;
	const renderCell = (num: number) => (
		<MandibleToothCell
			key={num}
			toothNumber={num as any}
			layers={getToothLayers(num)}
			isSelected={selectedTooth === num}
			isDark={isDark}
			zoom={zoom}
			badgeRadius={badgeRadius}
			badgePlacement={badgePlacement}
			onClick={handleSelect}
		/>
	);

	return (
		<div
			data-testid="tooth-mandible-full-arch"
			className={`w-full max-w-[1360px] flex flex-col items-center gap-3 p-2 sm:p-4 rounded-3xl border border-current/10 bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur-xs ${className}`}
		>
			<div className="w-full overflow-x-auto pb-2 scrollbar-none flex justify-center">
				<div className="flex items-start gap-0.5 sm:gap-1 shrink-0 px-2">
					{QUADRANT_4_TEETH.map(renderCell)}
					<MandibleMidlineNotch isDark={isDark} />
					{QUADRANT_3_TEETH.map(renderCell)}
				</div>
			</div>

			{selectedTooth && selectedLayers && (
				<MandibleQuickActionBar
					selectedTooth={selectedTooth}
					layers={selectedLayers}
					onToggleCaries={() => mutateSelected({ caries: !selectedLayers.caries, cariesType: selectedLayers.cariesType || ([1, 2, 3].includes(selectedTooth % 10) ? "class3" : "class1") })}
					onSetHealthy={() => mutateSelected({ caries: false, crown: false, implant: false, missing: false, composite: false })}
					onToggleCrown={() => mutateSelected({ crown: !selectedLayers.crown })}
					onToggleImplant={() => mutateSelected({ implant: !selectedLayers.implant })}
					onToggleMissing={() => mutateSelected({ missing: !selectedLayers.missing })}
				/>
			)}

			{selectedTooth && selectedLayers?.caries && (
				<div className="w-full max-w-2xl px-2 pt-1 animate-in fade-in slide-in-from-top-1 duration-150">
					<Tooth46CariesBar
						layers={selectedLayers}
						toothNumber={selectedTooth}
						onChangeCariesType={(type) => mutateSelected({ cariesType: type })}
						onChangeCariesDepth={(depth) => mutateSelected({ cariesDepth: depth })}
					/>
				</div>
			)}
		</div>
	);
};
