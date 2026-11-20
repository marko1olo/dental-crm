import React from "react";
import { ShieldCheck, Cpu } from "lucide-react";
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
					gap: "6px",
					padding: "3px 10px",
					borderRadius: "12px",
					background: metrics.isLowSpec ? "var(--paper-soft)" : "var(--paper)",
					border: "1px solid var(--line)",
					color: "var(--ink)",
					fontSize: "12px",
					fontWeight: 500,
				}}
				title="Автоматическая оптимизация памяти рабочих мест клиники"
				data-testid="cockpit-badge-vram-shield"
			>
				<Cpu size={13} className="text-[var(--primary)] shrink-0" />
				<span>{metrics.isLowSpec ? "Аппаратный шлюз: энергосберегающий режим" : "Аппаратный шлюз DENTE: активен"}</span>
				{metrics.rvgCacheItemCount > 0 && (
					<span style={{ color: "var(--ink-muted)", marginLeft: "4px" }}>
						(Кэш RVG: {rvgMb} МБ)
					</span>
				)}
			</div>
		</div>
	);
};
