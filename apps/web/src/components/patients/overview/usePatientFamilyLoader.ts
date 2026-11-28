import { useCallback, useEffect, useRef, useState } from "react";
import { actionFailureToast } from "../../../lib/panelStateText";
import { logger } from "../../../utils/logger";
import { showToast } from "../../GlobalToast";
import type { FamilyGroupData } from "../familyWidget/familyWidgetTypes";

export interface PatientFamilyAppLogic {
	auth?: {
		denteClinicalReadHeaders: () => HeadersInit;
	};
}

export function usePatientFamilyLoader(
	selectedPatientId: string | null | undefined,
	appLogic?: PatientFamilyAppLogic | null | undefined,
) {
	const [familyData, setFamilyData] = useState<FamilyGroupData | null>(null);
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
					let raw: unknown = null;
					try {
						raw = await res.json();
					} catch (err: unknown) {
						logger.error(err);
						const status = typeof err === "object" && err !== null && "status" in err && typeof (err as { status?: unknown }).status === "number"
							? (err as { status: number }).status
							: null;
						showToast(actionFailureToast("Ошибка чтения ответа", status), "error");
					}
					const data = raw && typeof raw === "object" && "data" in raw ? raw.data : raw;
					setFamilyData((data as FamilyGroupData) ?? null);
					setFamilyLoadFailure(data ? null : { status: res.status });
					return;
				}
				setFamilyData(null);
				setFamilyLoadFailure(res.status === 404 ? null : { status: res.status });
			})
			.catch((err: unknown) => {
				logger.error(err);
				const status = typeof err === "object" && err !== null && "status" in err && typeof (err as { status?: unknown }).status === "number"
					? (err as { status: number }).status
					: null;
				showToast(actionFailureToast("Ошибка загрузки семьи", status), "error");
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
