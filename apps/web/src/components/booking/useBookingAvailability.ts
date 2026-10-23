import { useEffect, useState } from "react";
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
		fetch(`${apiBaseUrl}/default-clinic`)
			.then((res) => (res.ok ? res.json() : null))
			.then((data) => {
				if (!isCancelled && data?.organizationId) setEffectiveOrgId(data.organizationId);
			})
			.catch(() => {});
		return () => { isCancelled = true; };
	}, [organizationId, apiBaseUrl]);

	const { loadedDoctors, doctorsLoading } = useBookingDoctorsQuery(effectiveOrgId, apiBaseUrl);
	const slotsQuery = useBookingSlotsQuery(effectiveOrgId, apiBaseUrl, selectedDate, selectedDoctorId);

	return {
		loadedDoctors,
		doctorsLoading,
		...slotsQuery,
	};
}
