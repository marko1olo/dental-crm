import { CheckCircle2, Info, Save, ShieldCheck, Sparkles, Wind } from "lucide-react";
import React from "react";
import type { CabinetDisinfectionPreset } from "./types.js";

export interface CabinetReadinessKpiStripProps {
	readonly selectedCabinet: string;
	readonly currentPreset: CabinetDisinfectionPreset;
	readonly isFullyReady: boolean;
	readonly disinfectionCompleted: boolean;
	readonly turbineSterile: boolean;
	readonly contraAngleSterile: boolean;
	readonly bactericidalActive: boolean;
}

export function CabinetReadinessKpiStrip({
	selectedCabinet,
	currentPreset,
	isFullyReady,
	disinfectionCompleted,
	turbineSterile,
	contraAngleSterile,
	bactericidalActive,
}: CabinetReadinessKpiStripProps) {
	const border = isFullyReady ? "1px solid rgba(16, 185, 129, 0.4)" : "1px solid rgba(245, 158, 11, 0.4)";
	const background = isFullyReady ? "rgba(16, 185, 129, 0.08)" : "rgba(245, 158, 11, 0.08)";
	const badgeBg = isFullyReady ? "var(--ok-fg, #059669)" : "var(--warn-fg, #b45309)";

	return (
		<div
			className="cabinet-readiness-kpi-strip"
			style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", padding: "0.5rem 0.85rem", borderRadius: "0.5rem", border, background, flexWrap: "wrap" }}
		>
			<div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap", minWidth: 0 }}>
				<span
					style={{ padding: "0.2rem 0.6rem", borderRadius: "0.375rem", background: badgeBg, color: "#ffffff", fontSize: "0.72rem", fontWeight: 800, letterSpacing: "0.03em", textTransform: "uppercase", display: "inline-flex", alignItems: "center", gap: "0.3rem", flexShrink: 0 }}
				>
					{isFullyReady ? <CheckCircle2 size={13} /> : <Info size={13} />}
					{isFullyReady ? "Готов к приёму" : "Требуется обработка"}
				</span>

				<span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--ink, #1e293b)" }}>
					{selectedCabinet} • {currentPreset.shortLabelRu}
				</span>

				<div style={{ width: "1px", height: "14px", background: "var(--line, rgba(148, 163, 184, 0.3))" }} />

				<div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap", fontSize: "0.78rem" }}>
					<span
						style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", color: disinfectionCompleted ? "var(--ok-fg, #059669)" : "var(--warn-fg, #b45309)", fontWeight: 600 }}
					>
						<Sparkles size={13} />
						{disinfectionCompleted ? "Дезинфекция выполнена" : "Поверхности не обработаны"}
					</span>

					<span style={{ color: "var(--muted, #94a3b8)" }}>•</span>

					<span
						style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", color: turbineSterile && contraAngleSterile ? "var(--ok-fg, #059669)" : "var(--warn-fg, #b45309)", fontWeight: 600 }}
					>
						<ShieldCheck size={13} />
						{turbineSterile && contraAngleSterile ? "Наконечники 5 кл. ОК" : "Требуются наконечники"}
					</span>

					{bactericidalActive && (
						<>
							<span style={{ color: "var(--muted, #94a3b8)" }}>•</span>
							<span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", color: "var(--brand-primary, #2563eb)", fontWeight: 600 }}>
								<Wind size={13} /> Дезар активен
							</span>
						</>
					)}
				</div>
			</div>

			<div style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.75rem", color: "var(--muted, #64748b)", marginLeft: "auto" }}>
				<Save size={13} color="var(--ok-fg, #059669)" />
				<span>Кабинет проверен (автосохранение)</span>
			</div>
		</div>
	);
}
