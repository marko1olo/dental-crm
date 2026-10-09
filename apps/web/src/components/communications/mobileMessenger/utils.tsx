import React from "react";

export function formatLastMessageTime(dateIso: string): string {
	try {
		const d = new Date(dateIso);
		const now = new Date();
		const isToday = d.toDateString() === now.toDateString();
		if (isToday) {
			return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
		}
		return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
	} catch {
		return "";
	}
}

export function renderChannelIcon(ch: string): React.ReactElement {
	switch (ch) {
		case "whatsapp":
			return <span className="mobile-avatar-channel-badge channel-badge-whatsapp">W</span>;
		case "telegram":
			return <span className="mobile-avatar-channel-badge channel-badge-telegram">T</span>;
		case "sms":
			return <span className="mobile-avatar-channel-badge channel-badge-sms">S</span>;
		default:
			return <span className="mobile-avatar-channel-badge channel-badge-whatsapp">W</span>;
	}
}
