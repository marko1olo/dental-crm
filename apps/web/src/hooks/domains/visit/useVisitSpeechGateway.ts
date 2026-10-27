import type { Dashboard, DentalSpecialty, SpeechGatewayHealthReport, SpeechGatewayStatus, SpeechProviderRuntimeStatus, SpeechRecordingRecoveryList, SpeechRecordingStrategy } from "@dental/shared";
import { useCallback, useMemo } from "react";
import { loadPendingSpeechChunks, operatorWorkflowFailureMessage, responseErrorMessage } from "../../../AppHelpers";
import { showToast } from "../../../components/GlobalToast";
import { actionFailureToast } from "../../../lib/panelStateText";
import { useAppStore } from "../../../store/appStore";
import { fetchWithHandling } from "../../../utils/networkUtils";

interface UseVisitSpeechGatewayParams {
	auth: { denteClinicalReadHeaders: (extra?: Record<string, string>) => Record<string, string> };
	setError: (err: string | null) => void;
	dashboard: Dashboard | null;
	activeOrganizationId: string | null;
	isOnline: boolean;
	selectedSpecialty: DentalSpecialty;
}

export function useVisitSpeechGateway({ auth, setError, dashboard, activeOrganizationId, isOnline, selectedSpecialty }: UseVisitSpeechGatewayParams) {
	const appStore = useAppStore();
	const { speechGatewayHealthReport, setSpeechGatewayHealthReport, speechGatewayStatus, setSpeechGatewayStatus, speechProviderRuntimeStatuses, setSpeechProviderRuntimeStatuses, setSpeechRecordingStrategy, setSpeechRecordingRecovery, setPendingSpeechChunkCount } = appStore;

	const speechProviderRuntimeById = useMemo(() => new Map((Array.isArray(speechProviderRuntimeStatuses) ? speechProviderRuntimeStatuses : []).map((p) => [p.providerId, p])), [speechProviderRuntimeStatuses]);
	const speechProviderHealthById = useMemo(() => new Map<string, any>((speechGatewayHealthReport?.providers ?? []).map((p) => [p.providerId, p])), [speechGatewayHealthReport]);
	const activeSpeechProviderHealth = useMemo(() => speechGatewayHealthReport?.providers?.find((p) => p.providerId === speechGatewayHealthReport.activeProviderId) ?? null, [speechGatewayHealthReport]);

	const handleGatewayError = useCallback((title: string, err: unknown, silent?: boolean) => {
		if (silent) return;
		showToast(actionFailureToast(title, (err as { status?: number })?.status ?? null), "error");
		setError(operatorWorkflowFailureMessage(title, err));
	}, [setError]);

	const loadSpeechGatewayStatus = useCallback(async (options: { silent?: boolean } = {}): Promise<SpeechGatewayStatus | null> => {
		try {
			const res = await fetchWithHandling("/api/speech/status", { cache: "no-store", headers: auth.denteClinicalReadHeaders() });
			if (!res.ok) throw new Error(await responseErrorMessage(res, "Состояние распознавания недоступно"));
			const status = (await res.json()) as SpeechGatewayStatus;
			setSpeechGatewayStatus(status);
			return status;
		} catch (err) { handleGatewayError("Шлюз распознавания речи недоступен", err, options.silent); return null; }
	}, [auth.denteClinicalReadHeaders, handleGatewayError, setSpeechGatewayStatus]);

	const loadSpeechGatewayHealthReport = useCallback(async (options: { silent?: boolean } = {}) => {
		try {
			const res = await fetchWithHandling("/api/speech/gateway-health", { cache: "no-store", headers: auth.denteClinicalReadHeaders() });
			if (!res.ok) throw new Error(await responseErrorMessage(res, "Проверка распознавания недоступна"));
			setSpeechGatewayHealthReport((await res.json()) as SpeechGatewayHealthReport);
		} catch (err) { handleGatewayError("Проверка распознавания недоступна", err, options.silent); }
	}, [auth.denteClinicalReadHeaders, handleGatewayError, setSpeechGatewayHealthReport]);

	const loadSpeechProviderRuntimeStatuses = useCallback(async (options: { silent?: boolean } = {}) => {
		try {
			const res = await fetchWithHandling("/api/speech/providers/runtime", { cache: "no-store", headers: auth.denteClinicalReadHeaders() });
			if (!res.ok) throw new Error(await responseErrorMessage(res, "Провайдеры распознавания недоступны"));
			setSpeechProviderRuntimeStatuses((await res.json()) as SpeechProviderRuntimeStatus[]);
		} catch (err) { handleGatewayError("Провайдер распознавания недоступен", err, options.silent); }
	}, [auth.denteClinicalReadHeaders, handleGatewayError, setSpeechProviderRuntimeStatuses]);

	const loadSpeechRecordingStrategy = useCallback(async (options: { silent?: boolean } = {}) => {
		try {
			const res = await fetchWithHandling("/api/speech/recording-strategy", {
				method: "POST", headers: auth.denteClinicalReadHeaders({ "Content-Type": "application/json" }),
				body: JSON.stringify({ expectedDurationMs: 180_000, networkState: isOnline ? "online" : "offline", privacyMode: "cloud_allowed", specialty: selectedSpecialty, source: "visit" }),
			});
			if (!res.ok) throw new Error(await responseErrorMessage(res, "Стратегия распознавания недоступна"));
			setSpeechRecordingStrategy((await res.json()) as SpeechRecordingStrategy);
		} catch (err) { handleGatewayError("Стратегия распознавания недоступна", err, options.silent); }
	}, [auth.denteClinicalReadHeaders, handleGatewayError, isOnline, selectedSpecialty, setSpeechRecordingStrategy]);

	const loadSpeechRecordingRecovery = useCallback(async (options: { silent?: boolean } = {}) => {
		try {
			if (!dashboard?.activeVisit?.id || !dashboard?.activeVisit?.patientId) { setSpeechRecordingRecovery(null); return; }
			const params = new URLSearchParams({ limit: "5", visitId: dashboard.activeVisit.id, patientId: dashboard.activeVisit.patientId });
			const res = await fetchWithHandling(`/api/speech/recordings/recovery?${params.toString()}`, { cache: "no-store", headers: auth.denteClinicalReadHeaders() });
			if (!res.ok) throw new Error(await responseErrorMessage(res, "Восстановление диктовки недоступно"));
			setSpeechRecordingRecovery((await res.json()) as SpeechRecordingRecoveryList);
		} catch (err) { handleGatewayError("Восстановление диктовки недоступно", err, options.silent); }
	}, [auth.denteClinicalReadHeaders, dashboard?.activeVisit?.id, dashboard?.activeVisit?.patientId, handleGatewayError, setSpeechRecordingRecovery]);

	const refreshSpeechRuntime = useCallback(async (options: { silent?: boolean } = {}) => {
		await Promise.all([loadSpeechGatewayStatus(options), loadSpeechGatewayHealthReport(options), loadSpeechProviderRuntimeStatuses(options), loadSpeechRecordingStrategy(options), loadSpeechRecordingRecovery(options)]);
	}, [loadSpeechGatewayStatus, loadSpeechGatewayHealthReport, loadSpeechProviderRuntimeStatuses, loadSpeechRecordingStrategy, loadSpeechRecordingRecovery]);

	const refreshPendingSpeechChunkState = useCallback(async () => {
		setPendingSpeechChunkCount((await loadPendingSpeechChunks(activeOrganizationId)).length);
	}, [activeOrganizationId, setPendingSpeechChunkCount]);

	return { speechProviderRuntimeById, speechProviderHealthById, activeSpeechProviderHealth, loadSpeechGatewayStatus, loadSpeechGatewayHealthReport, loadSpeechProviderRuntimeStatuses, loadSpeechRecordingStrategy, loadSpeechRecordingRecovery, refreshSpeechRuntime, refreshPendingSpeechChunkState };
}
