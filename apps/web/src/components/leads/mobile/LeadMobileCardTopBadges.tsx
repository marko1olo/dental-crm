/**
 * DENTE Dental CRM — Leads Mobile Card Top Badges
 * Channel, SLA Breach Pulse & Expected Revenue
 * Mandate 8b (<= 120 lines)
 */

import React from "react";
import { AlertTriangle, Clock } from "lucide-react";
import type { LeadSlaInfo } from "../leadsKanbanSla";

interface LeadMobileCardTopBadgesProps {
	channelBadge: { bg: string; color: string; border: string };
	channelLabel: string;
	sla: LeadSlaInfo;
	expectedRevenue?: string | number | null | undefined;
}

export const LeadMobileCardTopBadges: React.FC<LeadMobileCardTopBadgesProps> = ({
	channelBadge, channelLabel, sla, expectedRevenue,
}) => {
	return (
		<div className="leads-mobile-card-top">
			<div className="leads-mobile-card-badges">
				<span
					className="leads-mobile-source-badge"
					style={{ background: channelBadge.bg, color: channelBadge.color, border: `1px solid ${channelBadge.border}` }}
				>
					{channelLabel}
				</span>

				<span
					className={`leads-mobile-sla-badge ${sla.isBreached ? "lead-sla-breached-pulse" : ""}`}
					style={{ background: sla.badgeBg, color: sla.badgeColor, border: `1px solid ${sla.badgeBorder}` }}
				>
					{sla.isBreached ? <AlertTriangle size={11} className="shrink-0" /> : <Clock size={11} className="shrink-0" />}
					<span>{sla.label}</span>
				</span>
			</div>

			{expectedRevenue && (
				<span className="leads-mobile-revenue-badge">
					{Number(expectedRevenue).toLocaleString("ru-RU")} ₽
				</span>
			)}
		</div>
	);
};
