/**
 * apps/web/src/components/perio/perioHeatmap.ts
 *
 * Discrete clinical scale for periodontal pocket probing depth (AAP / EFP):
 * - null / undefined -> 'neutral' (#d1d5db)
 * - <= 3 mm          -> 'success' (green #34d399, normal sulcus)
 * - 4..5 mm          -> 'warning-low' (yellow #fbbf24, mild/moderate pocket)
 * - 6..7 mm          -> 'warning-high' (orange #f97316, pronounced pocket)
 * - >= 8 mm          -> 'critical' (crimson #e11d48, deep bone pocket)
 */

export type HeatmapTone = "neutral" | "success" | "warning-low" | "warning-high" | "error" | "critical";

export const TONE_TO_CLASS: Record<HeatmapTone, string> = {
	neutral: "bg-[var(--paper-soft,#f1f5f9)] ring-[var(--line,#e2e8f0)] text-[var(--muted,#64748b)] border-[var(--line,#e2e8f0)]",
	success: "bg-[var(--teal-soft,#0d94881a)] ring-[var(--teal,#0d9488)] text-[var(--teal,#0d9488)] border-[var(--teal,#0d9488)]/30",
	"warning-low": "bg-[var(--warning-soft,#f59e0b1a)] ring-[var(--warning,#f59e0b)] text-[var(--warning,#f59e0b)] border-[var(--warning,#f59e0b)]/30",
	"warning-high": "bg-[var(--warning-soft,#f59e0b26)] ring-[var(--warning-strong,#d97706)] text-[var(--warning-strong,#d97706)] border-[var(--warning-strong,#d97706)]/40",
	error: "bg-[var(--danger-soft,#ef44441a)] ring-[var(--danger,#ef4444)] text-[var(--danger,#ef4444)] border-[var(--danger,#ef4444)]/30",
	critical: "bg-[var(--danger-soft,#ef444426)] ring-[var(--danger,#ef4444)] text-[var(--danger,#ef4444)] border-[var(--danger,#ef4444)] font-bold shadow-xs",
};

export const TONE_TO_HEX: Record<HeatmapTone, string> = {
	neutral: "var(--muted, #94a3b8)",
	success: "var(--teal, #0d9488)",
	"warning-low": "var(--warning, #f59e0b)",
	"warning-high": "var(--warning-strong, #d97706)",
	error: "var(--danger, #ef4444)",
	critical: "var(--danger, #ef4444)",
};

export function probingDepthTone(pd: number | null | undefined, mode: "standard" | "clinical" = "standard"): HeatmapTone {
	if (mode === "clinical") return probingDepthClinicalTone(pd);
	if (pd === null || pd === undefined || Number.isNaN(pd)) return "neutral";
	if (pd <= 3) return "success";
	if (pd === 4) return "warning-low";
	if (pd <= 6) return "warning-high";
	return "error";
}

export function probingDepthClinicalTone(pd: number | null | undefined): HeatmapTone {
	if (pd === null || pd === undefined || Number.isNaN(pd)) return "neutral";
	if (pd <= 3) return "success";
	if (pd <= 5) return "warning-low";
	if (pd <= 7) return "warning-high";
	return "critical";
}

export function probingDepthClasses(pd: number | null | undefined, mode: "standard" | "clinical" = "standard"): string {
	return TONE_TO_CLASS[probingDepthTone(pd, mode)];
}

export function probingDepthClinicalClasses(pd: number | null | undefined): string {
	return TONE_TO_CLASS[probingDepthClinicalTone(pd)];
}

export function probingDepthHex(pd: number | null | undefined, mode: "standard" | "clinical" = "standard"): string {
	return TONE_TO_HEX[probingDepthTone(pd, mode)];
}

export function probingDepthClinicalHex(pd: number | null | undefined): string {
	return TONE_TO_HEX[probingDepthClinicalTone(pd)];
}

export const fastGetClinicalToneHex = probingDepthClinicalHex;
export const fastGetProbingDepthTone = probingDepthTone;
