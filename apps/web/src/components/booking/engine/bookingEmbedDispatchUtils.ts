export interface BookingReceiptData {
	bookingId: string;
	referenceNumber: string;
	status: "CONFIRMED" | "PENDING_RESERVATION";
	isNightMode: boolean;
	message: string;
	doctorName: string;
	specialty?: string | undefined;
	date: string;
	time: string;
	morningConfirmTime?: string | undefined;
	clinicAddress?: string | undefined;
	patientName: string;
	patientPhone: string;
	createdAt: string;
}

/**
 * Detects Telegram Mini App environment
 */
export function detectTelegramWebApp(): {
	isTelegram: boolean;
	user?: { id: number; firstName: string; username?: string | undefined } | undefined;
} {
	if (typeof window === "undefined") {
		return { isTelegram: false };
	}
	// biome-ignore lint/suspicious/noExplicitAny: Telegram global check
	const tg = (window as any)?.Telegram?.WebApp;
	if (tg) {
		tg.ready?.();
		tg.expand?.();
		const user = tg.initDataUnsafe?.user;
		return {
			isTelegram: true,
			user: user
				? {
						id: user.id,
						firstName: user.first_name,
						username: user.username,
					}
				: undefined,
		};
	}
	return { isTelegram: false };
}

/**
 * Dispatches postMessage event to parent frame (for Tilda, WordPress, HTML embedding).
 */
export function dispatchBookingCompletedMessage(
	data: BookingReceiptData,
): void {
	if (typeof window !== "undefined" && window.parent && window.parent !== window) {
		try {
			window.parent.postMessage(
				{
					type: "DENTE_BOOKING_COMPLETED",
					payload: data,
				},
				"*",
			);
		} catch (err) {
			console.warn("[publicBookingEngine] postMessage dispatch failed:", err);
		}
	}
}
