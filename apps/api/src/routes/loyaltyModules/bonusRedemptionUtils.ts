import {
	getLoyaltyTierDefinition,
	kopecksToNumericString,
	parseKopecks,
	type LoyaltyTierId,
} from "@dental/shared";
import { and, eq } from "drizzle-orm";
import type { TenantDb } from "../../db/rls.js";
import { patientInvoices } from "../../db/schema.js";

export function isPgUniqueViolation(err: unknown): boolean {
	const candidate = err as { code?: unknown; cause?: unknown };
	if (candidate?.code === "23505") return true;
	if (candidate?.cause) return isPgUniqueViolation(candidate.cause);
	return false;
}

export function resolveCanonicalInvoiceTotalKop(invoice: {
	totalPriceKopecks: bigint | null;
	totalAmountRub: number | null;
	totalRub: string | null;
}): number {
	if (invoice.totalPriceKopecks != null && invoice.totalPriceKopecks > 0n) {
		return Number(invoice.totalPriceKopecks);
	}
	if (invoice.totalAmountRub != null && invoice.totalAmountRub > 0) {
		return parseKopecks(invoice.totalAmountRub);
	}
	return parseKopecks(invoice.totalRub ?? 0);
}

export async function lockAndResolveLoyaltyInvoice(
	tx: TenantDb,
	params: {
		orgId: string;
		invoiceId: string;
		allowedPatientIds: readonly string[];
	},
): Promise<
	| { ok: true; invoiceTotalRub: number; invoiceTotalKop: number }
	| { ok: false; message: string; code: number }
> {
	const [invoice] = await tx
		.select({
			id: patientInvoices.id,
			patientId: patientInvoices.patientId,
			status: patientInvoices.status,
			totalPriceKopecks: patientInvoices.totalPriceKopecks,
			totalAmountRub: patientInvoices.totalAmountRub,
			totalRub: patientInvoices.totalRub,
		})
		.from(patientInvoices)
		.where(
			and(
				eq(patientInvoices.id, params.invoiceId),
				eq(patientInvoices.organizationId, params.orgId),
			),
		)
		.for("update")
		.limit(1);

	if (!invoice || !params.allowedPatientIds.includes(invoice.patientId)) {
		return { ok: false, message: "Счёт не найден или чужой", code: 404 };
	}
	if (
		invoice.status === "paid" ||
		invoice.status === "refunded" ||
		invoice.status === "voided" ||
		invoice.status === "cancelled"
	) {
		return { ok: false, message: "Счёт уже оплачен или аннулирован", code: 409 };
	}

	const invoiceTotalKop = resolveCanonicalInvoiceTotalKop(invoice);
	const invoiceTotalRub = Number(kopecksToNumericString(invoiceTotalKop));
	return { ok: true, invoiceTotalRub, invoiceTotalKop };
}

export function resolvePatientLoyaltyCoveragePercent(params: {
	hasFamilyGroup: boolean;
	lifetimeSpentPoints: string | number | null | undefined;
	lifetimeEarnedPoints: string | number | null | undefined;
	allowFullCoverage?: boolean | undefined;
}): number {
	if (params.allowFullCoverage) return 100;

	let patientTierId: LoyaltyTierId = params.hasFamilyGroup ? "family" : "silver";
	const lifetimeSpentKop = parseKopecks(params.lifetimeSpentPoints ?? 0);
	const lifetimeEarnedKop = parseKopecks(params.lifetimeEarnedPoints ?? 0);
	if (lifetimeSpentKop >= 40000000 || lifetimeEarnedKop >= 4000000) {
		patientTierId = "platinum";
	} else if (lifetimeSpentKop >= 15000000 || lifetimeEarnedKop >= 1500000) {
		if (patientTierId !== "family") {
			patientTierId = "gold";
		}
	}
	return getLoyaltyTierDefinition(patientTierId).maxInvoiceCoveragePercent;
}
