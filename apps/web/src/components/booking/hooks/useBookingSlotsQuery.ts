import { useEffect, useState } from "react";
import type { BookingSlotItem } from "../contracts/bookingContracts";

export function useBookingSlotsQuery(
	effectiveOrgId: string | null,
	apiBaseUrl: string,
	selectedDate: string,
	selectedDoctorId: string | null,
) {
	const [slots, setSlots] = useState<BookingSlotItem[]>([]);
	const [selectedSlot, setSelectedSlot] = useState<BookingSlotItem | null>(null);
	const [slotsLoading, setSlotsLoading] = useState(false);
	const [slotError, setSlotError] = useState<string | null>(null);

	useEffect(() => {
		let isCancelled = false;
		if (!selectedDate || !effectiveOrgId) {
			setSlots([]);
			setSelectedSlot(null);
			return;
		}

		setSlotsLoading(true);
		setSlotError(null);

		const docParam = selectedDoctorId ? `&doctorId=${encodeURIComponent(selectedDoctorId)}` : "";
		const orgParam = `&organizationId=${encodeURIComponent(effectiveOrgId)}`;

		const fetchSlots = async () => {
			let res = await fetch(`${apiBaseUrl}/available-slots?date=${encodeURIComponent(selectedDate)}${docParam}${orgParam}`).catch(() => null);
			if (!res || res.status === 404) {
				res = await fetch(`${apiBaseUrl}/${effectiveOrgId}/slots?date=${encodeURIComponent(selectedDate)}${docParam}`).catch(() => null);
			}
			if (!res) throw new Error("Сетевая ошибка при загрузке расписания");
			const data = await res.json().catch(() => null);
			if (!res.ok) throw new Error(data?.message || data?.error || "На выбранную дату приём не ведётся");
			return data;
		};

		fetchSlots()
			.then((data) => {
				if (isCancelled) return;
				if (Array.isArray(data) && data.length > 0) {
					const mapped: BookingSlotItem[] = data.map((item: any) => {
						const hour = Number.parseInt(item.time.split(":")[0] ?? "10", 10) || 10;
						const period: "morning" | "afternoon" | "evening" = hour < 12 ? "morning" : hour < 16 ? "afternoon" : "evening";
						return { time: item.time, startsAt: item.startsAt, endsAt: item.endsAt, period, availableDoctorIds: item.availableDoctorIds };
					});
					setSlots(mapped);
					setSelectedSlot((prev) => (prev && mapped.some((s) => s.time === prev.time) ? mapped.find((s) => s.time === prev.time) || mapped[0] || null : mapped[0] || null));
					setSlotError(null);
				} else {
					setSlots([]);
					setSelectedSlot(null);
					setSlotError(null);
				}
			})
			.catch((err: Error) => {
				if (isCancelled) return;
				setSlots([]);
				setSelectedSlot(null);
				setSlotError(err.message || "На выбранную дату нет свободных окон для записи");
			})
			.finally(() => {
				if (!isCancelled) setSlotsLoading(false);
			});

		return () => { isCancelled = true; };
	}, [effectiveOrgId, selectedDate, selectedDoctorId, apiBaseUrl]);

	return { slots, setSlots, selectedSlot, setSelectedSlot, slotsLoading, slotError, setSlotError };
}
