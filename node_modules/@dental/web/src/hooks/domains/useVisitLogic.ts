import {
	type AcceptVisitDraftResponse,
	buildRuleBasedVisitDraftFromTranscript,
	type DentalSpecialty,
	LocalBridgeReadinessResponse,
	normalizeDentalSpeechTranscript,
	type SpeechChunkUploadInput,
	type SpeechGatewayHealthReport,
	type SpeechGatewayStatus,
	type SpeechProviderRuntimeStatus,
	type SpeechRecordingAssembly,
	type SpeechRecordingRecoveryList,
	type SpeechRecordingStrategy,
	type SpeechTranscriptionResponse,
	type SpeechTranscriptPolishResponse,
	type VisitDraftAutosaveResponse,
	type VisitFlowResult,
	type VisitNoteDraft,
} from "@dental/shared";
import { useCallback, useEffect, useMemo, useRef } from "react";
import {
	acceptedVisitSaveFailureIsRetryable,
	appendSpeechTextWithoutDuplicateTail,
	type BrowserWindowWithSpeech,
	blobToBase64,
	buildOfflineVisitDraftFromTranscript,
	createLocalQueueId,
	emptyVisitNoteForm,
	latestPendingVisitSaveAt,
	loadPendingSpeechChunks,
	loadPendingVisitSaves,
	operatorReadableErrorDetail,
	operatorReadableErrorDetailFromUnknown,
	operatorWorkflowFailureMessage,
	queuePendingSpeechChunk,
	queuePendingVisitSave,
	removePendingSpeechChunkById,
	responseErrorMessage,
	responseStatusFailureLabel,
	savePendingVisitSaves,
	speechGatewayCanUpload,
	speechQualityLabels,
	type VisitNoteField,
	type VisitNoteForm,
	visitNoteDraftFromForm,
	visitNoteFieldDefinitions,
	visitNoteFormFromDraft,
	visitNoteFormFromVisit,
	WorkflowResponseError,
} from "../../AppHelpers";
import { motionSafeScrollIntoView } from "../../motionPreference";
import { useAppStore } from "../../store/appStore";
import { useVisitStore } from "../../store/visitStore";
import { useWorkspaceProfileStore } from "../useWorkspaceProfile";

