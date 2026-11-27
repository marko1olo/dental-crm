import { useCallback, useEffect, useRef, useState } from "react";
import { logger } from "../../../utils/logger";
import { getLocalTasks } from "../clinicalTasksPresets";
import type { ClinicalTask, CustomTaskType } from "../clinicalTasksTypes";
import { getLoadFailureMessage } from "./clinicalPhaseTransitionEngine";
import { useOptionalAppLogicContext } from "../../../contexts/AppLogicContext";
import { getDenteAuthHeaders } from "../../../lib/denteRequestHeaders";

export function useClinicalTasksFetch(
	patientId: string | null | undefined,
	/** @deprecated pass nothing — headers resolved internally via auth context */
	_legacyReadHeaders?: () => Record<string, string>,
) {
	const appLogic = useOptionalAppLogicContext();
	const auth = appLogic?.auth;
	const isMountedRef = useRef(true);
	useEffect(() => {
		isMountedRef.current = true;
		return () => { isMountedRef.current = false; };
	}, []);

	const [tasks, setTasks] = useState<ClinicalTask[] | null>(null);
	const [customTaskTypes, setCustomTaskTypes] = useState<CustomTaskType[] | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	const load = useCallback(async () => {
		if (!patientId) {
			if (isMountedRef.current) { setTasks(null); setError(null); setLoading(false); }
			return;
		}
		if (!isMountedRef.current) return;
		setError(null);
		setLoading(true);
		try {
			let response: Response;
			let customTypesResponse: Response | null = null;
			try {
				const denteClinicalReadHeaders = auth ? auth.denteClinicalReadHeaders() : getDenteAuthHeaders();
				response = await fetch(`/api/clinical/tasks?patientId=${encodeURIComponent(patientId)}`, { headers: denteClinicalReadHeaders });
				customTypesResponse = await fetch("/api/crm/custom-task-types", { headers: denteClinicalReadHeaders }).catch((err: unknown) => {
					logger.warn("[ClinicalTasks] custom-task-types fetch failed", err);
					return null;
				});
			} catch (err: unknown) {
				logger.warn("[ClinicalTasks] tasks fetch failed", err);
				if (!isMountedRef.current) return;
				const local = getLocalTasks(patientId);
				setTasks(local.length > 0 ? local : null);
				if (local.length === 0) setError("Сервер клиники не ответил. Проверьте соединение.");
				return;
			}
			let rawTasks: unknown = null;
			try {
				rawTasks = await response.json();
			} catch (jsonErr: unknown) {
				logger.warn("[ClinicalTasks] tasks invalid JSON", jsonErr);
			}
			const payload = (
				rawTasks && typeof rawTasks === "object" && "data" in rawTasks
					? (rawTasks as { data: unknown }).data
					: rawTasks
			) as ClinicalTask[] | { message?: string } | null;
			if (!isMountedRef.current) return;
			if (!response.ok || !Array.isArray(payload)) {
				const local = getLocalTasks(patientId);
				setTasks(local.length > 0 ? local : null);
				if (local.length === 0) {
					const msg = payload && typeof payload === "object" && "message" in payload && typeof payload.message === "string" ? payload.message : null;
					setError(getLoadFailureMessage(response.status, msg));
				}
				return;
			}
			const local = getLocalTasks(patientId);
			const serverIds = new Set(payload.map((t) => t.id));
			setTasks([...payload, ...local.filter((t) => !serverIds.has(t.id))]);

			if (customTypesResponse?.ok) {
				let rawCustom: unknown = null;
				try {
					rawCustom = await customTypesResponse.json();
				} catch (jsonErr: unknown) {
					logger.warn("[ClinicalTasks] custom-task-types invalid JSON", jsonErr);
				}
				const customData =
					rawCustom && typeof rawCustom === "object" && "data" in rawCustom
						? (rawCustom as { data: unknown }).data
						: rawCustom;
				if (isMountedRef.current && Array.isArray(customData)) setCustomTaskTypes(customData as CustomTaskType[]);
			}
		} finally {
			if (isMountedRef.current) setLoading(false);
		}
	}, [patientId, auth]);

	useEffect(() => { void load(); }, [load]);

	return { tasks, setTasks, customTaskTypes, error, loading, load };
}
