import type { Appointment } from "@dental/shared";
import { useCallback, useMemo, useState } from "react";

interface UseAppointmentModalTimeSyncParams {
	appointment: Appointment | null | undefined;
	timezone: string;
	toDateTimeLocalValue?: (iso: string, tz?: string | null) => string;
	fromDateTimeLocalValue?: (val: string, tz?: string | null) => string;
}

export function useAppointmentModalTimeSync({
	appointment,
	timezone,
	toDateTimeLocalValue,
	fromDateTimeLocalValue,
}: UseAppointmentModalTimeSyncParams) {
	const safeToDateTimeLocalValue = useCallback(
		(iso: string | null | undefined, tz?: string | null) => {
			if (!iso) return "";
			if (typeof toDateTimeLocalValue === "function") {
				return toDateTimeLocalValue(iso, tz);
			}
			return iso.length >= 16 ? iso.slice(0, 16) : iso;
		},
		[toDateTimeLocalValue],
	);

	const safeFromDateTimeLocalValue = useCallback(
		(val: string | null | undefined, tz?: string | null) => {
			if (!val) return "";
			if (typeof fromDateTimeLocalValue === "function") {
				return fromDateTimeLocalValue(val, tz);
			}
			return val.includes("T") && val.length === 16 ? `${val}:00.000Z` : val;
		},
		[fromDateTimeLocalValue],
	);

	const [startsAtLocal, setStartsAtLocal] = useState(() =>
		appointment?.startsAt
			? safeToDateTimeLocalValue(appointment.startsAt, timezone)
			: "",
	);
	const [endsAtLocal, setEndsAtLocal] = useState(() =>
		appointment?.endsAt
			? safeToDateTimeLocalValue(appointment.endsAt, timezone)
			: "",
	);

	const currentDurationMinutes = useMemo(() => {
		if (!startsAtLocal || !endsAtLocal) return 0;
		try {
			const startMs = Date.parse(
				safeFromDateTimeLocalValue(startsAtLocal, timezone),
			);
			const endMs = Date.parse(
				safeFromDateTimeLocalValue(endsAtLocal, timezone),
			);
			if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs <= startMs)
				return 0;
			return Math.round((endMs - startMs) / (60 * 1000));
		} catch {
			return 0;
		}
	}, [startsAtLocal, endsAtLocal, safeFromDateTimeLocalValue, timezone]);

	const applyDuration = useCallback(
		(minutes: number) => {
			let startVal = startsAtLocal;
			if (!startVal) {
				const now = new Date();
				now.setMinutes(Math.ceil(now.getMinutes() / 15) * 15, 0, 0);
				startVal = safeToDateTimeLocalValue(now.toISOString(), timezone);
				setStartsAtLocal(startVal);
			}
			try {
				const startDate = new Date(
					safeFromDateTimeLocalValue(startVal, timezone),
				);
				if (!Number.isNaN(startDate.getTime())) {
					const endDate = new Date(startDate.getTime() + minutes * 60 * 1000);
					setEndsAtLocal(
						safeToDateTimeLocalValue(endDate.toISOString(), timezone),
					);
				}
			} catch {}
		},
		[
			startsAtLocal,
			safeFromDateTimeLocalValue,
			safeToDateTimeLocalValue,
			timezone,
		],
	);

	return {
		safeToDateTimeLocalValue,
		safeFromDateTimeLocalValue,
		startsAtLocal,
		setStartsAtLocal,
		endsAtLocal,
		setEndsAtLocal,
		currentDurationMinutes,
		applyDuration,
	};
}
