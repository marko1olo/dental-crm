import React from "react";
import { ShieldCheck, Zap } from "lucide-react";
import type { MemoryShieldMetrics } from "../../../../services/storage/chairsideMemoryShield.js";

interface Props {
	metrics: MemoryShieldMetrics;
}

export const CockpitVramBadge: React.FC<Props> = ({ metrics }) => {
	const rvgMb = (metrics.rvgCacheSizeBytes / (1024 * 1024)).toFixed(1);

	return (
		<div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px" }}>
			<ShieldCheck size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
			<span style={{ fontWeight: 600, color: "var(--ink)" }}>
				Экспресс-диагностика оборудования:
			</span>
			<div
				style={{
					display: "inline-flex",
					alignItems: "center",
					gap: "4px",
					padding: "2px 8px",
					borderRadius: "12px",
					background: metrics.isLowSpec ? "rgba(16, 185, 129, 0.12)" : "var(--paper)",
					border: "1px solid var(--line)",
					color: "var(--ink)",
					fontSize: "11px",
					fontWeight: 500,
				}}
				title="Защита от переполнения видеопамяти на длительной смене (4GB RAM)"
				data-testid="cockpit-badge-vram-shield"
			>
				<Zap size={12} className="text-amber-500 shrink-0" />
				<span>{metrics.isLowSpec ? "Low-Spec VRAM Shield: 60 FPS" : "VRAM Shield: 60 FPS"}</span>
				{metrics.rvgCacheItemCount > 0 && (
					<span style={{ color: "var(--muted)", marginLeft: "4px" }}>
						(RVG: {rvgMb} МБ)
					</span>
				)}
			</div>
		</div>
	);
};
