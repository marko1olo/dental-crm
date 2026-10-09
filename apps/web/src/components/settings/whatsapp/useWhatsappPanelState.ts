import { useCallback, useEffect, useState } from "react";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders.js";
import { showToast } from "../../GlobalToast.js";
import type { GatewayMode, QrProvider, WabaTestResult } from "./types.js";

export interface UseWhatsappPanelStateParams {
	phoneNumberIdDraft: string;
	accessTokenDraft: string;
	serverBaseUrl?: string | undefined;
}

export function useWhatsappPanelState({
	phoneNumberIdDraft,
	accessTokenDraft,
	serverBaseUrl,
}: UseWhatsappPanelStateParams) {
	const [cleanSavedNotice, setCleanSavedNotice] = useState(false);
	const [gatewayMode, setGatewayMode] = useState<GatewayMode>("cloud_api");
	const [qrProvider, setQrProvider] = useState<QrProvider>("green_api");
	const [openQrStep, setOpenQrStep] = useState<number | null>(1);

	// QR Hub States
	const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
	const [pairingCode, setPairingCode] = useState<string | null>("7A4K-9M2N");
	const [secondsLeft, setSecondsLeft] = useState<number>(60);
	const [connectedPhone, setConnectedPhone] = useState<string | null>(null);
	const [deviceModel, setDeviceModel] = useState<string | null>(null);
	const [isPairingCodeMode, setIsPairingCodeMode] = useState(false);
	const [phoneInput, setPhoneInput] = useState("+7 (999) 123-45-67");
	const [isQrLoading, setIsQrLoading] = useState(false);

	// WABA State
	const [wabaAccountIdDraft, setWabaAccountIdDraft] = useState("");
	const [isTestingWaba, setIsTestingWaba] = useState(false);
	const [wabaTestResult, setWabaTestResult] = useState<WabaTestResult | null>(null);

	// Webhook URL
	const webhookUrl = serverBaseUrl
		? `${serverBaseUrl}/api/whatsapp/webhook`
		: typeof window !== "undefined"
			? `${window.location.origin}/api/whatsapp/webhook`
			: "https://clinic.example.com/api/whatsapp/webhook";

	const copyWebhook = useCallback(() => {
		void navigator.clipboard.writeText(webhookUrl);
		showToast("Webhook URL скопирован", "info");
	}, [webhookUrl]);

	// Запуск / Обновление QR-сессии
	const startQrSession = useCallback(
		async (force = false) => {
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
					setQrDataUrl(data.qrDataUrl);
					setPairingCode(data.pairingCode);
					setSecondsLeft(data.expiresInSeconds || 60);
					if (data.status === "authenticated") {
						setConnectedPhone(data.connectedPhone || "+7 (999) 123-45-67");
					}
				}
			} catch {
				setSecondsLeft(60);
			} finally {
				setIsQrLoading(false);
			}
		},
		[isPairingCodeMode, phoneInput],
	);

	// Проверка статуса QR-сессии
	const fetchQrStatus = useCallback(async () => {
		try {
			const res = await fetch("/api/whatsapp/qr/session/status", {
				headers: denteAdminSecretRequestHeaders(),
			});
			if (res.ok) {
				const data = await res.json();
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
			// fallback
		}
	}, []);

	useEffect(() => {
		void fetchQrStatus();
		void startQrSession();
	}, [fetchQrStatus, startQrSession]);

	useEffect(() => {
		if (connectedPhone) return;
		const timer = setInterval(() => {
			setSecondsLeft((prev) => {
				if (prev <= 1) {
					void startQrSession(true);
					return 60;
				}
				return prev - 1;
			});
		}, 1000);
		return () => clearInterval(timer);
	}, [connectedPhone, startQrSession]);

	const handleDisconnectQr = useCallback(async () => {
		try {
			await fetch("/api/whatsapp/qr/session/disconnect", {
				method: "POST",
				headers: denteAdminSecretRequestHeaders(),
			});
			setConnectedPhone(null);
			setDeviceModel(null);
			showToast("Рабочий телефон отвязан от клиники", "info");
			void startQrSession(true);
		} catch {
			setConnectedPhone(null);
			void startQrSession(true);
		}
	}, [startQrSession]);

	const handleSimulateScan = useCallback(async () => {
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
				setConnectedPhone(data.connectedPhone);
				setDeviceModel(data.deviceModel);
				showToast("Рабочий смартфон клиники успешно подключен!", "success");
			}
		} catch {
			setConnectedPhone(phoneInput || "+7 (999) 123-45-67");
			setDeviceModel("Рабочий смартфон клиники (Демо)");
			showToast("Рабочий телефон подключен (демо)", "success");
		}
	}, [phoneInput]);

	const handleTestWaba = useCallback(async () => {
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
	}, [accessTokenDraft, phoneNumberIdDraft]);

	const triggerCleanSavedToast = useCallback(() => {
		setCleanSavedNotice(true);
		setTimeout(() => {
			setCleanSavedNotice(false);
		}, 2500);
	}, []);

	return {
		gatewayMode,
		setGatewayMode,
		qrProvider,
		setQrProvider,
		openQrStep,
		setOpenQrStep,
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
		wabaAccountIdDraft,
		setWabaAccountIdDraft,
		isTestingWaba,
		wabaTestResult,
		webhookUrl,
		copyWebhook,
		startQrSession,
		handleDisconnectQr,
		handleSimulateScan,
		handleTestWaba,
		cleanSavedNotice,
		triggerCleanSavedToast,
	};
}
