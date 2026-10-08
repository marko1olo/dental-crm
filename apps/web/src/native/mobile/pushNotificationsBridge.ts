/**
 * DENTE CRM — Push Notifications & Notification Channels Bridge (Layer 2)
 *
 * FCM background push notifications, Android high-priority channels, and app badge counter.
 */

import type {
	MobilePushNotificationPayload,
	MobilePushNotificationHandlers,
	CapacitorPushNotificationSchema,
	CapacitorPushNotificationActionResult,
} from "./types";
import { isNativePlatform, getMobileNativeApi } from "./platform";
import { triggerHaptic, playClinicalAudioFeedback } from "./hapticsAndAudio";
import { saveSecureToken } from "./offlineStorageBridge";

/**
 * Requests push notification permissions in browser / mobile environment.
 */
export async function requestPushNotificationPermission(): Promise<{
	granted: boolean;
	status: "granted" | "denied" | "default";
}> {
	if (isNativePlatform()) {
		const pushPlugin = window.Capacitor?.Plugins?.PushNotifications;
		if (pushPlugin?.requestPermissions) {
			try {
				const result = await pushPlugin.requestPermissions();
				const granted = result.receive === "granted";
				return {
					granted,
					status: granted ? "granted" : result.receive === "prompt" ? "default" : "denied",
				};
			} catch (err) {
				console.warn("[Push] Capacitor push permission request error:", err);
			}
		}
	}

	if (typeof window === "undefined" || !("Notification" in window)) {
		return { granted: false, status: "denied" };
	}
	if (Notification.permission === "granted") {
		return { granted: true, status: "granted" };
	}
	if (Notification.permission === "denied") {
		return { granted: false, status: "denied" };
	}
	try {
		const permission = await Notification.requestPermission();
		return { granted: permission === "granted", status: permission };
	} catch (err: unknown) {
		console.warn("[mobileBridge] Notification.requestPermission failed:", err);
		return { granted: false, status: "denied" };
	}
}

/**
 * Creates high-priority Android notification channels for urgent clinical calls and alarms.
 */
export async function createAndroidNotificationChannels(): Promise<void> {
	if (!isNativePlatform()) return;

	const pushPlugin = window.Capacitor?.Plugins?.PushNotifications;
	if (!pushPlugin?.createChannel) return;

	try {
		// 1. High-priority channel for incoming doctor calls / telephony
		await pushPlugin.createChannel({
			id: "dente_urgent_calls",
			name: "Входящие звонки и вызовы клиники",
			description: "Экстренные звонки пациентов и селекторная связь клиники",
			importance: 5, // NotificationManager.IMPORTANCE_HIGH / MAX
			visibility: 1, // Notification.VISIBILITY_PUBLIC (Lockscreen)
			sound: "custom_ringtone.wav",
			vibration: true,
			lights: true,
			lightColor: "#ef4444",
		});

		// 2. Clinical urgent alerts (Allergy alarms, patient in acute pain, doctor summons)
		await pushPlugin.createChannel({
			id: "dente_clinical_alerts",
			name: "Клинические оповещения и острая боль",
			description: "Оповещения об острой боли, статусе стерилизации и вызовах ассистента",
			importance: 4,
			visibility: 1,
			sound: "custom_ringtone.wav",
			vibration: true,
			lights: true,
			lightColor: "#f59e0b",
		});

		// 3. General appointment reminders & schedule updates
		await pushPlugin.createChannel({
			id: "dente_appointments_channel",
			name: "Записи пациентов и расписание",
			description: "Напоминания о приемах и изменения в расписании",
			importance: 3, // NotificationManager.IMPORTANCE_DEFAULT
			visibility: 0,
			vibration: true,
		});
	} catch (err) {
		console.warn("[Push] Error creating Android notification channels:", err);
	}
}

/**
 * Triggers background wake-up and alert effects when receiving high-priority clinical pushes.
 */
export function triggerBackgroundWakeUp(payload: MobilePushNotificationPayload): void {
	if (typeof window === "undefined") return;

	const isUrgent =
		payload.isUrgentWakeUp ||
		payload.data?.urgent === "true" ||
		payload.data?.type === "incoming_call" ||
		payload.data?.type === "doctor_summon" ||
		payload.data?.type === "emergency_pain";

	if (isUrgent) {
		triggerHaptic("error");
		playClinicalAudioFeedback("warning");
	} else {
		triggerHaptic("light");
		playClinicalAudioFeedback("click");
	}

	// Dispatch custom DOM event for active UI screens (e.g. ScheduleView, PatientCard, TelephonyModal)
	try {
		const customEv = new CustomEvent("dente:fcm-wake-up", {
			detail: payload,
			bubbles: true,
		});
		window.dispatchEvent(customEv);
	} catch (err: unknown) {
		console.warn("[mobileBridge] dispatchEvent dente:fcm-wake-up failed:", err);
	}
}

