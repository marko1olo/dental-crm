/**
 * DENTE Dental CRM — Leads Mobile Bottom Sheet Contact Card
 * Phone, WhatsApp, Expected Revenue (>= 44x44px Touch Targets)
 * Mandate 8b (<= 120 lines)
 */

import { MessageSquare, Phone } from "lucide-react";
import type React from "react";
import { formatWhatsAppUrl } from "../../messaging/omnichannelEngine";

interface LeadMobileSheetContactCardProps {
	name: string;
	phone?: string | null | undefined;
	rawPhone: string;
	expectedRevenue?: string | number | null | undefined;
}

export const LeadMobileSheetContactCard: React.FC<
	LeadMobileSheetContactCardProps
> = ({ name, phone, rawPhone, expectedRevenue }) => {
	return (
		<div className="rounded-[16px] bg-[var(--paper-soft)] border border-[var(--line)] p-3.5 space-y-3">
			<div className="flex items-center justify-between gap-2">
				<div className="min-w-0">
					<div className="text-[13px] text-[var(--muted)] font-medium">
						Контактный телефон
					</div>
					<div className="text-[16px] font-semibold text-[var(--ink)] tracking-tight">
						{phone || "Номер не указан"}
					</div>
				</div>
				{expectedRevenue && (
					<div className="text-right shrink-0">
						<div className="text-[12px] text-[var(--muted)] font-medium">
							Ожидаемый чек
						</div>
						<div className="text-[15px] font-bold text-[var(--teal-dark,var(--teal))]">
							{Number(expectedRevenue).toLocaleString("ru-RU")} ₽
						</div>
					</div>
				)}
			</div>

			{phone && (
				<div className="grid grid-cols-2 gap-2 pt-1">
					<a
						href={`tel:${rawPhone}`}
						className="min-h-[44px] px-3 rounded-[12px] bg-[var(--teal)] text-white font-semibold text-[14px] flex items-center justify-center gap-2 shadow-xs active:scale-[0.98] transition-transform no-underline"
						data-testid="bottom-sheet-call-btn"
					>
						<Phone size={16} />
						<span>Позвонить</span>
					</a>

					<a
						href={formatWhatsAppUrl(
							phone,
							`Здравствуйте, ${name}! Вас беспокоит клиника DENTE по поводу вашей заявки.`,
						)}
						target="_blank"
						rel="noopener noreferrer"
						className="min-h-[44px] px-3 rounded-[12px] bg-[#25D366] text-white font-semibold text-[14px] flex items-center justify-center gap-2 shadow-xs active:scale-[0.98] transition-transform no-underline"
						data-testid="bottom-sheet-whatsapp-btn"
					>
						<MessageSquare size={16} />
						<span>WhatsApp</span>
					</a>
				</div>
			)}
		</div>
	);
};
