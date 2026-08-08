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
import { actionFailureToast, requestFailureCause } from "../lib/panelStateText";
import { useAppStore } from "../store/appStore";
import { useSettingsStore } from "../store/settingsStore";
import { logger } from "../utils/logger";

/** Объект из тела ответа или null. Массив и скаляр объектом не считаются. */
function jsonObjectOrNull(rawBody: string): Record<string, unknown> | null {
	const trimmed = rawBody.trim();
	if (!trimmed) return null;
	try {
		const parsed: unknown = JSON.parse(trimmed);
		return typeof parsed === "object" &&
			parsed !== null &&
			!Array.isArray(parsed)
			? (parsed as Record<string, unknown>)
			: null;
	} catch {
		// Текст исключения английский, человеку он не показывается никогда.
		return null;
	}
}

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

/**
 * Похож ли ответ на состояние шлюза распознавания.
 *
 * ЧТО БЫЛО СЛОМАНО. Ответ /api/speech/status разбирался как JSON ДО проверки
 * res.ok, и результат безусловно уходил в общий стор. Отказы гейта клинического
 * чтения — 403 ClinicalReadSecretRequired и 503 ClinicalReadSecretMissing
 * (accessGuard.ts) — отдают тело {error, message, protectedArea}. Это непустой
 * объект, поэтому все проверки вида `speechGatewayStatus ? ...` считали его
 * готовым состоянием шлюза, а обращения к вложенным полям падали:
 * `speechGatewayStatus?.chunkingPolicy.dedupeWindowChars` (useVisitLogic.ts:922,
 * 1212, 1403; useAppLogic.tsx:10844), `speechGatewayStatus?.polishPolicy
 * .neuralEnabled` (VisitView.tsx:645), `speechGatewayStatus.promptPolicy.enabled`
 * (SettingsAiTab.tsx:107) — необязательная точка стоит только на верхнем уровне.
 * TypeError во время отрисовки уводил в заглушку целый раздел (Настройки вместе
 * с полосой вкладок, приём), а «Повторить открытие» падало снова: стор уже
 * отравлен и перезапрос не делается.
 *
 * Проверяются ровно те поля, к вложенностям которых обращается интерфейс.
 * Полную схему сюда не тянем: она живёт в @dental/shared и разбирает ответ на
 * сервере, а лишняя строгость на клиенте молча отключила бы серверное
 * распознавание из-за поля, которого интерфейс не касается.
 */
function looksLikeSpeechGatewayStatus(
	value: unknown,
): value is SpeechGatewayStatus {
	if (typeof value !== "object" || value === null || Array.isArray(value))
		return false;
	const row = value as Record<string, unknown>;
	const isObject = (field: unknown) =>
		typeof field === "object" && field !== null && !Array.isArray(field);
	return (
		typeof row.serverTranscriptionEnabled === "boolean" &&
		typeof row.providerLabel === "string" &&
		isObject(row.chunkingPolicy) &&
		isObject(row.polishPolicy) &&
		isObject(row.promptPolicy)
	);
}

