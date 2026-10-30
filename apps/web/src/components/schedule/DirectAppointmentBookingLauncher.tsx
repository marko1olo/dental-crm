/**
 * DirectAppointmentBookingLauncher.tsx — Прямой автономный лаунчер модального окна записи (SSOT)
 * Мандаты 8b (<= 120 строк), 8aq (Mounted in UI Tree), 8e (Doctor Autonomy).
 * Монтируется в корневой AppShell, слушает хэш #appointment_booking / #quick_booking и событие dente:open-appointment-booking.
 */
import React, { useEffect, useState } from "react";
import { AppointmentBookingModal, type QuickBookingSlotInfo } from "./AppointmentBookingModal";

function checkIsBookingActive(): boolean {
	if (typeof window === "undefined") return false;
	const s = window.location.search || "";
	const h = window.location.hash || "";
	return (
		s.includes("standalone=appointment_booking") ||
		s.includes("standalone=booking") ||
		s.includes("booking_modal=1") ||
		h.includes("appointment_booking") ||
		h.includes("quick_booking") ||
		h.includes("schedule_booking") ||
		h.includes("new-appointment") ||
		h === "#booking" ||
		h.startsWith("#booking?") ||
		h.startsWith("#booking/") ||
		h === "#appointment" ||
		h.startsWith("#appointment?") ||
		h.startsWith("#appointment/") ||
		h === "#new-appointment" ||
		h.startsWith("#new-appointment?") ||
		h.startsWith("#new-appointment/")
	);
}

export const DirectAppointmentBookingLauncher: React.FC = () => {
	const [isOpen, setIsOpen] = useState<boolean>(() => checkIsBookingActive());
	const [slotInfo, setSlotInfo] = useState<QuickBookingSlotInfo | null>(() => {
		const today = new Date().toISOString().slice(0, 10);
		return {
			dateKey: today,
			startTime: "10:00",
			durationMinutes: 45,
			chairId: "chair-1",
			chairName: "Кресло 1 (Терапия)",
			doctorUserId: "doc-1",
			doctorName: "Д-р Воронов Алексей Владимирович",
			reason: "Первичный осмотр и консультация",
		};
	});

	useEffect(() => {
		const handleOpen = (e?: Event) => {
			const detail = (e as CustomEvent)?.detail;
			if (detail) {
				setSlotInfo((prev) => ({
					...prev,
					...detail,
				}));
			}
			setIsOpen(true);
		};

		window.addEventListener("dente:open-appointment", handleOpen);
		window.addEventListener("dente:open-appointment-booking", handleOpen);
		window.addEventListener("dente:open-quick-booking", handleOpen);
		window.addEventListener("dente-open-quick-booking", handleOpen);

		const handleState = () => {
			if (checkIsBookingActive()) {
				setIsOpen(true);
			}
		};

		window.addEventListener("hashchange", handleState);
		window.addEventListener("popstate", handleState);

		return () => {
			window.removeEventListener("dente:open-appointment", handleOpen);
			window.removeEventListener("dente:open-appointment-booking", handleOpen);
			window.removeEventListener("dente:open-quick-booking", handleOpen);
			window.removeEventListener("dente-open-quick-booking", handleOpen);
			window.removeEventListener("hashchange", handleState);
			window.removeEventListener("popstate", handleState);
		};
	}, []);

	if (!isOpen) return null;

	return (
		<AppointmentBookingModal
			isOpen={isOpen}
			onClose={() => {
				setIsOpen(false);
				if (
					window.location.hash.includes("appointment_booking") ||
					window.location.hash.includes("quick_booking") ||
					window.location.hash.includes("schedule_booking") ||
					window.location.hash === "#schedule" ||
					window.location.hash.startsWith("#schedule?") ||
					window.location.hash === "#booking" ||
					window.location.hash.startsWith("#booking?") ||
					window.location.hash === "#appointment" ||
					window.location.hash.startsWith("#appointment?") ||
					window.location.hash === "#new-appointment" ||
					window.location.hash.startsWith("#new-appointment?")
				) {
					window.location.hash = "";
				}
			}}
			initialSlot={slotInfo}
		/>
	);
};

export default DirectAppointmentBookingLauncher;
