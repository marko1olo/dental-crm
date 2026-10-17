import { useEffect, useState } from "react";
import type { CallerLookupResult, IncomingCallPayload } from "../../../store/telephonyTypes";
import { readDenteClinicToken, readDenteStaffToken } from "../../../lib/safeLocalStorage";

export interface ServerCallerLookupState {
	serverLookup: CallerLookupResult | null;
	isServerLookupLoading: boolean;
}

export function useServerCallerLookup(
	currentCall: IncomingCallPayload | null,
): ServerCallerLookupState {
	const [serverLookup, setServerLookup] = useState<CallerLookupResult | null>(null);
	const [isServerLookupLoading, setIsServerLookupLoading] = useState(false);

	useEffect(() => {
		if (!currentCall?.phone && !currentCall?.patientId) {
			setServerLookup(null);
			setIsServerLookupLoading(false);
			return;
		}

		let isMounted = true;
		const controller = new AbortController();

		async function fetchCaller() {
			try {
				setIsServerLookupLoading(true);
				const params = new URLSearchParams();
				if (currentCall?.phone) params.set("phone", currentCall.phone);
				if (currentCall?.patientId) params.set("patientId", currentCall.patientId);

				const headers: Record<string, string> = {
					Accept: "application/json",
				};
				const clinicToken = readDenteClinicToken();
				const staffToken = readDenteStaffToken();
				if (clinicToken) headers["x-dente-clinic-token"] = clinicToken;
				if (staffToken) headers["x-dente-staff-token"] = staffToken;

				const res = await fetch(`/api/telephony/lookup-caller?${params.toString()}`, {
					headers,
					signal: controller.signal,
				});

				if (!res.ok) return;
				const data: CallerLookupResult = await res.json();
				if (isMounted && data) {
					setServerLookup(data);
				}
			} catch (err: unknown) {
				if (err instanceof Error && err.name === "AbortError") return;
				// Quiet fallback to local store/dashboard
			} finally {
				if (isMounted) {
					setIsServerLookupLoading(false);
				}
			}
		}

		fetchCaller();

		return () => {
			isMounted = false;
			controller.abort();
		};
	}, [currentCall?.phone, currentCall?.patientId]);

	return { serverLookup, isServerLookupLoading };
}
