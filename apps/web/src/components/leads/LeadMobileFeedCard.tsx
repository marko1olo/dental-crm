/**
 * DENTE Dental CRM — Sovereign Native Apple HIG Card for Leads Mobile Feed
 * Mandate 8b (<= 120 lines), Touch Targets >= 44x44px, Natural Thumb Zone
 */

import { motion, type PanInfo, useAnimation } from "framer-motion";
import { Calendar, Phone } from "lucide-react";
import React from "react";
import { useState } from "react";
import type { Lead } from "../../store/leadsStore";
import {
	CHANNEL_BADGE_COLORS,
	CHANNEL_DISPLAY_NAMES,
} from "../telephony/telephonyAttribution";
import { normalizeMarketingChannel } from "./leadsFunnelTypes";
import {
	COLUMNS,
	getKanbanColumnForLeadStatus,
	getLeadSlaStatus,
} from "./leadsKanbanTypes";
import { LeadMobileCardActionButtons } from "./mobile/LeadMobileCardActionButtons";
import { LeadMobileCardBodyContent } from "./mobile/LeadMobileCardBodyContent";
import { LeadMobileCardTopBadges } from "./mobile/LeadMobileCardTopBadges";
import { LeadMobileSwipeBackground } from "./mobile/LeadMobileSwipeBackground";

export interface LeadMobileFeedCardProps {
	lead: Lead;
	onSelect: (leadId: string) => void;
	onSchedule: (leadId: string) => void;
	onQuickSchedule?: ((leadId: string) => Promise<void> | void) | undefined;
	onOpenPatientCard?: ((patientId: string) => void) | undefined;
}

export const LeadMobileFeedCard: React.FC<LeadMobileFeedCardProps> = ({
	lead,
	onSelect,
	onSchedule,
	onQuickSchedule,
	onOpenPatientCard,
}) => {
	const controls = useAnimation();
	const [dragOffset, setDragOffset] = useState(0);

	const sla = getLeadSlaStatus(lead);
	const channelKey = lead.source ? normalizeMarketingChannel(lead.source) : null;
	const channelBadge = (channelKey && CHANNEL_BADGE_COLORS[channelKey]) || {
		bg: "var(--teal-soft)",
		color: "var(--teal-dark, var(--teal))",
		border: "var(--teal)",
	};
	const channelLabel = (channelKey && CHANNEL_DISPLAY_NAMES[channelKey]) || lead.source || "Прямой звонок";
	const rawPhone = lead.phone ? lead.phone.replace(/[^\d+]/g, "") : "";
	const col = COLUMNS.find((c) => c.id === lead.status) || getKanbanColumnForLeadStatus(lead.status);

	const handleDragEnd = async (_: unknown, info: PanInfo) => {
		if (info.offset.x > 75) {
			if (rawPhone) window.location.href = `tel:${rawPhone}`;
		} else if (info.offset.x < -75) {
			if (onQuickSchedule) onQuickSchedule(lead.id);
			else onSchedule(lead.id);
		}
		setDragOffset(0);
		controls.start({
			x: 0,
			transition: { type: "spring", stiffness: 450, damping: 30 },
		});
	};

	const handleCardClick = () => {
		if (Math.abs(dragOffset) < 10) onSelect(lead.id);
	};

	return (
		<div className="leads-mobile-card-swipe-wrap">
			<LeadMobileSwipeBackground dragOffset={dragOffset} />

			<motion.article
				drag="x"
				dragConstraints={{ left: -100, right: 100 }}
				dragElastic={0.18}
				animate={controls}
				onDrag={(_, info) => setDragOffset(info.offset.x)}
				onDragEnd={handleDragEnd}
				onClick={handleCardClick}
				className="leads-mobile-card"
				data-testid={`mobile-lead-card-${lead.id}`}
				style={{ touchAction: "pan-y" }}
			>
				<div
					className="leads-mobile-card-stripe"
					style={{
						background: sla.isBreached
							? "var(--rust, #ef4444)"
							: col?.color || "var(--teal)",
					}}
				/>

				<LeadMobileCardTopBadges
					channelBadge={channelBadge}
					channelLabel={channelLabel}
					sla={sla}
					expectedRevenue={lead.expectedRevenue}
				/>

				<LeadMobileCardBodyContent
					lead={lead}
					onOpenPatientCard={onOpenPatientCard}
				/>

				<LeadMobileCardActionButtons
					lead={lead}
					rawPhone={rawPhone}
					onSchedule={onSchedule}
					onQuickSchedule={onQuickSchedule}
				/>
			</motion.article>
		</div>
	);
};
