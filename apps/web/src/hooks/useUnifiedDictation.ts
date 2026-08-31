/**
 * useUnifiedDictation.ts — Универсальный React-хук для голосовой диктовки в DENTE CRM.
 *
 * ВОЗМОЖНОСТИ:
 * 1. Управление полным циклом распознавания речи (Gemini Live / Server Whisper / Web Speech).
 * 2. Авто-подключение к AudioStreamManager (шумоподавление бормашины + 1.8с VAD Hands-Free).
 * 3. Живая синхронизация уровня звука (RMS) для CanvasWaveform.
 * 4. Автоматическая привязка к сессии клиники (клинический секрет, активный пациент и прием).
 * 5. Надежное хранение черновика и быстрое 1-клик применение в форму или ЭМК.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
	UnifiedAudioClient,
	type UnifiedAudioClientOptions,
	type UnifiedAudioMode,
	type UnifiedAudioState,
} from "../services/voice/UnifiedAudioClient";
import { useAppStore } from "../store/appStore";
import { useSettingsStore } from "../store/settingsStore";
import { showToast } from "../components/GlobalToast";

export interface UseUnifiedDictationOptions {
	preferredMode?: UnifiedAudioMode | undefined;
	context?: "visit" | "patient" | "document" | "general" | "chat" | undefined;
	specialty?: string | undefined;
	organizationId?: string | null | undefined;
	patientId?: string | null | undefined;
	visitId?: string | null | undefined;
	onResult?: ((text: string) => void) | undefined;
	onInterim?: ((interim: string) => void) | undefined;
	autoFallback?: boolean | undefined;
}

export interface UseUnifiedDictationReturn {
	isRecording: boolean;
	isProcessing: boolean;
	isSpeaking: boolean;
	state: UnifiedAudioState;
	mode: UnifiedAudioMode;
	interimText: string;
	finalText: string;
	fullTranscript: string;
	twoLayerDisplay: {
		finalized: string;
		interim: string;
		hasInterim: boolean;
		displayText: string;
	};
	audioLevel: number;
	rms: number;
	error: string | null;
	client: UnifiedAudioClient | null;
	streamManager: ReturnType<UnifiedAudioClient["getStreamManager"]>;
	startDictation: (overrideMode?: UnifiedAudioMode) => Promise<void>;
	stopDictation: () => Promise<string>;
	toggleDictation: () => Promise<void>;
	clearTranscript: () => void;
	setMode: (mode: UnifiedAudioMode) => void;
	applyTranscriptTo: (callback: (text: string) => void) => void;
}

export function useUnifiedDictation(
	options: UseUnifiedDictationOptions = {},
): UseUnifiedDictationReturn {
	const dashboard = useAppStore((state) => state.dashboard);
	const clinicalAdminSecretSession = useSettingsStore(
		(state) => state.clinicalAdminSecretSession,
	);

	const [state, setState] = useState<UnifiedAudioState>("idle");
	const [mode, setModeState] = useState<UnifiedAudioMode>(
		options.preferredMode ?? "gemini_live",
	);
	const [interimText, setInterimText] = useState("");
	const [finalText, setFinalText] = useState("");
	const [fullTranscript, setFullTranscript] = useState("");
	const [audioLevel, setAudioLevel] = useState(0);
	const [rms, setRms] = useState(0);
	const [isSpeaking, setIsSpeaking] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const clientRef = useRef<UnifiedAudioClient | null>(null);
	const onResultRef = useRef(options.onResult);
	onResultRef.current = options.onResult;
	const onInterimRef = useRef(options.onInterim);
	onInterimRef.current = options.onInterim;

	const targetOrgId =
		options.organizationId ?? dashboard?.activeVisit?.organizationId ?? null;
	const targetPatientId =
		options.patientId ?? dashboard?.activeVisit?.patientId ?? null;
	const targetVisitId = options.visitId ?? dashboard?.activeVisit?.id ?? null;

	// Инициализация UnifiedAudioClient
	useEffect(() => {
		const clientOptions: UnifiedAudioClientOptions = {
			preferredMode: options.preferredMode ?? "gemini_live",
			organizationId: targetOrgId,
			patientId: targetPatientId,
			visitId: targetVisitId,
			specialty: options.specialty ?? "therapy",
			adminSecret: clinicalAdminSecretSession.trim() || undefined,
			autoFallback: options.autoFallback ?? true,
		};

		const client = new UnifiedAudioClient(clientOptions);
		clientRef.current = client;

		// Загрузка сохраненного ранее черновика
		const initialTranscript = client.getTranscript();
		if (initialTranscript) {
			setFullTranscript(initialTranscript);
		}

		const unsubscribe = client.subscribe({
			onStateChange: (newState) => {
				setState(newState);
			},
			onModeChange: (newMode, _prevMode, reason) => {
				setModeState(newMode);
				if (reason) {
					showToast(`Режим диктовки: ${newMode} (${reason})`, "info");
				}
			},
			onInterimText: (text) => {
				setInterimText(text);
				onInterimRef.current?.(text);
			},
			onFinalText: (text, accumulated) => {
				setFinalText(text);
				setFullTranscript(accumulated);
				onResultRef.current?.(accumulated);
			},
			onTwoLayerTranscript: (data) => {
				setFinalText(data.finalized);
				setInterimText(data.interim);
				setFullTranscript(data.finalized);
			},
			onFullTranscript: (accumulated) => {
				setFullTranscript(accumulated);
			},
			onRmsUpdate: (newRms, speaking) => {
				setRms(newRms);
				setIsSpeaking(speaking);
				// Нормализуем аудио-уровень от 0.0 до 1.0 для индикаторов
				setAudioLevel(Math.min(1.0, newRms * 5.0));
			},
			onError: (err) => {
				const msg = typeof err === "string" ? err : err.message;
				setError(msg);
			},
		});

		return () => {
			unsubscribe();
			client.dispose();
			clientRef.current = null;
		};
	}, [
		targetOrgId,
		targetPatientId,
		targetVisitId,
		clinicalAdminSecretSession,
		options.preferredMode,
		options.specialty,
		options.autoFallback,
	]);

	// Обновление контекста при смене визита
	useEffect(() => {
		if (clientRef.current) {
			clientRef.current.updateContext({
				patientId: targetPatientId,
				visitId: targetVisitId,
				adminSecret: clinicalAdminSecretSession.trim() || undefined,
			});
		}
	}, [
		targetPatientId,
		targetVisitId,
		clinicalAdminSecretSession,
	]);

	const startDictation = useCallback(
		async (overrideMode?: UnifiedAudioMode) => {
			if (!clientRef.current) return;
			setError(null);
			if (overrideMode) {
				clientRef.current.setMode(overrideMode);
			}
			try {
				await clientRef.current.start();
			} catch (err) {
				const msg =
					err instanceof Error ? err.message : "Не удалось запустить микрофон";
				setError(msg);
				showToast(msg, "error");
			}
		},
		[],
	);

	const stopDictation = useCallback(async (): Promise<string> => {
		if (!clientRef.current) return fullTranscript;
		try {
			const finalRes = await clientRef.current.stop();
			return finalRes;
		} catch (err) {
			console.warn("Error stopping dictation:", err);
			return fullTranscript;
		}
	}, [fullTranscript]);

	const toggleDictation = useCallback(async () => {
		if (state === "listening" || state === "connecting") {
			await stopDictation();
		} else {
			await startDictation();
		}
	}, [state, startDictation, stopDictation]);

	const clearTranscript = useCallback(() => {
		if (clientRef.current) {
			clientRef.current.clearTranscript();
		}
		setInterimText("");
		setFinalText("");
		setFullTranscript("");
	}, []);

	const setMode = useCallback((newMode: UnifiedAudioMode) => {
		if (clientRef.current) {
			clientRef.current.setMode(newMode);
		}
		setModeState(newMode);
	}, []);

	const applyTranscriptTo = useCallback(
		(callback: (text: string) => void) => {
			if (fullTranscript.trim()) {
				callback(fullTranscript.trim());
				showToast("Транскрипт вставлен в поле ввода", "success");
			}
		},
		[fullTranscript],
	);

	const twoLayerDisplay = {
		finalized: fullTranscript,
		interim: interimText,
		hasInterim: Boolean(interimText.trim()),
		displayText: interimText.trim()
			? fullTranscript.trim()
				? `${fullTranscript.trim()} ${interimText.trim()}`
				: interimText.trim()
			: fullTranscript.trim(),
	};

	return {
		isRecording: state === "listening" || state === "connecting",
		isProcessing: state === "processing",
		isSpeaking,
		state,
		mode,
		interimText,
		finalText,
		fullTranscript,
		twoLayerDisplay,
		audioLevel,
		rms,
		error,
		client: clientRef.current,
		streamManager: clientRef.current?.getStreamManager() ?? null,
		startDictation,
		stopDictation,
		toggleDictation,
		clearTranscript,
		setMode,
		applyTranscriptTo,
	};
}
