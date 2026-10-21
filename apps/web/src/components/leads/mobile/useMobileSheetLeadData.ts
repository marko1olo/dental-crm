/**
 * DENTE Dental CRM — Mobile Sheet Lead Data Hook
 * Mandate 8b (<= 120 lines)
 */

import type { Lead } from "../../../store/leadsStore";
import {
	CHANNEL_BADGE_COLORS,
	CHANNEL_DISPLAY_NAMES,
} from "../../telephony/telephonyAttribution";
import { normalizeMarketingChannel } from "../leadsFunnelTypes";
import {
	COLUMNS,
	getKanbanColumnForLeadStatus,
	getLeadSlaStatus,
} from "../leadsKanbanTypes";

export function useMobileSheetLeadData(lead: Lead) {
	const sla = getLeadSlaStatus(lead);
	const channelKey = lead.source ? normalizeMarketingChannel(lead.source) : null;
	const channelBadge =
		(channelKey && CHANNEL_BADGE_COLORS[channelKey]) || {
			bg: "var(--teal-soft)",
			color: "var(--teal-dark, var(--teal))",
			border: "var(--teal)",
		};
	const channelLabel =
		(channelKey && CHANNEL_DISPLAY_NAMES[channelKey]) || lead.source || "Прямое обращение";
	const rawPhone = lead.phone ? lead.phone.replace(/[^\d+]/g, "") : "";
	const currentColumn =
		COLUMNS.find((c) => c.id === lead.status) || getKanbanColumnForLeadStatus(lead.status);

	return { sla, channelBadge, channelLabel, rawPhone, currentColumn };
}
