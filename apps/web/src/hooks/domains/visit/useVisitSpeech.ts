import type {
	SpeechChunkUploadInput,
	SpeechGatewayHealthReport,
	SpeechGatewayStatus,
	SpeechProviderRuntimeStatus,
	SpeechRecordingAssembly,
	SpeechRecordingRecoveryList,
	SpeechRecordingStrategy,
	SpeechTranscriptionResponse,
} from "@dental/shared";
import { useCallback, useMemo, useRef } from "react";
import {
	loadPendingSpeechChunks,
	operatorReadableErrorDetail,
	operatorWorkflowFailureMessage,
	removePendingSpeechChunkById,
	responseErrorMessage,
	responseStatusFailureLabel,
	speechGatewayCanUpload,
	speechQualityLabels,
} from "../../../AppHelpers";
import { showToast } from "../../../components/GlobalToast";
import { actionFailureToast } from "../../../lib/panelStateText";
import { useAppStore } from "../../../store/appStore";
import { useVisitStore } from "../../../store/visitStore";
import { logger } from "../../../utils/logger";
import { fetchWithHandling } from "../../../utils/networkUtils";
import {
	speechChunkApplyKey,
	speechTranscriptionMatchesActiveVisit,
} from "./helpers";
import type { UseVisitSpeechParams, UseVisitSpeechReturn } from "./types";
import { useVisitSpeechRecording } from "./useVisitSpeechRecording";

