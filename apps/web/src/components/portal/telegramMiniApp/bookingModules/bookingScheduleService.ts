/**
 * TELEGRAM MINI APP BOOKING — SCHEDULE & SLOTS SERVICE
 * (DOMAIN: API Slots Ingestion, Doctor Profiles Hydration)
 */

import type { DoctorProfile, SpecialistCategory, CalendarDayItem } from "./bookingTypes";

export interface LiveScheduleDay {
	date: string;
	dayOfWeek: string;
	dayNum: number;
	month: string;
	slots: string[];
}

export interface LiveScheduleResult {
	liveDocs: DoctorProfile[];
	schedule: LiveScheduleDay[];
}

export async function fetchLiveScheduleData(
	orgId: string,
	calendarDays: CalendarDayItem[],
	selectedDoctorId: string,
	isDemo: boolean,
): Promise<LiveScheduleResult | null> {
	try {
		const res = await fetch(`/api/telegram/webapp/slots?organizationId=${encodeURIComponent(orgId)}`);
		if (!res.ok) return null;
		const data = await res.json();
		if (!data?.schedule || !Array.isArray(data.schedule)) return null;

		const docsMap = new Map<string, DoctorProfile>();
		const categories: SpecialistCategory[] = ["therapist", "surgeon", "orthodontist", "hygienist"];

		data.schedule.forEach((dayItem: any) => {
			if (Array.isArray(dayItem.doctors)) {
				dayItem.doctors.forEach((doc: any, dIdx: number) => {
					if (doc.doctorId && !docsMap.has(doc.doctorId)) {
						const parts = (doc.doctorName || "").split(" ").filter(Boolean);
						const initials = parts.length >= 2
							? `${parts[0]?.[0] || ""}${parts[1]?.[0] || ""}`.toUpperCase()
							: "ВР";
						docsMap.set(doc.doctorId, {
							id: doc.doctorId,
							name: doc.doctorName || "Врач клиники DENTE",
							specialty: doc.specialty || "Врач-стоматолог",
							category: categories[dIdx % categories.length] || "therapist",
							experience: `${7 + ((dIdx * 3) % 10)} лет`,
							initials: initials || "ДР",
							rating: Number((4.8 + ((dIdx * 2) % 3) * 0.1).toFixed(1)),
						});
					}
				});
			}
		});

		const mapped: LiveScheduleDay[] = data.schedule.map((item: any, idx: number) => {
			const dayMeta = calendarDays[idx] || calendarDays[0]!;
			const currentDocSlots = item.doctors?.find((d: any) => d.doctorId === selectedDoctorId)?.slots;
			return {
				date: item.date || dayMeta.dateString,
				dayOfWeek: dayMeta.dayOfWeek,
				dayNum: dayMeta.dayNum,
				month: dayMeta.month,
				slots: currentDocSlots || item.doctors?.[0]?.slots || (isDemo ? ["09:00", "10:30", "12:00", "14:00", "15:30", "17:00", "18:30"] : []),
			};
		});

		return {
			liveDocs: Array.from(docsMap.values()),
			schedule: mapped,
		};
	} catch {
		return null;
	}
}
