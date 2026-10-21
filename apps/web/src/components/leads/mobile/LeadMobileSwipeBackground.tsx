/**
 * DENTE Dental CRM — Leads Mobile Swipe Background Actions
 * Mandate 8b (<= 120 lines)
 */

import { Calendar, Phone } from "lucide-react";
import React from "react";

interface LeadMobileSwipeBackgroundProps {
	dragOffset: number;
}

export const LeadMobileSwipeBackground: React.FC<LeadMobileSwipeBackgroundProps> = ({ dragOffset }) => {
	return (
		<div className="leads-mobile-card-swipe-background" aria-hidden="true">
			<div
				className="leads-mobile-swipe-action leads-mobile-swipe-action--call"
				style={{ opacity: dragOffset > 25 ? 1 : 0 }}
			>
				<Phone size={17} />
				<span>Звонок</span>
			</div>
			<div
				className="leads-mobile-swipe-action leads-mobile-swipe-action--schedule"
				style={{ opacity: dragOffset < -25 ? 1 : 0 }}
			>
				<span>Записать</span>
				<Calendar size={17} />
			</div>
		</div>
	);
};