export function useVisitSpeech({
	auth,
	setError,
	dashboard,
	activeOrganizationId,
	isOnline,
	selectedSpecialty,
	appendVisitDictationText,
	setImportSourceKind,
	setImportText,
	setImportPreview,
	setImportCommit,
}: UseVisitSpeechParams): UseVisitSpeechReturn {
	const visitStore = useVisitStore();
	const appStore = useAppStore();

	const { setSpeechLastQuality, setTranscript, visitDraftUserEditedRef } =
		visitStore;

	const {
		speechGatewayHealthReport,
		setSpeechGatewayHealthReport,
		speechGatewayStatus,
		setSpeechGatewayStatus,
		speechProviderRuntimeStatuses,
		setSpeechProviderRuntimeStatuses,
		setSpeechRecordingStrategy,
		setSpeechRecordingRecovery,
		setPendingSpeechChunkCount,
		setSpeechStatusNote,
	} = appStore;

	const speechUploadPromisesRef = useRef<Set<Promise<void>>>(new Set());
	const appliedSpeechChunkKeysRef = useRef<Set<string>>(new Set());

	const speechProviderRuntimeById = useMemo(
		() =>
			new Map(
				(Array.isArray(speechProviderRuntimeStatuses)
					? speechProviderRuntimeStatuses
					: []
				).map((provider) => [provider.providerId, provider]),
			),
		[speechProviderRuntimeStatuses],
	);

	const speechProviderHealthById = useMemo(
		() =>
			new Map(
				(speechGatewayHealthReport?.providers ?? []).map((provider) => [
					provider.providerId,
					provider,
				]),
			),
		[speechGatewayHealthReport],
	);

	const activeSpeechProviderHealth = useMemo(() => {
		if (!speechGatewayHealthReport) return null;
		return (
			speechGatewayHealthReport.providers?.find(
				(provider) =>
					provider.providerId === speechGatewayHealthReport.activeProviderId,
			) ?? null
		);
	}, [speechGatewayHealthReport]);

	const loadSpeechGatewayStatus = useCallback(
		async (
			options: { silent?: boolean } = {},
		): Promise<SpeechGatewayStatus | null> => {
			try {
				const response = await fetchWithHandling("/api/speech/status", {
					cache: "no-store",
					headers: auth.denteClinicalReadHeaders(),
				});
				if (!response.ok)
					throw new Error(
						await responseErrorMessage(
							response,
							"Состояние распознавания недоступно",
						),
					);
				const status = (await response.json()) as SpeechGatewayStatus;
				setSpeechGatewayStatus(status);
				return status;
			} catch (speechError) {
				if (!options.silent) {
					showToast(
						actionFailureToast(
							"Шлюз распознавания речи недоступен",
							(speechError as { status?: number })?.status ?? null,
						),
						"error",
					);
					setError(
						operatorWorkflowFailureMessage(
							"Шлюз распознавания речи недоступен",
							speechError,
						),
					);
				}
				return null;
			}
		},
		[auth.denteClinicalReadHeaders, setError, setSpeechGatewayStatus],
	);

	const loadSpeechGatewayHealthReport = useCallback(
		async (options: { silent?: boolean } = {}) => {
			try {
				const response = await fetchWithHandling("/api/speech/gateway-health", {
					cache: "no-store",
					headers: auth.denteClinicalReadHeaders(),
				});
				if (!response.ok)
					throw new Error(
						await responseErrorMessage(
							response,
							"Проверка распознавания недоступна",
						),
					);
				setSpeechGatewayHealthReport(
					(await response.json()) as SpeechGatewayHealthReport,
				);
			} catch (speechHealthError) {
				if (!options.silent) {
					showToast(
						actionFailureToast(
							"Проверка распознавания недоступна",
							(speechHealthError as { status?: number })?.status ?? null,
						),
						"error",
					);
					setError(
						operatorWorkflowFailureMessage(
							"Проверка распознавания недоступна",
							speechHealthError,
						),
					);
				}
			}
		},
		[auth.denteClinicalReadHeaders, setSpeechGatewayHealthReport, setError],
	);

	const loadSpeechProviderRuntimeStatuses = useCallback(
		async (options: { silent?: boolean } = {}) => {
			try {
				const response = await fetchWithHandling(
					"/api/speech/providers/runtime",
					{
						cache: "no-store",
						headers: auth.denteClinicalReadHeaders(),
					},
				);
				if (!response.ok)
					throw new Error(
						await responseErrorMessage(
							response,
							"Провайдеры распознавания недоступны",
						),
					);
				setSpeechProviderRuntimeStatuses(
					(await response.json()) as SpeechProviderRuntimeStatus[],
				);
			} catch (speechRuntimeError) {
				if (!options.silent) {
					showToast(
						actionFailureToast(
							"Провайдер распознавания недоступен",
							(speechRuntimeError as { status?: number })?.status ?? null,
						),
						"error",
					);
					setError(
						operatorWorkflowFailureMessage(
							"Провайдер распознавания недоступен",
							speechRuntimeError,
						),
					);
				}
			}
		},
		[setSpeechProviderRuntimeStatuses, setError, auth.denteClinicalReadHeaders],
	);

	const loadSpeechRecordingStrategy = useCallback(
		async (options: { silent?: boolean } = {}) => {
			try {
				const response = await fetchWithHandling(
					"/api/speech/recording-strategy",
					{
						method: "POST",
						headers: auth.denteClinicalReadHeaders({
							"Content-Type": "application/json",
						}),
						body: JSON.stringify({
							expectedDurationMs: 180_000,
							networkState: isOnline ? "online" : "offline",
							privacyMode: "cloud_allowed",
							specialty: selectedSpecialty,
							source: "visit",
						}),
					},
				);
				if (!response.ok)
					throw new Error(
						await responseErrorMessage(
							response,
							"Стратегия распознавания недоступна",
						),
					);
				setSpeechRecordingStrategy(
					(await response.json()) as SpeechRecordingStrategy,
				);
			} catch (speechStrategyError) {
				if (!options.silent) {
					showToast(
						actionFailureToast(
							"Стратегия распознавания недоступна",
							(speechStrategyError as { status?: number })?.status ?? null,
						),
						"error",
					);
					setError(
						operatorWorkflowFailureMessage(
							"Стратегия распознавания недоступна",
							speechStrategyError,
						),
					);
				}
			}
		},
		[
			isOnline,
			auth.denteClinicalReadHeaders,
			setError,
			setSpeechRecordingStrategy,
			selectedSpecialty,
		],
	);

	const loadSpeechRecordingRecovery = useCallback(
		async (options: { silent?: boolean } = {}) => {
			try {
				if (!dashboard?.activeVisit?.id || !dashboard?.activeVisit?.patientId) {
					setSpeechRecordingRecovery(null);
					return;
				}
				const params = new URLSearchParams({ limit: "5" });
				params.set("visitId", dashboard?.activeVisit?.id);
				params.set("patientId", dashboard?.activeVisit?.patientId);
				const response = await fetchWithHandling(
					`/api/speech/recordings/recovery?${params.toString()}`,
					{
						cache: "no-store",
						headers: auth.denteClinicalReadHeaders(),
					},
				);
				if (!response.ok)
					throw new Error(
						await responseErrorMessage(
							response,
							"Восстановление диктовки недоступно",
						),
					);
				setSpeechRecordingRecovery(
					(await response.json()) as SpeechRecordingRecoveryList,
				);
			} catch (speechRecoveryError) {
				if (!options.silent) {
					showToast(
						actionFailureToast(
							"Восстановление диктовки недоступно",
							(speechRecoveryError as { status?: number })?.status ?? null,
						),
						"error",
					);
					setError(
						operatorWorkflowFailureMessage(
							"Восстановление диктовки недоступно",
							speechRecoveryError,
						),
					);
				}
			}
		},
		[
			setError,
			dashboard?.activeVisit?.patientId,
			setSpeechRecordingRecovery,
			dashboard?.activeVisit?.id,
			auth.denteClinicalReadHeaders,
		],
	);

	const refreshSpeechRuntime = useCallback(
		async (options: { silent?: boolean } = {}) => {
			await Promise.all([
				loadSpeechGatewayStatus(options),
				loadSpeechGatewayHealthReport(options),
				loadSpeechProviderRuntimeStatuses(options),
				loadSpeechRecordingStrategy(options),
				loadSpeechRecordingRecovery(options),
			]);
		},
		[
			loadSpeechRecordingStrategy,
			loadSpeechGatewayStatus,
			loadSpeechProviderRuntimeStatuses,
			loadSpeechRecordingRecovery,
			loadSpeechGatewayHealthReport,
		],
	);

	const refreshPendingSpeechChunkState = useCallback(async () => {
		setPendingSpeechChunkCount(
			(await loadPendingSpeechChunks(activeOrganizationId)).length,
		);
	}, [activeOrganizationId, setPendingSpeechChunkCount]);

	const submitSpeechChunk = useCallback(
		async (
			input: SpeechChunkUploadInput,
		): Promise<SpeechTranscriptionResponse> => {
			const response = await fetchWithHandling("/api/speech/transcribe-chunk", {
				method: "POST",
				headers: auth.denteClinicalMutationHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify(input),
			});
			const payload = (await response.json()) as SpeechTranscriptionResponse & {
				error?: unknown;
				message?: unknown;
			};
			if (
				payload.chunk?.status === "needs_provider_key" &&
				!payload.chunk.transcript.trim()
			) {
				throw new Error(
					"Серверное распознавание сейчас недоступно; аудио осталось в локальной очереди.",
				);
			}
			if (!response.ok) {
				const rawDetail =
					typeof payload.message === "string"
						? payload.message
						: typeof payload.error === "string"
							? payload.error
							: null;
				const detail =
					operatorReadableErrorDetail(rawDetail) ??
					responseStatusFailureLabel(response);
				throw new Error(`Распознавание речи не выполнено: ${detail}`);
			}
			return payload;
		},
		[auth.denteClinicalMutationHeaders],
	);

	const applySpeechTranscription = useCallback(
		(result: SpeechTranscriptionResponse) => {
			setSpeechGatewayStatus(result.gateway);
			void loadSpeechRecordingRecovery({ silent: true });
			const applyKey = speechChunkApplyKey(result);
			if (appliedSpeechChunkKeysRef.current.has(applyKey)) {
				setSpeechStatusNote(
					`Фрагмент ${result.chunk.chunkIndex + 1} уже учтен, дубль не добавлен.`,
				);
				return;
			}
			if (!speechTranscriptionMatchesActiveVisit(result)) {
				setSpeechStatusNote(
					"Фрагмент распознавания относится к другому приему и не добавлен в текущую карту.",
				);
				return;
			}
			const text = result.chunk.transcript.trim();
			const quality = result.chunk.quality;
			setSpeechLastQuality(quality);
			const qualitySuffix =
				quality.level === "clear"
					? ""
					: ` · ${speechQualityLabels[quality.level]}`;
			if (text) {
				appliedSpeechChunkKeysRef.current.add(applyKey);
				appendVisitDictationText(text);
				setSpeechStatusNote(
					result.chunk.status === "transcribed"
						? `${result.chunk.providerLabel}: фрагмент ${result.chunk.chunkIndex + 1}${qualitySuffix}`
						: `Сохранен фрагмент ${result.chunk.chunkIndex + 1}${qualitySuffix}: ${quality.nextAction}`,
				);
				return;
			}
			setSpeechStatusNote(
				`${speechQualityLabels[quality.level]}: ${quality.nextAction}`,
			);
		},
		[
			setSpeechLastQuality,
			setSpeechStatusNote,
			appendVisitDictationText,
			loadSpeechRecordingRecovery,
			setSpeechGatewayStatus,
		],
	);

	const assembleSpeechRecording = useCallback(
		async (recordingId: string, options: { silent?: boolean } = {}) => {
			try {
				const params = new URLSearchParams();
				if (dashboard?.activeVisit?.id)
					params.set("visitId", dashboard?.activeVisit?.id);
				if (dashboard?.activeVisit?.patientId)
					params.set("patientId", dashboard?.activeVisit?.patientId);
				const scopedQuery = params.toString();
				const response = await fetchWithHandling(
					`/api/speech/recordings/${encodeURIComponent(recordingId)}/assemble${scopedQuery ? `?${scopedQuery}` : ""}`,
					{
						cache: "no-store",
						headers: auth.denteClinicalReadHeaders(),
					},
				);
				if (!response.ok)
					throw new Error(
						await responseErrorMessage(
							response,
							"Запись распознавания не собрана",
						),
					);
				const assembly = (await response.json()) as SpeechRecordingAssembly;
				const assembledTranscript = assembly.transcript.trim();
				if (assembledTranscript) {
					visitDraftUserEditedRef.current = true;
					// biome-ignore lint/suspicious/noExplicitAny: automated suppression
					setTranscript((current: any) => {
						const safeCurrent = typeof current === "string" ? current : "";
						const normalizedCurrent = safeCurrent.replace(/\s+/g, " ").trim();
						const normalizedAssembled = assembledTranscript
							.replace(/\s+/g, " ")
							.trim();
						if (
							!normalizedAssembled ||
							normalizedCurrent?.includes(normalizedAssembled)
						)
							return safeCurrent;
						return [safeCurrent.trim(), assembledTranscript]
							.filter(Boolean)
							.join("\n");
					});
				}
				if (
					!options.silent ||
					assembly.missingChunkIndexes.length ||
					assembly.warnings.length
				) {
					const missing = assembly.missingChunkIndexes.length
						? ` · пропуски ${assembly.missingChunkIndexes.join(", ")}`
						: "";
					setSpeechStatusNote(
						`Запись собрана: ${assembly.chunkCount} фрагм.${missing}`,
					);
				}
				void loadSpeechRecordingRecovery({ silent: true });
				return assembly;
			} catch (assemblyError) {
				if (!options.silent) {
					showToast(
						actionFailureToast(
							"Не удалось собрать запись распознавания",
							(assemblyError as { status?: number })?.status ?? null,
						),
						"error",
					);
					setError(
						operatorWorkflowFailureMessage(
							"Не удалось собрать запись распознавания",
							assemblyError,
						),
					);
				}
				return null;
			}
		},
		[
			setSpeechStatusNote,
			setTranscript,
			auth.denteClinicalReadHeaders,
			dashboard?.activeVisit?.patientId,
			setError,
			visitDraftUserEditedRef,
			dashboard?.activeVisit?.id,
			loadSpeechRecordingRecovery,
		],
	);

	const trackSpeechUpload = useCallback((upload: Promise<void>) => {
		speechUploadPromisesRef.current.add(upload);
		upload
			.finally(() => speechUploadPromisesRef.current.delete(upload))
			.catch((err) => {
				logger.error("[Dente] speech upload error:", err);
				showToast(
					actionFailureToast(
						"Ошибка загрузки аудиозаписи",
						(err as { status?: number })?.status ?? null,
					),
					"error",
				);
			});
	}, []);

	const waitForSpeechUploads = useCallback(async () => {
		const pendingUploads = Array.from(speechUploadPromisesRef.current);
		if (pendingUploads.length) {
			await Promise.allSettled(pendingUploads);
		}
	}, []);

	const flushPendingSpeechChunksRef = useRef<
		((options?: { silent?: boolean }) => Promise<void>) | null
	>(null);

	const flushPendingSpeechChunks = useCallback(
		async (options: { silent?: boolean } = {}) => {
			return flushPendingSpeechChunksRef.current?.(options);
		},
		[],
	);

	flushPendingSpeechChunksRef.current = async (
		options: { silent?: boolean } = {},
	) => {
		const queue = await loadPendingSpeechChunks(activeOrganizationId);
		if (!queue.length) {
			await refreshPendingSpeechChunkState();
			return;
		}

		if (!isOnline) {
			await refreshPendingSpeechChunkState();
			if (!options.silent) {
				setSpeechStatusNote(
					`Очередь распознавания сохранена локально: ${queue.length} фрагм., отправка после подключения.`,
				);
			}
			return;
		}

		const currentGateway =
			(await loadSpeechGatewayStatus({ silent: true })) ?? speechGatewayStatus;
		const hasAudioWaitingForServer = queue.some((item) =>
			Boolean(item.audioBase64?.trim()),
		);
		if (hasAudioWaitingForServer && !speechGatewayCanUpload(currentGateway)) {
			await refreshPendingSpeechChunkState();
			if (!options.silent) {
				setSpeechStatusNote(
					`Очередь распознавания сохранена: ${queue.length} фрагм. Серверное распознавание еще не готово, аудио не удалено.`,
				);
			}
			return;
		}

		const flushedRecordingIds = new Set<string>();
		try {
			for (const item of queue) {
				const result = await submitSpeechChunk(item);
				applySpeechTranscription(result);
				await removePendingSpeechChunkById(item.id, activeOrganizationId);
				if (speechTranscriptionMatchesActiveVisit(result))
					flushedRecordingIds.add(item.recordingId);
				await refreshPendingSpeechChunkState();
			}
			for (const recordingId of flushedRecordingIds) {
				await assembleSpeechRecording(recordingId, { silent: true });
			}
		} catch (syncError) {
			if (!options.silent) {
				showToast(
					actionFailureToast(
						"Очередь распознавания пока не отправлена",
						(syncError as { status?: number })?.status ?? null,
					),
					"error",
				);
				setError(
					operatorWorkflowFailureMessage(
						"Очередь распознавания пока не отправлена",
						syncError,
					),
				);
			}
			await refreshPendingSpeechChunkState();
		}
	};

	const finalizeSpeechRecording = useCallback(
		async (recordingId: string) => {
			await waitForSpeechUploads();
			await flushPendingSpeechChunks({ silent: true });
			await assembleSpeechRecording(recordingId, { silent: true });
		},
		[flushPendingSpeechChunks, assembleSpeechRecording, waitForSpeechUploads],
	);

	const recording = useVisitSpeechRecording({
		dashboard,
		activeOrganizationId,
		isOnline,
		selectedSpecialty,
		speechGatewayStatus,
		setError,
		setSpeechStatusNote,
		appendVisitDictationText,
		submitSpeechChunk,
		applySpeechTranscription,
		refreshPendingSpeechChunkState,
		setImportSourceKind,
		setImportText,
		setImportPreview,
		setImportCommit,
	});

	return {
		...recording,
		speechUploadPromisesRef,
		appliedSpeechChunkKeysRef,
		speechProviderRuntimeById,
		speechProviderHealthById,
		activeSpeechProviderHealth,
		loadSpeechGatewayStatus,
		loadSpeechGatewayHealthReport,
		loadSpeechProviderRuntimeStatuses,
		loadSpeechRecordingStrategy,
		loadSpeechRecordingRecovery,
		refreshSpeechRuntime,
		refreshPendingSpeechChunkState,
		submitSpeechChunk,
		speechChunkApplyKey,
		speechTranscriptionMatchesActiveVisit,
		applySpeechTranscription,
		assembleSpeechRecording,
		trackSpeechUpload,
		waitForSpeechUploads,
		finalizeSpeechRecording,
		flushPendingSpeechChunks,
	};
}
