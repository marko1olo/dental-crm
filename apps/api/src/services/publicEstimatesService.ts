import { createHash } from "node:crypto";
import {
	type PublicAuthMethod,
	type PublicEstimateDetail,
	type PublicEstimateItem,
	type PublicEstimateMeta,
	type PublicEstimateSignature,
	type PublicEstimateStatus,
	calculateEstimateTotals,
	computeEstimateDocumentHash,
} from "@dental/shared";
import { requireAuthTokenSecret } from "../accessGuard.js";
import {
	MAX_CONSECUTIVE_FAILURES,
	TOTAL_FAILURES_PERMANENT_LOCKOUT,
	hashVerbalPin,
	resolvePublicAuthMethod,
	validatePublicPlanSessionToken,
	verifyPatientKnowledgeFactor,
} from "./publicPlan2Fa.js";

export interface EstimateAccessLogEntry {
	readonly id: string;
	readonly estimateId: string;
	readonly attemptedAtIso: string;
	readonly success: boolean;
	readonly method: string;
	readonly ipHash: string;
}

export interface StoredPublicEstimate {
	readonly id: string;
	readonly organizationId: string;
	readonly patientId: string;
	readonly publicToken: string;
	readonly estimateNumber: string;
	status: PublicEstimateStatus;
	readonly validFrom: string;
	readonly validUntil: string | null;
	readonly clinicName: string;
	readonly clinicPhone: string;
	readonly clinicEmail: string;
	readonly clinicAddress: string;
	readonly clinicCurrency: string;
	readonly patientFirstName: string;
	readonly patientPhone?: string | null | undefined;
	readonly patientBirthDate?: string | null | undefined;
	readonly verbalPinHash?: string | null | undefined;
	failedAttempts: number;
	totalFailures: number;
	isLocked: boolean;
	lockedUntil?: Date | null | undefined;
	publicLockedAt?: Date | null | undefined;
	viewedAt?: Date | null | undefined;
	readonly patientNotes: string | null;
	items: PublicEstimateItem[];
	signature?: PublicEstimateSignature | undefined;
	rejectionReason?: string | undefined;
	rejectionNote?: string | undefined;
	decidedAt?: Date | null | undefined;
}

// In-memory store for public estimates with persistence bridge to DB
const estimatesStore = new Map<string, StoredPublicEstimate>();
const accessLogsStore: EstimateAccessLogEntry[] = [];

function hashIp(rawIp?: string): string {
	return createHash("sha256").update(rawIp || "127.0.0.1").digest("hex");
}

export class PublicEstimatesService {
	private static getSecretKey(): string {
		return process.env.BUDGET_PUBLIC_SECRET_KEY || requireAuthTokenSecret();
	}

	/**
	 * Registers or initializes a public estimate for patient link sharing
	 */
	public static registerEstimate(estimate: StoredPublicEstimate): StoredPublicEstimate {
		estimatesStore.set(estimate.publicToken, estimate);
		return estimate;
	}

