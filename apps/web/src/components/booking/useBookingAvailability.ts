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
	// Doctors loading from live backend
	const [loadedDoctors, setLoadedDoctors] = useState<BookingDoctorData[]>([]);
	const [doctorsLoading, setDoctorsLoading] = useState(false);

	useEffect(() => {
		if (!organizationId) return;
		let isCancelled = false;
		setDoctorsLoading(true);

		fetch(`${apiBaseUrl}/${organizationId}/doctors`)
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
				}
			})
			.catch(() => {
				// Non-blocking fallback
			})
			.finally(() => {
				if (!isCancelled) setDoctorsLoading(false);
			});

		return () => {
			isCancelled = true;
		};
	}, [organizationId, apiBaseUrl]);

	// Slots loading from live backend
	const [slots, setSlots] = useState<BookingSlotItem[]>([]);
	const [selectedSlot, setSelectedSlot] = useState<BookingSlotItem | null>(null);
	const [slotsLoading, setSlotsLoading] = useState(false);
	const [slotError, setSlotError] = useState<string | null>(null);

	useEffect(() => {
		let isCancelled = false;
		if (!selectedDate) return;

		if (organizationId) {
			setSlotsLoading(true);
			setSlotError(null);

			const doctorParam = selectedDoctorId
				? `&doctorId=${encodeURIComponent(selectedDoctorId)}`
				: "";
			fetch(
				`${apiBaseUrl}/${organizationId}/slots?date=${encodeURIComponent(selectedDate)}${doctorParam}`,
			)
				.then((res) => {
					if (!res.ok) throw new Error("Failed to load slots");
					return res.json();
				})
				.then((data) => {
					if (isCancelled) return;
					if (Array.isArray(data)) {
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
						if (mapped.length > 0) {
							setSelectedSlot((prev) => {
								if (prev && mapped.some((s) => s.time === prev.time)) {
									return (
										mapped.find((s) => s.time === prev.time) || mapped[0] || null
									);
								}
								return mapped[0] || null;
							});
						} else {
							setSelectedSlot(null);
						}
					} else {
						setSlots([]);
						setSelectedSlot(null);
					}
				})
				.catch(() => {
					if (!isCancelled) {
						setSlots([]);
						setSelectedSlot(null);
						setSlotError("Не удалось загрузить свободные интервалы");
					}
				})
				.finally(() => {
					if (!isCancelled) setSlotsLoading(false);
				});
		} else {
			setSlotsLoading(false);
		}

		return () => {
			isCancelled = true;
		};
	}, [organizationId, selectedDate, selectedDoctorId, apiBaseUrl]);

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
