import { generateUuidV7 } from "@dental/shared";

export interface QuickWriteoffApiContext {
	organizationId: string;
	getHeaders: (extra?: Record<string, string>) => Record<string, string>;
}

function buildQuickWriteoffHeaders(ctx: QuickWriteoffApiContext): Record<string, string> {
	return {
		...ctx.getHeaders({ "Content-Type": "application/json" }),
		"Idempotency-Key": generateUuidV7(),
	};
}

export async function apiQuickWriteoffStandardKit(
	ctx: QuickWriteoffApiContext,
	options?: { visitId?: string; cabinetId?: string; chairId?: string; notes?: string },
) {
	return fetch(`/api/inventory/${ctx.organizationId}/quick-writeoff-standard-kit`, {
		method: "POST",
		headers: buildQuickWriteoffHeaders(ctx),
		body: JSON.stringify({
			...(options?.visitId !== undefined ? { visitId: options.visitId } : {}),
			...(options?.notes !== undefined ? { notes: options.notes } : {}),
		}),
	});
}

export async function apiQuickWriteoffCarpules(
	ctx: QuickWriteoffApiContext,
	options?: {
		carpulesCount?: number; drugName?: string; visitId?: string;
		cabinetId?: string; chairId?: string; disposalReason?: string;
		isBroken?: boolean; isPartial?: boolean; disinfectionMethod?: string; notes?: string;
	},
) {
	return fetch(`/api/inventory/${ctx.organizationId}/quick-writeoff-carpules`, {
		method: "POST",
		headers: buildQuickWriteoffHeaders(ctx),
		body: JSON.stringify({
			...(options?.carpulesCount !== undefined ? { carpulesCount: options.carpulesCount } : {}),
			...(options?.drugName !== undefined ? { drugName: options.drugName } : {}),
			...(options?.visitId !== undefined ? { visitId: options.visitId } : {}),
			...(options?.notes !== undefined ? { notes: options.notes } : {}),
		}),
	});
}

export async function apiQuickWriteoffSterilizationKit(
	ctx: QuickWriteoffApiContext,
	options?: { visitId?: string; cabinetId?: string; chairId?: string; notes?: string },
) {
	return fetch(`/api/inventory/${ctx.organizationId}/quick-writeoff-package`, {
		method: "POST",
		headers: buildQuickWriteoffHeaders(ctx),
		body: JSON.stringify({
			packageId: "sterilization_kit",
			...(options?.visitId !== undefined ? { visitId: options.visitId } : {}),
			notes: options?.notes ?? "Быстрое списание: Набор стерилизации: 1 лоток + перчатки",
		}),
	});
}

export async function apiQuickWriteoffShiftBundle(
	ctx: QuickWriteoffApiContext,
	bundleType: "therapy" | "orthopedics" | "surgery",
	options?: { visitId?: string; cabinetId?: string; chairId?: string; notes?: string },
) {
	return fetch(`/api/inventory/${ctx.organizationId}/quick-writeoff-shift-bundle`, {
		method: "POST",
		headers: buildQuickWriteoffHeaders(ctx),
		body: JSON.stringify({
			bundleType,
			...(options?.visitId !== undefined ? { visitId: options.visitId } : {}),
			...(options?.notes !== undefined ? { notes: options.notes } : {}),
		}),
	});
}

export async function apiQuickWriteoffVisitBundle(
	ctx: QuickWriteoffApiContext,
	visitType: "therapy" | "surgery",
	options?: { visitId?: string; cabinetId?: string; chairId?: string; notes?: string },
) {
	return fetch(`/api/inventory/${ctx.organizationId}/quick-writeoff-visit-bundle`, {
		method: "POST",
		headers: buildQuickWriteoffHeaders(ctx),
		body: JSON.stringify({
			visitType,
			...(options?.visitId !== undefined ? { visitId: options.visitId } : {}),
			...(options?.notes !== undefined ? { notes: options.notes } : {}),
		}),
	});
}
