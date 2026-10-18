import type React from "react";
import { useEffect, useState } from "react";
import { TOOTH46_PRESETS } from "./Tooth46ClinicalPresets";
import { Tooth46Container } from "./Tooth46Container";
import { Tooth46StandHeader } from "./Tooth46StandHeader";
import { Tooth46StandToggles } from "./Tooth46StandToggles";
import {
	type CrownMaterial,
	DEFAULT_TOOTH46_LAYERS,
	type Tooth46ClinicalPreset,
	type Tooth46LayerFlags,
} from "./tooth46Types";

export const Tooth46InspectionStand: React.FC = () => {
	const [isDark, setIsDark] = useState<boolean>(() => {
		if (typeof document !== "undefined") {
			return document.documentElement.getAttribute("data-theme") === "dark";
		}
		return false;
	});
	const [zoom, setZoom] = useState<number>(2);
	const [activePreset, setActivePreset] =
		useState<Tooth46ClinicalPreset | null>("intact");
	const [layers, setLayers] = useState<Tooth46LayerFlags>(
		DEFAULT_TOOTH46_LAYERS,
	);

	useEffect(() => {
		document.documentElement.setAttribute(
			"data-theme",
			isDark ? "dark" : "light",
		);
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
		setLayers((prev) => ({
			...prev,
			[k]: prev[k] === "defective" ? "adequate" : "defective",
		}));
	};

	const bg = isDark ? "bg-slate-950 text-slate-100" : "bg-white text-slate-900";
	const card = isDark
		? "bg-slate-900/90 border-slate-800"
		: "bg-slate-50 border-slate-200";

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
			/>

			<Tooth46StandToggles
				layers={layers}
				activePreset={activePreset}
				onSelectPreset={handleSelectPreset}
				onToggle={toggleLayer}
				onChangeCrownMaterial={handleChangeCrownMaterial}
				onToggleCondition={handleToggleCondition}
			/>

			<main
				className={`flex-1 w-full max-w-5xl rounded-2xl border p-3 sm:p-6 flex flex-col items-center justify-center relative overflow-auto ${card}`}
			>
				<div className="stand-hud absolute top-2 left-3 sm:top-3 sm:left-4 text-[10px] sm:text-xs font-mono opacity-60 space-y-0.5 pointer-events-none">
					<div>
						Масштаб: {zoom}x ({100 * zoom}×{160 * zoom}px)
					</div>
					<div>
						Статус:{" "}
						{activePreset
							? TOOTH46_PRESETS.find((p) => p.id === activePreset)?.nameRu
							: "Пользовательский"}
					</div>
					<div>
						WCAG: {isDark ? "4.52:1 (AAA)" : "3.33:1 (AA)"} · 5 Бугров: MB, DB,
						D, ML, DL
					</div>
				</div>
				<div className="p-2 sm:p-8 transition-transform duration-200">
					<Tooth46Container isDark={isDark} zoom={zoom} layers={layers} />
				</div>
			</main>
		</div>
	);
};
