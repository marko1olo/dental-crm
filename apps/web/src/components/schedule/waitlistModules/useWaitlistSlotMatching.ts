/**
 * useWaitlistSlotMatching.ts — Hook for matching waitlist entries with freed slots and calculating fallback slots.
 */

import { useEffect, useMemo, useState } from "react";
import { logger } from "../../../utils/logger";
import {
	type DoctorFreeSlot,
	deriveClinicWorkingHours,
	findDoctorFreeSlots,
} from "../doctorFreeSlotsEngine";
import type { TargetSlotInfo } from "../waitlistCancellationEngine";
import type { ServerWaitlistMatch } from "./waitlistTypes";

export function useWaitlistSlotMatching(
	isOpen: boolean,
	targetSlot?: TargetSlotInfo | null | undefined,
	// biome-ignore lint/suspicious/noExplicitAny: dashboard and auth
	dashboard?: any,
	auth?: any,
) {
	const [serverMatchesMap, setServerMatchesMap] = useState<Map<string, ServerWaitlistMatch> | null>(null);

	useEffect(() => {
		const apptId = targetSlot?.appointmentId;
		if (!apptId || !isOpen) {
			setServerMatchesMap(null);
			return;
		}
		let isCancelled = false;
		async function fetchServerMatches() {
			try {
				const res = await fetch(`/api/appointments/${encodeURIComponent(apptId!)}/waitlist-matches`, {
					headers: auth?.denteClinicalReadHeaders ? auth.denteClinicalReadHeaders() : {},
				});
				if (res.ok) {
					const data = await res.json();
					if (!isCancelled && data && Array.isArray(data.matches)) {
						const map = new Map<string, ServerWaitlistMatch>();
						for (const m of data.matches) {
							if (m.entryId) map.set(m.entryId, m);
							if (m.patientId) map.set(m.patientId, m);
						}
						setServerMatchesMap(map);
					}
				}
			} catch (err) {
				logger.warn("Could not fetch server waitlist matches for target slot:", err);
			}
		}
		void fetchServerMatches();
		return () => {
			isCancelled = true;
		};
	}, [targetSlot?.appointmentId, isOpen, auth]);

	const staff = dashboard?.clinicSettings?.staff ?? [];

	const fallbackFreeSlots = useMemo(() => {
		if (targetSlot) return [];
		const today = new Date().toISOString().slice(0, 10);
		const workingWindow = deriveClinicWorkingHours(dashboard);
		const days = findDoctorFreeSlots({
			startDate: today,
			horizonDays: 3,
			durationMinutes: 30,
			appointments: dashboard?.appointments ?? [],
			chairs: dashboard?.clinicSettings?.chairs ?? [],
			clinicStartHour: workingWindow.clinicStartHour,
			clinicEndHour: workingWindow.clinicEndHour,
			workingDays: workingWindow.workingDays,
		});
		const flat: (DoctorFreeSlot & { dateFormatted: string; doctorName?: string })[] = [];
		for (const day of days) {
			for (const s of day.slots) {
				// biome-ignore lint/suspicious/noExplicitAny: doctor filtering
				const doc = staff.find((m: any) => m.id === s.doctorId);
				flat.push({
					...s,
					dateFormatted: day.dateFormatted,
					doctorName: doc?.fullName || doc?.name || "Дежурный врач",
				});
				if (flat.length >= 6) break;
			}
			if (flat.length >= 6) break;
		}
		return flat;
	}, [targetSlot, dashboard?.appointments, dashboard?.clinicSettings?.chairs, staff, dashboard]);

	return {
		serverMatchesMap,
		fallbackFreeSlots,
	};
}
