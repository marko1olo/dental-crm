export function getChannelLabel(channel: string) {
	if (channel === "whatsapp") return "WhatsApp";
	if (channel === "telegram") return "Telegram";
	if (channel === "sms") return "SMS";
	if (channel === "vk") return "VKontakte";
	return channel;
}

export function getChannelColor(channel: string) {
	if (channel === "whatsapp") return "#25D366";
	if (channel === "telegram") return "#0088cc";
	if (channel === "vk") return "#0077FF";
	return "var(--muted)";
}

export function getChannelLetter(channel: string) {
	if (channel === "whatsapp") return "W";
	if (channel === "telegram") return "T";
	if (channel === "sms") return "S";
	if (channel === "vk") return "V";
	return channel.charAt(0).toUpperCase();
}

export function formatTime(isoString: string) {
	const d = new Date(isoString);
	return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

export function formatDate(isoString: string) {
	const d = new Date(isoString);
	const today = new Date();
	const yesterday = new Date(today);
	yesterday.setDate(yesterday.getDate() - 1);

	if (d.toDateString() === today.toDateString()) return "Сегодня";
	if (d.toDateString() === yesterday.toDateString()) return "Вчера";
	return d.toLocaleDateString("ru-RU", {
		day: "numeric",
		month: "long",
		year: d.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
	});
}

export function getDateKey(isoString: string) {
	return new Date(isoString).toDateString();
}
