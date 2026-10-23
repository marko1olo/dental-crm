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
	const [retryTrigger, setRetryTrigger] = useState(0);

	const refetch = () => setRetryTrigger((v) => v + 1);

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

		const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
		const timeoutId = setTimeout(() => {
			controller?.abort();
		}, 7000);

		const fetchSlots = async () => {
			const urlsToTry = [
				`${apiBaseUrl}/available-slots?date=${encodeURIComponent(selectedDate)}${docParam}${orgParam}`,
				`${apiBaseUrl}/slots?date=${encodeURIComponent(selectedDate)}${docParam}${orgParam}`,
				`${apiBaseUrl}/${effectiveOrgId}/slots?date=${encodeURIComponent(selectedDate)}${docParam}`,
			];

			// Если apiBaseUrl /api/public/booking, пробуем также /api/public-booking
			if (apiBaseUrl.includes("public/booking")) {
				urlsToTry.push(`/api/public-booking/available-slots?date=${encodeURIComponent(selectedDate)}${docParam}${orgParam}`);
				urlsToTry.push(`/api/public-booking/slots?date=${encodeURIComponent(selectedDate)}${docParam}${orgParam}`);
			}

			let lastError: Error | null = null;
			for (const url of urlsToTry) {
				if (isCancelled) return null;
				try {
					const reqInit: RequestInit = controller ? { signal: controller.signal } : {};
					const res = await fetch(url, reqInit).catch((fetchErr) => {
						lastError = fetchErr;
						return null;
					});
					if (!res) continue;
					if (res.status === 404) continue;
					const data = await res.json().catch(() => null);
					if (!res.ok) {
						throw new Error(data?.message || data?.error || "На выбранную дату приём не ведётся");
					}
					return data;
				} catch (err: any) {
					if (err?.name === "AbortError") {
						throw new Error("Таймаут соединения с клиникой. Проверьте интернет или позвоните администратору.");
					}
					lastError = err;
				}
			}

			if (typeof navigator !== "undefined" && !navigator.onLine) {
				throw new Error("Отсутствует подключение к интернету (автономный режим). Пожалуйста, позвоните в клинику.");
			}
			throw lastError || new Error("Сетевая ошибка при загрузке расписания. Пожалуйста, позвоните в клинику.");
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
				clearTimeout(timeoutId);
				if (!isCancelled) setSlotsLoading(false);
			});

		return () => {
			isCancelled = true;
			clearTimeout(timeoutId);
			controller?.abort();
		};
	}, [effectiveOrgId, selectedDate, selectedDoctorId, apiBaseUrl, retryTrigger]);

	return { slots, setSlots, selectedSlot, setSelectedSlot, slotsLoading, slotError, setSlotError, refetch };
}