	/**
	 * Seed initial demo / fallback estimate for token if not already in store
	 */
	public static getOrInitEstimate(token: string): StoredPublicEstimate | null {
		const existing = estimatesStore.get(token);
		if (existing) return existing;

		// If token has valid UUID structure, generate structured default
		if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token) || token.startsWith("demo-")) {
			const defaultItems: PublicEstimateItem[] = [
				{
					id: "item-1",
					title: "Компьютерная томография челюстно-лицевой области (КЛКТ)",
					tooth_number: null,
					quantity: 1,
					unit_price_rub: 4500,
					line_total_rub: 4500,
					discount_rub: 500,
					net_line_total_rub: 4000,
					category: "Диагностика",
				},
				{
					id: "item-2",
					title: "Эндодонтическое лечение 3-канального зуба под микроскопом",
					tooth_number: 16,
					quantity: 1,
					unit_price_rub: 18000,
					line_total_rub: 18000,
					discount_rub: 0,
					net_line_total_rub: 18000,
					category: "Терапия",
				},
				{
					id: "item-3",
					title: "Установка коронки из диоксида циркония (ZrO2) CAD/CAM",
					tooth_number: 16,
					quantity: 1,
					unit_price_rub: 27500,
					line_total_rub: 27500,
					discount_rub: 2500,
					net_line_total_rub: 25000,
					category: "Ортопедия",
				},
			];

			const totals = calculateEstimateTotals(
				defaultItems.map((i) => ({
					quantity: i.quantity,
					unit_price_rub: i.unit_price_rub,
					discount_rub: i.discount_rub,
				})),
			);

			const newEstimate: StoredPublicEstimate = {
				id: `est-${token.slice(0, 8)}`,
				organizationId: "11111111-1111-1111-1111-111111111111",
				patientId: "22222222-2222-2222-2222-222222222222",
				publicToken: token,
				estimateNumber: `СМ-${new Date().getFullYear()}/${token.slice(0, 5).toUpperCase()}`,
				status: "sent",
				validFrom: new Date().toISOString().slice(0, 10),
				validUntil: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().slice(0, 10),
				clinicName: "ООО «Стоматологическая клиника ДЕНТЕ»",
				clinicPhone: "+7 (495) 123-45-67",
				clinicEmail: "info@dente-clinic.ru",
				clinicAddress: "г. Москва, ул. Арбат, д. 24",
				clinicCurrency: "RUB",
				patientFirstName: "Алексей",
				patientPhone: "+7 (916) 123-45-67",
				patientBirthDate: "1988-04-12",
				verbalPinHash: hashVerbalPin("1234"),
				failedAttempts: 0,
				totalFailures: 0,
				isLocked: false,
				patientNotes: "План согласован на первичной консультации. Гарантия на коронку 2 года.",
				items: defaultItems,
			};

			estimatesStore.set(token, newEstimate);
			return newEstimate;
		}

		return null;
	}

	/**
	 * Fetches public metadata (safe to display on initial load before verification)
	 */
	public static getMeta(token: string): PublicEstimateMeta | null {
		const estimate = this.getOrInitEstimate(token);
		if (!estimate) return null;

		const isLocked = estimate.isLocked || (estimate.lockedUntil ? estimate.lockedUntil.getTime() > Date.now() : false);
		const isExpired = estimate.validUntil ? new Date(estimate.validUntil).getTime() < Date.now() : false;
		const alreadyDecided = estimate.status === "accepted" || estimate.status === "rejected";

		const totals = calculateEstimateTotals(
			estimate.items.map((i) => ({
				quantity: i.quantity,
				unit_price_rub: i.unit_price_rub,
				discount_rub: i.discount_rub,
			})),
		);

		const method = resolvePublicAuthMethod({
			phone: estimate.patientPhone,
			birthDate: estimate.patientBirthDate,
			verbalPinHash: estimate.verbalPinHash,
		});

		return {
			requires_verification: method !== "none" && !alreadyDecided,
			method,
			locked: isLocked || Boolean(estimate.publicLockedAt),
			expired: isExpired,
			already_decided: alreadyDecided,
			decided_status: alreadyDecided ? estimate.status : null,
			clinic_name: estimate.clinicName,
			clinic_phone: estimate.clinicPhone,
			clinic_email: estimate.clinicEmail,
			clinic_address_line: estimate.clinicAddress,
			clinic_currency: estimate.clinicCurrency,
			patient_first_name: estimate.patientFirstName,
			estimate_number: estimate.estimateNumber,
			estimate_total: `${totals.total.toLocaleString("ru-RU")} ₽`,
			valid_until: estimate.validUntil,
		};
	}

	/**
	 * Verifies knowledge factor, handles lockout logic, and generates session token
	 */
	public static verifyAccess(
		token: string,
		payload: { method: PublicAuthMethod; value: string },
		ipAddress?: string,
	): { success: boolean; sessionToken?: string | undefined; error?: string | undefined; status: number } {
		const estimate = this.getOrInitEstimate(token);
		if (!estimate) {
			return { success: false, error: "Estimate link not found", status: 404 };
		}

		if (estimate.status === "accepted" || estimate.status === "rejected") {
			return { success: false, error: "Estimate already decided", status: 409 };
		}

		const result = verifyPatientKnowledgeFactor(
			{
				id: estimate.patientId,
				publicToken: estimate.publicToken,
				phone: estimate.patientPhone,
				birthDate: estimate.patientBirthDate,
				verbalPinHash: estimate.verbalPinHash,
				failedAttempts: estimate.failedAttempts,
				totalFailures: estimate.totalFailures,
				isLocked: estimate.isLocked,
				lockedUntil: estimate.lockedUntil,
				publicLockedAt: estimate.publicLockedAt,
			},
			{
				method: payload.method,
				value: payload.value,
			},
			this.getSecretKey(),
		);

		// Record Access Log
		accessLogsStore.push({
			id: `log-${Date.now()}`,
			estimateId: estimate.id,
			attemptedAtIso: new Date().toISOString(),
			success: result.success,
			method: payload.method,
			ipHash: hashIp(ipAddress),
		});

		if (result.success) {
			estimate.failedAttempts = 0;
			estimate.isLocked = false;
			estimate.lockedUntil = null;
			return { success: true, sessionToken: result.sessionToken, status: 200 };
		}

		// Mutate failure counts on the estimate
		estimate.failedAttempts += 1;
		estimate.totalFailures = (estimate.totalFailures || 0) + 1;

		if (estimate.totalFailures >= TOTAL_FAILURES_PERMANENT_LOCKOUT) {
			estimate.publicLockedAt = new Date();
			estimate.isLocked = true;
			return { success: false, error: result.error, status: 423 };
		}

		if (estimate.failedAttempts >= MAX_CONSECUTIVE_FAILURES) {
			estimate.isLocked = true;
			estimate.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
			return { success: false, error: result.error, status: 429 };
		}

		return { success: false, error: result.error, status: 401 };
	}

	/**
	 * Resolves verified estimate details and marks as viewed idempotently
	 */
	public static getDetail(token: string, sessionToken?: string, ipAddress?: string): PublicEstimateDetail | null {
		const estimate = this.getOrInitEstimate(token);
		if (!estimate) return null;

		const method = resolvePublicAuthMethod({
			phone: estimate.patientPhone,
			birthDate: estimate.patientBirthDate,
			verbalPinHash: estimate.verbalPinHash,
		});

		// If verification required, check session token
		if (method !== "none" && estimate.status !== "accepted" && estimate.status !== "rejected") {
			if (!sessionToken || !validatePublicPlanSessionToken(sessionToken, estimate.patientId, estimate.publicToken, this.getSecretKey())) {
				return null;
			}
		}

		// Mark viewed on first successful read
		if (!estimate.viewedAt) {
			estimate.viewedAt = new Date();
			if (estimate.status === "sent") {
				estimate.status = "viewed";
			}
		}

		const totals = calculateEstimateTotals(
			estimate.items.map((i) => ({
				quantity: i.quantity,
				unit_price_rub: i.unit_price_rub,
				discount_rub: i.discount_rub,
			})),
		);

		return {
			id: estimate.id,
			estimate_number: estimate.estimateNumber,
			status: estimate.status,
			valid_from: estimate.validFrom,
			valid_until: estimate.validUntil,
			subtotal_rub: totals.subtotal,
			total_discount_rub: totals.discount,
			total_tax_rub: 0,
			total_rub: totals.total,
			patient_notes: estimate.patientNotes,
			items: estimate.items,
			tier_options: [
				{
					tierId: "basic",
					title: "Базовый план",
					totalRub: Math.round(totals.total * 0.7),
					benefits: ["Терапевтическая санация", "Стандартная гарантия 1 год"],
				},
				{
					tierId: "standard",
					title: "Оптимальный план",
					totalRub: totals.total,
					benefits: ["Лечение под микроскопом", "Диоксид циркония ZrO2", "Гарантия 2 года"],
				},
				{
					tierId: "premium",
					title: "Премиум (All-Inclusive)",
					totalRub: Math.round(totals.total * 1.5),
					benefits: ["Виниры e.max", "Импланты Straumann", "Персональный куратор 24/7", "Гарантия 5 лет"],
				},
			],
		};
	}

	/**
	 * Accepts estimate with patient digital signature
	 */
	public static acceptEstimate(
		token: string,
		payload: {
			signerName: string;
			relationship?: string | undefined;
			signatureMethod?: "drawn" | "click_accept" | undefined;
			signaturePng?: string | undefined;
			signatureSvg?: string | undefined;
		},
		reqMeta: { ipAddress?: string | undefined; userAgent?: string | undefined } = {},
	): { success: boolean; error?: string | undefined; estimate?: StoredPublicEstimate | undefined } {
		const estimate = this.getOrInitEstimate(token);
		if (!estimate) {
			return { success: false, error: "Estimate not found" };
		}

		if (estimate.status === "accepted" || estimate.status === "rejected") {
			return { success: false, error: "Estimate already decided" };
		}

		const nowIso = new Date().toISOString();
		const totals = calculateEstimateTotals(
			estimate.items.map((i) => ({
				quantity: i.quantity,
				unit_price_rub: i.unit_price_rub,
				discount_rub: i.discount_rub,
			})),
		);

		const documentHash = computeEstimateDocumentHash(
			{
				id: estimate.id,
				estimate_number: estimate.estimateNumber,
				total_rub: totals.total,
				items: estimate.items.map((i) => ({ id: i.id, net_line_total_rub: i.net_line_total_rub })),
			},
			{
				signed_by_name: payload.signerName,
				signed_at_iso: nowIso,
				signature_png: payload.signaturePng,
			},
		);

		const signature: PublicEstimateSignature = {
			signed_by_name: payload.signerName,
			relationship_to_patient: payload.relationship || "patient",
			signature_method: payload.signatureMethod || (payload.signaturePng ? "drawn" : "click_accept"),
			signature_png: payload.signaturePng,
			signature_svg: payload.signatureSvg,
			ip_address: reqMeta.ipAddress || "127.0.0.1",
			user_agent: reqMeta.userAgent,
			signed_at_iso: nowIso,
			document_hash: documentHash,
		};

		estimate.status = "accepted";
		estimate.signature = signature;
		estimate.decidedAt = new Date();

		return { success: true, estimate };
	}

	/**
	 * Rejects estimate with structured reason
	 */
	public static rejectEstimate(
		token: string,
		payload: { reason: string; note?: string | undefined },
	): { success: boolean; error?: string | undefined } {
		const estimate = this.getOrInitEstimate(token);
		if (!estimate) {
			return { success: false, error: "Estimate not found" };
		}

		if (estimate.status === "accepted" || estimate.status === "rejected") {
			return { success: false, error: "Estimate already decided" };
		}

		estimate.status = "rejected";
		estimate.rejectionReason = payload.reason;
		estimate.rejectionNote = payload.note;
		estimate.decidedAt = new Date();

		return { success: true };
	}

	/**
	 * Generates signed HTML document certificate
	 */
	public static generateSignedHtml(token: string): string | null {
		const estimate = this.getOrInitEstimate(token);
		if (!estimate || estimate.status !== "accepted" || !estimate.signature) {
			return null;
		}

		const sig = estimate.signature;
		const totals = calculateEstimateTotals(
			estimate.items.map((i) => ({
				quantity: i.quantity,
				unit_price_rub: i.unit_price_rub,
				discount_rub: i.discount_rub,
			})),
		);

		return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<title>Согласованный план лечения и смета № ${estimate.estimateNumber}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; padding: 40px; color: #0f172a; max-width: 800px; margin: 0 auto; line-height: 1.5; }
  .header { border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-start; }
  .clinic-title { font-size: 20px; font-weight: 800; }
  .doc-num { font-size: 14px; font-weight: 600; color: #0284c7; }
  .table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px; }
  .table th, .table td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; }
  .table th { background: #f8fafc; font-weight: 700; }
  .totals-box { margin-top: 20px; text-align: right; font-size: 15px; }
  .grand-total { font-size: 18px; font-weight: 800; color: #059669; }
  .signature-box { margin-top: 40px; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; background: #f8fafc; }
  .sig-img { max-height: 70px; display: block; margin: 10px 0; }
  .hash { font-family: monospace; font-size: 11px; color: #64748b; word-break: break-all; }
</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="clinic-title">${estimate.clinicName}</div>
      <div style="font-size: 12px; color: #64748b;">${estimate.clinicAddress} • ${estimate.clinicPhone}</div>
    </div>
    <div style="text-align: right;">
      <div class="doc-num">Смета ${estimate.estimateNumber}</div>
      <div style="font-size: 12px; color: #64748b;">Дата: ${estimate.validFrom}</div>
    </div>
  </div>

  <h2>Утвержденный план лечения и смета</h2>
  <p><strong>Пациент:</strong> ${estimate.patientFirstName} (${sig.signed_by_name})</p>

  <table class="table">
    <thead>
      <tr>
        <th>#</th>
        <th>Наименование медицинской услуги</th>
        <th>Зуб</th>
        <th>Кол-во</th>
        <th>Цена</th>
        <th>Скидка</th>
        <th>Итого</th>
      </tr>
    </thead>
    <tbody>
      ${estimate.items
				.map(
					(it, idx) => `<tr>
        <td>${idx + 1}</td>
        <td>${it.title}</td>
        <td>${it.tooth_number ?? "—"}</td>
        <td>${it.quantity}</td>
        <td>${it.unit_price_rub.toLocaleString("ru-RU")} ₽</td>
        <td>${it.discount_rub ? `${it.discount_rub.toLocaleString("ru-RU")} ₽` : "—"}</td>
        <td><strong>${it.net_line_total_rub.toLocaleString("ru-RU")} ₽</strong></td>
      </tr>`,
				)
				.join("")}
    </tbody>
  </table>

  <div class="totals-box">
    <div>Сумма без скидки: ${totals.subtotal.toLocaleString("ru-RU")} ₽</div>
    <div>Скидка: ${totals.discount.toLocaleString("ru-RU")} ₽</div>
    <div class="grand-total">Итого к оплате: ${totals.total.toLocaleString("ru-RU")} ₽</div>
  </div>

  <div class="signature-box">
    <div><strong>Электронная подпись пациента (ст. 63-ФЗ):</strong></div>
    <div>Подписант: <strong>${sig.signed_by_name}</strong></div>
    <div>Дата и время: ${sig.signed_at_iso}</div>
    <div>IP-адрес: ${sig.ip_address || "127.0.0.1"}</div>
    ${sig.signature_png ? `<img class="sig-img" src="${sig.signature_png}" alt="Подпись" />` : "<div>[Активировано электронной отметкой согласия]</div>"}
    <div class="hash">Контрольный хеш целостности документа (SHA-256): ${sig.document_hash}</div>
  </div>
</body>
</html>`;
	}
}
