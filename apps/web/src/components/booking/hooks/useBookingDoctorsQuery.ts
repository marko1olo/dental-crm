import { useEffect, useState } from "react";
import type { BookingDoctorData } from "../contracts/bookingContracts";

export function useBookingDoctorsQuery(effectiveOrgId: string | null, apiBaseUrl: string) {
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
					const mapped: BookingDoctorData[] = data.map((d: any) => ({
						id: d.id,
						fullName: d.fullName,
						specialties: Array.isArray(d.specialties) && d.specialties.length > 0
							? d.specialties
							: ["Врач-стоматолог"],
						experienceYears: d.experienceYears ?? 5,
						rating: d.rating ?? 5.0,
						reviewsCount: d.reviewsCount ?? 0,
						categoryIds: ["all"],
						bio: d.bio,
						avatarUrl: d.avatarUrl,
					}));
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

	return { loadedDoctors, doctorsLoading };
}
