import { useCallback, useEffect, useState } from "react";
import {
	createEmptyPatientCabinetData,
	type PatientPersonalCabinetData,
} from "../../patientCabinetEngine.js";
import { DEMO_PATIENT_CABINET } from "../../patientCabinetPresets.js";
import { isDemoShowcaseMode } from "../../../../../lib/demoMode.js";
import { useOfflinePatientSync } from "../../../../../pwa/patientOfflineStorage.js";
import { mapServerPortalMeToCabinetData } from "../../patientCabinetMapper.js";
import type { AvailableDoctorItem } from "../types.js";

export function useCabinetDataHydration(initialData?: PatientPersonalCabinetData, token?: string) {
	const [data, setData] = useState<PatientPersonalCabinetData>(() => {
		if (initialData) return initialData;
		if (isDemoShowcaseMode()) return DEMO_PATIENT_CABINET;
		return createEmptyPatientCabinetData();
	});
	const [isFetchingMe, setIsFetchingMe] = useState(Boolean(token));
	const [availableDoctors, setAvailableDoctors] = useState<AvailableDoctorItem[]>([]);
	const [cabinetToastMessage, setCabinetToastMessage] = useState<string | null>(null);

	const { isOnline, queuedBookingsCount, isSyncing, flushNow } = useOfflinePatientSync();

	const handleShowCabinetToast = useCallback((msg: string) => {
		setCabinetToastMessage(msg);
		const timer = setTimeout(() => {
			setCabinetToastMessage(null);
		}, 3500);
		return () => clearTimeout(timer);
	}, []);

	useEffect(() => {
		if (!token) return;
		let isMounted = true;
		setIsFetchingMe(true);
		const fetchMe = async () => {
			try {
				const [res, consentsRes] = await Promise.all([
					fetch("/api/portal/me", { headers: { Authorization: `Bearer ${token}` } }),
					fetch("/api/portal/consents", { headers: { Authorization: `Bearer ${token}` } }).catch(() => null),
				]);
				if (res.ok) {
					const json = await res.json();
					let serverConsents: Array<Record<string, unknown>> | undefined;
					if (consentsRes && consentsRes.ok) {
						try {
							const consentsJson = (await consentsRes.json()) as { consents?: Array<Record<string, unknown>> } | Array<Record<string, unknown>> | null;
							if (consentsJson && typeof consentsJson === "object") {
								if ("consents" in consentsJson && Array.isArray(consentsJson.consents)) {
									serverConsents = consentsJson.consents;
								} else if (Array.isArray(consentsJson)) {
									serverConsents = consentsJson;
								}
							}
						} catch {
							// Silent fallback to empty consents
						}
					}
					if (isMounted && json && json.patient) {
						const mapped = mapServerPortalMeToCabinetData(json, serverConsents);
						setData(mapped);
						if (Array.isArray(json.doctors)) {
							setAvailableDoctors(json.doctors);
						}
					}
				}
			} catch (err) {
				console.error("[PatientCabinetModal] Failed to fetch /api/portal/me:", err);
			} finally {
				if (isMounted) setIsFetchingMe(false);
			}
		};
		void fetchMe();
		return () => { isMounted = false; };
	}, [token]);

	return {
		data, setData, isFetchingMe, availableDoctors,
		cabinetToastMessage, handleShowCabinetToast,
		isOnline, queuedBookingsCount, isSyncing, flushNow,
	};
}
