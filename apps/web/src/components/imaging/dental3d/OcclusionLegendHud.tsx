/**
 * apps/web/src/components/imaging/dental3d/OcclusionLegendHud.tsx
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * OCCLUSOGRAM HEATMAP MICRON SCALE HUD (КЛИНИЧЕСКАЯ ШКАЛА СМЫКАНИЯ)
 * ═══════════════════════════════════════════════════════════════════════════
 * Distance visualization in microns (<50um red, 50-150um green, 150-350um blue).
 * Apple Glassmorphic styling with Zero-Clipping and live contact metrics.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React from "react";
import type { OcclusionContactStats } from "./dental3dTypes.js";

export interface OcclusionLegendHudProps {
	readonly stats: OcclusionContactStats | null;
	readonly visible: boolean;
	readonly onClose?: () => void;
}

export const OcclusionLegendHud: React.FC<OcclusionLegendHudProps> = ({
	stats,
	visible,
}) => {
	if (!visible) return null;

	return (
		<div
			className="absolute bottom-4 left-4 z-20 p-3 rounded-xl bg-[var(--paper-strong)]/90 dark:bg-slate-900/90 backdrop-blur-md border border-[var(--line)] shadow-lg max-w-[280px] pointer-events-auto select-none"
			data-testid="occlusion-legend-hud"
		>
			<div className="flex items-center justify-between gap-2 pb-1.5 mb-1.5 border-b border-[var(--line-subtle)]">
				<span className="text-xs font-bold text-[var(--ink)] tracking-tight">
					Окклюзограмма (мкм)
				</span>
				<span className="text-[10px] font-mono text-[var(--primary)] font-semibold">
					±5 мкм
				</span>
			</div>

			<div className="space-y-1.5 text-[11px]">
				<div className="flex items-center justify-between gap-2">
					<div className="flex items-center gap-1.5">
						<span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
						<span className="text-[var(--ink)] font-medium">&lt; 50 мкм</span>
					</div>
					<span className="text-red-500 font-semibold text-[10px]">Жесткий контакт</span>
				</div>

				<div className="flex items-center justify-between gap-2">
					<div className="flex items-center gap-1.5">
						<span className="w-2.5 h-2.5 rounded-full bg-green-500 shrink-0" />
						<span className="text-[var(--ink)] font-medium">50–150 мкм</span>
					</div>
					<span className="text-green-500 font-semibold text-[10px]">Норма прикуса</span>
				</div>

				<div className="flex items-center justify-between gap-2">
					<div className="flex items-center gap-1.5">
						<span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
						<span className="text-[var(--ink)] font-medium">150–350 мкм</span>
					</div>
					<span className="text-blue-500 font-semibold text-[10px]">Зазор реставрации</span>
				</div>

				<div className="flex items-center justify-between gap-2">
					<div className="flex items-center gap-1.5">
						<span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0" />
						<span className="text-[var(--muted)] font-medium">&gt; 350 мкм</span>
					</div>
					<span className="text-[var(--muted)] font-medium text-[10px]">Разобщение</span>
				</div>
			</div>

			{stats && (
				<div className="mt-2 pt-2 border-t border-[var(--line-subtle)] text-[10px] text-[var(--muted)] flex justify-between gap-2">
					<span>
						Мин: <b className="text-[var(--ink)] font-mono">{stats.minDistanceUm} мкм</b>
					</span>
					<span>
						Ср: <b className="text-[var(--ink)] font-mono">{stats.averageContactUm} мкм</b>
					</span>
				</div>
			)}
		</div>
	);
};
