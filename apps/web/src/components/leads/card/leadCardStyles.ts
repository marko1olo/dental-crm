import type { MotionStyle } from "framer-motion";
import type { LeadSlaStatus } from "../leadsKanbanSla";

export interface LeadCardStyleParams {
	cardBg?: string | undefined;
	borderColor?: string | undefined;
	sla: LeadSlaStatus;
	isDragged?: boolean | undefined;
}

export function computeLeadCardStyle(
	params: LeadCardStyleParams,
): MotionStyle {
	const { cardBg, borderColor, sla, isDragged } = params;
	return {
		background: cardBg,
		padding: "12px 14px",
		borderRadius: "10px",
		cursor: "grab",
		border: sla.isBreached
			? "1px solid var(--rust-soft, rgba(239, 68, 68, 0.4))"
			: `1px solid ${borderColor}`,
		borderLeft: sla.isBreached
			? "4px solid var(--rust, #ef4444)"
			: `1px solid ${borderColor}`,
		boxShadow: sla.isBreached
			? "0 2px 12px rgba(239, 68, 68, 0.12)"
			: "0 2px 8px rgba(0,0,0,0.05)",
		opacity: isDragged ? 0.5 : 1,
		transform: isDragged ? "scale(0.98)" : "scale(1)",
		transition: "box-shadow 0.2s, border 0.2s",
	};
}

export function computeLeadCardHover(sla: LeadSlaStatus) {
	return {
		y: -2,
		boxShadow: sla.isBreached
			? "0 8px 18px rgba(239, 68, 68, 0.18)"
			: "0 8px 16px rgba(0,0,0,0.08)",
	};
}
