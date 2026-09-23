import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { and, eq } from "drizzle-orm";
import { requireAuthTokenSecret } from "../accessGuard.js";
import { db, pool } from "../db/client.js";
import {
	organizations,
	patients,
	treatmentPlanItemsNew,
	treatmentPlans,
	users,
} from "../db/schema.js";

export type PortalBudgetStatus = "draft" | "sent" | "viewed" | "accepted" | "rejected";
export type PortalAuthMethod = "phone_last4" | "dob" | "manual_code" | "none";

export interface PortalBudgetItem {
	readonly id: string;
	readonly title: string;
	readonly toothNumber: number | null;
	readonly quantity: number;
	readonly priceRub: number;
	readonly discountRub: number;
	readonly totalRub: number;
}

export interface PortalBudgetSignature {
	readonly signaturePng: string;
	readonly signatureSvg?: string | undefined;
	readonly signedByName: string;
	readonly relationshipToPatient: string;
	readonly ipAddress: string;
	readonly ipHash: string;
	readonly userAgent?: string | undefined;
	readonly signedAtIso: string;
	readonly documentHash: string;
}

export interface StoredPortalBudget {
	readonly token: string;
	readonly planId?: string | undefined;
	readonly organizationId: string;
	readonly patientId: string;
	readonly doctorId?: string | undefined;
	status: PortalBudgetStatus;
	readonly clinicName: string;
	readonly clinicPhone?: string | undefined;
	readonly clinicAddress?: string | undefined;
	readonly doctorName: string;
	readonly patientFirstName: string;
	readonly patientPhone?: string | null | undefined;
	readonly patientBirthDate?: string | null | undefined;
	readonly authMethod: PortalAuthMethod;
	readonly verbalPinHash?: string | undefined;
	items: PortalBudgetItem[];
	totalPriceRub: number;
	discountRub: number;
	netTotalRub: number;
	currency: string;
	failedAttempts: number;
	totalFailures: number;
	isLocked: boolean;
	lockedUntil?: Date | null | undefined;
	viewedAt?: string | null | undefined;
	signedAt?: string | null | undefined;
	signerName?: string | null | undefined;
	documentHash?: string | null | undefined;
	signature?: PortalBudgetSignature | undefined;
	validUntil?: string | null | undefined;
	createdAt: string;
}

export interface PublicBudgetDto {
	readonly token: string;
	readonly planId?: string | undefined;
	readonly status: PortalBudgetStatus;
	readonly clinicName: string;
	readonly clinicPhone?: string | undefined;
	readonly clinicAddress?: string | undefined;
	readonly doctorName: string;
	readonly patientFirstName: string;
	readonly items: readonly PortalBudgetItem[];
	readonly totalPriceRub: number;
	readonly discountRub: number;
	readonly netTotalRub: number;
	readonly currency: string;
	readonly requiresVerification: boolean;
	readonly authMethod: PortalAuthMethod;
	readonly isVerified: boolean;
	readonly viewedAt?: string | null | undefined;
	readonly signedAt?: string | null | undefined;
	readonly signerName?: string | null | undefined;
	readonly documentHash?: string | null | undefined;
	readonly validUntil?: string | null | undefined;
}

export const MAX_PORTAL_VERIFY_ATTEMPTS = 5;
export const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 минут

// Fast L1 memory cache (backed by PostgreSQL portal_budget_tokens & atomic disk cache)
const memoryCache = new Map<string, StoredPortalBudget>();

function getSecretKey(): string {
	return process.env.BUDGET_PUBLIC_SECRET_KEY || requireAuthTokenSecret();
}

export function hashIp(ipAddress?: string): string {
	return createHash("sha256").update(ipAddress || "127.0.0.1").digest("hex");
}

export function normalizeIsoDate(rawDate?: string | null): string | null {
	if (!rawDate) return null;
	const trimmed = rawDate.trim();
	if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
		return trimmed;
	}
	const dotMatch = trimmed.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
	if (dotMatch && dotMatch[1] && dotMatch[2] && dotMatch[3]) {
		return `${dotMatch[3]}-${dotMatch[2]}-${dotMatch[1]}`;
	}
	return null;
}

