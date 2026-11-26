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
import { useCopilotStore } from "../store/copilotStore";
import { fetchSpeechGatewayHealth } from "../store/copilotSessionApi";
import { useSettingsStore } from "../store/settingsStore";
import { showToast } from "../components/GlobalToast";
import { logger } from "../utils/logger";

export interface SpeechGatewayHealthSummary {
	checked: boolean;
	cloudReady: boolean;
	geminiReady: boolean;
	whisperReady: boolean;
	activeProviderLabel: string;
	fallbackReason: string | null;
}

const DICTATION_MODE_LABELS: Record<UnifiedAudioMode, string> = {
	gemini_live: "Gemini Live",
	server_whisper: "Серверный Whisper",
	browser_speech: "Браузерное распознавание",
};

function mapCopilotEngineToAudioMode(engine?: string): UnifiedAudioMode {
	if (engine === "whisper") return "server_whisper";
	if (engine === "web_speech") return "browser_speech";
	return "gemini_live";
}

function mapSensitivityToVad(sensitivity?: "high" | "normal" | "low") {
	if (sensitivity === "high") return { speechThresholdRms: 0.011, silenceThresholdRms: 0.005 };
	if (sensitivity === "low") return { speechThresholdRms: 0.03, silenceThresholdRms: 0.014 };
	return { speechThresholdRms: 0.016, silenceThresholdRms: 0.008 };
}

export interface UseUnifiedDictationOptions {
	preferredMode?: UnifiedAudioMode | undefined;
	context?: "visit" | "patient" | "document" | "general" | "chat" | undefined;
	specialty?: string | undefined;
	organizationId?: string | null | undefined;
	patientId?: string | null | undefined;
	visitId?: string | null | undefined;
	onResult?: ((text: string) => void) | undefined;
	onFullTranscript?: ((fullText: string) => void) | undefined;
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
	speechHealth: SpeechGatewayHealthSummary;
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
	const copilotSpeechEngine = useCopilotStore((state) => state.settings.speechEngine);
	const copilotSpeechSensitivity = useCopilotStore((state) => state.settings.webSpeechSensitivity);
	const clinicalAdminSecretSession = useSettingsStore(
		(state) => state.clinicalAdminSecretSession,
	);
	const effectivePreferredMode = options.preferredMode ?? mapCopilotEngineToAudioMode(copilotSpeechEngine);

	const [state, setState] = useState<UnifiedAudioState>("idle");
	const [mode, setModeState] = useState<UnifiedAudioMode>(effectivePreferredMode);
	const [interimText, setInterimText] = useState("");
	const [finalText, setFinalText] = useState("");
	const [fullTranscript, setFullTranscript] = useState("");
	const [audioLevel, setAudioLevel] = useState(0);
	const [rms, setRms] = useState(0);
	const [isSpeaking, setIsSpeaking] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [speechHealth, setSpeechHealth] = useState<SpeechGatewayHealthSummary>({
		checked: false,
		cloudReady: true,
		geminiReady: true,
		whisperReady: false,
		activeProviderLabel: DICTATION_MODE_LABELS[effectivePreferredMode],
		fallbackReason: null,
	});

	useEffect(() => {
		if (typeof window === "undefined" || (typeof process !== "undefined" && process.env?.NODE_ENV === "test")) {
			return;
		}
		let cancelled = false;
		void fetchSpeechGatewayHealth().then((report) => {
			if (cancelled || !report) return;
			const providers = Array.isArray(report.providers) ? (report.providers as Array<Record<string, unknown>>) : [];
			const gemini = providers.find((p) => String(p.providerId || "").includes("gemini"));
			const whisper = providers.find((p) => String(p.providerId || "").includes("whisper") || String(p.providerId || "").includes("groq"));
			const geminiReady = Boolean(gemini && (gemini.healthLevel === "ready" || gemini.safeToUseInVisit));
			const whisperReady = Boolean(whisper && (whisper.healthLevel === "ready" || whisper.safeToUseInVisit));
			const availableKeys = typeof report.totalAvailableKeys === "number" ? report.totalAvailableKeys : 0;
			const serverEnabled = report.serverTranscriptionEnabled !== false;
			const cloudReady = serverEnabled && (geminiReady || whisperReady || availableKeys > 0);
			const activeProviderLabel =
				typeof report.activeProviderLabel === "string" && report.activeProviderLabel
					? report.activeProviderLabel
					: cloudReady
						? "Google Gemini Live"
						: "Браузерный резерв (Web Speech)";
			const fallbackReason = cloudReady
				? null
				: "Облачные ключи распознавания не настроены или временно недоступны";
			setSpeechHealth({
				checked: true,
				cloudReady,
				geminiReady,
				whisperReady,
				activeProviderLabel,
				fallbackReason,
			});
			if (!cloudReady && !options.preferredMode && options.autoFallback !== false && clientRef.current) {
				clientRef.current.setMode("browser_speech");
			}
		});
		return () => {
			cancelled = true;
		};
	}, [options.preferredMode, options.autoFallback]);

