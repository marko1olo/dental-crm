import { useEffect, useState } from "react";
import type { BookingDoctorData } from "../contracts/bookingContracts";

export function useBookingDoctorsQuery(effectiveOrgId: string | null, apiBaseUrl: string) {
	const [loadedDoctors, setLoadedDoctors] = useState<BookingDoctorData[]>([]);
	const [doctorsLoading, setDoctorsLoading] = useState(false);

	useEffect(() => {
		if (!effectiveOrgId) return;
		let isCancelled = false;
		setDoctorsLoading(true);

		const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
		const timeoutId = setTimeout(() => {
			controller?.abort();
		}, 7000);

		const fetchDoctors = async () => {
			const urls = [
				`${apiBaseUrl}/${effectiveOrgId}/doctors`,
				`${apiBaseUrl}/doctors`,
			];
			if (apiBaseUrl.includes("public/booking")) {
				urls.push(`/api/public-booking/${effectiveOrgId}/doctors`);
				urls.push(`/api/public-booking/doctors`);
			}

			for (const url of urls) {
				if (isCancelled) return null;
				try {
					const reqInit: RequestInit = controller ? { signal: controller.signal } : {};
					const res = await fetch(url, reqInit).catch(() => null);
					if (res && res.ok) {
						return await res.json().catch(() => null);
					}
				} catch {
					// continue next url
				}
			}
			return null;
		};

		fetchDoctors()
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
				clearTimeout(timeoutId);
				if (!isCancelled) setDoctorsLoading(false);
			});

		return () => {
			isCancelled = true;
			clearTimeout(timeoutId);
			controller?.abort();
		};
	}, [effectiveOrgId, apiBaseUrl]);

	return { loadedDoctors, doctorsLoading };
}
