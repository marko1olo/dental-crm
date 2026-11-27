import { useEffect, useState } from "react";
import { clientLogger } from "../../utils/logger";
import type { BookingDoctorData, BookingSlotItem } from "./contracts/bookingContracts";
import { useBookingDoctorsQuery } from "./hooks/useBookingDoctorsQuery";
import { useBookingSlotsQuery } from "./hooks/useBookingSlotsQuery";

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
	const [effectiveOrgId, setEffectiveOrgId] = useState<string | null>(organizationId ?? null);

	useEffect(() => {
		if (organizationId) {
			setEffectiveOrgId(organizationId);
			return;
		}
		let isCancelled = false;
		const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
		const timeoutId = setTimeout(() => {
			controller?.abort();
		}, 7000);
		fetch(`${apiBaseUrl}/default-clinic?allowDefault=1`, controller ? { signal: controller.signal } : {})
			.then(async (res) => {
				if (!res.ok) return null;
				let raw: unknown = null;
				try {
					raw = await res.json();
				} catch (jsonErr: unknown) {
					if (!isCancelled) {
						clientLogger.warn("[useBookingAvailability] Invalid JSON response", jsonErr);
					}
					return null;
				}
				return raw && typeof raw === "object" && "data" in raw ? (raw as { data: unknown }).data : raw;
			})
			.then((data) => {
				const resolvedOrgId =
					data && typeof data === "object" && "organizationId" in data
						? (data as { organizationId?: string }).organizationId
						: undefined;
				if (!isCancelled && resolvedOrgId) setEffectiveOrgId(resolvedOrgId);
			})
			.catch((err: unknown) => {
				if (!isCancelled) {
					clientLogger.warn("[useBookingAvailability] Failed to resolve default clinic", err);
				}
			})
			.finally(() => {
				clearTimeout(timeoutId);
			});
		return () => {
			isCancelled = true;
			clearTimeout(timeoutId);
			controller?.abort();
		};
	}, [organizationId, apiBaseUrl]);

	const { loadedDoctors, doctorsLoading } = useBookingDoctorsQuery(effectiveOrgId, apiBaseUrl);
	const slotsQuery = useBookingSlotsQuery(effectiveOrgId, apiBaseUrl, selectedDate, selectedDoctorId);

	return {
		loadedDoctors,
		doctorsLoading,
		...slotsQuery,
	};
}
