/**
 * DENTE Dental CRM — Tooth 46 Inspection Stand & Mandible Arch Coordinator
 * Mandate 8b <= 120 lines.
 */

import React, { useEffect, useState } from "react";
import { Tooth46FullArchMockup } from "./archMockup/Tooth46FullArchMockup";
import type { BadgeSizeOption } from "./archMockup/archMockupTypes";
import { ToothMandibleFullArch } from "./mandible/ToothMandibleFullArch";
import { TOOTH46_PRESETS } from "./Tooth46ClinicalPresets";
import { Tooth46SingleView } from "./Tooth46SingleView";
import { Tooth46StandHeader } from "./Tooth46StandHeader";
import {
	type CariesDepth,
	type CariesType,
	type CrownMaterial,
	DEFAULT_TOOTH46_LAYERS,
	type Tooth46ClinicalPreset,
	type Tooth46LayerFlags,
} from "./tooth46Types";

export const Tooth46InspectionStand: React.FC = () => {
	const [isDark, setIsDark] = useState<boolean>(() => {
		if (typeof document !== "undefined") {
			return (
				document.documentElement.getAttribute("data-theme") === "dark" ||
				document.documentElement.classList.contains("dark")
			);
		}
		return false;
	});
	const [zoom, setZoom] = useState<number>(2);
	const [activePreset, setActivePreset] = useState<Tooth46ClinicalPreset | null>("intact");
	const [layers, setLayers] = useState<Tooth46LayerFlags>(DEFAULT_TOOTH46_LAYERS);
	const [standMode, setStandMode] = useState<"single" | "arch32" | "mandible">(() => {
		if (typeof window !== "undefined") {
			const s = window.location.search + window.location.hash;
			if (s.includes("mandible")) return "mandible";
			if (s.includes("odontogram-32")) return "arch32";
		}
		return "single";
	});
	const initialBadgeSize = (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("size") as BadgeSizeOption) || "l";

	useEffect(() => {
		document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
		document.documentElement.classList.toggle("dark", isDark);
		document.documentElement.classList.toggle("light", !isDark);
	}, [isDark]);

	const handleSelectPreset = (presetId: Tooth46ClinicalPreset) => {
		setActivePreset(presetId);
		const found = TOOTH46_PRESETS.find((p) => p.id === presetId);
		if (found) setLayers(found.layers);
	};

	const toggleLayer = (key: keyof Tooth46LayerFlags) => {
		setActivePreset(null);
		setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
	};

	const handleChangeCrownMaterial = (mat: CrownMaterial) =>
		setLayers((prev) => ({ ...prev, crownMaterial: mat }));

	const handleToggleCondition = (type: "composite" | "crown") => {
		const k = type === "composite" ? "compositeCondition" : "crownCondition";
		setLayers((prev) => ({ ...prev, [k]: prev[k] === "defective" ? "adequate" : "defective" }));
	};

	const handleChangeCariesType = (type: CariesType) => {
		setActivePreset(null);
		setLayers((prev) => ({ ...prev, caries: true, cariesType: type }));
	};

	const handleChangeCariesDepth = (depth: CariesDepth) => {
		setActivePreset(null);
		setLayers((prev) => ({ ...prev, caries: true, cariesDepth: depth }));
	};

	const bg = "bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)]";

	return (
		<div
			data-testid="tooth-46-gate0-stand"
			className={`min-h-screen w-full p-2.5 sm:p-4 flex flex-col items-center select-none ${bg}`}
		>
			<Tooth46StandHeader
				zoom={zoom}
				isDark={isDark}
				onZoomChange={setZoom}
				onToggleTheme={() => setIsDark((d) => !d)}
				standMode={standMode}
				onSelectStandMode={setStandMode}
			/>

			{standMode === "mandible" ? (
				<div className="w-full flex justify-center py-4">
					<ToothMandibleFullArch isDark={isDark} zoom={0.52} />
				</div>
			) : standMode === "arch32" ? (
				<Tooth46FullArchMockup isDark={isDark} initialSize={initialBadgeSize} />
			) : (
				<Tooth46SingleView
					isDark={isDark}
					zoom={zoom}
					layers={layers}
					activePreset={activePreset}
					onSelectPreset={handleSelectPreset}
					onToggleLayer={toggleLayer}
					onChangeCrownMaterial={handleChangeCrownMaterial}
					onToggleCondition={handleToggleCondition}
					onChangeCariesType={handleChangeCariesType}
					onChangeCariesDepth={handleChangeCariesDepth}
				/>
			)}
		</div>
	);
};