export function useVoiceAssistant(
	_context: "visit" | "schedule" | "general" = "visit",
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
	/*
	 * Секрет администратора клиники — из сеанса настроек, а НЕ из localStorage.
	 * Прежний ключ "dente_clinical_admin_secret_session" не пишет никто: во всём
	 * вебе было три чтения и ни одной записи, то есть секрет всегда оказывался
	 * undefined. Локально это скрыто лазейками в .env, а у заказчика /api/speech/*
	 * отвечает 403 — проверено живьём на экземпляре с заданным секретом.
	 */
	const clinicalAdminSecretSession = useSettingsStore(
		(state) => state.clinicalAdminSecretSession,
	);

	/**
	 * Состояние шлюза прочитать не удалось. Всплывающим сообщением при загрузке
	 * приложения об этом не говорим: запрос фоновый, пользователь ничего не
	 * просил, а браузерное распознавание чаще всего работает. Скажем в тот
	 * момент, когда человек нажмёт микрофон и получит распознавание хуже
	 * ожидаемого — один раз за сеанс, чтобы не превратить подсказку в шум.
	 */
	const gatewayStatusUnknownRef = useRef(false);
	const gatewayFallbackReportedRef = useRef(false);

	useEffect(() => {
		if (speechGatewayStatus) return;
		let alive = true;
		const loadGatewayStatus = async () => {
			const secret = clinicalAdminSecretSession.trim() || undefined;
			const headers = denteAdminSecretRequestHeaders(
				{ "Content-Type": "application/json" },
				secret,
			);
			try {
				const res = await fetch("/api/speech/status", { headers });
				// Тело читается строкой: у пустого ответа res.json() бросает исключение,
				// и прежний catch не отличал его от отказа сервера.
				const rawBody = await res.text();
				if (!res.ok) {
					logger.error(
						`[speech status] ${res.status} ${rawBody.slice(0, 300)}`,
					);
					if (alive) gatewayStatusUnknownRef.current = true;
					return;
				}
				let parsed: unknown = null;
				try {
					parsed = rawBody.trim() ? JSON.parse(rawBody) : null;
				} catch (parseError) {
					showToast(
						actionFailureToast(
							"Ошибка выполнения операции",
							(parseError as { status?: number })?.status ?? null,
						),
						"error",
					);
					logger.error("[speech status] тело ответа не разобрано", parseError);
				}
				if (!looksLikeSpeechGatewayStatus(parsed)) {
					logger.error(
						"[speech status] ответ не похож на состояние шлюза, в стор не пишем",
					);
					if (alive) gatewayStatusUnknownRef.current = true;
					return;
				}
				if (!alive) return;
				gatewayStatusUnknownRef.current = false;
				setSpeechGatewayStatus(parsed);
			} catch (err) {
				showToast(
					actionFailureToast(
						"Ошибка выполнения операции",
						(err as { status?: number })?.status ?? null,
					),
					"error",
				);
				logger.error("[speech status] запрос не выполнен", err);
				if (alive) gatewayStatusUnknownRef.current = true;
			}
		};
		void loadGatewayStatus();
		return () => {
			alive = false;
		};
		/*
		 * Секрет добавлен в зависимости намеренно. Состояние шлюза читается один раз,
		 * пока оно неизвестно; если администратор вводит секрет ПОСЛЕ первой попытки,
		 * без этой зависимости чтение больше не повторилось бы, и врач до конца смены
		 * видел бы распознавание «хуже ожидаемого» при уже разблокированном доступе.
		 */
	}, [speechGatewayStatus, setSpeechGatewayStatus, clinicalAdminSecretSession]);

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
			showToast(
				actionFailureToast(
					"Ошибка выполнения операции",
					(e as { status?: number })?.status ?? null,
				),
				"error",
			);
			logger.warn("Could not play synthesized audio feedback:", e);
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
					recordingId: `assistant_${Date.now()}`,
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

				const secret = clinicalAdminSecretSession.trim() || undefined;
				const headers = denteAdminSecretRequestHeaders(
					{ "Content-Type": "application/json" },
					secret,
				);

				const response = await fetch("/api/speech/transcribe-chunk", {
					method: "POST",
					headers,
					body: JSON.stringify(input),
				});

				// Тело читается один раз строкой и разбирается безопасно. БЫЛО: res.json()
				// до проверки res.ok — на пустом теле отказа он бросал исключение, и
				// причина отказа подменялась общим «Ошибка сервера распознавания».
				const rawBody = await response.text();
				const payload = jsonObjectOrNull(rawBody);

				if (!response.ok) {
					logger.error(
						`[speech transcribe] ${response.status} ${rawBody.slice(0, 300)}`,
					);
					const detail = operatorReadableErrorDetail(
						typeof payload?.message === "string" ? payload.message : null,
					);
					showToast(
						detail ??
							`Голос не распознан: ${requestFailureCause(response.status)}.`,
						"error",
						10000,
					);
					playBeep("error");
					return;
				}

				const chunk =
					payload?.chunk &&
					typeof payload.chunk === "object" &&
					!Array.isArray(payload.chunk)
						? (payload.chunk as Record<string, unknown>)
						: null;

				if (chunk?.status === "failed") {
					// Своей причины у фрагмента нет: в схеме ответа
					// (speechTranscriptionChunkSchema) есть только warnings — массив строк
					// по-русски. Берём первую, если она есть.
					const firstWarning = Array.isArray(chunk.warnings)
						? chunk.warnings[0]
						: null;
					const detail = operatorReadableErrorDetail(
						typeof firstWarning === "string" ? firstWarning : null,
					);
					logger.error(
						`[speech transcribe] фрагмент не распознан: ${rawBody.slice(0, 300)}`,
					);
					showToast(
						detail ??
							"Сервер не смог распознать этот фрагмент. Повторите фразу ближе к микрофону; если повторяется — проверьте распознавание в «Настройки → ИИ».",
						"error",
						10000,
					);
					playBeep("error");
					return;
				}

				const transcript =
					typeof chunk?.transcript === "string" ? chunk.transcript.trim() : "";
				if (transcript) {
					setTranscript(transcript);
					handleCommand(transcript);
				} else {
					// Пустой текст при успешном ответе — это действительно «ничего не
					// услышали», а не отказ сервера: отказ обработан выше.
					showToast(
						"Ничего не расслышали. Скажите фразу ещё раз — ближе к микрофону и без пауз в начале.",
						"warning",
						8000,
					);
					playBeep("error");
				}
			} catch (err: any) {
				// Сюда попадает только обрыв связи: ответ сервера, включая отказ, разобран выше.
				logger.error("Voice Assistant Server STT Error:", err);
				showToast(
					`Голос не распознан: ${requestFailureCause(null)}.`,
					"error",
					10000,
				);
				playBeep("error");
			}
		},
		[dashboard, handleCommand, playBeep, clinicalAdminSecretSession.trim],
	);

	const startBrowserNative = useCallback(async () => {
		const SpeechRecognition =
			(window as any).SpeechRecognition ||
			(window as any).webkitSpeechRecognition;
		if (!SpeechRecognition) {
			logger.error("Speech Recognition API not supported in this browser.");
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
			logger.error("Speech recognition error", event.error);
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
				/*
				 * Причины отката к браузерному распознаванию разные, и человеку важна
				 * именно та, которую он может исправить. Молча откатываться нельзя:
				 * врач диктует так же, а текст получается заметно хуже, и он думает,
				 * что программа стала плохо распознавать.
				 */
				if (!navigator.onLine) {
					showToast(
						"Сети нет: диктовка идёт силами браузера, текст получится грубее. Проверьте подключение и повторите — тогда распознает сервер клиники.",
						"warning",
						9000,
					);
				} else if (
					gatewayStatusUnknownRef.current &&
					!gatewayFallbackReportedRef.current
				) {
					gatewayFallbackReportedRef.current = true;
					showToast(
						"Не удалось узнать, включено ли распознавание на сервере клиники, поэтому диктовка идёт силами браузера и текст получится грубее. Обновите страницу; если не поможет — попросите администратора проверить раздел «Настройки → ИИ».",
						"warning",
						12000,
					);
				}
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
			showToast(
				actionFailureToast(
					"Ошибка выполнения операции",
					(err as { status?: number })?.status ?? null,
				),
				"error",
			);
			logger.error("Failed to start listening:", err);
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
			streamRef.current.getTracks().forEach((track) => {
				track.stop();
			});
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