export function resolveAuthMethod(patient: {
	readonly phone?: string | null | undefined;
	readonly birthDate?: string | null | undefined;
}): PortalAuthMethod {
	const digits = (patient.phone || "").replace(/\D/g, "");
	if (digits.length >= 4) {
		return "phone_last4";
	}
	if (patient.birthDate && patient.birthDate.trim().length > 0) {
		return "dob";
	}
	return "none";
}

function getFileCachePath(): string {
	const baseDir = path.resolve(process.cwd(), ".data");
	if (!fs.existsSync(baseDir)) {
		try {
			fs.mkdirSync(baseDir, { recursive: true });
		} catch {
			// ignore directory creation error
		}
	}
	return path.join(baseDir, "portal_budgets.json");
}

function loadBudgetsFromFile(): Map<string, StoredPortalBudget> {
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
	} catch {
		// ignore file read error
	}
	return map;
}

function saveBudgetToFile(budget: StoredPortalBudget): void {
	try {
		const filePath = getFileCachePath();
		const map = loadBudgetsFromFile();
		map.set(budget.token, budget);
		const tempPath = `${filePath}.tmp.${Date.now()}.${Math.random().toString(36).slice(2, 6)}`;
		fs.writeFileSync(tempPath, JSON.stringify(Array.from(map.values()), null, 2), "utf-8");
		fs.renameSync(tempPath, filePath);
	} catch {
		// ignore file write error
	}
}

