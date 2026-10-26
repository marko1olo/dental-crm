/**
 * apps/web/src/components/billing/sbpQrEngine.ts
 *
 * SBP dynamic QR: the cashier requests the payment QR from the clinic server.
 *
 * Division of truth: the NSPK payload (operation id, bank member id, amount,
 * CRC16) is built ONLY by the backend (`POST /api/sbp/generate-qr`) and is
 * stored against the operation id, so the status route can find the payment.
 * This module only visualizes the payload the server returned and copies its
 * link. A client-invented NSPK link would render a QR that no bank app
 * can actually pay, and the polling route would never find the operation —
 * exactly the kind of Potemkin village this module used to be.
 *
 * Mandate 8e (zero cashier friction), Mandate 8i (exact kopecks), Mandate 8n.
 */

import { generateQrCodeSvg } from "@dental/shared";

export interface SbpDynamicQrConfig {
	readonly sumRub: number;
	readonly orderId?: string | undefined;
	readonly invoiceId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly clinicLegalName?: string | undefined;
	readonly ttlSeconds?: number | undefined;
	readonly purpose?: string | undefined;
	/** Идемпотентный идентификатор операции; генерируется вызывающей стороной (UUIDv7). */
	readonly operationId?: string | undefined;
}

export interface SbpDynamicQrPayloadData {
	readonly operationId: string;
	readonly sumRub: number;
	readonly sumKopecks: number;
	readonly sumFormattedRu: string;
	readonly nspkUrl: string;
	readonly crc16Hex: string;
	readonly expiresAtIso: string;
	readonly ttlSeconds: number;
	readonly svg: string;
}

export interface SbpDynamicQrRequestResult {
	readonly qr: SbpDynamicQrPayloadData | null;
	readonly errorRu: string | null;
}

/**
 * Requests a dynamic SBP QR from the backend. The backend builds the real NSPK
 * payload and returns its vector SVG. On failure the caller receives an honest
 * error text and renders no QR at all — there is no fabricated fallback link.
 */
export async function fetchSbpDynamicQr(config: SbpDynamicQrConfig): Promise<SbpDynamicQrRequestResult> {
	const sumRub = Math.max(0, config.sumRub || 0);
	const sumKopecks = Math.round(sumRub * 100);
	if (!config.operationId) {
		return { qr: null, errorRu: "Не создан идентификатор операции — обновите QR." };
	}
	// Схема сервера принимает TTL от 60 секунд.
	const ttlSeconds = Math.max(60, config.ttlSeconds ?? 300);

	try {
		const res = await fetch("/api/sbp/generate-qr", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				operationId: config.operationId,
				amountKopecks: sumKopecks,
				ttlSeconds,
				invoiceId: config.invoiceId ?? config.orderId ?? null,
				description:
					config.purpose ||
					(config.patientName
						? `Оплата стоматологических услуг: ${config.patientName}`
						: "Оплата стоматологических услуг"),
			}),
		});
		const data = (await res.json().catch(() => null)) as {
			success?: boolean;
			payloadUrl?: string;
			operationId?: string;
			crc16?: string;
			qrSvg?: string | null;
			expiresAt?: string;
			ttlSeconds?: number;
			message?: string;
		} | null;

		if (!res.ok || !data?.success || !data.payloadUrl) {
			return {
				qr: null,
				errorRu:
					data?.message ||
					`Банк-эквайер недоступен (ошибка ${res.status}). Пополните QR повторно или примите оплату другим способом.`,
			};
		}

		// Сервер присылает готовый SVG. Если он не собрался — честно отрисовываем
		// возвращённую сервером ссылку локальным рендером (только визуализация payload).
		const rawSvg = data.qrSvg || generateQrCodeSvg(data.payloadUrl, { size: 160, margin: 2 });
		const svg = injectSbpCenterLogo(rawSvg, 160);

		return {
			qr: {
				operationId: data.operationId || config.operationId,
				sumRub,
				sumKopecks,
				sumFormattedRu: `${sumRub.toLocaleString("ru-RU")} ₽`,
				nspkUrl: data.payloadUrl,
				crc16Hex: data.crc16 || "",
				expiresAtIso: data.expiresAt || new Date(Date.now() + ttlSeconds * 1000).toISOString(),
				ttlSeconds: data.ttlSeconds || ttlSeconds,
				svg,
			},
			errorRu: null,
		};
	} catch {
		return {
			qr: null,
			errorRu: "Нет связи с сервером кассы. Проверьте сеть и обновите QR-код.",
		};
	}
}

/**
 * Injects a crisp vector SBP triangle logo at the center of the QR SVG.
 * Center position: (size/2, size/2), badge size ~22% of the QR side.
 */
export function injectSbpCenterLogo(svg: string, size = 160): string {
	if (!svg.includes("</svg>")) return svg;

	const center = Math.round(size / 2);
	const badgeSize = Math.round(size * 0.22); // ~35px on 160px
	const halfBadge = Math.round(badgeSize / 2);
	const x = center - halfBadge;
	const y = center - halfBadge;

	// Authentic SBP Emblem (Tri-color geometric motif)
	const sbpOverlay = `
  <g class="sbp-center-badge" aria-label="СБП">
    <rect x="${x}" y="${y}" width="${badgeSize}" height="${badgeSize}" rx="6" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.2" />
    <path d="M ${x + 6} ${y + 10} L ${x + 17} ${y + 5} L ${x + 13} ${y + 17} Z" fill="#0047bb" />
    <path d="M ${x + 17} ${y + 5} L ${x + 28} ${y + 10} L ${x + 22} ${y + 17} Z" fill="#ffb81c" />
    <path d="M ${x + 13} ${y + 17} L ${x + 22} ${y + 17} L ${x + 17.5} ${y + 27} Z" fill="#e40046" />
    <text x="${center}" y="${y + badgeSize - 3.5}" font-family="system-ui, -apple-system, sans-serif" font-size="5.5" font-weight="900" text-anchor="middle" fill="#0f172a" letter-spacing="0.4">СБП</text>
  </g>
</svg>`;

	return svg.replace("</svg>", sbpOverlay);
}

/**
 * Copies the SBP link to clipboard with a legacy-browser fallback.
 */
export async function copySbpUrlToClipboard(url: string): Promise<boolean> {
	if (!url) return false;
	try {
		if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
			await navigator.clipboard.writeText(url);
			return true;
		}
	} catch {
		// Fallback for older browsers / non-HTTPS
	}

	try {
		if (typeof document !== "undefined") {
			const textArea = document.createElement("textarea");
			textArea.value = url;
			textArea.style.position = "fixed";
			textArea.style.left = "-9999px";
			document.body.appendChild(textArea);
			textArea.select();
			const success = document.execCommand("copy");
			document.body.removeChild(textArea);
			return success;
		}
	} catch {
		return false;
	}
	return false;
}
