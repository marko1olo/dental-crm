import { useState, useEffect, useCallback } from "react";
import type { CephStudioTheme } from "./cephStudioTypes";
import type { XrayFilterMode } from "../CephalometricCanvas";

export function useCephStudioThemeAndDisplay() {
	const [theme, setTheme] = useState<CephStudioTheme>(() => {
		if (typeof document !== "undefined") {
			const current = document.documentElement.getAttribute("data-theme");
			if (current === "light") return "light";
		}
		return "dark";
	});

	const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
	const [showPlanes, setShowPlanes] = useState<boolean>(true);
	const [showPolygon, setShowPolygon] = useState<boolean>(true);
	const [showLabels, setShowLabels] = useState<boolean>(true);
	const [filterMode, setFilterMode] = useState<XrayFilterMode>("normal");
	const [brightness] = useState<number>(100);
	const [contrast] = useState<number>(100);

	useEffect(() => {
		if (typeof document === "undefined") return;
		const updateTheme = () => {
			const current = document.documentElement.getAttribute("data-theme");
			setTheme(current === "light" ? "light" : "dark");
		};
		updateTheme();
		const observer = new MutationObserver(updateTheme);
		observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
		return () => observer.disconnect();
	}, []);

	const toggleTheme = useCallback(() => {
		const next = theme === "dark" ? "light" : "dark";
		setTheme(next);
		if (typeof document !== "undefined") {
			document.documentElement.setAttribute("data-theme", next);
		}
	}, [theme]);

	const toggleFullscreen = useCallback(() => {
		if (!document.fullscreenElement) {
			document.documentElement.requestFullscreen().catch(() => {});
			setIsFullscreen(true);
		} else {
			document.exitFullscreen().catch(() => {});
			setIsFullscreen(false);
		}
	}, []);

	return {
		theme,
		toggleTheme,
		isFullscreen,
		toggleFullscreen,
		showPlanes,
		setShowPlanes,
		showPolygon,
		setShowPolygon,
		showLabels,
		setShowLabels,
		filterMode,
		setFilterMode,
		brightness,
		contrast,
	};
}
