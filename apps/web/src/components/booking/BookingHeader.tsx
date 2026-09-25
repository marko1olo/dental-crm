/**
 * DENTE Dental CRM — Booking Top Glass Header
 *
 * Mandate 8s & Mandate 8p:
 * - Strictly <= 110px on mobile
 * - Telegram Mini App badge support
 */

import type React from "react";
import { Building2, Send } from "lucide-react";

export interface BookingHeaderProps {
	title: string;
	subtitle: string;
	isTelegramContext: boolean;
}

export const BookingHeader: React.FC<BookingHeaderProps> = ({
	title,
	subtitle,
	isTelegramContext,
}) => {
	return (
		<header className="dbw-header">
			<div className="dbw-header-clinic">
				<div className="flex items-center gap-1.5 min-w-0">
					<Building2 size={15} className="shrink-0" />
					<span className="truncate">Стоматологический центр DENTE</span>
				</div>
				{isTelegramContext && (
					<div className="dbw-tg-inline-badge">
						<Send size={11} />
						<span>Telegram Mini App</span>
					</div>
				)}
			</div>
			<h2 className="dbw-header-title">{title}</h2>
			<p className="dbw-header-subtitle">{subtitle}</p>
		</header>
	);
};
