import React from "react";
import { THEME_COLORS } from "../ui/SharedOnboardingUI";
import type { ThemeColor } from "../useOnboardingLogic";

export function Step4Branding({ theme, setTheme, isDark }: any) {
	return (
		<div
			style={{
				background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
				padding: 32,
				borderRadius: 24,
			}}
		>
			<h3 style={{ marginBottom: 24 }}>Выберите акцентный цвет</h3>
			<div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
				{(Object.entries(THEME_COLORS) as [ThemeColor, string][]).map(
					([k, color]) => (
						<div
							key={k}
							onClick={() => setTheme(k as ThemeColor)}
							style={{
								width: 64,
								height: 64,
								borderRadius: 32,
								background: color,
								cursor: "pointer",
								border:
									theme === k ? `4px solid white` : `4px solid transparent`,
								outline: theme === k ? `2px solid ${color}` : "none",
							}}
						/>
					),
				)}
			</div>
		</div>
	);
}
