import { pool } from "../../db/client.js";
import type {
	PortalAuthMethod,
	PortalBudgetItem,
	PortalBudgetSignature,
	PortalBudgetStatus,
	StoredPortalBudget,
} from "./types.js";

// Fast L1 memory cache (backed by PostgreSQL portal_budget_tokens)
export const memoryCache = new Map<string, StoredPortalBudget>();

function safeJsonParse<T>(raw: unknown, fallback: T): T {
	if (!raw) return fallback;
	if (typeof raw !== "string") return (raw as T) ?? fallback;
	try {
		return JSON.parse(raw) as T;
	} catch {
		return fallback;
	}
}

function toSafeIsoString(date: unknown, fallbackIso: string | null = null): string | null {
	if (!date) return fallbackIso;
	const d = date instanceof Date ? date : new Date(String(date));
	return Number.isNaN(d.getTime()) ? fallbackIso : d.toISOString();
}

export async function persistBudget(budget: StoredPortalBudget): Promise<void> {
	memoryCache.set(budget.token, budget);

	try {
		const upsertSql = `
		INSERT INTO portal_budget_tokens (
			token, plan_id, organization_id, patient_id, doctor_id, status,
			clinic_name, clinic_phone, clinic_address, doctor_name, patient_first_name,
			patient_phone, patient_birth_date, auth_method, verbal_pin_hash,
			items, total_price_rub, discount_rub, net_total_rub, currency,
			failed_attempts, total_failures, is_locked, locked_until, viewed_at,
			signed_at, signer_name, document_hash, signature, valid_until, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6,
			$7, $8, $9, $10, $11,
			$12, $13, $14, $15,
			$16, $17, $18, $19, $20,
			$21, $22, $23, $24, $25,
			$26, $27, $28, $29, $30, $31, NOW()
		)
		ON CONFLICT (token) DO UPDATE SET
			status = EXCLUDED.status,
			failed_attempts = EXCLUDED.failed_attempts,
			total_failures = EXCLUDED.total_failures,
			is_locked = EXCLUDED.is_locked,
			locked_until = EXCLUDED.locked_until,
			viewed_at = EXCLUDED.viewed_at,
			signed_at = EXCLUDED.signed_at,
			signer_name = EXCLUDED.signer_name,
			document_hash = EXCLUDED.document_hash,
			signature = EXCLUDED.signature,
			valid_until = EXCLUDED.valid_until,
			items = EXCLUDED.items,
			total_price_rub = EXCLUDED.total_price_rub,
			discount_rub = EXCLUDED.discount_rub,
			net_total_rub = EXCLUDED.net_total_rub,
			updated_at = NOW()
		`;
		await pool.query(upsertSql, [
			budget.token,
			budget.planId || null,
			budget.organizationId,
			budget.patientId,
			budget.doctorId || null,
			budget.status,
			budget.clinicName,
			budget.clinicPhone || null,
			budget.clinicAddress || null,
			budget.doctorName,
			budget.patientFirstName,
			budget.patientPhone || null,
			budget.patientBirthDate || null,
			budget.authMethod,
			budget.verbalPinHash || null,
			JSON.stringify(budget.items),
			budget.totalPriceRub,
			budget.discountRub,
			budget.netTotalRub,
			budget.currency || "RUB",
			budget.failedAttempts,
			budget.totalFailures,
			budget.isLocked,
			budget.lockedUntil || null,
			budget.viewedAt ? new Date(budget.viewedAt) : null,
			budget.signedAt ? new Date(budget.signedAt) : null,
			budget.signerName || null,
			budget.documentHash || null,
			budget.signature ? JSON.stringify(budget.signature) : null,
			budget.validUntil ? new Date(budget.validUntil) : null,
			budget.createdAt ? new Date(budget.createdAt) : new Date(),
		]);
	} catch (err) {
		console.error("[PortalBudgetService] Failed to persist budget to database:", err);
	}
}

export async function loadBudget(token: string): Promise<StoredPortalBudget | null> {
	const cached = memoryCache.get(token);
	if (cached) {
		return cached;
	}

	try {
		const res = await pool.query(
			"SELECT * FROM portal_budget_tokens WHERE token = $1 LIMIT 1",
			[token],
		);
		if (res.rows.length > 0) {
			const row = res.rows[0];
			const parsedItems: PortalBudgetItem[] = safeJsonParse<PortalBudgetItem[]>(row.items, []);
			const parsedSignature: PortalBudgetSignature | undefined =
				row.signature ? safeJsonParse<PortalBudgetSignature | undefined>(row.signature, undefined) : undefined;

			const budget: StoredPortalBudget = {
				token: row.token,
				planId: row.plan_id ?? undefined,
				organizationId: row.organization_id,
				patientId: row.patient_id,
				doctorId: row.doctor_id ?? undefined,
				status: row.status as PortalBudgetStatus,
				clinicName: row.clinic_name,
				clinicPhone: row.clinic_phone ?? undefined,
				clinicAddress: row.clinic_address ?? undefined,
				doctorName: row.doctor_name,
				patientFirstName: row.patient_first_name,
				patientPhone: row.patient_phone ?? null,
				patientBirthDate: row.patient_birth_date ?? null,
				authMethod: row.auth_method as PortalAuthMethod,
				verbalPinHash: row.verbal_pin_hash ?? undefined,
				items: parsedItems,
				totalPriceRub: Number(row.total_price_rub) || 0,
				discountRub: Number(row.discount_rub) || 0,
				netTotalRub: Number(row.net_total_rub) || 0,
				currency: row.currency || "RUB",
				failedAttempts: Number(row.failed_attempts) || 0,
				totalFailures: Number(row.total_failures) || 0,
				isLocked: Boolean(row.is_locked),
				lockedUntil: row.locked_until ? (Number.isNaN(new Date(row.locked_until).getTime()) ? null : new Date(row.locked_until)) : null,
				viewedAt: toSafeIsoString(row.viewed_at),
				signedAt: toSafeIsoString(row.signed_at),
				signerName: row.signer_name ?? null,
				documentHash: row.document_hash ?? null,
				signature: parsedSignature,
				validUntil: toSafeIsoString(row.valid_until),
				createdAt: toSafeIsoString(row.created_at, new Date().toISOString()) ?? new Date().toISOString(),
			};

			memoryCache.set(token, budget);
			return budget;
		}
	} catch (err) {
		console.error("[PortalBudgetService] Error reading from portal_budget_tokens:", err);
	}

	return null;
}

export function clearRegistry(): void {
	memoryCache.clear();
}

export function resetMemoryCacheOnly(): void {
	memoryCache.clear();
}
