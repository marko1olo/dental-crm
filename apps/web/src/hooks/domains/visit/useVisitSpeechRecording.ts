import type { SpeechChunkUploadInput } from "@dental/shared";
import { useCallback, useEffect, useRef } from "react";
import {
	type BrowserWindowWithSpeech,
	blobToBase64,
	createLocalQueueId,
	operatorReadableErrorDetailFromUnknown,
	queuePendingSpeechChunk,
	removePendingSpeechChunkById,
	speechGatewayCanUpload,
} from "../../AppHelpers";
import { showToast } from "../../components/GlobalToast";
import { actionFailureToast } from "../../lib/panelStateText";
import { UnifiedAudioClient } from "../../services/voice/UnifiedAudioClient";
import { useAppStore } from "../../store/appStore";
import { useVisitStore } from "../../store/visitStore";
import { logger } from "../../utils/logger";
import { preferredSpeechMimeType } from "./helpers";
import type {
	UseVisitSpeechRecordingParams,
	UseVisitSpeechRecordingReturn,
} from "./types";

export function useVisitSpeechRecording({
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
}: UseVisitSpeechRecordingParams): UseVisitSpeechRecordingReturn {
	const visitStore = useVisitStore();
	const appStore = useAppStore();

	const { isVisitDictating, setIsVisitDictating } = visitStore;
	const { isImportDictating, setIsImportDictating } = appStore;

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
	const importDictationClientRef = useRef<UnifiedAudioClient | null>(null);

	const stopSpeechMonitor = useCallback(() => {
		if (speechMonitorTimerRef.current !== null) {
			window.clearInterval(speechMonitorTimerRef.current);
			speechMonitorTimerRef.current = null;
		}
		speechAudioContextRef.current?.close().catch((err) => {
			logger.error("[Dente] audio context close error:", err);
			showToast(
				actionFailureToast(
					"Ошибка завершения аудиосессии",
					(err as { status?: number })?.status ?? null,
				),
				"error",
			);
		});
		speechAudioContextRef.current = null;
		speechAnalyserRef.current = null;
	}, []);

	const requestSpeechChunk = useCallback(
		(reason: "silence" | "max_time" | "manual") => {
			const recorder = mediaRecorderRef.current;
			if (recorder?.state !== "recording") return;
			try {
				const now = Date.now();
				const durationMs = Math.max(
					250,
					Math.min(
						now - speechSegmentStartedAtRef.current,
						speechGatewayStatus?.chunkingPolicy?.maxChunkMs ?? 25_000,
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
		},
		[speechGatewayStatus?.chunkingPolicy?.maxChunkMs, setSpeechStatusNote],
	);

	const startSpeechMonitor = useCallback(
		(
			stream: MediaStream,
			recorder: MediaRecorder,
			status: typeof speechGatewayStatus,
		) => {
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
					Math.max(
						1000,
						Math.min(recommendedChunkMs, chunkingPolicy.maxChunkMs),
					),
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
		},
		[stopSpeechMonitor, setSpeechStatusNote, requestSpeechChunk],
	);

	const startVisitDictation = useCallback(() => {
		if (isVisitDictating) {
			setError("Дождитесь завершения текущей диктовки.");
			return;
		}

		const client = new UnifiedAudioClient({
			preferredMode: "gemini_live",
			specialty: "therapy",
			autoFallback: true,
		});

		client.subscribe({
			onFinalText: (text) => {
				if (text && text.trim()) {
					appendVisitDictationText(text.trim());
				}
			},
			onStateChange: (state) => {
				setIsVisitDictating(state === "listening" || state === "connecting");
			},
			onError: (err) => {
				const msg = typeof err === "string" ? err : err.message;
				setError(`Диктовка: ${msg}`);
				setIsVisitDictating(false);
			},
		});

		setError(null);
		setIsVisitDictating(true);
		client.start().catch(() => {
			showToast(
				actionFailureToast("Операция завершилась ошибкой", null),
				"error",
			);
			setIsVisitDictating(false);
			setError(
				"Не удалось запустить микрофон. Текст можно продолжить вручную.",
			);
		});
	}, [
		setIsVisitDictating,
		setError,
		isVisitDictating,
		appendVisitDictationText,
	]);

	const uploadSpeechBlob = useCallback(
		async (blob: Blob) => {
			const liveDashboard = useAppStore.getState().dashboard ?? dashboard;
			const liveIsOnline =
				typeof navigator === "undefined" ? isOnline : navigator.onLine;
			if (!liveDashboard || blob.size === 0) return;
			const maxChunkBytes = speechGatewayStatus?.maxChunkBytes ?? 6_000_000;
			if (blob.size > maxChunkBytes) {
				setSpeechStatusNote(
					`Распознавание: аудио-фрагмент ${Math.round(blob.size / 1024 / 1024)} МБ больше лимита ${Math.round(
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
				patientId: liveDashboard?.activeVisit?.patientId,
				visitId: liveDashboard?.activeVisit?.id,
				specialty: selectedSpecialty,
				clientRecordedAt: new Date().toISOString(),
			};
			const queuedBeforeUpload = await queuePendingSpeechChunk(
				chunk,
				activeOrganizationId,
			);
			await refreshPendingSpeechChunkState();

			if (!liveIsOnline || !speechGatewayCanUpload(speechGatewayStatus)) {
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
				showToast(
					actionFailureToast(
						"Ошибка выполнения операции",
						(speechError as { status?: number })?.status ?? null,
					),
					"error",
				);
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
		},
		[
			selectedSpecialty,
			setSpeechStatusNote,
			isOnline,
			speechGatewayStatus,
			submitSpeechChunk,
			refreshPendingSpeechChunkState,
			dashboard,
			applySpeechTranscription,
			activeOrganizationId,
		],
	);

	const startImportDictation = useCallback(() => {
		if (isImportDictating) {
			setError("Дождитесь завершения текущей диктовки импорта.");
			return;
		}

		if (importDictationClientRef.current) {
			importDictationClientRef.current.dispose();
			importDictationClientRef.current = null;
		}

		const client = new UnifiedAudioClient({
			preferredMode: "gemini_live",
			specialty: "therapy",
			autoFallback: true,
		});
		importDictationClientRef.current = client;

		client.subscribe({
			onFinalText: (text) => {
				if (text && text.trim()) {
					setImportSourceKind?.("voice_dictation");
					setImportText?.((current) => `${current.trim()}\n${text.trim()}`.trim());
					setImportPreview?.(null);
					setImportCommit?.(null);
				}
			},
			onStateChange: (state) => {
				setIsImportDictating(state === "listening" || state === "connecting");
			},
			onError: (err) => {
				const msg = typeof err === "string" ? err : err.message;
				setImportSourceKind?.("voice_dictation");
				setIsImportDictating(false);
				setError(`Диктовка импорта: ${msg}`);
			},
		});

		setError(null);
		setIsImportDictating(true);
		client.start().catch(() => {
			showToast(
				actionFailureToast("Операция завершилась ошибкой", null),
				"error",
			);
			setIsImportDictating(false);
			setError("Не удалось запустить микрофон для импорта.");
		});
	}, [
		setImportPreview,
		setImportSourceKind,
		setImportText,
		setIsImportDictating,
		setImportCommit,
		setError,
		isImportDictating,
	]);

	useEffect(() => {
		return () => {
			stopSpeechMonitor();
			if (
				mediaRecorderRef.current &&
				mediaRecorderRef.current.state !== "inactive"
			) {
				try {
					mediaRecorderRef.current.stop();
				} catch (err: unknown) {
					logger.warn(
						"[useVisitSpeechRecording] Failed to stop mediaRecorder on unmount:",
						err,
					);
				}
				mediaRecorderRef.current = null;
			}
			if (mediaStreamRef.current) {
				mediaStreamRef.current.getTracks().forEach((track) => {
					try {
						track.stop();
					} catch (err: unknown) {
						logger.warn(
							"[useVisitSpeechRecording] Failed to stop mediaStream track on unmount:",
							err,
						);
					}
				});
				mediaStreamRef.current = null;
			}
			if (importDictationClientRef.current) {
				importDictationClientRef.current.dispose();
				importDictationClientRef.current = null;
			}
		};
	}, [stopSpeechMonitor]);

	return {
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
		startVisitDictation,
		preferredSpeechMimeType,
		uploadSpeechBlob,
		stopSpeechMonitor,
		requestSpeechChunk,
		startSpeechMonitor,
		startImportDictation,
	};
}
