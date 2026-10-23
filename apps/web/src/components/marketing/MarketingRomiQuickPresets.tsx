/**
 * MarketingRomiQuickPresets.tsx — Quick Add Channel Preset Buttons.
 * Governed by Mandate 8b (<= 120 lines), Mandate 8e & 8n (Solo Doctor Fast Actions).
 */

import React from "react";
import { QUICK_CHANNEL_PRESETS, type QuickChannelPreset } from "./marketingRomiPresets.js";

export interface MarketingRomiQuickPresetsProps {
	readonly onSelectPreset: (preset: QuickChannelPreset) => void;
}

export function MarketingRomiQuickPresets({ onSelectPreset }: MarketingRomiQuickPresetsProps) {
	return (
		<div style={{ marginBottom: "12px" }}>
			<span
				style={{
					fontSize: "11px",
					fontWeight: 700,
					color: "var(--muted)",
					display: "block",
					marginBottom: "6px",
				}}
			>
				Быстрое добавление типового канала:
			</span>
			<div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
				{QUICK_CHANNEL_PRESETS.map((p) => (
					<button
						key={p.nameRu}
						type="button"
						onClick={() => onSelectPreset(p)}
						className="romi-action-btn secondary"
						style={{ fontSize: "11px", padding: "4px 10px", minHeight: "32px" }}
						title={`Добавить ${p.nameRu} (${p.categoryRu})`}
					>
						+ {p.nameRu}
					</button>
				))}
			</div>
		</div>
	);
}
