/**
 * PerioKeypadSiteInfo.tsx — Информационный бейдж активной точки зондирования.
 * Архитектурный слой Layer 4: Keypad Subcomponent (Мандат 8b, <= 120 строк).
 */

import { PERIO_SITES_CONFIG, type PerioSiteKey, type PerioToothRecord } from "@dental/shared";
import React from "react";
import { PerioProbe } from "../../icons/DentalIcons";
import { probingDepthTone } from "../perioHeatmap";

export interface PerioKeypadSiteInfoProps {
	readonly focusedSite: { toothNumber: number; siteKey: PerioSiteKey } | null;
	readonly toothMap: Map<number, PerioToothRecord>;
	readonly isProbeKeyboardEnabled: boolean;
	readonly onToggleProbeKeyboard: (enabled: boolean) => void;
}

export const PerioKeypadSiteInfo: React.FC<PerioKeypadSiteInfoProps> = React.memo(({
	focusedSite, toothMap, isProbeKeyboardEnabled, onToggleProbeKeyboard,
}) => {
	const currentTooth = focusedSite ? toothMap.get(focusedSite.toothNumber) : null;
	const currentSite = focusedSite && currentTooth ? currentTooth[focusedSite.siteKey] : null;
	const currentDepth = currentSite?.probingDepthMm ?? 0;
	const tone = probingDepthTone(currentDepth);
	const toneColor = tone === "success" ? "text-emerald-400" : tone === "warning-low" ? "text-amber-400" : tone === "warning-high" ? "text-orange-400" : "text-rose-400";
	const siteLabel = focusedSite ? PERIO_SITES_CONFIG.find((s) => s.key === focusedSite.siteKey)?.shortKey : "";

	return (
		<div className="flex items-center gap-2 flex-wrap">
			<div className="px-2.5 py-1 rounded-lg bg-teal-500/20 border border-teal-500/40 text-teal-300 font-mono text-xs font-bold flex items-center gap-1.5">
				<PerioProbe size={14} className="text-teal-400 shrink-0" />
				<span>
					{focusedSite ? (
						<>Зуб <strong className="text-[var(--ink)] text-sm">{focusedSite.toothNumber}</strong> • {siteLabel}</>
					) : (
						"Пародонтограмма: выберите точку"
					)}
				</span>
			</div>
			{focusedSite && (
				<span className="text-xs font-mono font-bold text-[var(--ink)]">
					Глубина: <strong className={`text-sm ${toneColor}`}>{currentDepth} мм</strong>
				</span>
			)}
			<label className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[var(--paper)] border border-[var(--line)] cursor-pointer text-xs select-none">
				<input
					type="checkbox"
					data-testid="perio-probe-keyboard-toggle-tier3"
					checked={isProbeKeyboardEnabled}
					onChange={(e) => onToggleProbeKeyboard(e.target.checked)}
					className="accent-teal-500 w-3.5 h-3.5 rounded cursor-pointer"
				/>
				<span className="text-[var(--ink-soft)] font-medium">Клавиатура Numpad</span>
			</label>
		</div>
	);
});
PerioKeypadSiteInfo.displayName = "PerioKeypadSiteInfo";
