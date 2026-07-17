import React from "react";
import { BriefcaseMedical, Layers, Settings2, Wrench, Check } from "lucide-react";

export function Step3Modules({ modules, toggleModule, accentColor, isDark }: any) {
	const MODULE_OPTIONS = [
		{ k: "lab", label: "Лаборатория", icon: <Wrench size={20} /> },
		{
			k: "dms",
			label: "ДМС Страхование",
			icon: <BriefcaseMedical size={20} />,
		},
		{
			k: "installments",
			label: "Рассрочки",
			icon: <Layers size={20} />,
		},
		{
			k: "egisz",
			label: "Интеграция с ЕГИСЗ",
			icon: <Settings2 size={20} />,
		},
	];

	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
			{MODULE_OPTIONS.map((m) => {
				const isSelected = modules[m.k as keyof typeof modules];
				return (
					<div
						key={m.k}
						onClick={() => toggleModule(m.k)}
						style={{
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between",
							padding: 20,
							borderRadius: 16,
							background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)",
							cursor: "pointer",
							border: `2px solid ${isSelected ? accentColor : "transparent"}`,
						}}
					>
						<div style={{ display: "flex", alignItems: "center", gap: 16 }}>
							<div style={{ color: isSelected ? accentColor : "gray" }}>
								{m.icon}
							</div>
							<span style={{ fontWeight: 600 }}>{m.label}</span>
						</div>
						<div
							style={{
								width: 24,
								height: 24,
								borderRadius: "50%",
								background: isSelected ? accentColor : "transparent",
								border: `2px solid ${isSelected ? accentColor : "gray"}`,
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
							}}
						>
							{isSelected && <Check size={14} color="#fff" />}
						</div>
					</div>
				);
			})}
		</div>
	);
}