export function useVisitLogic({
	dashboard,
	query,
	setError,
	auth,
	setDashboard,
	setQuery,
	selectedPatientId,
	documentPatient,
	activePatient,
	activeAppointment,
	activeDoctor,
	activeChair,
	paymentPatientContextReady,
	paymentPatientContextMessage,
	loadDashboard,
	clinicProfileDraft,
	patientCoreDraft,
	documentPatientMatchesActiveVisit,
	activeOrganizationId,
	importSourceKind,
	setImportSourceKind,
	importText,
	setImportText,
	setImportPreview,
	setImportCommit,
}: any) {
	const visitStore = useVisitStore();
	const appStore = useAppStore();

	const {
		selectedSpecialty,
		setSelectedSpecialty,
		selectedProtocolId,
		setSelectedProtocolId,
		clearedTranscriptSnapshot,
		setClearedTranscriptSnapshot,
		transcript,
		setTranscript,
		draft,
		setDraft,
		visitFlowResult,
		setVisitFlowResult,
		visitNoteForm,
		setVisitNoteForm,
		visitToothStateByCode,
		setToothState,
		applyAiToothCodes,
		lastServerDraftSavedAt,
		setLastServerDraftSavedAt,
		serverDraftSyncState,
		setServerDraftSyncState,
		localDraftWasRestored,
		setLocalDraftWasRestored,
		pendingVisitSaveCount,
		setPendingVisitSaveCount,
		lastPendingVisitSaveAt,
		setLastPendingVisitSaveAt,
		lastVisitSaveReceipt,
		setLastVisitSaveReceipt,
		speechLastQuality,
		setSpeechLastQuality,
		isDraftLoading,
		setIsDraftLoading,
		isDraftAccepting,
		setIsDraftAccepting,
		isPendingVisitSyncing,
		setIsPendingVisitSyncing,
		isVisitDictating,
		setIsVisitDictating,
		isTranscriptPolishing,
		setIsTranscriptPolishing,
		lastServerDraftSignatureRef,
		visitDraftUserEditedRef,
	} = visitStore;

	const {
		isOnline,
		speechGatewayHealthReport,
		setSpeechGatewayHealthReport,
		speechGatewayStatus,
		setSpeechGatewayStatus,
		speechProviderRuntimeStatuses,
		setSpeechProviderRuntimeStatuses,
		speechRecordingStrategy,
		setSpeechRecordingStrategy,
		speechRecordingRecovery,
		setSpeechRecordingRecovery,
		pendingSpeechChunkCount,
		setPendingSpeechChunkCount,
		speechStatusNote,
		setSpeechStatusNote,
		isImportDictating,
		setIsImportDictating,
	} = appStore;

	const mediaRecorderRef = useRef<MediaRecorder | null>(null);
	const mediaStreamRef = useRef<MediaStream | null>(null);
	const speechAudioContextRef = useRef<AudioContext | null>(null);
	const speechAnalyserRef = useRef<AnalyserNode | null>(null);
	const speechMonitorTimerRef = useRef<number | null>(null);
	const speechRecordingIdRef = useRef<string | null>(null);
	const speechChunkIndexRef = useRef(0);
	const speechSegmentStartedAtRef = useRef(0);
	const speechLastSoundAtRef = useRef(0);
	const speechPendingChunkDurationMsRef = useRef<number | null>(null);
	const speechUploadPromisesRef = useRef<Set<Promise<void>>>(new Set());
	const appliedSpeechChunkKeysRef = useRef<Set<string>>(new Set());

	const visitCloseChecklist = dashboard?.visitCloseChecklist ?? null;
	const visitWarnings =
		visitCloseChecklist?.items.filter((item: any) => !item.ready) ?? [];
	const primaryVisitWarning =
		visitWarnings?.find((item: any) => item.blocking) ??
		visitWarnings[0] ??
		null;
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
	const savedVisitNoteForm = useMemo(
		() =>
			dashboard
				? visitNoteFormFromVisit(dashboard.activeVisit)
				: emptyVisitNoteForm,
		[dashboard],
	);
	const isVisitNoteDirty = visitNoteFieldDefinitions.some(
		({ key }) => visitNoteForm[key] !== savedVisitNoteForm[key],
	);
	const hasVisitNoteFormText = visitNoteFieldDefinitions.some(
		({ key }) => visitNoteForm[key].trim().length > 0,
	);
	const hasVisitTranscriptText = transcript.trim().length > 0;
	const visitDraftBuildMissingSteps = [
		!activePatient ? "выберите пациента" : null,
		!hasVisitTranscriptText
			? "добавьте текст диктовки или нажмите голосовую запись"
			: null,
	].filter((step): step is string => Boolean(step));
	const visitDraftReadyToBuild = visitDraftBuildMissingSteps.length === 0;
	const visitNoteAcceptMissingSteps = [
		!hasVisitNoteFormText
			? "заполните хотя бы одно поле ЭМК или соберите черновик из диктовки"
			: null,
		!draft && !isVisitNoteDirty
			? "внесите правку в ЭМК или подготовьте новый черновик"
			: null,
	].filter((step): step is string => Boolean(step));
	const visitNoteReadyToAccept = visitNoteAcceptMissingSteps.length === 0;
	const visitNoteActionLabel = isDraftAccepting
		? "Сохраняю"
		: draft
			? "Принять"
			: isVisitNoteDirty
				? "Сохранить"
				: "Сохранено";
	const visitNoteStatusLabel = draft
		? "черновик готов"
		: isVisitNoteDirty
			? "есть правки"
			: "сохранено";
	const visitHasSavedNote = hasVisitNoteFormText && !draft && !isVisitNoteDirty;

	async function loadSpeechGatewayStatus(
		options: { silent?: boolean } = {},
	): Promise<SpeechGatewayStatus | null> {
		try {
			const response = await fetch("/api/speech/status", {
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
				setError(
					operatorWorkflowFailureMessage(
						"Шлюз распознавания речи недоступен",
						speechError,
					),
				);
			}
			return null;
		}
	}

	async function loadSpeechGatewayHealthReport(
		options: { silent?: boolean } = {},
	) {
		try {
			const response = await fetch("/api/speech/gateway-health", {
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
				setError(
					operatorWorkflowFailureMessage(
						"Проверка распознавания недоступна",
						speechHealthError,
					),
				);
			}
		}
	}

	async function loadSpeechProviderRuntimeStatuses(
		options: { silent?: boolean } = {},
	) {
		try {
			const response = await fetch("/api/speech/providers/runtime", {
				cache: "no-store",
				headers: auth.denteClinicalReadHeaders(),
			});
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
				setError(
					operatorWorkflowFailureMessage(
						"Провайдер распознавания недоступен",
						speechRuntimeError,
					),
				);
			}
		}
	}

	async function loadSpeechRecordingStrategy(
		options: { silent?: boolean } = {},
	) {
		try {
			const response = await fetch("/api/speech/recording-strategy", {
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
			});
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
				setError(
					operatorWorkflowFailureMessage(
						"Стратегия распознавания недоступна",
						speechStrategyError,
					),
				);
			}
		}
	}

	async function loadSpeechRecordingRecovery(
		options: { silent?: boolean } = {},
	) {
		try {
			if (!dashboard?.activeVisit?.id || !dashboard?.activeVisit?.patientId) {
				setSpeechRecordingRecovery(null);
				return;
			}
			const params = new URLSearchParams({ limit: "5" });
			params.set("visitId", dashboard?.activeVisit?.id);
			params.set("patientId", dashboard?.activeVisit?.patientId);
			const response = await fetch(
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
				setError(
					operatorWorkflowFailureMessage(
						"Восстановление диктовки недоступно",
						speechRecoveryError,
					),
				);
			}
		}
	}

	async function refreshSpeechRuntime(options: { silent?: boolean } = {}) {
		await Promise.all([
			loadSpeechGatewayStatus(options),
			loadSpeechGatewayHealthReport(options),
			loadSpeechProviderRuntimeStatuses(options),
			loadSpeechRecordingStrategy(options),
			loadSpeechRecordingRecovery(options),
		]);
	}

	async function refreshPendingVisitSaveState() {
		const pending = await loadPendingVisitSaves(activeOrganizationId);
		setPendingVisitSaveCount(pending.length);
		setLastPendingVisitSaveAt(latestPendingVisitSaveAt(pending));
	}

	async function refreshPendingSpeechChunkState() {
		setPendingSpeechChunkCount(
			(await loadPendingSpeechChunks(activeOrganizationId)).length,
		);
	}

	function applyAcceptedVisitResponse(result: AcceptVisitDraftResponse) {
		setDashboard((current) =>
			current
				? {
						...current,
						activeVisit: result.visit,
						visitCloseChecklist: result.visitCloseChecklist,
					}
				: current,
		);
		setDraft(null);
		setVisitNoteForm(visitNoteFormFromVisit(result.visit));
		setLastVisitSaveReceipt(result.saveReceipt);
		if (result.saveReceipt.warning) {
			setError(result.saveReceipt.warning);
		}
	}

	async function submitAcceptedVisitDraft(
		visitId: string | null | undefined,
		draftToAccept: VisitNoteDraft,
		doctorSummary: string | null,
		options: {
			clientMutationId?: string | null;
			baseRevision?: number | null;
			clientSavedAt?: string | null;
		} = {},
	) {
		if (!visitId)
			throw new WorkflowResponseError(
				"Откройте или создайте прием перед сохранением ЭМК.",
				409,
			);
		const response = await fetch(`/api/visits/${visitId}/draft/accept`, {
			method: "POST",
			headers: auth.denteClinicalMutationHeaders({
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({
				draft: draftToAccept,
				doctorSummary,
				clientMutationId: options.clientMutationId ?? null,
				baseRevision: options.baseRevision ?? null,
				clientSavedAt: options.clientSavedAt ?? new Date().toISOString(),
			}),
		});
		if (!response.ok) {
			throw new WorkflowResponseError(
				await responseErrorMessage(response, "Прием не принят"),
				response.status,
			);
		}
		return (await response.json()) as AcceptVisitDraftResponse;
	}

	function visitDraftSignature(
		nextTranscript: string,
		nextSpecialty: DentalSpecialty,
		nextForm: VisitNoteForm,
	) {
		return JSON.stringify([nextTranscript, nextSpecialty, nextForm]);
	}

	async function loadServerVisitDraft(
		visitId: string | null | undefined,
	): Promise<VisitDraftAutosaveResponse> {
		if (!visitId) return { serverDraft: null };
		const response = await fetch(`/api/visits/${visitId}/draft/autosave`, {
			cache: "no-store",
			headers: auth.denteClinicalReadHeaders(),
		});
		if (!response.ok)
			throw new Error(
				await responseErrorMessage(response, "Серверный черновик не загружен"),
			);
		return (await response.json()) as VisitDraftAutosaveResponse;
	}

	async function syncVisitDraftAutosave(
		clientSavedAt: string,
		options: { silent?: boolean } = {},
	) {
		if (!dashboard?.activeVisit?.id) return;
		const signature = visitDraftSignature(
			transcript,
			selectedSpecialty,
			visitNoteForm,
		);
		if (lastServerDraftSignatureRef.current === signature) return;
		if (!transcript.trim() && !hasVisitNoteFormText) return;

		if (!isOnline) {
			setServerDraftSyncState("queued");
			return;
		}

		setServerDraftSyncState("saving");
		try {
			const response = await fetch(
				`/api/visits/${dashboard?.activeVisit?.id}/draft/autosave`,
				{
					method: "PUT",
					headers: auth.denteClinicalMutationHeaders({
						"Content-Type": "application/json",
					}),
					body: JSON.stringify({
						patientId: dashboard?.activeVisit?.patientId,
						selectedSpecialty,
						transcript,
						draft: visitNoteDraftFromForm(visitNoteForm, [
							"Серверный снимок автосохранения. Перед принятием черновика ЭМК врач все равно проверяет текст.",
						]),
						baseRevision: dashboard?.activeVisit?.revision ?? null,
						clientDraftId: `visit-draft-${dashboard?.activeVisit?.id}`,
						clientSavedAt,
					}),
				},
			);
			if (!response.ok)
				throw new Error(
					await responseErrorMessage(
						response,
						"Серверный черновик не сохранен",
					),
				);
			const result = (await response.json()) as VisitDraftAutosaveResponse;
			lastServerDraftSignatureRef.current = signature;
			setLastServerDraftSavedAt(
				result.serverDraft?.serverSavedAt ?? clientSavedAt,
			);
			setServerDraftSyncState("saved");
		} catch (syncError) {
			setServerDraftSyncState("error");
			if (!options.silent) {
				setError(
					operatorWorkflowFailureMessage(
						"Серверный черновик не сохранен",
						syncError,
					),
				);
			}
		}
	}

	async function flushPendingVisitSaves(options: { silent?: boolean } = {}) {
		if (isPendingVisitSyncing) return;
		const pending = await loadPendingVisitSaves(activeOrganizationId);
		if (!pending.length) {
			await refreshPendingVisitSaveState();
			return;
		}

		setIsPendingVisitSyncing(true);
		let remaining = [...pending];
		try {
			const promises = pending.map(async (item) => {
				const result = await submitAcceptedVisitDraft(
					item.visitId,
					item.draft,
					item.doctorSummary,
					{
						clientMutationId: item.clientMutationId,
						baseRevision: item.baseRevision,
						clientSavedAt: item.queuedAt,
					},
				);
				return { item, result };
			});

			const outcomes = await Promise.allSettled(promises);
			const errors: unknown[] = [];

			for (const outcome of outcomes) {
				if (outcome.status === "fulfilled") {
					const { item, result } = outcome.value;
					remaining = remaining.filter((candidate) => candidate.id !== item.id);
					if (dashboard?.activeVisit?.id === result.visit.id) {
						applyAcceptedVisitResponse(result);
					}
				} else {
					errors.push(outcome.reason);
				}
			}

			await savePendingVisitSaves(remaining, activeOrganizationId);

			if (errors.length > 0) {
				throw errors[0];
			}

			await refreshPendingVisitSaveState();
		} catch (syncError) {
			await savePendingVisitSaves(remaining, activeOrganizationId);
			await refreshPendingVisitSaveState();
			if (!options.silent) {
				setError(
					operatorWorkflowFailureMessage(
						"Сервер пока не принял очередь",
						syncError,
					),
				);
			}
		} finally {
			setIsPendingVisitSyncing(false);
		}
	}

	async function submitSpeechChunk(
		input: SpeechChunkUploadInput,
	): Promise<SpeechTranscriptionResponse> {
		const response = await fetch("/api/speech/transcribe-chunk", {
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
			throw new Error(`РаспознаИвание речи не выполнено: ${detail}`);
		}
		return payload;
	}

	function speechChunkApplyKey(result: SpeechTranscriptionResponse): string {
		return `${result.chunk.recordingId}:${result.chunk.chunkIndex}`;
	}

	function speechTranscriptionMatchesActiveVisit(
		result: SpeechTranscriptionResponse,
	): boolean {
		if (
			result.chunk.source !== "visit" ||
			!result.chunk.visitId ||
			!dashboard?.activeVisit?.id
		)
			return true;
		return result.chunk.visitId === dashboard?.activeVisit?.id;
	}

	function applySpeechTranscription(result: SpeechTranscriptionResponse) {
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
				: ` В· ${speechQualityLabels[quality.level]}`;
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
	}

	async function assembleSpeechRecording(
		recordingId: string,
		options: { silent?: boolean } = {},
	) {
		try {
			const params = new URLSearchParams();
			if (dashboard?.activeVisit?.id)
				params.set("visitId", dashboard?.activeVisit?.id);
			if (dashboard?.activeVisit?.patientId)
				params.set("patientId", dashboard?.activeVisit?.patientId);
			const scopedQuery = params.toString();
			const response = await fetch(
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
				setTranscript((current: any) => {
					const normalizedCurrent = current.replace(/\s+/g, " ").trim();
					const normalizedAssembled = assembledTranscript
						.replace(/\s+/g, " ")
						.trim();
					if (
						!normalizedAssembled ||
						normalizedCurrent.includes(normalizedAssembled)
					)
						return current;
					return [current.trim(), assembledTranscript]
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
					? ` В· пропуски ${assembly.missingChunkIndexes.join(", ")}`
					: "";
				setSpeechStatusNote(
					`Запись собрана: ${assembly.chunkCount} фрагм.${missing}`,
				);
			}
			void loadSpeechRecordingRecovery({ silent: true });
			return assembly;
		} catch (assemblyError) {
			if (!options.silent) {
				setError(
					operatorWorkflowFailureMessage(
						"Не удалось собрать запись распознавания",
						assemblyError,
					),
				);
			}
			return null;
		}
	}

	function trackSpeechUpload(upload: Promise<void>) {
		speechUploadPromisesRef.current.add(upload);
		upload
			.finally(() => speechUploadPromisesRef.current.delete(upload))
			.catch(() => undefined);
	}

	async function waitForSpeechUploads() {
		const pendingUploads = Array.from(speechUploadPromisesRef.current);
		if (pendingUploads.length) {
			await Promise.allSettled(pendingUploads);
		}
	}

	async function finalizeSpeechRecording(recordingId: string) {
		await waitForSpeechUploads();
		await flushPendingSpeechChunks({ silent: true });
		await assembleSpeechRecording(recordingId, { silent: true });
	}

	async function flushPendingSpeechChunks(options: { silent?: boolean } = {}) {
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
			await refreshPendingSpeechChunkState();
			if (!options.silent) {
				setError(
					operatorWorkflowFailureMessage(
						"Очередь распознавания пока не отправлена",
						syncError,
					),
				);
			}
		}
	}

	function scrollToVisitArea(selector: string) {
		window.location.hash = "visit";
		window.requestAnimationFrame(() => {
			motionSafeScrollIntoView(document.querySelector(selector), {
				block: "start",
			});
		});
	}

	function appendToTranscript(text: string) {
		visitDraftUserEditedRef.current = true;
		setClearedTranscriptSnapshot(null);
		setTranscript((current: any) =>
			appendSpeechTextWithoutDuplicateTail(
				current,
				text,
				speechGatewayStatus?.chunkingPolicy.dedupeWindowChars ?? 600,
			),
		);
	}

	function updateVisitNoteField(field: VisitNoteField, value: string) {
		visitDraftUserEditedRef.current = true;
		setVisitNoteForm((current) => ({ ...current, [field]: value }));
	}

	function buildOfflineDraft() {
		if (!hasVisitTranscriptText) {
			setError("Добавьте текст диктовки перед локальным разбором.");
			return;
		}
		visitDraftUserEditedRef.current = true;
		const fallbackDraft = buildOfflineVisitDraftFromTranscript(
			transcript,
			selectedSpecialty,
		);
		setDraft(fallbackDraft);
		setVisitNoteForm(visitNoteFormFromDraft(fallbackDraft));
		scrollToVisitArea(".visit-note-panel");
	}

	function openVisitWarningAction() {
		if (!primaryVisitWarning) {
			scrollToVisitArea(".close-checklist");
			return;
		}
		if (primaryVisitWarning.section === "visit") {
			if (primaryVisitWarning.id === "ai-draft-review") {
				scrollToVisitArea(".ai-draft");
				return;
			}
			if (primaryVisitWarning.id === "clinical-rules") {
				const warningPanel = document.querySelector(
					".clinical-rule-panel-compact",
				);
				if (warningPanel instanceof HTMLDetailsElement) {
					warningPanel.open = true;
				}
				scrollToVisitArea(".clinical-rule-panel");
				return;
			}
			scrollToVisitArea(".close-checklist");
			return;
		}
		window.location.hash = primaryVisitWarning.section;
	}

	async function polishTranscript() {
		if (!hasVisitTranscriptText) {
			setError(
				"Перед очисткой диктовки: добавьте текст диктовки или нажмите голосовую запись.",
			);
			return;
		}
		visitDraftUserEditedRef.current = true;
		setIsTranscriptPolishing(true);
		try {
			const response = await fetch("/api/speech/polish-transcript", {
				method: "POST",
				headers: auth.denteClinicalMutationHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify({
					transcript,
					specialty: selectedSpecialty,
					source: "voice",
				}),
			});
			if (!response.ok) {
				throw new Error(
					await responseErrorMessage(
						response,
						"Серверная очистка диктовки недоступна",
					),
				);
			}
			const result = (await response.json()) as SpeechTranscriptPolishResponse;
			setTranscript(result.normalizedTranscript);
			setDraft(result.draft);
			setVisitNoteForm(visitNoteFormFromDraft(result.draft));
			const polishLabel =
				result.polishMode === "deterministic_neural"
					? `ИИ-полировка ${result.modelName ?? ""}`.trim()
					: "локальная проверка правил";
			setSpeechStatusNote(
				result.changedPhrases.length
					? `Текст очищен (${polishLabel}): ${result.changedPhrases.slice(0, 4).join(", ")}`
					: `Текст проверен (${polishLabel}): факты не добавлялись.`,
			);
		} catch (polishError) {
			const local = normalizeDentalSpeechTranscript(
				transcript,
				selectedSpecialty,
			);
			const localDraft = buildRuleBasedVisitDraftFromTranscript(
				local.normalizedText,
				selectedSpecialty,
				{
					sourceLabel: "Локальная очистка диктовки",
				},
			);
			setTranscript(local.normalizedText);
			setDraft(localDraft);
			setVisitNoteForm(visitNoteFormFromDraft(localDraft));
			setSpeechStatusNote("Текст очищен локальным разбором без сервера.");
			if (polishError instanceof Error) {
				setError(
					`${operatorWorkflowFailureMessage("Серверная очистка недоступна", polishError)} Использован локальный разбор.`,
				);
			}
		} finally {
			setIsTranscriptPolishing(false);
		}
	}

	async function buildDraft() {
		if (!dashboard || !activePatient || !hasVisitTranscriptText) {
			const missingSteps = [
				!dashboard ? "дождитесь загрузки приема" : null,
				...visitDraftBuildMissingSteps,
			].filter((step): step is string => Boolean(step));
			setError(`Перед сборкой черновика: ${missingSteps.join(", ")}.`);
			return;
		}
		visitDraftUserEditedRef.current = true;
		setIsDraftLoading(true);
		try {
			const {
				aiEnableTreatmentPlan,
				aiEnableRecommendations,
				aiEnableDocuments,
			} = useWorkspaceProfileStore.getState();

			const response = await fetch("/api/ai/visit-flow", {
				method: "POST",
				headers: auth.denteClinicalReadHeaders({
					"Content-Type": "application/json",
				}),
				body: JSON.stringify({
					patientId: activePatient.id,
					transcript,
					specialty: selectedSpecialty,
					source: "voice",
					completedServices: dashboard?.activeVisit?.completedServices ?? [],
					doctorFullName: activeDoctor?.fullName ?? undefined,
					planPayload: null, // extracted inside flow
					recommendationsPayload: null,
					orchestratorConfig: {
						enablePlan: aiEnableTreatmentPlan,
						enableRecommendations: aiEnableRecommendations,
						enableDocuments: aiEnableDocuments,
					},
				}),
			});
			if (!response.ok) {
				throw new Error(
					await responseErrorMessage(
						response,
						"Серверный поток визита недоступен",
					),
				);
			}
			const result = (await response.json()) as VisitFlowResult;
			setVisitFlowResult(result);

			if (result.draft.data) {
				setDraft(result.draft.data);
				setVisitNoteForm(visitNoteFormFromDraft(result.draft.data));
				// Auto-update tooth map from AI-detected tooth codes
				if (
					result.draft.data.quality?.detectedToothCodes?.length ||
					result.draft.data.quality?.detectedToothStates
				) {
					applyAiToothCodes(
						result.draft.data.quality?.detectedToothCodes || [],
						"planned",
						result.draft.data.quality?.detectedToothStates as any,
					);
				}
			}
			scrollToVisitArea(".visit-note-panel");
		} catch (draftError) {
			const fallbackDraft = buildOfflineVisitDraftFromTranscript(
				transcript,
				selectedSpecialty,
			);
			setDraft(fallbackDraft);
			setVisitNoteForm(visitNoteFormFromDraft(fallbackDraft));
			scrollToVisitArea(".visit-note-panel");
			setError(
				`${operatorWorkflowFailureMessage("Серверный черновик недоступен", draftError)} Включен офлайн-разбор.`,
			);
		} finally {
			setIsDraftLoading(false);
		}
	}

	async function acceptDraftToVisit() {
		if (!dashboard?.activeVisit?.id) {
			setError("Откройте или создайте прием перед сохранением ЭМК.");
			return;
		}
		if (!visitNoteReadyToAccept) {
			setError(
				`Перед сохранением приема: ${visitNoteAcceptMissingSteps.join(", ")}.`,
			);
			return;
		}
		setIsDraftAccepting(true);
		const acceptedDraft = visitNoteDraftFromForm(
			visitNoteForm,
			draft?.warnings ?? [
				"Правки внесены врачом вручную. Подпись приема остается отдельным действием.",
			],
		);
		const doctorSummary = acceptedDraft.warnings.join(" ");
		const clientMutationId = createLocalQueueId();
		const baseRevision = dashboard?.activeVisit?.revision ?? null;
		try {
			const result = await submitAcceptedVisitDraft(
				dashboard?.activeVisit?.id,
				acceptedDraft,
				doctorSummary,
				{
					clientMutationId,
					baseRevision,
					clientSavedAt: new Date().toISOString(),
				},
			);
			applyAcceptedVisitResponse(result);
			scrollToVisitArea(".visit-fields");
		} catch (acceptError) {
			if (!acceptedVisitSaveFailureIsRetryable(acceptError)) {
				setError(
					operatorWorkflowFailureMessage("Прием не принят", acceptError),
				);
				return;
			}
			const queued = await queuePendingVisitSave(
				{
					visitId: dashboard?.activeVisit?.id,
					clientMutationId,
					baseRevision,
					draft: acceptedDraft,
					doctorSummary,
					transcript,
					selectedSpecialty,
				},
				activeOrganizationId,
			);
			await refreshPendingVisitSaveState();
			const optimisticVisit = {
				...dashboard.activeVisit,
				complaint: acceptedDraft.complaint,
				anamnesis: acceptedDraft.anamnesis,
				objectiveStatus: acceptedDraft.objectiveStatus,
				diagnosis: acceptedDraft.diagnosis,
				treatmentPlan: acceptedDraft.treatmentPlan,
				doctorSummary:
					doctorSummary ||
					"Черновик ЭМК принят врачом локально и ожидает синхронизацию.",
				updatedAt: queued.queuedAt,
			};
			setDashboard((current) =>
				current ? { ...current, activeVisit: optimisticVisit } : current,
			);
			setDraft(null);
			setVisitNoteForm(visitNoteFormFromVisit(optimisticVisit));
			scrollToVisitArea(".visit-fields");
			setError(
				`${operatorWorkflowFailureMessage("Серверное сохранение недоступно", acceptError)} Прием сохранен локально и поставлен в очередь.`,
			);
		} finally {
			setIsDraftAccepting(false);
		}
	}

	function appendVisitDictationText(value: string) {
		const cleanValue = value.trim();
		if (!cleanValue) return;
		visitDraftUserEditedRef.current = true;
		setClearedTranscriptSnapshot(null);
		setTranscript((current: any) =>
			appendSpeechTextWithoutDuplicateTail(
				current,
				cleanValue,
				speechGatewayStatus?.chunkingPolicy.dedupeWindowChars ?? 600,
			),
		);
		setDraft(null);
	}

	function clearTranscriptWithUndo() {
		const previousTranscript = transcript;
		if (!previousTranscript.trim()) {
			setSpeechStatusNote("Диктовка уже пустая. Нечего очищать.");
			return;
		}
		visitDraftUserEditedRef.current = true;
		setClearedTranscriptSnapshot(previousTranscript);
		setTranscript("");
		setSpeechStatusNote(
			"Диктовка очищена. Можно сразу вернуть текст кнопкой В«ВернутьВ».",
		);
	}

	function undoTranscriptClear() {
		if (!clearedTranscriptSnapshot) {
			setSpeechStatusNote("Нет очищенной диктовки для восстановления.");
			return;
		}
		visitDraftUserEditedRef.current = true;
		setTranscript(clearedTranscriptSnapshot);
		setClearedTranscriptSnapshot(null);
		setSpeechStatusNote("Диктовка восстановлена из локального черновика.");
	}

	function startVisitDictation() {
		if (isVisitDictating) {
			setError("Дождитесь завершения текущей браузерной диктовки.");
			return;
		}
		const speechWindow = window as BrowserWindowWithSpeech;
		const Recognition =
			speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
		if (!Recognition) {
			setError(
				"Браузерная диктовка недоступна. Текст можно печатать вручную, локальный черновик все равно сохранится.",
			);
			return;
		}

		const recognition = new Recognition();
		recognition.lang = "ru-RU";
		recognition.continuous = false;
		recognition.interimResults = false;
		recognition.onresult = (event) => {
			const transcriptText = Array.from(event.results)
				.map((result) => result[0].transcript)
				.join(" ");
			appendVisitDictationText(transcriptText);
		};
		recognition.onerror = () => {
			setError(
				"Диктовка не распознана. Продолжайте печатать, текущий черновик не потерян.",
			);
			setIsVisitDictating(false);
		};
		recognition.onend = () => setIsVisitDictating(false);
		setError(null);
		setIsVisitDictating(true);
		try {
			recognition.start();
		} catch {
			setIsVisitDictating(false);
			setError(
				"Браузер не смог запустить микрофон. Текст можно продолжить вручную.",
			);
		}
	}

	function preferredSpeechMimeType(): string {
		const candidates = [
			"audio/webm;codecs=opus",
			"audio/webm",
			"audio/ogg;codecs=opus",
			"audio/mp4",
		];
		return (
			candidates?.find((mimeType) => MediaRecorder.isTypeSupported(mimeType)) ??
			""
		);
	}

	async function uploadSpeechBlob(blob: Blob) {
		if (!dashboard || blob.size === 0) return;
		const maxChunkBytes = speechGatewayStatus?.maxChunkBytes ?? 6_000_000;
		if (blob.size > maxChunkBytes) {
			setSpeechStatusNote(
				`РаспознаИвание: аудио-фрагмент ${Math.round(blob.size / 1024 / 1024)} МБ больше лимита ${Math.round(
					maxChunkBytes / 1024 / 1024,
				)} МБ; запись продолжается, уменьшите длительность чанка или используйте локальный модуль.`,
			);
			return;
		}
		const audioBase64 = await blobToBase64(blob);
		const chunkIndex = speechChunkIndexRef.current;
		speechChunkIndexRef.current += 1;
		const durationMs =
			speechPendingChunkDurationMsRef.current ??
			speechGatewayStatus?.recommendedChunkMs ??
			15_000;
		speechPendingChunkDurationMsRef.current = null;
		const chunk: SpeechChunkUploadInput = {
			recordingId: speechRecordingIdRef.current ?? createLocalQueueId(),
			chunkIndex,
			mimeType: blob.type || "audio/webm",
			audioBase64,
			durationMs,
			language: "ru",
			source: "visit",
			patientId: dashboard?.activeVisit?.patientId,
			visitId: dashboard?.activeVisit?.id,
			specialty: selectedSpecialty,
			clientRecordedAt: new Date().toISOString(),
		};
		const queuedBeforeUpload = await queuePendingSpeechChunk(
			chunk,
			activeOrganizationId,
		);
		await refreshPendingSpeechChunkState();

		if (!isOnline || !speechGatewayCanUpload(speechGatewayStatus)) {
			setSpeechStatusNote(
				queuedBeforeUpload
					? `Фрагмент ${chunkIndex + 1} сохранен локально; распознавание отправится, когда источник будет готов.`
					: `Фрагмент ${chunkIndex + 1} не сохранен: локальная очередь недоступна.`,
			);
			return;
		}

		try {
			const result = await submitSpeechChunk(chunk);
			applySpeechTranscription(result);
			if (queuedBeforeUpload) {
				await removePendingSpeechChunkById(
					queuedBeforeUpload.id,
					activeOrganizationId,
				);
				await refreshPendingSpeechChunkState();
			}
		} catch (speechError) {
			const queued =
				queuedBeforeUpload ??
				(await queuePendingSpeechChunk(chunk, activeOrganizationId));
			await refreshPendingSpeechChunkState();
			setSpeechStatusNote(
				queued
					? `Фрагмент ${chunkIndex + 1} сохранен локально и уйдет на сервер позже.`
					: `Фрагмент ${chunkIndex + 1} не отправлен: ${
							operatorReadableErrorDetailFromUnknown(speechError) ??
							"повторите запись или проверьте подключение к серверу клиники"
						}.`,
			);
		}
	}

	function stopSpeechMonitor() {
		if (speechMonitorTimerRef.current !== null) {
			window.clearInterval(speechMonitorTimerRef.current);
			speechMonitorTimerRef.current = null;
		}
		speechAudioContextRef.current?.close().catch(() => undefined);
		speechAudioContextRef.current = null;
		speechAnalyserRef.current = null;
	}

	function requestSpeechChunk(reason: "silence" | "max_time" | "manual") {
		const recorder = mediaRecorderRef.current;
		if (!recorder || recorder.state !== "recording") return;
		try {
			const now = Date.now();
			const durationMs = Math.max(
				250,
				Math.min(
					now - speechSegmentStartedAtRef.current,
					speechGatewayStatus?.chunkingPolicy.maxChunkMs ?? 25_000,
				),
			);
			speechPendingChunkDurationMsRef.current = durationMs;
			recorder.requestData();
			speechSegmentStartedAtRef.current = now;
			speechLastSoundAtRef.current = now;
			if (reason !== "manual") {
				setSpeechStatusNote(
					reason === "silence"
						? "Фрагмент отправлен после паузы."
						: "Фрагмент отправлен по лимиту времени.",
				);
			}
		} catch {
			setSpeechStatusNote(
				"Браузер не отдал аудио-фрагмент, запись продолжается.",
			);
		}
	}

	function startSpeechMonitor(
		stream: MediaStream,
		recorder: MediaRecorder,
		status: SpeechGatewayStatus | null,
	) {
		stopSpeechMonitor();
		const audioWindow = window as BrowserWindowWithSpeech;
		const AudioContextClass =
			window.AudioContext ?? audioWindow.webkitAudioContext;
		const providerLabel = status?.providerLabel ?? "Локальная запись";
		const chunkingPolicy = status?.chunkingPolicy ?? {
			strategy: "time_and_silence" as const,
			minChunkMs: 10_000,
			maxChunkMs: 25_000,
			silenceMs: 900,
			rmsThreshold: 0.015,
			monitorIntervalMs: 250,
			overlapMs: 500,
			dedupeWindowChars: 600,
		};
		const recommendedChunkMs = status?.recommendedChunkMs ?? 15_000;
		if (!AudioContextClass) {
			recorder.start(recommendedChunkMs);
			setSpeechStatusNote(
				`${providerLabel}: запись идет по таймеру, Web Audio недоступен.`,
			);
			return;
		}

		try {
			const audioContext = new AudioContextClass();
			const source = audioContext.createMediaStreamSource(stream);
			const analyser = audioContext.createAnalyser();
			analyser.fftSize = 1024;
			analyser.smoothingTimeConstant = 0.25;
			source.connect(analyser);
			speechAudioContextRef.current = audioContext;
			speechAnalyserRef.current = analyser;
			speechSegmentStartedAtRef.current = Date.now();
			speechLastSoundAtRef.current = Date.now();
			recorder.start(
				Math.max(1000, Math.min(recommendedChunkMs, chunkingPolicy.maxChunkMs)),
			);
			const samples = new Uint8Array(analyser.fftSize);
			speechMonitorTimerRef.current = window.setInterval(() => {
				analyser.getByteTimeDomainData(samples);
				let sumSquares = 0;
				for (const sample of samples) {
					const centered = (sample - 128) / 128;
					sumSquares += centered * centered;
				}
				const rms = Math.sqrt(sumSquares / samples.length);
				const now = Date.now();
				const segmentAgeMs = now - speechSegmentStartedAtRef.current;
				if (rms >= chunkingPolicy.rmsThreshold) {
					speechLastSoundAtRef.current = now;
				}
				const silentForMs = now - speechLastSoundAtRef.current;
				if (segmentAgeMs >= chunkingPolicy.maxChunkMs) {
					requestSpeechChunk("max_time");
					return;
				}
				if (
					segmentAgeMs >= chunkingPolicy.minChunkMs &&
					silentForMs >= chunkingPolicy.silenceMs
				) {
					requestSpeechChunk("silence");
				}
			}, chunkingPolicy.monitorIntervalMs);
			setSpeechStatusNote(
				`${providerLabel}: умные фрагменты ${Math.round(chunkingPolicy.minChunkMs / 1000)}-${Math.round(
					chunkingPolicy.maxChunkMs / 1000,
				)} сек., пауза ${chunkingPolicy.silenceMs} мс.`,
			);
		} catch {
			stopSpeechMonitor();
			recorder.start(recommendedChunkMs);
			setSpeechStatusNote(
				`${providerLabel}: запись идет по таймеру, умное деление недоступно.`,
			);
		}
	}

	function startImportDictation() {
		if (isImportDictating) {
			setError("Дождитесь завершения текущей диктовки импорта.");
			return;
		}
		const speechWindow = window as BrowserWindowWithSpeech;
		const Recognition =
			speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
		if (!Recognition) {
			setImportSourceKind("voice_dictation");
			setImportText(
				(current) =>
					`${current}\n\nДиктовка недоступна в этом браузере. Вставь распознанный текст сюда: Иванов Иван, телефон +7 900 000-00-00, дата рождения 01.01.1980.`,
			);
			setError(
				"Браузерная диктовка импорта недоступна. Вставьте список пациентов вручную или загрузите OCR.",
			);
			return;
		}
		const recognition = new Recognition();
		recognition.lang = "ru-RU";
		recognition.continuous = false;
		recognition.interimResults = false;
		recognition.onresult = (event) => {
			const transcriptText = Array.from(event.results)
				.map((result) => result[0].transcript)
				.join(" ");
			setImportSourceKind("voice_dictation");
			setImportText((current) => `${current.trim()}\n${transcriptText}`.trim());
			setImportPreview(null);
			setImportCommit(null);
		};
		recognition.onerror = () => {
			setImportSourceKind("voice_dictation");
			setIsImportDictating(false);
			setError(
				"Диктовка импорта не распознана. Вставьте список вручную или загрузите OCR.",
			);
		};
		recognition.onend = () => setIsImportDictating(false);
		setError(null);
		setIsImportDictating(true);
		try {
			recognition.start();
		} catch {
			setIsImportDictating(false);
			setError(
				"Браузер не смог запустить микрофон для импорта. Вставьте список пациентов вручную или загрузите файл.",
			);
		}
	}

	return {
		...visitStore,
		isOnline,
		speechGatewayHealthReport,
		speechGatewayStatus,
		speechProviderRuntimeStatuses,
		speechRecordingStrategy,
		speechRecordingRecovery,
		pendingSpeechChunkCount,
		speechStatusNote,
		isImportDictating,
		mediaRecorderRef,
		mediaStreamRef,
		speechAudioContextRef,
		speechAnalyserRef,
		speechMonitorTimerRef,
		speechRecordingIdRef,
		speechChunkIndexRef,
		speechSegmentStartedAtRef,
		speechLastSoundAtRef,
		speechPendingChunkDurationMsRef,
		speechUploadPromisesRef,
		appliedSpeechChunkKeysRef,
		visitCloseChecklist,
		visitWarnings,
		primaryVisitWarning,
		speechProviderRuntimeById,
		speechProviderHealthById,
		activeSpeechProviderHealth,
		savedVisitNoteForm,
		isVisitNoteDirty,
		hasVisitNoteFormText,
		hasVisitTranscriptText,
		visitFlowResult,
		visitDraftBuildMissingSteps,
		visitDraftReadyToBuild,
		visitNoteAcceptMissingSteps,
		visitNoteReadyToAccept,
		visitNoteActionLabel,
		visitNoteStatusLabel,
		visitHasSavedNote,
		loadSpeechGatewayStatus,
		loadSpeechGatewayHealthReport,
		loadSpeechProviderRuntimeStatuses,
		loadSpeechRecordingStrategy,
		loadSpeechRecordingRecovery,
		refreshSpeechRuntime,
		refreshPendingVisitSaveState,
		refreshPendingSpeechChunkState,
		applyAcceptedVisitResponse,
		submitAcceptedVisitDraft,
		visitDraftSignature,
		loadServerVisitDraft,
		syncVisitDraftAutosave,
		flushPendingVisitSaves,
		submitSpeechChunk,
		speechChunkApplyKey,
		speechTranscriptionMatchesActiveVisit,
		applySpeechTranscription,
		assembleSpeechRecording,
		trackSpeechUpload,
		waitForSpeechUploads,
		finalizeSpeechRecording,
		flushPendingSpeechChunks,
		scrollToVisitArea,
		appendToTranscript,
		updateVisitNoteField,
		buildOfflineDraft,
		openVisitWarningAction,
		polishTranscript,
		buildDraft,
		acceptDraftToVisit,
		appendVisitDictationText,
		clearTranscriptWithUndo,
		undoTranscriptClear,
		startVisitDictation,
		preferredSpeechMimeType,
		uploadSpeechBlob,
		stopSpeechMonitor,
		requestSpeechChunk,
		startSpeechMonitor,
		startImportDictation,
	};
}
