import { useCallback, useEffect, useState } from "react";
import {
	createEmptyPatientCabinetData,
	type PatientPersonalCabinetData,
} from "../../patientCabinetEngine.js";
import { DEMO_PATIENT_CABINET } from "../../patientCabinetPresets.js";
import { isDemoShowcaseMode } from "../../../../../lib/demoMode.js";
import { clientLogger } from "../../../../../services/logging/clientLogger.js";
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
				const consentsPromise = (async () => {
					try {
						return await fetch("/api/portal/consents", { headers: { Authorization: `Bearer ${token}` } });
					} catch (err) {
						clientLogger.warn("[PatientCabinetModal] Failed to fetch /api/portal/consents:", err);
						return null;
					}
				})();
				const [res, consentsRes] = await Promise.all([
					fetch("/api/portal/me", { headers: { Authorization: `Bearer ${token}` } }),
					consentsPromise,
				]);
				if (!res.ok) {
					clientLogger.warn("[PatientCabinetModal] /api/portal/me returned non-OK status:", res.status);
					if (isMounted) handleShowCabinetToast("Не удалось обновить данные личного кабинета");
					return;
				}
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
					} catch (err) {
						clientLogger.warn("[PatientCabinetModal] Failed to parse /api/portal/consents:", err);
					}
				}
				if (isMounted && json && json.patient) {
					const mapped = mapServerPortalMeToCabinetData(json, serverConsents);
					setData(mapped);
					if (Array.isArray(json.doctors)) {
						setAvailableDoctors(json.doctors);
					}
				}
			} catch (err) {
				clientLogger.error("[PatientCabinetModal] Failed to fetch /api/portal/me:", err);
				if (isMounted) handleShowCabinetToast("Ошибка сети при загрузке данных кабинета");
			} finally {
				if (isMounted) setIsFetchingMe(false);
			}
		};
		void fetchMe();
		return () => { isMounted = false; };
	}, [token, handleShowCabinetToast]);

	return {
		data, setData, isFetchingMe, availableDoctors,
		cabinetToastMessage, handleShowCabinetToast,
		isOnline, queuedBookingsCount, isSyncing, flushNow,
	};
}
