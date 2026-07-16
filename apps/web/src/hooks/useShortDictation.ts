import type {
	SpeechChunkUploadInput,
	SpeechGatewayStatus,
	SpeechTranscriptionResponse,
	SpeechTranscriptionSource,
} from "@dental/shared";
import { useCallback, useRef, useState } from "react";
import {
	denteAdminSecretRequestHeaders,
	operatorReadableErrorDetail,
} from "../AppHelpers";
import { showToast } from "../components/GlobalToast";
import { useAppStore } from "../store/appStore";

type ContextType =
	| "schedule"
	| "visit"
	| "patient"
	| "price"
	| "payment"
	| "general";

export function useShortDictation(
	context: ContextType,
	onResult: (text: string) => void,
) {
	const [isRecording, setIsRecording] = useState(false);
	const [isProcessing, setIsProcessing] = useState(false);

	const mediaRecorderRef = useRef<MediaRecorder | null>(null);
	const audioChunksRef = useRef<Blob[]>([]);
	const streamRef = useRef<MediaStream | null>(null);

	const dashboard = useAppStore((state) => state.dashboard);
	const speechGatewayStatus = useAppStore(
		(state) => state.speechGatewayStatus as SpeechGatewayStatus | null,
	);

	// Note: isOnline is not in AppStore according to previous logs, we'll use navigator.onLine
	const isOnline = navigator.onLine;

	const cleanupStream = useCallback(() => {
		if (streamRef.current) {
			streamRef.current.getTracks().forEach((track) => track.stop());
			streamRef.current = null;
		}
	}, []);

	const startBrowserNative = useCallback(() => {
		const SpeechRecognition =
			(window as any).SpeechRecognition ||
			(window as any).webkitSpeechRecognition;
		if (!SpeechRecognition) {
			showToast("Голосовой ввод не поддерживается в этом браузере.", "error");
			return;
		}

		const recognition = new SpeechRecognition();
		recognition.lang = "ru-RU";
		recognition.continuous = false;
		recognition.interimResults = false;

		recognition.onstart = () => setIsRecording(true);

		recognition.onresult = (event: any) => {
			const transcript = event.results[0][0].transcript;
			if (transcript) onResult(transcript);
		};

		recognition.onerror = (e: any) => {
			if (e.error !== "no-speech") {
				showToast("Ошибка распознавания: " + e.error, "error");
			}
			setIsRecording(false);
		};

		recognition.onend = () => setIsRecording(false);
		recognition.start();
	}, [onResult]);

	const sendToServer = useCallback(
		async (audioBlob: Blob) => {
			setIsProcessing(true);
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

				const source: SpeechTranscriptionSource =
					context === "visit" || context === "patient" ? "visit" : "document";

				const input: SpeechChunkUploadInput = {
					recordingId: "short_" + Date.now(),
					chunkIndex: 0,
					mimeType: audioBlob.type || "audio/webm",
					audioBase64,
					durationMs: 3000,
					language: "ru",
					source,
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
					onResult(payload.chunk.transcript);
				} else {
					showToast("Не удалось распознать речь", "warning");
				}
			} catch (err: any) {
				console.error("Server STT Error:", err);
				showToast("Сбой сервера распознавания. Попробуйте еще раз.", "error");
			} finally {
				setIsProcessing(false);
			}
		},
		[context, dashboard, onResult],
	);

	const toggleRecording = useCallback(async () => {
		if (isRecording) {
			if (
				mediaRecorderRef.current &&
				mediaRecorderRef.current.state === "recording"
			) {
				mediaRecorderRef.current.stop();
			}
			return;
		}

		if (!navigator.onLine || !speechGatewayStatus?.serverTranscriptionEnabled) {
			startBrowserNative();
			return;
		}

		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			streamRef.current = stream;
			const mediaRecorder = new MediaRecorder(stream);
			mediaRecorderRef.current = mediaRecorder;
			audioChunksRef.current = [];

			mediaRecorder.ondataavailable = (e) => {
				if (e.data.size > 0) {
					audioChunksRef.current.push(e.data);
				}
			};

			mediaRecorder.onstop = () => {
				setIsRecording(false);
				cleanupStream();
				const audioBlob = new Blob(audioChunksRef.current, {
					type: mediaRecorder.mimeType,
				});
				if (audioBlob.size > 0) {
					sendToServer(audioBlob);
				}
			};

			mediaRecorder.start();
			setIsRecording(true);

			setTimeout(() => {
				if (mediaRecorder.state === "recording") {
					mediaRecorder.stop();
				}
			}, 10000);
		} catch (err) {
			console.error("Microphone access denied or error:", err);
			startBrowserNative();
		}
	}, [
		isRecording,
		speechGatewayStatus,
		startBrowserNative,
		sendToServer,
		cleanupStream,
	]);

	return {
		isRecording,
		isProcessing,
		toggleRecording,
		mediaStream: streamRef.current,
	};
}
