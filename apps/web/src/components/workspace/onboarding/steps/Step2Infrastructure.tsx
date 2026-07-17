import React from "react";
import { SliderControl } from "../ui/SharedOnboardingUI";

export function Step2Infrastructure({
	chairs,
	setChairs,
	workHours,
	setWorkHours,
	accentColor,
	isDark,
}: any) {
	return (
		<div
			style={{
				background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
				padding: "32px 20px",
				borderRadius: 24,
				border: `1px solid ${isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}`,
			}}
		>
			<SliderControl
				label="Количество кресел (от 1 до 10)"
				min={1}
				max={10}
				value={chairs}
				onChange={setChairs}
				isDark={isDark}
				accentColor={accentColor}
			/>
			<div
				style={{
					marginTop: 40,
					paddingTop: 32,
					borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
				}}
			>
				<h4 style={{ marginBottom: 24, fontSize: 18 }}>
					График работы клиники
				</h4>
				<SliderControl
					label="Открытие"
					min={6}
					max={12}
					value={workHours[0]}
					onChange={(v: number) => setWorkHours([v, workHours[1]])}
					isDark={isDark}
					accentColor={accentColor}
				/>
				<SliderControl
					label="Закрытие"
					min={15}
					max={23}
					value={workHours[1]}
					onChange={(v: number) => setWorkHours([workHours[0], v])}
					isDark={isDark}
					accentColor={accentColor}
				/>
			</div>
		</div>
	);
}
