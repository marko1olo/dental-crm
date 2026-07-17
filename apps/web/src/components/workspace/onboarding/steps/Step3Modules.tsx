import React from "react";
import { BriefcaseMedical, Layers, Settings2, Wrench, Check, Blocks, Baby } from "lucide-react";

export function Step3Modules({ modules, toggleModule, accentColor, isDark }: any) {
	const MODULE_GROUPS = [
		{
			title: "Клинические модули",
			options: [
				{ k: "lab", label: "Лаборатория", icon: <Wrench size={20} /> },
				{ k: "pediatric", label: "Детский прием", icon: <Baby size={20} /> },
			]
		},
		{
			title: "Финансы и бизнес",
			options: [
				{ k: "dms", label: "ДМС Страхование", icon: <BriefcaseMedical size={20} /> },
				{ k: "installments", label: "Рассрочки", icon: <Layers size={20} /> },
				{ k: "egisz", label: "Интеграция с ЕГИСЗ", icon: <Settings2 size={20} /> },
			]
		},
		{
			title: "AI Автоматизация",
			options: [
				{ k: "aiTreatmentPlan", label: "AI: Генерация планов лечения", icon: <Blocks size={20} /> },
				{ k: "aiRecommendations", label: "AI: Персонализация рекомендаций", icon: <Blocks size={20} /> },
				{ k: "aiDocuments", label: "AI: Подбор ИДС и документов", icon: <Blocks size={20} /> },
			]
		}
	];

	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
			{MODULE_GROUPS.map((group) => (
				<div key={group.title} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
					<h3 style={{ fontSize: 14, fontWeight: 600, opacity: 0.6, margin: "0 0 4px 8px", textTransform: "uppercase", letterSpacing: 1 }}>{group.title}</h3>
					<div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
						{group.options.map((m) => {
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
										transition: "border 0.2s, background 0.2s"
									}}
								>
									<div style={{ display: "flex", alignItems: "center", gap: 16 }}>
										<div style={{ color: isSelected ? accentColor : (isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)") }}>
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
											border: `2px solid ${isSelected ? accentColor : (isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)")}`,
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
											transition: "all 0.2s"
										}}
									>
										{isSelected && <Check size={14} color="#fff" />}
									</div>
								</div>
							);
						})}
					</div>
				</div>
			))}
		</div>
	);
}
