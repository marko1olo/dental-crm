import { useCallback, useEffect, useState } from "react";
import { DEFAULT_INCISOR_STAND_LAYERS, INCISOR_CLINICAL_PRESETS } from "./incisorStandPresets";
import type { IncisorPresetId, IncisorStandLayers, IncisorToothNumber } from "./incisorStandTypes";

const VALID_TEETH: readonly IncisorToothNumber[] = [11, 21, 12, 22, 31, 41, 32, 42];

function getInitialTooth(): IncisorToothNumber {
	if (typeof window === "undefined") return 11;
	const param = new URLSearchParams(window.location.search).get("tooth");
	const parsed = Number(param) as IncisorToothNumber;
	return VALID_TEETH.includes(parsed) ? parsed : 11;
}

export function useToothIncisorStandState() {
	const [toothNumber, setToothNumber] = useState<IncisorToothNumber>(getInitialTooth);
	const [zoom, setZoom] = useState<number>(1);
	const [isDark, setIsDark] = useState<boolean>(() => {
		if (typeof window === "undefined") return false;
		return (
			document.documentElement.getAttribute("data-theme") === "dark" ||
			document.documentElement.classList.contains("dark") ||
			localStorage.getItem("dente_theme") === "dark"
		);
	});
	const [activePreset, setActivePreset] = useState<IncisorPresetId>("intact");
	const [layers, setLayers] = useState<IncisorStandLayers>(() => ({
		...DEFAULT_INCISOR_STAND_LAYERS,
	}));

	useEffect(() => {
		if (typeof document === "undefined") return;
		document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
		if (isDark) {
			document.documentElement.classList.add("dark");
		} else {
			document.documentElement.classList.remove("dark");
		}
	}, [isDark]);

	const applyPreset = useCallback((id: IncisorPresetId) => {
		const target = INCISOR_CLINICAL_PRESETS.find((p) => p.id === id);
		if (target) {
			setActivePreset(id);
			setLayers({ ...target.layers });
		}
	}, []);

	const toggleLayer = useCallback((k: keyof IncisorStandLayers) => {
		setLayers((prev) => {
			const current = prev[k];
			if (typeof current === "boolean") {
				return { ...prev, [k]: !current };
			}
			return { ...prev, [k]: current ? undefined : true };
		});
	}, []);

	const activePresetTitle =
		INCISOR_CLINICAL_PRESETS.find((p) => p.id === activePreset)?.title ?? "Настраиваемый";

	return {
		toothNumber,
		setToothNumber,
		zoom,
		setZoom,
		isDark,
		setIsDark,
		activePreset,
		activePresetTitle,
		layers,
		applyPreset,
		toggleLayer,
	};
}
