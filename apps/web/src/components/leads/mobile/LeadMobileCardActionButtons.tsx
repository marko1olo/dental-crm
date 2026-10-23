/**
 * DENTE Dental CRM — Leads Mobile Card Quick Action Buttons
 * Touch Targets >= 44x44px for Call, WhatsApp, Schedule (Apple HIG)
 * Mandate 8b (<= 120 lines)
 */

import { Calendar, MessageSquare, Phone } from "lucide-react";
import React from "react";
import type { Lead } from "../../../store/leadsStore";
import { formatWhatsAppUrl } from "../../messaging/omnichannelEngine";

interface LeadMobileCardActionButtonsProps {
	lead: Lead;
	rawPhone: string;
	onSchedule: (id: string) => void;
	onQuickSchedule?: ((id: string) => Promise<void> | void) | undefined;
}

export const LeadMobileCardActionButtons: React.FC<
	LeadMobileCardActionButtonsProps
> = ({ lead, rawPhone, onSchedule, onQuickSchedule }) => {
	const handleScheduleClick = () => {
		if (onQuickSchedule) onQuickSchedule(lead.id);
		else onSchedule(lead.id);
	};

	return (
		<div
			className="leads-mobile-actions-bar"
			onClick={(e) => e.stopPropagation()}
		>
			{lead.phone ? (
				<a
					href={`tel:${rawPhone}`}
					className="leads-mobile-action-btn leads-mobile-action-btn--call"
					title="Прямой звонок пациенту"
					data-testid={`quick-call-btn-${lead.id}`}
				>
					<Phone size={15} />
					<span>Звонок</span>
				</a>
			) : (
				<button
					type="button"
					onClick={handleScheduleClick}
					className="leads-mobile-action-btn leads-mobile-action-btn--call opacity-85"
					title="Указать номер телефона и записать"
					data-testid={`quick-call-btn-${lead.id}`}
				>
					<Phone size={15} />
					<span>Звонок</span>
				</button>
			)}

			{lead.phone ? (
				<a
					href={formatWhatsAppUrl(
						lead.phone,
						`Здравствуйте, ${lead.name}! Вас беспокоит стоматология DENTE.`,
					)}
					target="_blank"
					rel="noopener noreferrer"
					className="leads-mobile-action-btn leads-mobile-action-btn--whatsapp"
					title="Открыть диалог в WhatsApp"
					data-testid={`quick-chat-btn-${lead.id}`}
				>
					<MessageSquare size={15} />
					<span>Чат</span>
				</a>
			) : (
				<button
					type="button"
					onClick={handleScheduleClick}
					className="leads-mobile-action-btn leads-mobile-action-btn--whatsapp opacity-85"
					title="Указать номер телефона для чата"
					data-testid={`quick-chat-btn-${lead.id}`}
				>
					<MessageSquare size={15} />
					<span>Чат</span>
				</button>
			)}

			<button
				type="button"
				onClick={handleScheduleClick}
				className="leads-mobile-action-btn leads-mobile-action-btn--schedule"
				title="Записать на прием в расписание"
				data-testid={`quick-schedule-btn-${lead.id}`}
			>
				<Calendar size={15} />
				<span>Записать</span>
			</button>
		</div>
	);
};
