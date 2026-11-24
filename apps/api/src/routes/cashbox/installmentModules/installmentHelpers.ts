/**
 * installmentHelpers.ts — Pure helpers & locked cashbox lookup for 0% clinic installments.
 */

import { and, eq } from "drizzle-orm";
import type { FastifyRequest } from "fastify";
import { rublesToKopecks } from "@dental/shared";
import type { TenantDb } from "../../../db/rls.js";
import { cashBoxes } from "../../../db/schema.js";
import { ensureOrganizationCashBoxes } from "../../../db/seeds/seed_cash_and_reasons.js";

export function parseHeaderIdempotencyKey(request: FastifyRequest): string | undefined {
	const rawKey = request.headers["idempotency-key"] ?? request.headers["x-idempotency-key"];
	if (typeof rawKey === "string") return rawKey.trim();
	if (Array.isArray(rawKey) && rawKey.length > 0 && typeof rawKey[0] === "string") {
		return rawKey[0].trim();
	}
	return undefined;
}

export function resolveSafeKopecks(
	kopecksVal: number | bigint | null | undefined,
	rubVal: number | string | null | undefined,
): number {
	const kop = kopecksVal != null ? Number(kopecksVal) : 0;
	const rub = Number(rubVal || 0);
	return kop !== 0 || rub === 0 ? kop : rublesToKopecks(rub);
}

export function resolveCashBoxPaymentMethod(
	box: typeof cashBoxes.$inferSelect,
): "cash" | "card" | "online" {
	if (box.type === "sbp") return "online";
	if (box.isCashless || box.type === "cashless") return "card";
	return "cash";
}

export type ResolveTargetBoxOutcome =
	| { ok: true; box: typeof cashBoxes.$inferSelect }
	| { ok: false; kind: "explicit_box_not_found" | "no_cash_box" };

export async function resolveLockedCashBoxForInstallment(
	tx: TenantDb,
	orgId: string,
	cashBoxId: string | undefined,
	defaultType: "main" | "cashless",
): Promise<ResolveTargetBoxOutcome> {
	await ensureOrganizationCashBoxes(tx, orgId);

	if (cashBoxId) {
		const [found] = await tx
			.select()
			.from(cashBoxes)
			.where(and(eq(cashBoxes.id, cashBoxId), eq(cashBoxes.organizationId, orgId)))
			.for("update")
			.limit(1);
		if (!found) {
			return { ok: false, kind: "explicit_box_not_found" };
		}
		return { ok: true, box: found };
	}

	const [preferred] = await tx
		.select()
		.from(cashBoxes)
		.where(and(eq(cashBoxes.organizationId, orgId), eq(cashBoxes.type, defaultType)))
		.for("update")
		.limit(1);
	if (preferred) {
		return { ok: true, box: preferred };
	}

	const [fallback] = await tx
		.select()
		.from(cashBoxes)
		.where(eq(cashBoxes.organizationId, orgId))
		.for("update")
		.limit(1);
	if (!fallback) {
		return { ok: false, kind: "no_cash_box" };
	}
	return { ok: true, box: fallback };
}
