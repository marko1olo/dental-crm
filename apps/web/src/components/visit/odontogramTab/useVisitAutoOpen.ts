import { useState, useCallback, useEffect, useRef } from "react";
import { denteAdminSecretRequestHeaders } from "../../../AppHelpers";
import { safeLocalStorageGetItem } from "../../../lib/safeLocalStorage";
import { useAppStore } from "../../../store/appStore";

interface UseVisitAutoOpenParams {
	appointmentId: string | null;
	rawAppointmentId?: string | null | undefined;
	openVisitId: string | null;
}

export function useVisitAutoOpen({
	appointmentId,
	rawAppointmentId,
	openVisitId,
}: UseVisitAutoOpenParams) {
	const [isOpeningVisit, setIsOpeningVisit] = useState(false);
	const hasAttemptedRef = useRef<string | null>(null);

	const handleOpenVisitNow = useCallback(async () => {
		const targetApptId = appointmentId || rawAppointmentId;
		if (!targetApptId || isOpeningVisit || hasAttemptedRef.current === targetApptId) return;
		hasAttemptedRef.current = targetApptId;
		setIsOpeningVisit(true);
		try {
			const clinicToken = safeLocalStorageGetItem("dente_clinic_token");
			const staffToken = safeLocalStorageGetItem("dente_staff_token");
			const headers: Record<string, string> = {
				"Content-Type": "application/json",
				...denteAdminSecretRequestHeaders(),
			};
			if (clinicToken) headers["x-dente-clinic-token"] = clinicToken;
			if (staffToken) headers.Authorization = `Bearer ${staffToken}`;

			const res = await fetch(
				`/api/appointments/${encodeURIComponent(targetApptId)}/visit`,
				{
					method: "POST",
					headers,
				},
			);
			if (res.ok) {
				const data = await res.json();
				if (data?.visit) {
					useAppStore.setState((state) => ({
						dashboard: state.dashboard
							? { ...state.dashboard, activeVisit: data.visit }
							: state.dashboard,
					}));
				}
			}
		} catch (e) {
			console.warn("[VisitOdontogramTab] auto visit open fallback:", e);
		} finally {
			setIsOpeningVisit(false);
		}
	}, [appointmentId, rawAppointmentId, isOpeningVisit]);

	useEffect(() => {
		if (appointmentId && !openVisitId && !isOpeningVisit) {
			void handleOpenVisitNow();
		}
	}, [appointmentId, openVisitId, handleOpenVisitNow, isOpeningVisit]);

	return {
		isOpeningVisit,
		handleOpenVisitNow,
	};
}