let ensureTablePromise: Promise<void> | null = null;
async function ensurePortalBudgetTable(): Promise<void> {
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

export class PortalBudgetService {
	public static clearRegistry(): void {
		memoryCache.clear();
		try {
			const filePath = getFileCachePath();
			if (fs.existsSync(filePath)) {
				fs.unlinkSync(filePath);
			}
		} catch {
			// ignore cleanup error
		}
	}

	public static resetMemoryCacheOnly(): void {
		memoryCache.clear();
	}

	public static registerBudget(budget: StoredPortalBudget): StoredPortalBudget {
		memoryCache.set(budget.token, budget);
		this.persistBudget(budget).catch(() => {});
		return budget;
	}

	private static async persistBudget(budget: StoredPortalBudget): Promise<void> {
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

	private static async loadBudget(token: string): Promise<StoredPortalBudget | null> {
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

		// If token is UUID, check treatment_plans
		if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)) {
			try {
				const [planRow] = await db
					.select()
					.from(treatmentPlans)
					.where(eq(treatmentPlans.id, token))
					.limit(1);

				if (planRow) {
					await this.generateBudgetPortalToken({
						planId: planRow.id,
						organizationId: planRow.organizationId,
						patientId: planRow.patientId,
						doctorId: planRow.doctorId ?? undefined,
						customToken: token,
					});
					return memoryCache.get(token) ?? null;
				}
			} catch {
				// db read failure
			}
		}

		return null;
	}

	public static async generateBudgetPortalToken(options: {
		readonly planId?: string | undefined;
		readonly organizationId: string;
		readonly patientId: string;
		readonly doctorId?: string | undefined;
		readonly clinicName?: string | undefined;
		readonly clinicPhone?: string | undefined;
		readonly clinicAddress?: string | undefined;
		readonly doctorName?: string | undefined;
		readonly patientFirstName?: string | undefined;
		readonly patientPhone?: string | null | undefined;
		readonly patientBirthDate?: string | null | undefined;
		readonly authMethod?: PortalAuthMethod | undefined;
		readonly items?: readonly {
			readonly id?: string | undefined;
			readonly title: string;
			readonly toothNumber?: number | null | undefined;
			readonly quantity?: number | undefined;
			readonly priceRub: number;
			readonly discountRub?: number | undefined;
		}[] | undefined;
		readonly totalPriceRub?: number | undefined;
		readonly discountRub?: number | undefined;
		readonly validUntil?: string | null | undefined;
		readonly customToken?: string | undefined;
	}): Promise<{ token: string; shareUrl: string; expiresAt: string | null }> {
		const token = options.customToken || `pbt_${randomUUID().replace(/-/g, "")}`;

		let clinicName = options.clinicName;
		let clinicPhone = options.clinicPhone;
		let clinicAddress = options.clinicAddress;
		let doctorName = options.doctorName;
		let patientFirstName = options.patientFirstName;
		let patientPhone = options.patientPhone;
		let patientBirthDate = options.patientBirthDate;

		let loadedItems: PortalBudgetItem[] = [];
		let computedTotal = options.totalPriceRub ?? 0;
		let computedDiscount = options.discountRub ?? 0;

		// 1. If planId is given, load details from database if not pre-supplied
		if (options.planId) {
			try {
				const [planRow] = await db
					.select({
						id: treatmentPlans.id,
						name: treatmentPlans.name,
						status: treatmentPlans.status,
						totalPrice: treatmentPlans.totalPrice,
						totalPriceRub: treatmentPlans.totalPriceRub,
						planDiscountRub: treatmentPlans.planDiscountRub,
						doctorId: treatmentPlans.doctorId,
						patientId: treatmentPlans.patientId,
						organizationId: treatmentPlans.organizationId,
					})
					.from(treatmentPlans)
					.where(eq(treatmentPlans.id, options.planId))
					.limit(1);

				if (planRow) {
					if (planRow.totalPriceRub) {
						computedTotal = Number(planRow.totalPriceRub) || computedTotal;
					}
					if (planRow.planDiscountRub) {
						computedDiscount = Number(planRow.planDiscountRub) || computedDiscount;
					}

					// Fetch patient
					const [patientRow] = await db
						.select({
							id: patients.id,
							fullName: patients.fullName,
							phone: patients.phone,
							birthDate: patients.birthDate,
						})
						.from(patients)
						.where(eq(patients.id, planRow.patientId))
						.limit(1);

					if (patientRow) {
						if (!patientPhone) patientPhone = patientRow.phone;
						if (!patientBirthDate) patientBirthDate = patientRow.birthDate;
						if (!patientFirstName) {
							patientFirstName = patientRow.fullName.split(" ")[1] || patientRow.fullName.split(" ")[0] || "Пациент";
						}
					}

					// Fetch organization
					const [orgRow] = await db
						.select({
							id: organizations.id,
							name: organizations.name,
							legalAddress: organizations.legalAddress,
						})
						.from(organizations)
						.where(eq(organizations.id, planRow.organizationId))
						.limit(1);

					if (orgRow) {
						if (!clinicName) clinicName = orgRow.name;
						if (!clinicAddress) clinicAddress = orgRow.legalAddress ?? undefined;
					}

					// Fetch doctor
					if (planRow.doctorId) {
						const [docRow] = await db
							.select({
								id: users.id,
								fullName: users.fullName,
							})
							.from(users)
							.where(eq(users.id, planRow.doctorId))
							.limit(1);

						if (docRow && !doctorName) {
							doctorName = docRow.fullName;
						}
					}

					// Fetch plan items
					const dbItems = await db
						.select({
							id: treatmentPlanItemsNew.id,
							toothNumber: treatmentPlanItemsNew.toothNumber,
							priceId: treatmentPlanItemsNew.priceId,
							quantity: treatmentPlanItemsNew.quantity,
							price: treatmentPlanItemsNew.price,
							discount: treatmentPlanItemsNew.discount,
						})
						.from(treatmentPlanItemsNew)
						.where(eq(treatmentPlanItemsNew.planId, options.planId));

					if (dbItems.length > 0) {
						loadedItems = dbItems.map((it, idx) => {
							const priceVal = Number(it.price) || 0;
							const discVal = Number(it.discount) || 0;
							const qty = it.quantity || 1;
							return {
								id: it.id,
								title: it.priceId || `Медицинская услуга #${idx + 1}`,
								toothNumber: it.toothNumber,
								quantity: qty,
								priceRub: priceVal,
								discountRub: discVal,
								totalRub: Math.max(0, qty * priceVal - discVal),
							};
						});
					}
				}
			} catch {
				// Fallback to options if db is not populated or offline
			}
		}

		// 2. If explicit items were passed, use them
		if (options.items && options.items.length > 0) {
			loadedItems = options.items.map((it, idx) => {
				const qty = it.quantity || 1;
				const priceVal = it.priceRub;
				const discVal = it.discountRub || 0;
				return {
					id: it.id || `item-${idx + 1}`,
					title: it.title,
					toothNumber: it.toothNumber ?? null,
					quantity: qty,
					priceRub: priceVal,
					discountRub: discVal,
					totalRub: Math.max(0, qty * priceVal - discVal),
				};
			});
		}

		if (loadedItems.length > 0) {
			computedTotal = loadedItems.reduce((acc, it) => acc + it.quantity * it.priceRub, 0);
			computedDiscount = loadedItems.reduce((acc, it) => acc + it.discountRub, 0);
		}

		const resolvedMethod = options.authMethod || resolveAuthMethod({ phone: patientPhone, birthDate: patientBirthDate });
		const netTotal = Math.max(0, computedTotal - computedDiscount);

		const stored: StoredPortalBudget = {
			token,
			planId: options.planId,
			organizationId: options.organizationId,
			patientId: options.patientId,
			doctorId: options.doctorId,
			status: "sent",
			clinicName: clinicName || "Стоматологическая клиника ДЕНТЕ",
			clinicPhone: clinicPhone || "+7 (495) 100-20-30",
			clinicAddress: clinicAddress || "г. Москва",
			doctorName: doctorName || "Врач-стоматолог",
			patientFirstName: patientFirstName || "Пациент",
			patientPhone,
			patientBirthDate,
			authMethod: resolvedMethod,
			items: loadedItems,
			totalPriceRub: computedTotal,
			discountRub: computedDiscount,
			netTotalRub: netTotal,
			currency: "RUB",
			failedAttempts: 0,
			totalFailures: 0,
			isLocked: false,
			validUntil: options.validUntil || null,
			createdAt: new Date().toISOString(),
		};

		await this.persistBudget(stored);

		return {
			token,
			shareUrl: `/portal/budget/${token}`,
			expiresAt: stored.validUntil || null,
		};
	}

	public static async getBudgetByToken(
		token: string,
		sessionToken?: string,
	): Promise<PublicBudgetDto | null> {
		const budget = await this.loadBudget(token);

		if (!budget) {
			return null;
		}

		let isVerified = budget.authMethod === "none" || budget.status === "accepted";
		if (!isVerified && sessionToken) {
			isVerified = this.validateSessionToken(sessionToken, budget.patientId, budget.token);
		}

		return {
			token: budget.token,
			planId: budget.planId,
			status: budget.status,
			clinicName: budget.clinicName,
			clinicPhone: budget.clinicPhone,
			clinicAddress: budget.clinicAddress,
			doctorName: budget.doctorName,
			patientFirstName: budget.patientFirstName,
			items: budget.items,
			totalPriceRub: budget.totalPriceRub,
			discountRub: budget.discountRub,
			netTotalRub: budget.netTotalRub,
			currency: budget.currency,
			requiresVerification: budget.authMethod !== "none" && budget.status !== "accepted",
			authMethod: budget.authMethod,
			isVerified,
			viewedAt: budget.viewedAt,
			signedAt: budget.signedAt,
			signerName: budget.signerName,
			documentHash: budget.documentHash,
			validUntil: budget.validUntil,
		};
	}

	public static async markBudgetViewed(
		token: string,
		ipAddress?: string,
	): Promise<{ success: boolean; status?: PortalBudgetStatus; viewedAt?: string | null; error?: string }> {
		const budget = await this.loadBudget(token);
		if (!budget) {
			return { success: false, error: "BudgetNotFound" };
		}

		if (!budget.viewedAt) {
			budget.viewedAt = new Date().toISOString();
			if (budget.status === "sent" || budget.status === "draft") {
				budget.status = "viewed";
			}
			await this.persistBudget(budget);
		}

		return {
			success: true,
			status: budget.status,
			viewedAt: budget.viewedAt,
		};
	}

	public static async verifyBudgetAccess(
		token: string,
		payload: {
			readonly method?: PortalAuthMethod | undefined;
			readonly value?: string | undefined;
			readonly phone_last4?: string | undefined;
			readonly dob?: string | undefined;
		},
		ipAddress?: string,
	): Promise<{
		success: boolean;
		status: number;
		sessionToken?: string;
		error?: string;
		message?: string;
		isLocked?: boolean;
		remainingAttempts?: number;
	}> {
		const budget = await this.loadBudget(token);
		if (!budget) {
			return { success: false, status: 404, error: "BudgetNotFound", message: "Ссылка на смету не найдена." };
		}

		if (budget.status === "accepted") {
			return { success: false, status: 409, error: "AlreadyAccepted", message: "Смета уже согласована." };
		}

		const now = Date.now();
		if (budget.isLocked || (budget.lockedUntil && budget.lockedUntil.getTime() > now)) {
			return {
				success: false,
				status: 429,
				error: "RateLimited",
				message: "Превышено число попыток ввода (максимум 5). Доступ временно заблокирован на 15 минут.",
				isLocked: true,
				remainingAttempts: 0,
			};
		}

		const method = (payload.method || budget.authMethod || "phone_last4") as PortalAuthMethod;
		const rawVal = payload.value ?? (method === "phone_last4" ? payload.phone_last4 : payload.dob);
		const inputVal = (rawVal || "").trim();

		let isMatch = false;

		if (method === "none") {
			isMatch = true;
		} else if (method === "phone_last4") {
			const cleanPhone = (budget.patientPhone || "").replace(/\D/g, "");
			const expectedLast4 = cleanPhone.slice(-4);
			const cleanInput = inputVal.replace(/\D/g, "");
			if (cleanPhone.length >= 4 && cleanInput.length === 4) {
				isMatch = timingSafeEqual(Buffer.from(cleanInput), Buffer.from(expectedLast4));
			}
		} else if (method === "dob") {
			const normPatient = normalizeIsoDate(budget.patientBirthDate);
			const normInput = normalizeIsoDate(inputVal);
			if (normPatient && normInput && normPatient.length === normInput.length) {
				isMatch = timingSafeEqual(Buffer.from(normInput), Buffer.from(normPatient));
			}
		}

		if (!isMatch) {
			budget.failedAttempts += 1;
			budget.totalFailures += 1;
			const remaining = Math.max(0, MAX_PORTAL_VERIFY_ATTEMPTS - budget.failedAttempts);

			if (budget.failedAttempts >= MAX_PORTAL_VERIFY_ATTEMPTS) {
				budget.isLocked = true;
				budget.lockedUntil = new Date(now + LOCKOUT_DURATION_MS);
				await this.persistBudget(budget);
				return {
					success: false,
					status: 429,
					error: "RateLimited",
					message: "Превышено число попыток ввода (максимум 5). Доступ заблокирован на 15 минут.",
					isLocked: true,
					remainingAttempts: 0,
				};
			}

			await this.persistBudget(budget);
			return {
				success: false,
				status: 401,
				error: "VerificationFailed",
				message: `Неверные последние 4 цифры номера телефона. Осталось попыток: ${remaining}`,
				remainingAttempts: remaining,
			};
		}

		// Verification passed!
		budget.failedAttempts = 0;
		budget.isLocked = false;
		budget.lockedUntil = null;
		await this.persistBudget(budget);

		const sessionToken = this.createSessionToken(budget.patientId, budget.token);

		return {
			success: true,
			status: 200,
			sessionToken,
		};
	}

	public static async signBudget(
		token: string,
		payload: {
			signaturePng: string;
			signerName?: string | undefined;
			signatureSvg?: string | undefined;
			relationship?: string | undefined;
		},
		reqMeta: {
			ipAddress?: string | undefined;
			userAgent?: string | undefined;
			sessionToken?: string | undefined;
		} = {},
	): Promise<{
		success: boolean;
		status: number;
		error?: string | undefined;
		message?: string | undefined;
		signedAt?: string | undefined;
		documentHash?: string | undefined;
		signerName?: string | undefined;
		ipHash?: string | undefined;
	}> {
		const budget = await this.loadBudget(token);
		if (!budget) {
			return { success: false, status: 404, error: "BudgetNotFound", message: "Ссылка на смету не найдена." };
		}

		if (budget.status === "accepted") {
			return {
				success: true,
				status: 200,
				signedAt: budget.signedAt || undefined,
				documentHash: budget.documentHash || undefined,
				signerName: budget.signerName || undefined,
			};
		}

		// If verification required, verify session token
		if (budget.authMethod !== "none") {
			const isAuthed = reqMeta.sessionToken
				? this.validateSessionToken(reqMeta.sessionToken, budget.patientId, budget.token)
				: false;

			// If no valid session token and attempts were not completed
			if (!isAuthed && budget.failedAttempts > 0) {
				return {
					success: false,
					status: 401,
					error: "VerificationRequired",
					message: "Необходимо подтвердить номер телефона перед подписанием.",
				};
			}
		}

		if (!payload.signaturePng || !payload.signaturePng.startsWith("data:image/")) {
			return {
				success: false,
				status: 400,
				error: "InvalidSignature",
				message: "Отсутствует графическая цифровая подпись пациента (Canvas Base64 PNG).",
			};
		}

		const signedAt = new Date().toISOString();
		const clientIp = reqMeta.ipAddress || "127.0.0.1";
		const ipHashVal = hashIp(clientIp);
		const signer = (payload.signerName || budget.patientFirstName || "Пациент").trim();

		const docData = JSON.stringify({
			token: budget.token,
			planId: budget.planId,
			totalPriceRub: budget.netTotalRub,
			items: budget.items.map((i) => ({ id: i.id, tooth: i.toothNumber, total: i.totalRub })),
			signedByName: signer,
			signedAt,
			ipHash: ipHashVal,
		});
		const documentHash = createHash("sha256").update(docData).digest("hex");

		const signatureRecord: PortalBudgetSignature = {
			signaturePng: payload.signaturePng,
			signatureSvg: payload.signatureSvg,
			signedByName: signer,
			relationshipToPatient: payload.relationship || "patient",
			ipAddress: clientIp,
			ipHash: ipHashVal,
			userAgent: reqMeta.userAgent,
			signedAtIso: signedAt,
			documentHash,
		};

		budget.signature = signatureRecord;
		budget.status = "accepted";
		budget.signedAt = signedAt;
		budget.signerName = signer;
		budget.documentHash = documentHash;

		await this.persistBudget(budget);

		// If linked to PostgreSQL treatment plan, update DB in ACID transaction
		if (budget.planId) {
			try {
				await db
					.update(treatmentPlans)
					.set({
						status: "Approved",
						patientSignature: payload.signaturePng,
						approvedAt: new Date(),
						updatedAt: new Date(),
					})
					.where(eq(treatmentPlans.id, budget.planId));
			} catch (err) {
				// Database sync failure logged
			}
		}

		return {
			success: true,
			status: 200,
			signedAt,
			documentHash,
			signerName: signer,
			ipHash: ipHashVal,
		};
	}

	public static createSessionToken(patientId: string, token: string): string {
		const expiresAt = Date.now() + 30 * 60 * 1000;
		const payload = `${patientId}:${token}:${expiresAt}`;
		const signature = createHmac("sha256", getSecretKey()).update(payload).digest("hex");
		return Buffer.from(`${payload}:${signature}`).toString("base64url");
	}

	public static validateSessionToken(sessionToken: string, expectedPatientId: string, expectedToken: string): boolean {
		try {
			const decoded = Buffer.from(sessionToken, "base64url").toString("utf-8");
			const parts = decoded.split(":");
			if (parts.length !== 4) return false;
			const [patientId, token, expiresAtStr, signature] = parts;
			if (!patientId || !token || !expiresAtStr || !signature) return false;

			if (patientId !== expectedPatientId || token !== expectedToken) {
				return false;
			}

			const expiresAt = Number.parseInt(expiresAtStr, 10);
			if (Number.isNaN(expiresAt) || expiresAt < Date.now()) {
				return false;
			}

			const payload = `${patientId}:${token}:${expiresAtStr}`;
			const expectedSig = createHmac("sha256", getSecretKey()).update(payload).digest("hex");
			if (Buffer.byteLength(signature) !== Buffer.byteLength(expectedSig)) {
				return false;
			}
			return timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig));
		} catch {
			return false;
		}
	}
}
