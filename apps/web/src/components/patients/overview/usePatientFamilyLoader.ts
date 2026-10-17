import { useCallback, useEffect, useRef, useState } from "react";
import { actionFailureToast } from "../../../lib/panelStateText";
import { logger } from "../../../utils/logger";
import { showToast } from "../../GlobalToast";

export function usePatientFamilyLoader(selectedPatientId: string | null | undefined, appLogic: any) {
	const [familyData, setFamilyData] = useState<any>(null);
	const [familyLoadFailure, setFamilyLoadFailure] = useState<{ status: number | null } | null>(null);
	const selectedPatientIdRef = useRef(selectedPatientId);
	selectedPatientIdRef.current = selectedPatientId;

	const loadFamily = useCallback(() => {
		if (!selectedPatientId) {
			setFamilyData(null);
			setFamilyLoadFailure(null);
			return;
		}
		const requestedPatientId = selectedPatientId;
		const headers = appLogic?.auth ? appLogic.auth.denteClinicalReadHeaders() : {};
		fetch(`/api/finance/family/patient/${requestedPatientId}`, { headers })
			.then(async (res) => {
				if (selectedPatientIdRef.current !== requestedPatientId) return;
				if (res.ok) {
					const data = await res.json().catch((err: any) => {
						logger.error(err);
						showToast(actionFailureToast("Ошибка чтения ответа", err?.status ?? null), "error");
						return null;
					});
					setFamilyData(data ?? null);
					setFamilyLoadFailure(data ? null : { status: res.status });
					return;
				}
				setFamilyData(null);
				setFamilyLoadFailure(res.status === 404 ? null : { status: res.status });
			})
			.catch((err: any) => {
				logger.error(err);
				showToast(actionFailureToast("Ошибка загрузки семьи", err?.status ?? null), "error");
				if (selectedPatientIdRef.current !== requestedPatientId) return;
				setFamilyData(null);
				setFamilyLoadFailure({ status: null });
			});
	}, [selectedPatientId, appLogic]);

	useEffect(() => {
		setFamilyData(null);
		setFamilyLoadFailure(null);
		loadFamily();
	}, [loadFamily]);

	return { familyData, familyLoadFailure, loadFamily };
}
