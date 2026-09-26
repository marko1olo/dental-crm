import { useEffect, useMemo, useState } from "react";
import { useThemeStore } from "../../store/themeStore";
import { DENTE_THEMES } from "./themeData";

/**
 * ThemeBackground — renders subtle atmospheric ambient lighting behind the application shell.
 * Uses hardware-accelerated CSS properties and disables itself on low-spec hardware or reduced motion.
 */
export function ThemeBackground() {
	const themeMode = useThemeStore((state) => state.themeMode);
	const [isLowSpec, setIsLowSpec] = useState(false);

	useEffect(() => {
		if (typeof window === "undefined") return;
		const nav = window.navigator as Navigator & { deviceMemory?: number; hardwareConcurrency?: number };
		if ((nav.deviceMemory && nav.deviceMemory <= 4) || (nav.hardwareConcurrency && nav.hardwareConcurrency <= 4)) {
			setIsLowSpec(true);
		}
	}, []);

	const currentTheme = useMemo(
		() => DENTE_THEMES.find((t) => t.id === themeMode) ?? DENTE_THEMES[0]!,
		[themeMode],
	);

	if (isLowSpec || currentTheme.id === "contrast") {
		return null;
	}

	return (
		<div
			className="dente-theme-background-layer"
			aria-hidden="true"
			style={{
				position: "fixed",
				inset: 0,
				pointerEvents: "none",
				zIndex: 0,
				overflow: "hidden",
				transform: "translateZ(0)",
			}}
		>
			{/* Ambient Top Glow Orb */}
			<div
				style={{
					position: "absolute",
					top: "-15%",
					right: "5%",
					width: "60vw",
					height: "50vh",
					borderRadius: "50%",
					background: currentTheme.atmosphericGlow,
					filter: "blur(90px)",
					opacity: 0.65,
					transition: "background 0.5s ease, opacity 0.5s ease",
					pointerEvents: "none",
				}}
			/>

			{/* Ambient Bottom Subtle Wash */}
			<div
				style={{
					position: "absolute",
					bottom: "-20%",
					left: "5%",
					width: "50vw",
					height: "45vh",
					borderRadius: "50%",
					background: currentTheme.atmosphericGlow,
					filter: "blur(110px)",
					opacity: 0.35,
					transition: "background 0.5s ease, opacity 0.5s ease",
					pointerEvents: "none",
				}}
			/>
		</div>
	);
}
