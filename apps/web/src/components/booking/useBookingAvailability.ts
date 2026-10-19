/**
 * DENTE Dental CRM — Booking Availability & Doctor/Slot Data Fetching Hook
 *
 * Mandate 8s (Modular Architecture & Anti-Bloat)
 */

import { useEffect, useState } from "react";
import type { BookingDoctorData } from "./BookingDoctorCard";
import type { BookingSlotItem } from "./BookingSlotPicker";

export interface UseBookingAvailabilityOptions {
	organizationId?: string | null;
	apiBaseUrl?: string;
	selectedDate: string;
	selectedDoctorId: string | null;
}

export function useBookingAvailability({
	organizationId,
	apiBaseUrl = "/api/public/booking",
	selectedDate,
	selectedDoctorId,
}: UseBookingAvailabilityOptions) {
	// Auto-resolve organization ID if not provided (fallback to live default-clinic)
	const [effectiveOrgId, setEffectiveOrgId] = useState<string | null>(organizationId ?? null);

	useEffect(() => {
		if (organizationId) {
			setEffectiveOrgId(organizationId);
			return;
		}
		let isCancelled = false;
		fetch(`${apiBaseUrl}/default-clinic`)
			.then((res) => (res.ok ? res.json() : null))
			.then((data) => {
				if (isCancelled || !data?.organizationId) return;
				setEffectiveOrgId(data.organizationId);
			})
			.catch(() => {
				// Failed to resolve default clinic
			});
		return () => {
			isCancelled = true;
		};
	}, [organizationId, apiBaseUrl]);

	// Doctors loading from live backend
	const [loadedDoctors, setLoadedDoctors] = useState<BookingDoctorData[]>([]);
	const [doctorsLoading, setDoctorsLoading] = useState(false);

	useEffect(() => {
		if (!effectiveOrgId) return;
		let isCancelled = false;
		setDoctorsLoading(true);

		fetch(`${apiBaseUrl}/${effectiveOrgId}/doctors`)
			.then((res) => {
				if (!res.ok) throw new Error("Failed to load doctors");
				return res.json();
			})
			.then((data) => {
				if (isCancelled) return;
				if (Array.isArray(data)) {
					const mapped: BookingDoctorData[] = data.map(
						(d: {
							id: string;
							fullName: string;
							specialties?: string[] | null;
							experienceYears?: number;
							rating?: number;
							reviewsCount?: number;
							bio?: string;
							avatarUrl?: string;
						}) => ({
							id: d.id,
							fullName: d.fullName,
							specialties:
								Array.isArray(d.specialties) && d.specialties.length > 0
									? d.specialties
									: ["Врач-стоматолог"],
							experienceYears: d.experienceYears ?? 5,
							rating: d.rating ?? 5.0,
							reviewsCount: d.reviewsCount ?? 0,
							categoryIds: ["all"],
							bio: d.bio,
							avatarUrl: d.avatarUrl,
						}),
					);
					setLoadedDoctors(mapped);
				} else {
					setLoadedDoctors([]);
				}
			})
			.catch(() => {
				if (!isCancelled) setLoadedDoctors([]);
			})
			.finally(() => {
				if (!isCancelled) setDoctorsLoading(false);
			});

		return () => {
			isCancelled = true;
		};
	}, [effectiveOrgId, apiBaseUrl]);

	// Slots loading from live backend
	const [slots, setSlots] = useState<BookingSlotItem[]>([]);
	const [selectedSlot, setSelectedSlot] = useState<BookingSlotItem | null>(null);
	const [slotsLoading, setSlotsLoading] = useState(false);
	const [slotError, setSlotError] = useState<string | null>(null);

	useEffect(() => {
		let isCancelled = false;
		if (!selectedDate) {
			setSlots([]);
			setSelectedSlot(null);
			return;
		}

		if (!effectiveOrgId) {
			setSlots([]);
			setSelectedSlot(null);
			return;
		}

		setSlotsLoading(true);
		setSlotError(null);

		const doctorParam = selectedDoctorId
			? `&doctorId=${encodeURIComponent(selectedDoctorId)}`
			: "";

		const orgParam = effectiveOrgId
			? `&organizationId=${encodeURIComponent(effectiveOrgId)}`
			: "";

		const fetchAvailableSlots = async () => {
			let res = await fetch(
				`${apiBaseUrl}/available-slots?date=${encodeURIComponent(selectedDate)}${doctorParam}${orgParam}`,
			).catch(() => null);

			if (!res || res.status === 404) {
				res = await fetch(
					`${apiBaseUrl}/${effectiveOrgId}/slots?date=${encodeURIComponent(selectedDate)}${doctorParam}`,
				).catch(() => null);
			}

			if (!res) {
				throw new Error("Сетевая ошибка при загрузке расписания");
			}

			const data = await res.json().catch(() => null);
			if (!res.ok) {
				const errMsg =
					data?.message ||
					data?.error ||
					"На выбранную дату приём не ведётся. Выберите другую дату.";
				throw new Error(errMsg);
			}
			return data;
		};

		fetchAvailableSlots()
			.then((data) => {
				if (isCancelled) return;
				if (Array.isArray(data) && data.length > 0) {
					const mapped: BookingSlotItem[] = data.map(
						(item: {
							time: string;
							startsAt: string;
							endsAt: string;
							availableDoctorIds?: string[];
						}) => {
							const hour =
								Number.parseInt(item.time.split(":")[0] ?? "10", 10) || 10;
							const period: "morning" | "afternoon" | "evening" =
								hour < 12 ? "morning" : hour < 16 ? "afternoon" : "evening";
							return {
								time: item.time,
								startsAt: item.startsAt,
								endsAt: item.endsAt,
								period,
								availableDoctorIds: item.availableDoctorIds,
							};
						},
					);
					setSlots(mapped);
					setSelectedSlot((prev) => {
						if (prev && mapped.some((s) => s.time === prev.time)) {
							return (
								mapped.find((s) => s.time === prev.time) || mapped[0] || null
							);
						}
						return mapped[0] || null;
					});
					setSlotError(null);
				} else {
					setSlots([]);
					setSelectedSlot(null);
					setSlotError(
						"На выбранную дату нет свободных окон для записи. Выберите другой день или оставьте заявку в лист ожидания.",
					);
				}
			})
			.catch((err: Error) => {
				if (isCancelled) return;
				setSlots([]);
				setSelectedSlot(null);
				setSlotError(
					err.message ||
						"На выбранную дату нет свободных окон для записи. Выберите другой день или оставьте заявку в лист ожидания.",
				);
			})
			.finally(() => {
				if (!isCancelled) setSlotsLoading(false);
			});

		return () => {
			isCancelled = true;
		};
	}, [effectiveOrgId, selectedDate, selectedDoctorId, apiBaseUrl]);

	return {
		loadedDoctors,
		doctorsLoading,
		slots,
		setSlots,
		selectedSlot,
		setSelectedSlot,
		slotsLoading,
		slotError,
		setSlotError,
	};
}
