/**
 * DmsEmergencyCareBanner.tsx — 1-клик баннер экстренной помощи по острой боли (Мандат 8e)
 */

import { Zap } from "lucide-react";
import React from "react";

export interface DmsEmergencyCareBannerProps {
	readonly isEmergencyCare: boolean;
	readonly onActivateEmergency: () => void;
}

export function DmsEmergencyCareBanner({ isEmergencyCare, onActivateEmergency }: DmsEmergencyCareBannerProps) {
	return (
		<div
			style={{
				padding: "12px 16px", borderRadius: "14px",
				background: isEmergencyCare
					? "linear-gradient(135deg, var(--warn-bg, rgba(245, 158, 11, 0.18)), var(--ok-bg, rgba(16, 185, 129, 0.12)))"
					: "var(--warn-bg, rgba(245, 158, 11, 0.08))",
				border: isEmergencyCare ? "2px solid var(--warn-fg, #f59e0b)" : "1px solid var(--line, rgba(245, 158, 11, 0.35))",
				display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap",
				gap: "12px", marginBottom: "14px",
				boxShadow: isEmergencyCare ? "0 4px 16px rgba(245, 158, 11, 0.15)" : "none",
			}}
		>
			<div style={{ flex: 1, minWidth: "260px" }}>
				<div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
					<Zap size={18} className="text-amber-600" />
					<strong style={{ fontSize: "0.875rem", color: "var(--ink, #0f172a)" }}>
						Экстренный приём / Гарантия в пути
					</strong>
					{isEmergencyCare && (
						<span style={{ fontSize: "0.6875rem", fontWeight: 800, padding: "2px 8px", borderRadius: "6px", background: "var(--ok-fg, #10b981)", color: "#ffffff" }}>
							АКТИВНО
						</span>
					)}
				</div>
				<p style={{ margin: 0, fontSize: "0.75rem", color: "var(--muted, #64748b)", lineHeight: 1.4 }}>
					При острой боли лечение разрешено без ожидания письма страховой (анестезия, депульпирование, вскрытие абсцесса).
				</p>
			</div>
			<button
				type="button"
				onClick={onActivateEmergency}
				style={{
					minHeight: "44px", padding: "8px 16px", borderRadius: "10px", border: "none",
					background: isEmergencyCare ? "var(--ok-fg, #10b981)" : "var(--warn-fg, #f59e0b)",
					color: "#ffffff", fontWeight: 700, fontSize: "0.8125rem", cursor: "pointer",
					display: "flex", alignItems: "center", gap: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
				}}
				title="Экстренный приём / Гарантия в пути"
			>
				<Zap size={16} />
				<span>{isEmergencyCare ? "Экстренный приём активен" : "Экстренный приём / Гарантия в пути"}</span>
			</button>
		</div>
	);
}
