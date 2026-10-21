/**
 * DmsExpressPresetChips.tsx — 1-клик кнопки шаблонов гарантийных писем ведущих страховщиков
 */

import { CheckCircle2, Zap } from "lucide-react";
import React from "react";
import type { ExpressDmsGuaranteePreset } from "../dmsInsurancePresets.js";

export interface DmsExpressPresetChipsProps {
	readonly onApplyExpressPreset: (preset: ExpressDmsGuaranteePreset) => void;
	readonly presets: readonly ExpressDmsGuaranteePreset[];
}

export function DmsExpressPresetChips({ onApplyExpressPreset, presets }: DmsExpressPresetChipsProps) {
	return (
		<div style={{ padding: "10px 14px", borderRadius: "12px", background: "var(--paper-strong, #ffffff)", border: "1px solid var(--line, #e2e8f0)", marginBottom: "14px" }}>
			<div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
				<Zap size={16} className="text-sky-600" />
				<span style={{ fontSize: "0.8125rem", fontWeight: 700, color: "var(--ink, #0f172a)" }}>
					Экспресс-прикрепление гарантийного письма в 1 клик:
				</span>
				<span style={{ fontSize: "0.75rem", color: "var(--muted, #64748b)" }}>
					(моментальное заполнение страховщика, лимитов и согласованных услуг)
				</span>
			</div>
			<div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
				{presets.map((preset) => (
					<button
						key={preset.id}
						type="button"
						onClick={() => onApplyExpressPreset(preset)}
						className="dms-btn dms-btn-secondary"
						style={{
							fontSize: "0.75rem", padding: "6px 12px", borderRadius: "8px",
							display: "flex", alignItems: "center", gap: "6px",
							background: "var(--paper, #f8fafc)", border: "1px solid var(--line, #cbd5e1)", cursor: "pointer",
						}}
						title={preset.noteRu}
					>
						<CheckCircle2 size={13} className="text-sky-600" />
						<span style={{ fontWeight: 600 }}>{preset.labelRu}</span>
					</button>
				))}
			</div>
		</div>
	);
}
