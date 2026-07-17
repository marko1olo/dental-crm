import {
	Baby,
	BrainCircuit,
	Scissors,
	Stethoscope,
	Wrench,
} from "lucide-react";
import React from "react";
import type { ThemeColor } from "../useOnboardingLogic";

export const THEME_COLORS: Record<ThemeColor, string> = {
	teal: "hsl(175, 80%, 40%)",
	blue: "hsl(210, 80%, 50%)",
	purple: "hsl(262, 80%, 65%)",
	rose: "hsl(340, 80%, 60%)",
};

export const SPECIALIZATIONS = [
	{
		id: "therapy",
		label: "Терапия",
		icon: <Stethoscope size={24} />,
		desc: "Лечение кариеса, пульпита",
	},
	{
		id: "orthopedics",
		label: "Ортопедия",
		icon: <Wrench size={24} />,
		desc: "Протезирование, коронки",
	},
	{
		id: "surgery",
		label: "Хирургия",
		icon: <Scissors size={24} />,
		desc: "Удаление, имплантация",
	},
	{
		id: "orthodontics",
		label: "Ортодонтия",
		icon: <BrainCircuit size={24} />,
		desc: "Брекеты, элайнеры",
	},
	{
		id: "pediatrics",
		label: "Педиатрия",
		icon: <Baby size={24} />,
		desc: "Детский прием",
	},
];

export function GlassCard({
	children,
	selected,
	onClick,
	accentColor,
	isDark,
}: any) {
	return (
		<div
			onClick={onClick}
			style={{
				padding: "20px",
				borderRadius: "16px",
				cursor: "pointer",
				background: selected
					? `var(--card-selected-bg, rgba(255,255,255,0.1))`
					: isDark
						? "rgba(255,255,255,0.03)"
						: "rgba(0,0,0,0.02)",
				border: `2px solid ${selected ? accentColor : isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
				transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
				transform: selected ? "translateY(-4px)" : "translateY(0)",
				boxShadow: selected ? `0 8px 24px -8px ${accentColor}` : "none",
				display: "flex",
				flexDirection: "column",
				gap: "12px",
				height: "100%",
			}}
		>
			{children}
		</div>
	);
}

export function SliderControl({
	label,
	value,
	min,
	max,
	onChange,
	isDark,
	accentColor,
}: any) {
	return (
		<div style={{ marginBottom: 24 }}>
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					marginBottom: 12,
				}}
			>
				<span style={{ fontWeight: 600, fontSize: 15 }}>{label}</span>
				<span style={{ fontWeight: 700, fontSize: 16, color: accentColor }}>
					{value}
				</span>
			</div>
			<input
				type="range"
				min={min}
				max={max}
				value={value}
				onChange={(e) => onChange(parseInt(e.target.value))}
				style={{ width: "100%", accentColor, cursor: "pointer" }}
			/>
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					marginTop: 8,
					fontSize: 12,
					color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)",
				}}
			>
				<span>{min}</span>
				<span>{max}</span>
			</div>
		</div>
	);
}