	const clientRef = useRef<UnifiedAudioClient | null>(null);
	const fullTranscriptRef = useRef(fullTranscript);
	fullTranscriptRef.current = fullTranscript;
	const onResultRef = useRef(options.onResult);
	onResultRef.current = options.onResult;
	const onFullTranscriptRef = useRef(options.onFullTranscript);
	onFullTranscriptRef.current = options.onFullTranscript;
	const onInterimRef = useRef(options.onInterim);
	onInterimRef.current = options.onInterim;

	const targetOrgId =
		options.organizationId ?? dashboard?.activeVisit?.organizationId ?? null;
	const targetPatientId =
		options.patientId ?? dashboard?.activeVisit?.patientId ?? null;
	const targetVisitId = options.visitId ?? dashboard?.activeVisit?.id ?? null;

	// Инициализация UnifiedAudioClient
	useEffect(() => {
		setModeState(effectivePreferredMode);
		const clientOptions: UnifiedAudioClientOptions = {
			preferredMode: effectivePreferredMode,
			organizationId: targetOrgId,
			patientId: targetPatientId,
			visitId: targetVisitId,
			specialty: options.specialty ?? "therapy",
			adminSecret: clinicalAdminSecretSession.trim() || undefined,
			vadOptions: mapSensitivityToVad(copilotSpeechSensitivity),
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
					showToast(`Режим диктовки: ${DICTATION_MODE_LABELS[newMode] ?? newMode} (${reason})`, "info");
				}
			},
			onInterimText: (text) => {
				setInterimText((prev) => (prev !== text ? text : prev));
				onInterimRef.current?.(text);
			},
			onFinalText: (text, accumulated) => {
				setFinalText(text);
				fullTranscriptRef.current = accumulated;
				setFullTranscript(accumulated);
				onResultRef.current?.(text);
				onFullTranscriptRef.current?.(accumulated);
			},
			onTwoLayerTranscript: (data) => {
				setFinalText((prev) => (prev !== data.finalized ? data.finalized : prev));
				setInterimText((prev) => (prev !== data.interim ? data.interim : prev));
				setFullTranscript((prev) => (prev !== data.finalized ? data.finalized : prev));
			},
			onFullTranscript: (accumulated) => {
				setFullTranscript((prev) => (prev !== accumulated ? accumulated : prev));
			},
			onRmsUpdate: (newRms, speaking) => {
				setIsSpeaking((prev) => (prev !== speaking ? speaking : prev));
				const level = Math.min(1.0, Math.round(newRms * 50) / 10);
				setAudioLevel((prev) => (Math.abs(prev - level) >= 0.05 ? level : prev));
				setRms((prev) => (Math.abs(prev - newRms) >= 0.02 ? newRms : prev));
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
		effectivePreferredMode,
		copilotSpeechSensitivity,
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
		if (!clientRef.current) return fullTranscriptRef.current;
		try {
			const finalRes = await clientRef.current.stop();
			return finalRes;
		} catch (err) {
			logger.warn("[useUnifiedDictation] Error stopping dictation:", err);
			return fullTranscriptRef.current;
		}
	}, []);

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
		fullTranscriptRef.current = "";
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
		speechHealth,
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
