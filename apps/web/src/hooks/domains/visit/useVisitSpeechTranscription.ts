import type { SpeechChunkUploadInput, SpeechRecordingAssembly, SpeechTranscriptionResponse } from "@dental/shared";
import { useCallback, useRef } from "react";
import { loadPendingSpeechChunks, operatorReadableErrorDetail, operatorWorkflowFailureMessage, removePendingSpeechChunkById, responseErrorMessage, responseStatusFailureLabel, speechGatewayCanUpload } from "../../../AppHelpers";
import { showToast } from "../../../components/GlobalToast";
import { actionFailureToast } from "../../../lib/panelStateText";
import { useAppStore } from "../../../store/appStore";
import { useVisitStore } from "../../../store/visitStore";
import { logger } from "../../../utils/logger";
import { fetchWithHandling } from "../../../utils/networkUtils";
import { speechTranscriptionMatchesActiveVisit } from "./helpers";
import type { UseVisitSpeechTranscriptionParams } from "./types";

export function useVisitSpeechTranscription({
	auth, setError, dashboard, activeOrganizationId, isOnline, loadSpeechGatewayStatus, loadSpeechRecordingRecovery, applySpeechTranscription, refreshPendingSpeechChunkState,
}: UseVisitSpeechTranscriptionParams) {
	const { setTranscript, visitDraftUserEditedRef } = useVisitStore();
	const { speechGatewayStatus, setSpeechStatusNote } = useAppStore();
	const speechUploadPromisesRef = useRef<Set<Promise<void>>>(new Set());

	const submitSpeechChunk = useCallback(async (input: SpeechChunkUploadInput): Promise<SpeechTranscriptionResponse> => {
		const res = await fetchWithHandling("/api/speech/transcribe-chunk", {
			method: "POST", headers: auth.denteClinicalMutationHeaders({ "Content-Type": "application/json" }), body: JSON.stringify(input),
		});
		const payload = (await res.json()) as SpeechTranscriptionResponse & { error?: unknown; message?: unknown };
		if (payload.chunk?.status === "needs_provider_key" && !payload.chunk.transcript.trim()) {
			throw new Error("Серверное распознавание сейчас недоступно; аудио осталось в локальной очереди.");
		}
		if (!res.ok) {
			const rawDetail = typeof payload.message === "string" ? payload.message : typeof payload.error === "string" ? payload.error : null;
			throw new Error(`Распознавание речи не выполнено: ${operatorReadableErrorDetail(rawDetail) ?? responseStatusFailureLabel(res)}`);
		}
		return payload;
	}, [auth.denteClinicalMutationHeaders]);

	const assembleSpeechRecording = useCallback(async (recordingId: string, options: { silent?: boolean } = {}) => {
		try {
			const params = new URLSearchParams();
			if (dashboard?.activeVisit?.id) params.set("visitId", dashboard.activeVisit.id);
			if (dashboard?.activeVisit?.patientId) params.set("patientId", dashboard.activeVisit.patientId);
			const url = `/api/speech/recordings/${encodeURIComponent(recordingId)}/assemble${params.toString() ? `?${params.toString()}` : ""}`;
			const res = await fetchWithHandling(url, { cache: "no-store", headers: auth.denteClinicalReadHeaders() });
			if (!res.ok) throw new Error(await responseErrorMessage(res, "Запись распознавания не собрана"));
			const assembly = (await res.json()) as SpeechRecordingAssembly;
			const text = assembly.transcript.trim();
			if (text) {
				visitDraftUserEditedRef.current = true;
				setTranscript((curr: any) => {
					const safe = typeof curr === "string" ? curr : "";
					return safe.replace(/\s+/g, " ").includes(text.replace(/\s+/g, " ")) ? safe : [safe.trim(), text].filter(Boolean).join("\n");
				});
			}
			if (!options.silent || assembly.missingChunkIndexes.length || assembly.warnings.length) {
				const missing = assembly.missingChunkIndexes.length ? ` · пропуски ${assembly.missingChunkIndexes.join(", ")}` : "";
				setSpeechStatusNote(`Запись собрана: ${assembly.chunkCount} фрагм.${missing}`);
			}
			void loadSpeechRecordingRecovery({ silent: true });
			return assembly;
		} catch (err) {
			if (!options.silent) {
				showToast(actionFailureToast("Не удалось собрать запись распознавания", (err as { status?: number })?.status ?? null), "error");
				setError(operatorWorkflowFailureMessage("Не удалось собрать запись распознавания", err));
			}
			return null;
		}
	}, [auth.denteClinicalReadHeaders, dashboard?.activeVisit?.id, dashboard?.activeVisit?.patientId, loadSpeechRecordingRecovery, setError, setSpeechStatusNote, setTranscript, visitDraftUserEditedRef]);

	const trackSpeechUpload = useCallback((upload: Promise<void>) => {
		speechUploadPromisesRef.current.add(upload);
		upload.finally(() => speechUploadPromisesRef.current.delete(upload)).catch((err) => {
			logger.error("[Dente] speech upload error:", err);
			showToast(actionFailureToast("Ошибка загрузки аудиозаписи", (err as { status?: number })?.status ?? null), "error");
		});
	}, []);

	const waitForSpeechUploads = useCallback(async () => {
		const pending = Array.from(speechUploadPromisesRef.current);
		if (pending.length) await Promise.allSettled(pending);
	}, []);

	const flushPendingSpeechChunks = useCallback(async (options: { silent?: boolean } = {}) => {
		const queue = await loadPendingSpeechChunks(activeOrganizationId);
		if (!queue.length || !isOnline) { await refreshPendingSpeechChunkState(); return; }
		const currentGw = (await loadSpeechGatewayStatus({ silent: true })) ?? speechGatewayStatus;
		if (queue.some((i) => Boolean(i.audioBase64?.trim())) && !speechGatewayCanUpload(currentGw)) {
			await refreshPendingSpeechChunkState();
			return;
		}
		const flushedIds = new Set<string>();
		try {
			for (const item of queue) {
				const res = await submitSpeechChunk(item);
				applySpeechTranscription(res);
				await removePendingSpeechChunkById(item.id, activeOrganizationId);
				if (speechTranscriptionMatchesActiveVisit(res)) flushedIds.add(item.recordingId);
				await refreshPendingSpeechChunkState();
			}
			for (const recId of flushedIds) await assembleSpeechRecording(recId, { silent: true });
		} catch (err) {
			if (!options.silent) {
				showToast(actionFailureToast("Очередь распознавания пока не отправлена", (err as { status?: number })?.status ?? null), "error");
				setError(operatorWorkflowFailureMessage("Очередь распознавания пока не отправлена", err));
			}
			await refreshPendingSpeechChunkState();
		}
	}, [activeOrganizationId, applySpeechTranscription, assembleSpeechRecording, isOnline, loadSpeechGatewayStatus, refreshPendingSpeechChunkState, setError, speechGatewayStatus, submitSpeechChunk]);

	const finalizeSpeechRecording = useCallback(async (recordingId: string) => {
		await waitForSpeechUploads();
		await flushPendingSpeechChunks({ silent: true });
		await assembleSpeechRecording(recordingId, { silent: true });
	}, [assembleSpeechRecording, flushPendingSpeechChunks, waitForSpeechUploads]);

	return { speechUploadPromisesRef, submitSpeechChunk, assembleSpeechRecording, trackSpeechUpload, waitForSpeechUploads, flushPendingSpeechChunks, finalizeSpeechRecording };
}