/**
 * Initializes FCM background push notification listeners with full Android/iOS/Web resilience.
 */
export async function initMobilePushNotifications(
	handlers: MobilePushNotificationHandlers = {},
): Promise<{ success: boolean; token?: string | undefined; error?: string | undefined }> {
	// 1. Native Capacitor / Android / iOS Shell
	if (isNativePlatform()) {
		const pushPlugin = window.Capacitor?.Plugins?.PushNotifications;
		if (pushPlugin) {
			try {
				await createAndroidNotificationChannels();

				const perm = await pushPlugin.requestPermissions?.();
				if (perm && perm.receive !== "granted") {
					return {
						success: false,
						error: "Разрешение на push-уведомления отклонено пользователем",
					};
				}

				if (pushPlugin.addListener) {
					pushPlugin.addListener("registration", (tokenData: { value?: string; token?: string }) => {
						const token = tokenData?.value || tokenData?.token || "";
						if (token) {
							void saveSecureToken("fcm_device_token", token);
							handlers.onRegistration?.(token);
						}
					});

					pushPlugin.addListener("registrationError", (err: { error?: string }) => {
						const errorMsg = err?.error || "Ошибка регистрации FCM токена";
						handlers.onRegistrationError?.(errorMsg);
					});

					pushPlugin.addListener("pushNotificationReceived", (notification: CapacitorPushNotificationSchema) => {
						const payload: MobilePushNotificationPayload = {
							id: notification.id,
							title: notification.title,
							body: notification.body,
							data: notification.data,
							clickAction: notification.click_action,
							isUrgentWakeUp: notification.data?.urgent === "true",
						};
						triggerBackgroundWakeUp(payload);
						handlers.onNotificationReceived?.(payload);
					});

					pushPlugin.addListener(
						"pushNotificationActionPerformed",
						(action: CapacitorPushNotificationActionResult) => {
							const payload: MobilePushNotificationPayload = {
								id: action.notification?.id,
								title: action.notification?.title,
								body: action.notification?.body,
								data: action.notification?.data,
								clickAction: action.notification?.click_action,
							};
							handlers.onNotificationActionPerformed?.(payload, action.actionId);
						},
					);
				}

				await pushPlugin.register?.();

				return { success: true };
			} catch (err: unknown) {
				const msg = err instanceof Error ? err.message : "Ошибка инициализации FCM push";
				return { success: false, error: msg };
			}
		}

		// Fallback to native custom bridge if present
		const nativeApi = getMobileNativeApi();
		if (nativeApi?.registerPushNotifications) {
			return nativeApi.registerPushNotifications();
		}
	}

	// 2. Pure Web / PWA Environment Fallback
	const webPerm = await requestPushNotificationPermission();
	if (!webPerm.granted) {
		return {
			success: false,
			error: "Уведомления в браузере отклонены",
		};
	}

	return {
		success: true,
		token: "pwa-web-notification-granted",
	};
}

/**
 * Updates app icon badge count on iOS / Android or Web App Badging API.
 */
export async function setAppBadgeCount(count: number): Promise<void> {
	if (typeof window === "undefined") return;

	// 1. Native Capacitor Badge Plugin
	const badgePlugin = window.Capacitor?.Plugins?.Badge;
	if (badgePlugin?.set) {
		try {
			await badgePlugin.set({ count: Math.max(0, count) });
			return;
		} catch (err: unknown) {
			console.warn("[mobileBridge] native badge set failed:", err);
		}
	}

	// 2. Modern Web App Badging API (navigator.setAppBadge)
	if (typeof navigator !== "undefined" && "setAppBadge" in navigator && typeof (navigator as any).setAppBadge === "function") {
		try {
			if (count > 0) {
				await (navigator as any).setAppBadge(count);
			} else {
				await (navigator as any).clearAppBadge();
			}
		} catch (err: unknown) {
			console.warn("[mobileBridge] navigator setAppBadge/clearAppBadge failed:", err);
		}
	}
}

/**
 * Clears app icon badge.
 */
export async function clearAppBadgeCount(): Promise<void> {
	await setAppBadgeCount(0);
}
