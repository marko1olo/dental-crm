import { useCallback, useEffect, useRef, useState } from "react";
import { logger } from "../../../utils/logger";
import { getLocalTasks } from "../clinicalTasksPresets";
import type { ClinicalTask, CustomTaskType } from "../clinicalTasksTypes";
import { getLoadFailureMessage } from "./clinicalPhaseTransitionEngine";

export function useClinicalTasksFetch(patientId: string | null | undefined, readHeaders: () => Record<string, string>) {
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
				const headers = readHeaders();
				response = await fetch(`/api/clinical/tasks?patientId=${encodeURIComponent(patientId)}`, { headers });
				customTypesResponse = await fetch("/api/crm/custom-task-types", { headers }).catch(() => null);
			} catch {
				if (!isMountedRef.current) return;
				const local = getLocalTasks(patientId);
				setTasks(local.length > 0 ? local : null);
				if (local.length === 0) setError("Сервер клиники не ответил. Проверьте соединение.");
				return;
			}
			const payload = (await response.json().catch(() => null)) as ClinicalTask[] | { message?: string } | null;
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
				const customData = await customTypesResponse.json().catch(() => null);
				if (isMountedRef.current && Array.isArray(customData)) setCustomTaskTypes(customData as CustomTaskType[]);
			}
		} finally {
			if (isMountedRef.current) setLoading(false);
		}
	}, [patientId, readHeaders]);

	useEffect(() => { void load(); }, [load]);

	return { tasks, setTasks, customTaskTypes, error, loading, load };
}
