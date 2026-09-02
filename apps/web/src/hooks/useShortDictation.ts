/**
 * useShortDictation.ts — Компактный хук диктовки для точечных полей и кнопок микрофона.
 *
 * ВОЗМОЖНОСТИ:
 * 1. Потоковое Gemini Live Bidi распознавание через WebSocket (/api/speech/live).
 * 2. VAD Hands-Free захват речи через AudioWorklet (без необходимости удерживать кнопку).
 * 3. Реалтайм-стриминг interimText (синий пульсирующий курсив) и финализация по тишине.
 * 4. Полная обратная совместимость с колбэком onResult и новым объектом ShortDictationOptions.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { UnifiedAudioClient } from "../services/voice/UnifiedAudioClient";
import { useAppStore } from "../store/appStore";
import { useSettingsStore } from "../store/settingsStore";
import { showToast } from "../components/GlobalToast";

export type ContextType =
	| "schedule"
	| "visit"
	| "patient"
	| "price"
	| "payment"
	| "general";

export interface ShortDictationOptions {
	readonly onResult?: (text: string) => void;
	readonly onInterim?: (interim: string) => void;
	readonly autoFallback?: boolean;
	readonly specialty?: string;
}

export function useShortDictation(
	context: ContextType,
	handlerOrOptions?: ((text: string) => void) | ShortDictationOptions,
) {
	const [isRecording, setIsRecording] = useState(false);
	const [isProcessing, setIsProcessing] = useState(false);
	const [isSpeaking, setIsSpeaking] = useState(false);
	const [interimText, setInterimText] = useState("");
	const [finalText, setFinalText] = useState("");
	const [fullTranscript, setFullTranscript] = useState("");
	const [audioLevel, setAudioLevel] = useState(0);
	const [rms, setRms] = useState(0);

	const dashboard = useAppStore((state) => state.dashboard);
	const clinicalAdminSecretSession = useSettingsStore(
		(state) => state.clinicalAdminSecretSession,
	);

	const clientRef = useRef<UnifiedAudioClient | null>(null);

	const options: ShortDictationOptions =
		typeof handlerOrOptions === "function"
			? { onResult: handlerOrOptions }
			: (handlerOrOptions ?? {});

	const onResultRef = useRef(options.onResult);
	onResultRef.current = options.onResult;

	const onInterimRef = useRef(options.onInterim);
	onInterimRef.current = options.onInterim;

	useEffect(() => {
		return () => {
			if (clientRef.current) {
				clientRef.current.dispose();
				clientRef.current = null;
			}
		};
	}, []);

	const clearTranscript = useCallback(() => {
		if (clientRef.current) {
			clientRef.current.clearTranscript();
		}
		setInterimText("");
		setFinalText("");
		setFullTranscript("");
	}, []);

	const stopRecording = useCallback(async (): Promise<string> => {
		if (!clientRef.current) return fullTranscript;
		setIsProcessing(true);
		try {
			const finalRes = await clientRef.current.stop();
			const clean = finalRes ? finalRes.trim() : "";
			if (clean) {
				onResultRef.current?.(clean);
			}
			return clean;
		} catch (err) {
			console.warn("[useShortDictation] stop error:", err);
			return fullTranscript;
		} finally {
			setIsRecording(false);
			setIsProcessing(false);
			setInterimText("");
		}
	}, [fullTranscript]);

	const startRecording = useCallback(async () => {
		if (isRecording) return;
		setIsProcessing(true);
		setInterimText("");
		setFinalText("");

		try {
			if (clientRef.current) {
				clientRef.current.dispose();
				clientRef.current = null;
			}

			const client = new UnifiedAudioClient({
				preferredMode: "gemini_live",
				organizationId: dashboard?.activeVisit?.organizationId ?? null,
				patientId: dashboard?.activeVisit?.patientId ?? null,
				visitId: dashboard?.activeVisit?.id ?? null,
				specialty: options.specialty ?? "therapy",
				adminSecret: clinicalAdminSecretSession.trim() || undefined,
				autoFallback: options.autoFallback ?? true,
			});
			clientRef.current = client;

			client.subscribe({
				onStateChange: (newState) => {
					if (newState === "listening") {
						setIsRecording(true);
						setIsProcessing(false);
					} else if (newState === "processing") {
						setIsProcessing(true);
					} else if (newState === "idle") {
						setIsRecording(false);
						setIsProcessing(false);
					}
				},
				onInterimText: (interim) => {
					setInterimText(interim);
					onInterimRef.current?.(interim);
				},
				onFinalText: (final, accumulated) => {
					setFinalText(final);
					setFullTranscript(accumulated);
					if (accumulated && accumulated.trim()) {
						onResultRef.current?.(accumulated.trim());
					}
				},
				onTwoLayerTranscript: (data) => {
					setInterimText(data.interim);
					setFinalText(data.finalized);
					setFullTranscript(data.fullWithInterim);
				},
				onRmsUpdate: (newRms, speaking) => {
					setIsSpeaking(speaking);
					setRms(newRms);
					setAudioLevel(Math.min(1.0, Math.round(newRms * 50) / 10));
				},
				onError: (err) => {
					const msg = typeof err === "string" ? err : err.message;
					showToast(`Ошибка диктовки: ${msg}`, "error");
					setIsRecording(false);
					setIsProcessing(false);
				},
			});

			await client.start();
			setIsRecording(true);
			setIsProcessing(false);
		} catch (err: unknown) {
			const msg =
				err instanceof Error
					? err.message
					: "Не удалось запустить микрофон";
			showToast(msg, "error");
			setIsRecording(false);
			setIsProcessing(false);
		}
	}, [dashboard, clinicalAdminSecretSession, isRecording, options.autoFallback, options.specialty]);

	const toggleRecording = useCallback(async () => {
		if (isRecording) {
			await stopRecording();
		} else {
			await startRecording();
		}
	}, [isRecording, startRecording, stopRecording]);

	return {
		isRecording,
		isProcessing,
		isSpeaking,
		interimText,
		finalText,
		fullTranscript,
		audioLevel,
		rms,
		toggleRecording,
		startRecording,
		stopRecording,
		clearTranscript,
	};
}
