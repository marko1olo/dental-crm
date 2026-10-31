/**
 * DirectPublicBookingLauncher.tsx — Прямой автономный лаунчер студии публичной онлайн-записи
 * Мандаты: 8b (60–100 строк Sweet Spot), 8aq (Mounted in UI Tree), 8e (Doctor Autonomy).
 * Монтируется в AppShell / StandaloneLaunchers, слушает хэши #booking / #online-booking / #public-booking.
 */

import React, { useEffect, useState } from "react";
import { PublicBookingStudioModal } from "./PublicBookingStudioModal";

function checkIsPublicBookingActive(): boolean {
	if (typeof window === "undefined") return false;
	const s = window.location.search || "";
	const h = window.location.hash || "";
	return (
		s.includes("standalone=booking") ||
		s.includes("standalone=online_booking") ||
		s.includes("booking=1") ||
		s.includes("online_booking=1") ||
		s.includes("public_booking=1") ||
		s.includes("booking_studio=1") ||
		h === "#booking" ||
		h.startsWith("#booking?") ||
		h.startsWith("#booking/") ||
		h === "#online-booking" ||
		h.startsWith("#online-booking?") ||
		h.startsWith("#online-booking/") ||
		h === "#public-booking" ||
		h.startsWith("#public-booking?") ||
		h.startsWith("#public-booking/") ||
		h === "#booking-studio" ||
		h.startsWith("#booking-studio?")
	);
}

export const DirectPublicBookingLauncher: React.FC = () => {
	const [isOpen, setIsOpen] = useState<boolean>(() => checkIsPublicBookingActive());

	useEffect(() => {
		const handleOpen = () => setIsOpen(true);

		window.addEventListener("dente:open-booking", handleOpen);
		window.addEventListener("dente:open-online-booking", handleOpen);
		window.addEventListener("dente:open-public-booking", handleOpen);

		const handleState = () => {
			if (checkIsPublicBookingActive()) setIsOpen(true);
		};

		window.addEventListener("hashchange", handleState);
		window.addEventListener("popstate", handleState);

		return () => {
			window.removeEventListener("dente:open-booking", handleOpen);
			window.removeEventListener("dente:open-online-booking", handleOpen);
			window.removeEventListener("dente:open-public-booking", handleOpen);
			window.removeEventListener("hashchange", handleState);
			window.removeEventListener("popstate", handleState);
		};
	}, []);

	const handleClose = () => {
		setIsOpen(false);
		if (typeof window !== "undefined") {
			const h = window.location.hash;
			if (
				h === "#booking" ||
				h.startsWith("#booking?") ||
				h.startsWith("#booking/") ||
				h === "#online-booking" ||
				h.startsWith("#online-booking?") ||
				h === "#public-booking" ||
				h.startsWith("#public-booking?") ||
				h === "#booking-studio"
			) {
				window.history.replaceState(null, "", window.location.pathname + window.location.search);
			}
		}
	};

	if (!isOpen) return null;

	return <PublicBookingStudioModal isOpen={isOpen} onClose={handleClose} />;
};

export default DirectPublicBookingLauncher;
