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
				const res = await fetch("/api/portal/me", { headers: { Authorization: `Bearer ${token}` } });
				if (res.ok) {
					const json = await res.json();
					if (isMounted && json && json.patient) {
						const mapped = mapServerPortalMeToCabinetData(json);
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
