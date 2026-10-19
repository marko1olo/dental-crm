import { useEffect, useState } from "react";
import { TOOTH16_CLINICAL_PRESETS } from "./Tooth16ClinicalPresets";
import { DEFAULT_TOOTH16_LAYERS } from "./tooth16LayerConstants";
import type {
	Tooth16CrownMaterial,
	Tooth16LayerFlags,
	Tooth16Number,
	Tooth16RestorationCondition,
} from "./tooth16Types";

/**
 * DENTE Dental CRM — State management hook for Tooth 16/26 Inspection Stand
 * Mandate 8b <= 120 lines.
 */
export function useTooth16StandState() {
	const [toothNumber, setToothNumber] = useState<Tooth16Number>(() => {
		if (typeof window === "undefined") return 16;
		const p = new URLSearchParams(window.location.search).get("tooth");
		return p === "26" || window.location.hash.includes("26") ? 26 : 16;
	});
	const [zoom, setZoom] = useState<number>(2);
	const [isDark, setIsDark] = useState<boolean>(
		() =>
			typeof document !== "undefined" &&
			(document.documentElement.getAttribute("data-theme") === "dark" ||
				document.documentElement.classList.contains("dark")),
	);
	const [activePreset, setActivePreset] = useState<string>("intact");
	const [layers, setLayers] = useState<Tooth16LayerFlags>(
		DEFAULT_TOOTH16_LAYERS,
	);

	useEffect(() => {
		document.documentElement.setAttribute(
			"data-theme",
			isDark ? "dark" : "light",
		);
		document.documentElement.classList.toggle("dark", isDark);
	}, [isDark]);

	const handleToothChange = (num: Tooth16Number) => {
		setToothNumber(num);
		if (typeof window !== "undefined") {
			const url = new URL(window.location.href);
			url.searchParams.set("tooth", String(num));
			window.history.replaceState({}, "", url.toString());
		}
	};

	const applyPreset = (presetId: string) => {
		const found = TOOTH16_CLINICAL_PRESETS.find((p) => p.id === presetId);
		if (!found) return;
		setActivePreset(presetId);
		setLayers({ ...DEFAULT_TOOTH16_LAYERS, ...found.layers });
	};

	const toggleLayer = (k: keyof Tooth16LayerFlags) => {
		setActivePreset("custom");
		setLayers((prev) => ({ ...prev, [k]: !prev[k] }));
	};

	const setCrownMaterial = (crownMaterial: Tooth16CrownMaterial) =>
		setLayers((l) => ({ ...l, crownMaterial, zirconiaCrown: true }));
	const setCrownCondition = (crownCondition: Tooth16RestorationCondition) =>
		setLayers((l) => ({ ...l, crownCondition }));
	const toggleCrown = () =>
		setLayers((l) => ({ ...l, zirconiaCrown: !l.zirconiaCrown }));
	const toggleComposite = () =>
		setLayers((l) => ({
			...l,
			compositeCondition:
				l.compositeCondition === "defective" ? "adequate" : "defective",
		}));

	const activePresetObj = TOOTH16_CLINICAL_PRESETS.find(
		(p) => p.id === activePreset,
	);
	const presetTitle = activePresetObj
		? activePresetObj.title
		: "Пользовательский";

	return {
		toothNumber,
		handleToothChange,
		zoom,
		setZoom,
		isDark,
		setIsDark,
		activePreset,
		applyPreset,
		layers,
		toggleLayer,
		setCrownMaterial,
		setCrownCondition,
		toggleCrown,
		toggleComposite,
		presetTitle,
	};
}
