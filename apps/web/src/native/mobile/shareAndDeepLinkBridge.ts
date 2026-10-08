/**
 * DENTE CRM — Deep Linking & Web Share Bridge (Layer 2)
 *
 * dente:// deep link parser and WhatsApp / Telegram / Web Share API dispatcher.
 */

import type {
	DenteDeepLinkAction,
	DenteDeepLinkPayload,
	MobileDocShareResult,
} from "./types";
import { getMobileNativeApi } from "./platform";
import { triggerHaptic } from "./hapticsAndAudio";

/**
 * Parses and normalizes incoming mobile deep link URL (e.g. `dente://open-visit?patientId=pat-100&visitId=vis-200`).
 */
export function parseDenteDeepLink(rawUrl: string): DenteDeepLinkPayload | null {
	if (!rawUrl || typeof rawUrl !== "string") return null;

	const trimmed = rawUrl.trim();
	let protocol: "dente" | "https" | "http" = "dente";
	let actionPath = "";
	let queryString = "";

	if (trimmed.startsWith("dente://")) {
		protocol = "dente";
		const withoutScheme = trimmed.slice(8);
		const qIdx = withoutScheme.indexOf("?");
		if (qIdx !== -1) {
			actionPath = withoutScheme.slice(0, qIdx);
			queryString = withoutScheme.slice(qIdx + 1);
		} else {
			actionPath = withoutScheme;
		}
	} else if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
		try {
			const u = new URL(trimmed);
			protocol = u.protocol.replace(":", "") as "https" | "http";
			actionPath = u.pathname.replace(/^\//, "");
			queryString = u.search.replace(/^\?/, "");
		} catch (err: unknown) {
			console.warn("[mobileBridge] parseDenteDeepLink URL constructor failed:", err);
			return null;
		}
	} else {
		return null;
	}

	// Parse query params
	const params: Record<string, string> = {};
	if (queryString) {
		const pairs = queryString.split("&");
		for (const p of pairs) {
			const [k, v] = p.split("=");
			if (k) {
				params[decodeURIComponent(k)] = v ? decodeURIComponent(v) : "";
			}
		}
	}

	// Normalize action
	let action: DenteDeepLinkAction = "unknown";
	const actLower = actionPath.toLowerCase();
	if (actLower.includes("open-visit") || actLower.includes("visit")) {
		action = "open-visit";
	} else if (actLower.includes("open-patient") || actLower.includes("patient")) {
		action = "open-patient";
	} else if (actLower.includes("open-invoice") || actLower.includes("invoice")) {
		action = "open-invoice";
	} else if (actLower.includes("tax") || actLower.includes("knd")) {
		action = "open-tax-cert";
	} else if (actLower.includes("sanpin") || actLower.includes("kraft")) {
		action = "open-sanpin";
	}

	return {
		protocol,
		action,
		patientId: params.patientId || params.patient_id || params.pid || undefined,
		visitId: params.visitId || params.visit_id || params.vid || undefined,
		invoiceId: params.invoiceId || params.invoice_id || params.iid || undefined,
		rawUrl: trimmed,
		params,
	};
}

/**
 * Creates formatted `dente://` deep link URL.
 */
export function createDenteDeepLink(
	action: DenteDeepLinkAction,
	params: Record<string, string | number | undefined> = {},
): string {
	const queryEntries = Object.entries(params)
		.filter(([_, v]) => v !== undefined && v !== "")
		.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
	const qs = queryEntries.length > 0 ? `?${queryEntries.join("&")}` : "";
	return `dente://${action}${qs}`;
}

/**
 * Generates WhatsApp SOS direct messaging link for clinical document delivery.
 */
export function generateWhatsAppDocShareLink(phone: string, text: string): string {
	const cleanPhone = (phone || "").replace(/\D/g, "");
	const normalizedPhone = cleanPhone.startsWith("8") && cleanPhone.length === 11
		? `7${cleanPhone.slice(1)}`
		: cleanPhone;
	const encodedText = encodeURIComponent(text || "");
	return `https://api.whatsapp.com/send?phone=${normalizedPhone}&text=${encodedText}`;
}

/**
 * Generates Telegram share link for clinical documents & certificates.
 */
export function generateTelegramDocShareLink(text: string, url?: string): string {
	const encodedText = encodeURIComponent(text || "");
	const encodedUrl = url ? encodeURIComponent(url) : "";
	return `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`;
}

/**
 * Universal Mobile Document Sharing Dispatcher (Web Share API, Capacitor, WhatsApp SOS, Telegram).
 * Used for 1-click sharing of 54-FZ Fiscal Receipts, Tax Certificates (KND 1151156) and treatment plans.
 */
export async function shareClinicalDocumentMobile(params: {
	title: string;
	text?: string | undefined;
	url?: string | undefined;
	phone?: string | undefined;
	fallbackMessenger?: "whatsapp" | "telegram" | "clipboard" | undefined;
}): Promise<MobileDocShareResult> {
	const textContent = params.text || params.title;
	const shareTitle = params.title;
	const shareUrl = params.url || (typeof window !== "undefined" ? window.location.href : "");

	// 1. Native Capacitor App bridge if available
	const nativeApi = getMobileNativeApi();
	if (nativeApi?.shareFile && params.url) {
		try {
			const res = await nativeApi.shareFile(params.url, shareTitle);
			if (res.success) {
				triggerHaptic("success");
				return { success: true, sharedVia: "capacitor", urlOrPayload: params.url };
			}
		} catch (err: unknown) {
			console.warn("[mobileBridge] native shareFile failed, falling back to Web Share API:", err);
			// Fall through to Web Share API
		}
	}

	// 2. Modern Web Share API (navigator.share)
	if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
		try {
			await navigator.share({
				title: shareTitle,
				text: textContent,
				url: shareUrl,
			});
			triggerHaptic("success");
			return { success: true, sharedVia: "native_share", urlOrPayload: shareUrl };
		} catch (err: unknown) {
			const errName = (err as { name?: string })?.name;
			if (errName === "AbortError") {
				return { success: false, sharedVia: "native_share", error: "Отправка документа отменена пользователем" };
			}
			// Fall through to Messenger fallback
		}
	}

	// 3. WhatsApp Direct Messenger Fallback
	if (params.phone || params.fallbackMessenger === "whatsapp") {
		const waLink = generateWhatsAppDocShareLink(params.phone || "", `${shareTitle}\n\n${textContent}\n${shareUrl}`);
		if (typeof window !== "undefined") {
			window.open(waLink, "_blank");
		}
		triggerHaptic("light");
		return { success: true, sharedVia: "whatsapp_sos", urlOrPayload: waLink };
	}

	// 4. Telegram Direct Messenger Fallback
	if (params.fallbackMessenger === "telegram") {
		const tgLink = generateTelegramDocShareLink(`${shareTitle}\n\n${textContent}`, shareUrl);
		if (typeof window !== "undefined") {
			window.open(tgLink, "_blank");
		}
		triggerHaptic("light");
		return { success: true, sharedVia: "telegram", urlOrPayload: tgLink };
	}

	// 5. Clipboard Fallback
	if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
		try {
			await navigator.clipboard.writeText(`${shareTitle}\n\n${textContent}\n${shareUrl}`);
			triggerHaptic("light");
			return { success: true, sharedVia: "clipboard", urlOrPayload: shareUrl };
		} catch (err: unknown) {
			console.warn("[mobileBridge] clipboard.writeText failed:", err);
			// Ignore clipboard failure
		}
	}

	return {
		success: false,
		sharedVia: "error",
		error: "Не удалось отправить документ: функции общего доступа недоступны на этом устройстве.",
	};
}
