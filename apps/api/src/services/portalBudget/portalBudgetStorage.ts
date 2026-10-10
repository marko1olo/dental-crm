import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pool } from "../../db/client.js";
import type {
	PortalAuthMethod,
	PortalBudgetItem,
	PortalBudgetSignature,
	PortalBudgetStatus,
	StoredPortalBudget,
} from "./types.js";

// Fast L1 memory cache (backed by PostgreSQL portal_budget_tokens & atomic disk cache)
export const memoryCache = new Map<string, StoredPortalBudget>();

export function getFileCachePath(): string {
	const baseDir = path.resolve(process.cwd(), ".data");
	if (!fs.existsSync(baseDir)) {
		try {
			fs.mkdirSync(baseDir, { recursive: true });
		} catch (err) {
			console.warn("[PortalBudgetService] Failed to create data directory:", err);
		}
	}
	return path.join(baseDir, "portal_budgets.json");
}

export function loadBudgetsFromFile(): Map<string, StoredPortalBudget> {
	const map = new Map<string, StoredPortalBudget>();
	try {
		const filePath = getFileCachePath();
		if (fs.existsSync(filePath)) {
			const raw = fs.readFileSync(filePath, "utf-8");
			const data = JSON.parse(raw);
			if (Array.isArray(data)) {
				for (const item of data) {
					if (item && item.token) {
						map.set(item.token, {
							...item,
							lockedUntil: item.lockedUntil ? new Date(item.lockedUntil) : null,
						});
					}
				}
			}
		}
	} catch (err) {
		console.warn("[PortalBudgetService] Failed to read cached budgets from file:", err);
	}
	return map;
}

export function saveBudgetToFile(budget: StoredPortalBudget): void {
	try {
		const filePath = getFileCachePath();
		const map = loadBudgetsFromFile();
		map.set(budget.token, budget);
		const tempPath = `${filePath}.tmp.${Date.now()}.${randomUUID()}`;
		fs.writeFileSync(tempPath, JSON.stringify(Array.from(map.values()), null, 2), "utf-8");
		fs.renameSync(tempPath, filePath);
	} catch (err) {
		console.warn("[PortalBudgetService] Failed to save budget cache to file:", err);
	}
}

let ensureTablePromise: Promise<void> | null = null;
export async function ensurePortalBudgetTable(): Promise<void> {
	if (!ensureTablePromise) {
		ensureTablePromise = (async () => {
			try {
				const ddl = `
				CREATE TABLE IF NOT EXISTS portal_budget_tokens (
					token VARCHAR(128) PRIMARY KEY,
					plan_id UUID,
					organization_id UUID NOT NULL,
					patient_id UUID NOT NULL,
					doctor_id UUID,
					status VARCHAR(32) NOT NULL DEFAULT 'sent',
					clinic_name TEXT NOT NULL,
					clinic_phone TEXT,
					clinic_address TEXT,
					doctor_name TEXT NOT NULL,
					patient_first_name TEXT NOT NULL,
					patient_phone TEXT,
					patient_birth_date TEXT,
					auth_method VARCHAR(32) NOT NULL DEFAULT 'phone_last4',
					verbal_pin_hash TEXT,
					items JSONB NOT NULL DEFAULT '[]'::jsonb,
					total_price_rub NUMERIC(12, 2) NOT NULL DEFAULT 0,
					discount_rub NUMERIC(12, 2) NOT NULL DEFAULT 0,
					net_total_rub NUMERIC(12, 2) NOT NULL DEFAULT 0,
					currency VARCHAR(8) NOT NULL DEFAULT 'RUB',
					failed_attempts INTEGER NOT NULL DEFAULT 0,
					total_failures INTEGER NOT NULL DEFAULT 0,
					is_locked BOOLEAN NOT NULL DEFAULT FALSE,
					locked_until TIMESTAMPTZ,
					viewed_at TIMESTAMPTZ,
					signed_at TIMESTAMPTZ,
					signer_name TEXT,
					document_hash TEXT,
					signature JSONB,
					valid_until TIMESTAMPTZ,
					created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
					updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
				);
				CREATE INDEX IF NOT EXISTS idx_portal_budget_tokens_plan_id ON portal_budget_tokens(plan_id);
				CREATE INDEX IF NOT EXISTS idx_portal_budget_tokens_patient_id ON portal_budget_tokens(patient_id);
				CREATE INDEX IF NOT EXISTS idx_portal_budget_tokens_org_id ON portal_budget_tokens(organization_id);
				`;
				await pool.query(ddl);
			} catch (err) {
				console.error("[PortalBudgetService] Error ensuring portal_budget_tokens table:", err);
			}
		})();
	}
	return ensureTablePromise;
}

export async function persistBudget(budget: StoredPortalBudget): Promise<void> {
	memoryCache.set(budget.token, budget);
	saveBudgetToFile(budget);

	try {
		await ensurePortalBudgetTable();
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
	if (memoryCache.has(token)) {
		return memoryCache.get(token)!;
	}

	try {
		await ensurePortalBudgetTable();
		const res = await pool.query(
			"SELECT * FROM portal_budget_tokens WHERE token = $1 LIMIT 1",
			[token],
		);
		if (res.rows.length > 0) {
			const row = res.rows[0];
			const parsedItems: PortalBudgetItem[] =
				typeof row.items === "string" ? JSON.parse(row.items) : (row.items || []);
			const parsedSignature: PortalBudgetSignature | undefined =
				row.signature
					? (typeof row.signature === "string" ? JSON.parse(row.signature) : row.signature)
					: undefined;

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
				lockedUntil: row.locked_until ? new Date(row.locked_until) : null,
				viewedAt: row.viewed_at ? new Date(row.viewed_at).toISOString() : null,
				signedAt: row.signed_at ? new Date(row.signed_at).toISOString() : null,
				signerName: row.signer_name ?? null,
				documentHash: row.document_hash ?? null,
				signature: parsedSignature,
				validUntil: row.valid_until ? new Date(row.valid_until).toISOString() : null,
				createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
			};

			memoryCache.set(token, budget);
			return budget;
		}
	} catch (err) {
		console.error("[PortalBudgetService] Error reading from portal_budget_tokens:", err);
	}

	// Fallback to disk cache
	const diskBudgets = loadBudgetsFromFile();
	if (diskBudgets.has(token)) {
		const budget = diskBudgets.get(token)!;
		memoryCache.set(token, budget);
		return budget;
	}

	return null;
}

export function clearRegistry(): void {
	memoryCache.clear();
	try {
		const filePath = getFileCachePath();
		if (fs.existsSync(filePath)) {
			fs.unlinkSync(filePath);
		}
	} catch (err) {
		console.warn("[PortalBudgetService] Failed to unlink cache file on cleanup:", err);
	}
}

export function resetMemoryCacheOnly(): void {
	memoryCache.clear();
}
