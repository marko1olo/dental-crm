import type {
	SpeechChunkUploadInput,
	SpeechGatewayStatus,
} from "@dental/shared";
import { useCallback, useEffect, useRef, useState } from "react";
import {
	denteAdminSecretRequestHeaders,
	operatorReadableErrorDetail,
} from "../AppHelpers";
import { UnifiedAudioClient } from "../services/voice/UnifiedAudioClient";
import { soundFeedback } from "../services/audio/SoundFeedbackService";
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
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	lastAction: { action: AiIntent; payload?: any } | null;
}

export interface UseVoiceAssistantOptions {
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
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
		// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		payload?: any;
	} | null>(null);

	const clientRef = useRef<UnifiedAudioClient | null>(null);

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

	useEffect(() => {
		return () => {
			if (clientRef.current) {
				clientRef.current.dispose();
				clientRef.current = null;
			}
		};
	}, []);

	const playTTS = useCallback((text: string) => {
		window.speechSynthesis.cancel();
		const utterance = new SpeechSynthesisUtterance(text);
		utterance.lang = "ru-RU";
		utterance.rate = 1.1;
		window.speechSynthesis.speak(utterance);
	}, []);

	const playBeep = useCallback((type: "start" | "success" | "error") => {
		try {
			if (type === "start") {
				void soundFeedback.playMicStart();
			} else if (type === "success") {
				void soundFeedback.playActionSuccess();
			} else if (type === "error") {
				void soundFeedback.playWarningAlert();
			}
		} catch (e) {
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

	const startListening = useCallback(async () => {
		if (isListening) return;

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
				specialty: "therapy",
				adminSecret: clinicalAdminSecretSession.trim() || undefined,
				autoFallback: true,
			});
			clientRef.current = client;

			client.subscribe({
				onStateChange: (state) => {
					const listening = state === "listening";
					setIsListening((prev) => (prev !== listening ? listening : prev));
				},
				onInterimText: (interim) => {
					if (interim) {
						setTranscript((prev) => (prev !== interim ? interim : prev));
					}
				},
				onFinalText: (final, accumulated) => {
					const t = (accumulated || final).trim();
					if (t) {
						setTranscript((prev) => (prev !== t ? t : prev));
						handleCommand(t);
					}
				},
				onRmsUpdate: (rms) => {
					const vol = Math.min(100, Math.round(rms * 250));
					setVolume((prev) => (Math.abs(prev - vol) >= 5 ? vol : prev));
				},
				onError: (err) => {
					const msg = typeof err === "string" ? err : err.message;
					showToast(`Ошибка распознавания: ${msg}`, "error");
					setIsListening(false);
					playBeep("error");
				},
			});

			await client.start();
			setIsListening(true);
			playBeep("start");
			setTranscript("");
		} catch (err: unknown) {
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
	}, [dashboard, clinicalAdminSecretSession, isListening, handleCommand, playBeep]);

	const stopListening = useCallback(async () => {
		if (!isListening) return;

		setIsListening(false);
		setVolume(0);
		playBeep("success");

		if (clientRef.current) {
			try {
				const finalTranscript = await clientRef.current.stop();
				if (finalTranscript && finalTranscript.trim()) {
					setTranscript(finalTranscript.trim());
					handleCommand(finalTranscript.trim());
				}
			} catch (e) {
				logger.warn("stopListening error:", e);
			}
		}
	}, [isListening, playBeep, handleCommand]);

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
