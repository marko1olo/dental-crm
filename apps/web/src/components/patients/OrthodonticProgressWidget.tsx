import React from "react";
import { motion } from "framer-motion";
import { Smile } from "lucide-react";

export function OrthodonticProgressWidget({ patientId }: { patientId: string }) {
	// Mocked data for the widget
	const totalAligners = 40;
	const currentAligner = 12;
	const weeksRemaining = totalAligners - currentAligner;
	const progressPercent = Math.round((currentAligner / totalAligners) * 100);

	// To keep UI clean, we only show this if active orthodontics exist.
	// For the MVP demonstration, we always show it if patientId exists.
	if (!patientId) return null;

	return (
		<motion.div
			className="ortho-progress-widget"
			initial={{ opacity: 0, y: 10 }}
			animate={{ opacity: 1, y: 0 }}
			style={{
				background: "var(--slate-800)",
				borderRadius: "12px",
				padding: "16px",
				border: "1px solid var(--slate-700)",
				marginTop: "16px",
			}}
		>
			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
				<div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--slate-100)" }}>
					<Smile size={18} className="text-violet-400" style={{ color: "#a78bfa" }} />
					<h3 style={{ fontSize: "14px", fontWeight: 600, margin: 0 }}>Ортодонтия: Элайнеры</h3>
				</div>
				<span style={{ fontSize: "12px", color: "var(--slate-400)", fontWeight: 500 }}>
					Осталось {weeksRemaining} нед.
				</span>
			</div>
			
			<div style={{ marginBottom: "8px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
				<span style={{ fontSize: "24px", fontWeight: 700, color: "white", lineHeight: 1 }}>
					Каппа {currentAligner} <span style={{ fontSize: "14px", fontWeight: 500, color: "var(--slate-400)" }}>из {totalAligners}</span>
				</span>
				<span style={{ fontSize: "13px", fontWeight: 600, color: "#a78bfa" }}>
					{progressPercent}%
				</span>
			</div>

			<div style={{ height: "6px", background: "var(--slate-900)", borderRadius: "4px", overflow: "hidden" }}>
				<div 
					style={{ 
						height: "100%", 
						width: `${progressPercent}%`, 
						background: "linear-gradient(90deg, #8b5cf6, #c084fc)",
						borderRadius: "4px",
						transition: "width 0.5s ease-out"
					}} 
				/>
			</div>

			<div style={{ display: "flex", justifyContent: "space-between", marginTop: "12px", fontSize: "12px" }}>
				<span style={{ color: "var(--slate-400)" }}>Начало: 12.01.2026</span>
				<button type="button" style={{ background: "none", border: "none", color: "#a78bfa", fontSize: "12px", fontWeight: 600, cursor: "pointer", padding: 0 }}>
					Обновить этап →
				</button>
			</div>
		</motion.div>
	);
}
