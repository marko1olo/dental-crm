import type { ToothVisualProps } from "../ToothColors";

function scopeGrad(idPrefix: string | undefined, id: string): string {
	return idPrefix ? `url(#${idPrefix}-${id})` : `url(#${id})`;
}

function visual(
	fill: string, crownFill: string, rootFill: string, stroke: string,
	badgeColor: string, badgeText: string, badgeBg: string,
	opacity = "1", isPulsing = false, collarFill?: string,
): ToothVisualProps {
	return { fill, crownFill, rootFill, stroke, opacity, isPulsing, badgeColor, badgeBg, badgeText, collarFill };
}

export function getPathologyToothColors(state: string, idPrefix?: string): ToothVisualProps | null {
	const enamelHealthy = scopeGrad(idPrefix, "dente-enamel-healthy");
	const rootDentin = scopeGrad(idPrefix, "dente-root-dentin");
	const cariesGrad = scopeGrad(idPrefix, "dente-caries-grad");
	const pulpitisGrad = scopeGrad(idPrefix, "dente-pulpitis-grad");
	const perioGrad = scopeGrad(idPrefix, "dente-periodontitis-grad");
	const zirconiaGrad = scopeGrad(idPrefix, "zirconia-crown-gradient");
	const cervicalCollar = scopeGrad(idPrefix, "dente-cervical-collar");
	const titaniumGrad = scopeGrad(idPrefix, "titanium-implant-gradient");

	switch (state) {
		case "Healthy":
			return visual(enamelHealthy, enamelHealthy, rootDentin, "var(--tooth-root-stroke, #94a3b8)", "#10b981", "#059669", "rgba(16, 185, 129, 0.12)");
		case "Caries":
		case "caries":
			return visual(cariesGrad, cariesGrad, rootDentin, "#d97706", "#f59e0b", "#b45309", "rgba(245, 158, 11, 0.15)");
		case "Pulpitis":
		case "pulpitis":
		case "treatment":
			return visual(pulpitisGrad, pulpitisGrad, rootDentin, "#ef4444", "#ef4444", "#b91c1c", "rgba(239, 68, 68, 0.15)");
		case "Periodontitis":
			return visual(perioGrad, perioGrad, rootDentin, "#ea580c", "#ea580c", "#c2410c", "rgba(234, 88, 12, 0.15)");
		case "Planned_Crown":
			return visual(zirconiaGrad, zirconiaGrad, rootDentin, "#3b82f6", "#3b82f6", "#1d4ed8", "rgba(59, 130, 246, 0.15)", "0.85", true, cervicalCollar);
		case "watch":
		case "Watch":
			return visual(cariesGrad, cariesGrad, rootDentin, "#d97706", "#d97706", "#b45309", "rgba(217, 119, 6, 0.15)", "0.85");
		case "Implant":
			return visual(titaniumGrad, zirconiaGrad, titaniumGrad, "#64748b", "#64748b", "#475569", "rgba(100, 116, 139, 0.15)");
		case "Planned_Implant":
			return visual(titaniumGrad, zirconiaGrad, titaniumGrad, "#64748b", "#64748b", "#475569", "rgba(100, 116, 139, 0.15)", "1", true);
		case "Missing":
		case "missing":
			return { fill: "transparent", crownFill: "none", rootFill: "none", stroke: "var(--tooth-root-stroke, #94a3b8)", opacity: "0.12", isMissing: true, badgeColor: "#64748b", badgeBg: "rgba(100, 116, 139, 0.15)", badgeText: "#475569" };
		case "Retained":
			return visual(enamelHealthy, enamelHealthy, rootDentin, "#8b5cf6", "#8b5cf6", "#7c3aed", "rgba(139, 92, 246, 0.15)", "0.85");
		case "Root":
			return visual(rootDentin, "none", rootDentin, "#dc2626", "#dc2626", "#991b1b", "rgba(220, 38, 38, 0.15)");
		default:
			return null;
	}
}
