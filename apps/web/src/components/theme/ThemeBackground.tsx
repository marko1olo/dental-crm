import { useEffect, useMemo, useState } from "react";
import { useThemeStore } from "../../store/themeStore";
import { DENTE_THEMES } from "./themeData";
import {
	useHardwareTier,
	usePerfState,
	useIsCtActive,
	isLowSpecDevice,
} from "../../lib/hardwareCapabilities";

/**
 * ThemeBackground — renders rich volumetric atmospheric ambient lighting behind the application shell.
 * Uses hardware-accelerated CSS properties and disables itself on low-spec hardware, potato/low tiers,
 * degraded performance state, active CT 3D rendering, or reduced motion.
 * Mandate 8b: strictly <= 800 lines.
 */
export function ThemeBackground() {
	const themeMode = useThemeStore((state) => state.themeMode);
	const tier = useHardwareTier();
	const perfState = usePerfState();
	const isCtActive = useIsCtActive();
	const [isLowSpec, setIsLowSpec] = useState(() => isLowSpecDevice());

	useEffect(() => {
		if (typeof window === "undefined") return;
		if (isLowSpecDevice()) {
			setIsLowSpec(true);
		}
	}, [tier, perfState, isCtActive]);

	const currentTheme = useMemo(
		() => DENTE_THEMES.find((t) => t.id === themeMode) ?? DENTE_THEMES[0]!,
		[themeMode],
	);

	if (
		isLowSpec ||
		tier === "potato" ||
		tier === "low" ||
		perfState === "degraded" ||
		isCtActive ||
		currentTheme.id === "contrast"
	) {
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
				className="dente-ambient-orb-top"
				style={{
					position: "absolute",
					top: "-15%",
					right: "5%",
					width: "60vw",
					height: "55vh",
					borderRadius: "50%",
					background: currentTheme.atmosphericGlow,
					filter: "blur(90px)",
					opacity: 0.75,
					transition: "background 0.6s ease, opacity 0.6s ease",
					pointerEvents: "none",
				}}
			/>

			{/* Ambient Bottom Subtle Wash */}
			<div
				className="dente-ambient-orb-bottom"
				style={{
					position: "absolute",
					bottom: "-20%",
					left: "5%",
					width: "55vw",
					height: "50vh",
					borderRadius: "50%",
					background: currentTheme.secondaryGlow,
					filter: "blur(110px)",
					opacity: 0.55,
					transition: "background 0.6s ease, opacity 0.6s ease",
					pointerEvents: "none",
				}}
			/>

			{/* Ambient Center Accent Refraction Beam */}
			<div
				className="dente-ambient-orb-accent"
				style={{
					position: "absolute",
					top: "30%",
					left: "35%",
					width: "45vw",
					height: "40vh",
					borderRadius: "50%",
					background: currentTheme.accentGlow,
					filter: "blur(85px)",
					opacity: 0.4,
					transition: "background 0.6s ease, opacity 0.6s ease",
					pointerEvents: "none",
				}}
			/>

			{/* Refractive Ambient Mesh Field */}
			{currentTheme.refractiveMesh !== "none" && (
				<div
					className="dente-refractive-mesh-field"
					style={{
						position: "absolute",
						inset: 0,
						backgroundImage: currentTheme.refractiveMesh,
						opacity: 0.85,
						transition: "opacity 0.6s ease",
						pointerEvents: "none",
					}}
				/>
			)}
		</div>
	);
}
