import type {
	SpeechChunkUploadInput,
	SpeechGatewayStatus,
} from "@dental/shared";
import { useCallback, useEffect, useRef, useState } from "react";
import {
	denteAdminSecretRequestHeaders,
	operatorReadableErrorDetail,
} from "../AppHelpers";
import { showToast } from "../components/GlobalToast";
import { type AiIntent, AiOrchestrator } from "../lib/aiOrchestrator";
import { useAppStore } from "../store/appStore";

export interface UseVoiceAssistantReturn {
	isListening: boolean;
	transcript: string;
	volume: number;
	startListening: () => void;
	stopListening: () => void;
	playTTS: (text: string) => void;
	lastAction: { action: AiIntent; payload?: any } | null;
}

export interface UseVoiceAssistantOptions {
	onNavigate?: ((view: any) => void) | undefined;
	onSearchQuery?: ((query: string) => void) | undefined;
	onDateChange?: ((date: string) => void) | undefined;
}

export function useVoiceAssistant(
	context: "visit" | "schedule" | "general" = "visit",
	options?: UseVoiceAssistantOptions,
): UseVoiceAssistantReturn {
	const [isListening, setIsListening] = useState(false);
	const [transcript, setTranscript] = useState("");
	const [volume, setVolume] = useState(0);
	const [lastAction, setLastAction] = useState<{
		action: AiIntent;
		payload?: any;
	} | null>(null);

	const audioContextRef = useRef<AudioContext | null>(null);
	const analyserRef = useRef<AnalyserNode | null>(null);
	const animationFrameRef = useRef<number | null>(null);
	const streamRef = useRef<MediaStream | null>(null);
	const mediaRecorderRef = useRef<MediaRecorder | null>(null);
	const audioChunksRef = useRef<Blob[]>([]);
	const recognitionRef = useRef<any>(null);

	const dashboard = useAppStore((state) => state.dashboard);
	const speechGatewayStatus = useAppStore(
		(state) => state.speechGatewayStatus as SpeechGatewayStatus | null,
	);
	const setSpeechGatewayStatus = useAppStore(
		(state) => state.setSpeechGatewayStatus,
	);

	useEffect(() => {
		if (!speechGatewayStatus) {
			const secret =
				localStorage.getItem("dente_clinical_admin_secret_session") ||
				undefined;
			const headers = denteAdminSecretRequestHeaders(
				{ "Content-Type": "application/json" },
				secret,
			);
			fetch("/api/speech/status", { headers })
				.then((res) => res.json())
				.then((data) => {
					setSpeechGatewayStatus(data);
				})
				.catch((err) =>
					console.error("Failed to load speech status in assistant:", err),
				);
		}
	}, [speechGatewayStatus, setSpeechGatewayStatus]);

	const playTTS = useCallback((text: string) => {
		window.speechSynthesis.cancel();
		const utterance = new SpeechSynthesisUtterance(text);
		utterance.lang = "ru-RU";
		utterance.rate = 1.1;
		window.speechSynthesis.speak(utterance);
	}, []);

	const playBeep = useCallback((type: "start" | "success" | "error") => {
		try {
			const audioCtx = new (
				window.AudioContext || (window as any).webkitAudioContext
			)();
			const osc = audioCtx.createOscillator();
			const gainNode = audioCtx.createGain();
			osc.connect(gainNode);
			gainNode.connect(audioCtx.destination);

			if (type === "start") {
				osc.frequency.setValueAtTime(380, audioCtx.currentTime);
				osc.frequency.exponentialRampToValueAtTime(
					580,
					audioCtx.currentTime + 0.08,
				);
				gainNode.gain.setValueAtTime(0.01, audioCtx.currentTime);
				gainNode.gain.exponentialRampToValueAtTime(
					0.12,
					audioCtx.currentTime + 0.02,
				);
				gainNode.gain.exponentialRampToValueAtTime(
					0.001,
					audioCtx.currentTime + 0.08,
				);
				osc.start(audioCtx.currentTime);
				osc.stop(audioCtx.currentTime + 0.08);
			} else if (type === "success") {
				osc.frequency.setValueAtTime(580, audioCtx.currentTime);
				osc.frequency.setValueAtTime(720, audioCtx.currentTime + 0.06);
				gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime);
				gainNode.gain.setValueAtTime(0.001, audioCtx.currentTime + 0.04);
				gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime + 0.06);
				gainNode.gain.setValueAtTime(0.001, audioCtx.currentTime + 0.1);
				osc.start(audioCtx.currentTime);
				osc.stop(audioCtx.currentTime + 0.1);
			} else if (type === "error") {
				osc.type = "sawtooth";
				osc.frequency.setValueAtTime(180, audioCtx.currentTime);
				gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
				gainNode.gain.exponentialRampToValueAtTime(
					0.001,
					audioCtx.currentTime + 0.15,
				);
				osc.start(audioCtx.currentTime);
				osc.stop(audioCtx.currentTime + 0.15);
			}
		} catch (e) {
			console.warn("Could not play synthesized audio feedback:", e);
		}
	}, []);

	const handleCommand = useCallback(
		(text: string) => {
			// 1. Try to parse global navigation, query, or date command
			const nav = AiOrchestrator.parseGlobalNavigation(text);
			if (nav.view || nav.query || nav.date) {
				if (nav.view) {
					options?.onNavigate?.(nav.view);
				}
				if (nav.query !== undefined) {
					options?.onSearchQuery?.(nav.query);
				}
				if (nav.date) {
					options?.onDateChange?.(nav.date);
				}
				if (nav.feedbackText) {
					playTTS(nav.feedbackText);
				}
				setLastAction({ action: "unknown", payload: { text, nav } });
				return;
			}

			// 2. Fall back to legacy intent routing
			const intent = AiOrchestrator.detectIntent(text);
			setLastAction({ action: intent, payload: { text } });

			if (intent === "schedule_appointment") {
				options?.onNavigate?.("schedule");
				playTTS("Открываю расписание.");
			} else if (intent === "fill_emk") {
				options?.onNavigate?.("visit");
				playTTS("Открываю текущий прием.");
			} else if (intent === "parse_patient_document") {
				options?.onNavigate?.("documents");
				playTTS("Открываю документы.");
			} else if (intent === "manage_prices") {
				options?.onNavigate?.("settings");
				playTTS("Открываю настройки.");
			} else {
				playTTS("Команда не распознана. Пожалуйста, повторите.");
				playBeep("error");
			}
		},
		[playTTS, playBeep, options],
	);

	const updateVolume = useCallback(() => {
		if (!analyserRef.current) return;

		const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
		analyserRef.current.getByteFrequencyData(dataArray);

		let sum = 0;
		for (const val of dataArray) {
			sum += val;
		}
		const avgVolume = sum / dataArray.length;
		setVolume(avgVolume);

		if (isListening) {
			animationFrameRef.current = requestAnimationFrame(updateVolume);
		}
	}, [isListening]);

	const processAudioOnServer = useCallback(
		async (audioBlob: Blob) => {
			try {
				const reader = new FileReader();
				const base64Promise = new Promise<string>((resolve, reject) => {
					reader.onloadend = () => {
						const result = reader.result as string | null;
						if (result) {
							resolve(result.split(",")[1] || "");
						} else {
							reject(new Error("Failed to read blob"));
						}
					};
					reader.onerror = reject;
					reader.readAsDataURL(audioBlob);
				});
				const audioBase64 = await base64Promise;

				const input: SpeechChunkUploadInput = {
					recordingId: "assistant_" + Date.now(),
					chunkIndex: 0,
					mimeType: audioBlob.type || "audio/webm",
					audioBase64,
					durationMs: 3000,
					language: "ru",
					source: "document",
					patientId: dashboard?.activeVisit?.patientId,
					visitId: dashboard?.activeVisit?.id,
					specialty: "universal",
					clientRecordedAt: new Date().toISOString(),
				};

				const secret =
					localStorage.getItem("dente_clinical_admin_secret_session") ||
					undefined;
				const headers = denteAdminSecretRequestHeaders(
					{ "Content-Type": "application/json" },
					secret,
				);

				const response = await fetch("/api/speech/transcribe-chunk", {
					method: "POST",
					headers,
					body: JSON.stringify(input),
				});

				const payload = await response.json();

				if (!response.ok || payload.chunk?.status === "failed") {
					throw new Error(
						operatorReadableErrorDetail(payload.message || payload.error) ||
							"Ошибка сервера",
					);
				}

				if (payload.chunk?.transcript) {
					setTranscript(payload.chunk.transcript);
					handleCommand(payload.chunk.transcript);
				} else {
					showToast("Не удалось распознать голос", "warning");
					playBeep("error");
				}
			} catch (err: any) {
				console.error("Voice Assistant Server STT Error:", err);
				showToast("Ошибка сервера распознавания.", "error");
				playBeep("error");
			}
		},
		[dashboard, handleCommand, playBeep],
	);

	const startBrowserNative = useCallback(async () => {
		const SpeechRecognition =
			(window as any).SpeechRecognition ||
			(window as any).webkitSpeechRecognition;
		if (!SpeechRecognition) {
			console.error("Speech Recognition API not supported in this browser.");
			playTTS("Голосовой помощник не поддерживается в этом браузере.");
			setIsListening(false);
			playBeep("error");
			return;
		}

		const recognition = new SpeechRecognition();
		recognitionRef.current = recognition;
		recognition.lang = "ru-RU";
		recognition.continuous = false;
		recognition.interimResults = true;

		recognition.onresult = (event: any) => {
			let finalTranscript = "";
			for (let i = event.resultIndex; i < event.results.length; ++i) {
				if (event.results[i].isFinal) {
					finalTranscript += event.results[i][0].transcript;
				}
			}

			if (finalTranscript) {
				setTranscript(finalTranscript);
				handleCommand(finalTranscript);
			}
		};

		recognition.onerror = (event: any) => {
			console.error("Speech recognition error", event.error);
			setIsListening(false);
			playBeep("error");
		};

		recognition.onend = () => {
			setIsListening(false);
		};

		recognition.start();
	}, [handleCommand, playTTS, playBeep]);

	const startListening = useCallback(async () => {
		if (isListening) return;

		try {
			const stream = await navigator.mediaDevices.getUserMedia({
				audio: true,
				video: false,
			});
			streamRef.current = stream;

			const audioCtx = new (
				window.AudioContext || (window as any).webkitAudioContext
			)();
			audioContextRef.current = audioCtx;
			const source = audioCtx.createMediaStreamSource(stream);
			const analyser = audioCtx.createAnalyser();
			analyser.fftSize = 256;
			source.connect(analyser);
			analyserRef.current = analyser;

			setIsListening(true);
			playBeep("start");
			setTranscript("");
			updateVolume();

			if (
				!navigator.onLine ||
				!speechGatewayStatus?.serverTranscriptionEnabled
			) {
				startBrowserNative();
				return;
			}

			const mediaRecorder = new MediaRecorder(stream);
			mediaRecorderRef.current = mediaRecorder;
			audioChunksRef.current = [];

			mediaRecorder.ondataavailable = (e) => {
				if (e.data.size > 0) {
					audioChunksRef.current.push(e.data);
				}
			};

			mediaRecorder.onstop = () => {
				const audioBlob = new Blob(audioChunksRef.current, {
					type: mediaRecorder.mimeType || "audio/webm",
				});
				if (audioBlob.size > 0) {
					processAudioOnServer(audioBlob);
				}
			};

			mediaRecorder.start();
		} catch (err) {
			console.error("Failed to start listening:", err);
			setIsListening(false);
			playBeep("error");
		}
	}, [
		isListening,
		updateVolume,
		speechGatewayStatus,
		startBrowserNative,
		processAudioOnServer,
		playBeep,
	]);

	const stopListening = useCallback(() => {
		if (!isListening) return;

		setIsListening(false);
		setVolume(0);
		playBeep("success");

		if (
			mediaRecorderRef.current &&
			mediaRecorderRef.current.state === "recording"
		) {
			mediaRecorderRef.current.stop();
		}

		if (recognitionRef.current) {
			recognitionRef.current.stop();
		}

		if (animationFrameRef.current) {
			cancelAnimationFrame(animationFrameRef.current);
		}

		if (streamRef.current) {
			streamRef.current.getTracks().forEach((track) => track.stop());
		}

		if (audioContextRef.current) {
			audioContextRef.current.close();
		}
	}, [isListening, playBeep]);

	return {
		isListening,
		transcript,
		volume,
		startListening,
		stopListening,
		playTTS,
		lastAction,
	};
}
