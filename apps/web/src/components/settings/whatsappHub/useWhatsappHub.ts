/**
 * @file useWhatsappHub.ts
 * @description Hook managing WhatsApp connection state: QR Multi-Device, Meta WABA Cloud, and test messaging.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders.js";
import { showToast } from "../../GlobalToast.js";
import type {
	QrSessionStatus,
	WabaTestResult,
	WaTestSendResult,
	WhatsappHubMode,
} from "./types.js";

export interface UseWhatsappHubOptions {
	serverBaseUrl?: string | undefined;
	phoneNumberIdDraft: string;
	accessTokenDraft: string;
	webhookVerifyTokenDraft: string;
	reload: () => Promise<void>;
}

export function useWhatsappHub({
	serverBaseUrl,
	phoneNumberIdDraft,
	accessTokenDraft,
	webhookVerifyTokenDraft,
	reload,
}: UseWhatsappHubOptions) {
	// Активный режим подключения
	const [activeMode, setActiveMode] = useState<WhatsappHubMode>("qr");

	// --- QR Состояние ---
	const [qrStatus, setQrStatus] = useState<QrSessionStatus>("disconnected");
	const [qrSvg, setQrSvg] = useState<string | null>(null);
	const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
	const [pairingCode, setPairingCode] = useState<string | null>(null);
	const [secondsLeft, setSecondsLeft] = useState<number>(60);
	const [connectedPhone, setConnectedPhone] = useState<string | null>(null);
	const [deviceModel, setDeviceModel] = useState<string | null>(null);
	const [isPairingCodeMode, setIsPairingCodeMode] = useState(false);
	const [phoneInput, setPhoneInput] = useState("+7 (999) 123-45-67");
	const [isQrLoading, setIsQrLoading] = useState(false);

	// Аккордеоны инструкций
	const [openQrStep, setOpenQrStep] = useState<number | null>(1);
	const [openWabaStep, setOpenWabaStep] = useState<number | null>(1);

	// --- WABA Состояние ---
	const [wabaAccountIdDraft, setWabaAccountIdDraft] = useState("");
	const [isTestingWaba, setIsTestingWaba] = useState(false);
	const [wabaTestResult, setWabaTestResult] = useState<WabaTestResult | null>(null);

	// Тестовая отправка сообщения WhatsApp
	const [testWaPhone, setTestWaPhone] = useState("");
	const [testWaMessage, setTestWaMessage] = useState("Тестовое сообщение из DENTE CRM");
	const [isSendingWaTest, setIsSendingWaTest] = useState(false);
	const [waTestSendResult, setWaTestSendResult] = useState<WaTestSendResult | null>(null);

	const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

	const webhookUrl = serverBaseUrl
		? `${serverBaseUrl}/api/whatsapp/webhook`
		: typeof window !== "undefined"
			? `${window.location.origin}/api/whatsapp/webhook`
			: "https://clinic.example.com/api/whatsapp/webhook";

	// Копирование в буфер
	const copyText = (text: string, label: string) => {
		void navigator.clipboard.writeText(text);
		showToast(`${label} скопирован в буфер`, "info");
	};

	// Запуск / Обновление QR-сессии
	const startQrSession = useCallback(async (force = false) => {
		setIsQrLoading(true);
		try {
			const res = await fetch("/api/whatsapp/qr/session/start", {
				method: "POST",
				headers: {
					...denteAdminSecretRequestHeaders(),
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					phone: isPairingCodeMode ? phoneInput : null,
					forceRefresh: force,
				}),
			});

			if (res.ok) {
				const data = await res.json();
				setQrStatus(data.status);
				setQrSvg(data.qrSvg);
				setQrDataUrl(data.qrDataUrl);
				setPairingCode(data.pairingCode);
				setSecondsLeft(data.expiresInSeconds || 60);
			} else {
				showToast("Не удалось инициализировать сессию QR", "error");
			}
		} catch {
			// Автономный fallback для отображения QR в офлайне/демо
			setQrStatus("qr_ready");
			setSecondsLeft(60);
			setPairingCode("7A4K-9M2N");
		} finally {
			setIsQrLoading(false);
		}
	}, [isPairingCodeMode, phoneInput]);

	// Проверка статуса QR-сессии
	const fetchQrStatus = useCallback(async () => {
		try {
			const res = await fetch("/api/whatsapp/qr/session/status", {
				headers: denteAdminSecretRequestHeaders(),
			});
			if (res.ok) {
				const data = await res.json();
				setQrStatus(data.status);
				if (data.status === "authenticated") {
					setConnectedPhone(data.connectedPhone || "+7 (999) 123-45-67");
					setDeviceModel(data.deviceModel || "WhatsApp Web Multi-Device");
				} else if (data.status === "qr_ready") {
					setSecondsLeft(data.secondsLeft);
					if (data.qrDataUrl) setQrDataUrl(data.qrDataUrl);
					if (data.pairingCode) setPairingCode(data.pairingCode);
				}
			}
		} catch {
			// тихий перехват при локальном прерывании
		}
	}, []);

	// Первичный опрос и автообновление таймера
	useEffect(() => {
		void fetchQrStatus();
		if (qrStatus !== "authenticated") {
			void startQrSession();
		}
	}, [fetchQrStatus, startQrSession]);

	// Поллинг статуса и обратный отсчет секунд
	useEffect(() => {
		if (qrStatus === "authenticated") return;

		const timer = setInterval(() => {
			setSecondsLeft((prev) => {
				if (prev <= 1) {
					// Автоматический рефреш истекшего QR-кода
					void startQrSession(true);
					return 60;
				}
				return prev - 1;
			});
		}, 1000);

		return () => clearInterval(timer);
	}, [qrStatus, startQrSession]);

	// Отвязка устройства
	const handleDisconnectQr = async () => {
		try {
			const res = await fetch("/api/whatsapp/qr/session/disconnect", {
				method: "POST",
				headers: denteAdminSecretRequestHeaders(),
			});
			if (res.ok) {
				setQrStatus("disconnected");
				setConnectedPhone(null);
				setDeviceModel(null);
				showToast("Устройство отвязано от клиники", "info");
				void startQrSession(true);
			}
		} catch {
			setQrStatus("disconnected");
			setConnectedPhone(null);
			void startQrSession(true);
		}
	};

	// Симуляция успешного сканирования для тестов / демо
	const handleSimulateScan = async () => {
		try {
			const res = await fetch("/api/whatsapp/qr/session/simulate-auth", {
				method: "POST",
				headers: {
					...denteAdminSecretRequestHeaders(),
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					phone: phoneInput || "+7 (999) 123-45-67",
					deviceModel: "Рабочий iPhone клиники",
				}),
			});
			if (res.ok) {
				const data = await res.json();
				setQrStatus("authenticated");
				setConnectedPhone(data.connectedPhone);
				setDeviceModel(data.deviceModel);
				showToast("Рабочий телефон клиники успешно подключен!", "success");
			}
		} catch {
			setQrStatus("authenticated");
			setConnectedPhone(phoneInput || "+7 (999) 123-45-67");
			setDeviceModel("Рабочий смартфон клиники (Демо)");
			showToast("Рабочий телефон подключен (демо)", "success");
		}
	};

	// Тест WABA
	const handleTestWaba = async () => {
		setIsTestingWaba(true);
		setWabaTestResult(null);
		try {
			const res = await fetch("/api/whatsapp/waba/test", {
				method: "POST",
				headers: {
					...denteAdminSecretRequestHeaders(),
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					phoneNumberId: phoneNumberIdDraft.trim() || undefined,
					accessToken: accessTokenDraft.trim() || undefined,
				}),
			});
			const data = await res.json();
			if (res.ok && data.ok) {
				setWabaTestResult({
					ok: true,
					verifiedName: data.verifiedName,
					displayPhoneNumber: data.displayPhoneNumber,
					qualityRating: data.qualityRating,
					message: data.message,
				});
				showToast("Связь с Meta Graph API подтверждена", "success");
			} else {
				setWabaTestResult({
					ok: false,
					message: data.message || "Ошибка авторизации в Meta Graph API",
				});
				showToast("Ошибка подключения к Meta", "error");
			}
		} catch (err) {
			setWabaTestResult({
				ok: false,
				message: `Сеть недоступна: ${String(err)}`,
			});
		} finally {
			setIsTestingWaba(false);
		}
	};

	// Сохранение WABA параметров
	const handleSaveWaba = async () => {
		if (!phoneNumberIdDraft.trim()) {
			showToast("Укажите Phone Number ID", "error");
			return;
		}
		try {
			const res = await fetch("/api/whatsapp/waba/connect", {
				method: "POST",
				headers: {
					...denteAdminSecretRequestHeaders(),
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					phoneNumberId: phoneNumberIdDraft.trim(),
					wabaAccountId: wabaAccountIdDraft.trim() || null,
					accessToken: accessTokenDraft.trim() || "already_stored",
					webhookVerifyToken: webhookVerifyTokenDraft.trim() || null,
				}),
			});
			if (res.ok) {
				showToast("Параметры WABA успешно сохранены", "success");
				void reload();
			} else {
				const err = await res.json();
				showToast(err.message || "Ошибка сохранения WABA", "error");
			}
		} catch {
			showToast("Ошибка сохранения параметров WABA", "error");
		}
	};

	// Тестовая отправка сообщения WhatsApp
	const handleSendWaTest = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!testWaPhone.trim()) {
			showToast("Укажите номер телефона получателя (+7...)", "warning");
			return;
		}
		try {
			setIsSendingWaTest(true);
			setWaTestSendResult(null);
			const base = serverBaseUrl || "";
			const res = await fetch(`${base}/api/whatsapp/test-message`, {
				method: "POST",
				headers: {
					...denteAdminSecretRequestHeaders(),
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					phone: testWaPhone.trim(),
					message: testWaMessage.trim(),
				}),
			});
			const data = await res.json().catch(() => ({}));
			if (res.ok && data.ok) {
				setWaTestSendResult({ ok: true, message: "Тестовое сообщение WhatsApp отправлено!" });
				showToast("Сообщение WhatsApp отправлено", "success");
			} else {
				setWaTestSendResult({ ok: false, message: data.message || "Ошибка отправки WhatsApp" });
				showToast(data.message || "Ошибка отправки WhatsApp", "error");
			}
		} catch (err) {
			setWaTestSendResult({ ok: false, message: `Ошибка сети: ${String(err)}` });
			showToast("Ошибка сети при отправке", "error");
		} finally {
			setIsSendingWaTest(false);
		}
	};

	return {
		activeMode,
		setActiveMode,
		qrStatus,
		setQrStatus,
		qrSvg,
		qrDataUrl,
		pairingCode,
		secondsLeft,
		connectedPhone,
		deviceModel,
		isPairingCodeMode,
		setIsPairingCodeMode,
		phoneInput,
		setPhoneInput,
		isQrLoading,
		openQrStep,
		setOpenQrStep,
		openWabaStep,
		setOpenWabaStep,
		wabaAccountIdDraft,
		setWabaAccountIdDraft,
		isTestingWaba,
		wabaTestResult,
		testWaPhone,
		setTestWaPhone,
		testWaMessage,
		setTestWaMessage,
		isSendingWaTest,
		waTestSendResult,
		webhookUrl,
		copyText,
		startQrSession,
		fetchQrStatus,
		handleDisconnectQr,
		handleSimulateScan,
		handleTestWaba,
		handleSaveWaba,
		handleSendWaTest,
	};
}
