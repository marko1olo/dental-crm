export interface QuickWriteoffApiContext {
	organizationId: string;
	getHeaders: (extra?: Record<string, string>) => Record<string, string>;
}

export async function apiQuickWriteoffStandardKit(
	ctx: QuickWriteoffApiContext,
	options?: { visitId?: string; cabinetId?: string; chairId?: string; notes?: string },
) {
	return fetch(`/api/inventory/${ctx.organizationId}/quick-writeoff-standard-kit`, {
		method: "POST",
		headers: ctx.getHeaders({ "Content-Type": "application/json" }),
		body: JSON.stringify({ ...(options ?? {}), allowSoftOverdraft: true, allowOverdraft: true }),
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
		headers: ctx.getHeaders({ "Content-Type": "application/json" }),
		body: JSON.stringify({ ...(options ?? {}), allowSoftOverdraft: true, allowOverdraft: true }),
	});
}

export async function apiQuickWriteoffSterilizationKit(
	ctx: QuickWriteoffApiContext,
	options?: { visitId?: string; cabinetId?: string; chairId?: string; notes?: string },
) {
	return fetch(`/api/inventory/${ctx.organizationId}/quick-writeoff-package`, {
		method: "POST",
		headers: ctx.getHeaders({ "Content-Type": "application/json" }),
		body: JSON.stringify({
			packageId: "sterilization_kit",
			...(options?.visitId ? { visitId: options.visitId } : {}),
			...(options?.cabinetId ? { cabinetId: options.cabinetId } : {}),
			...(options?.chairId ? { chairId: options.chairId } : {}),
			notes: options?.notes ?? "Быстрое списание: Набор стерилизации: 1 лоток + перчатки",
			allowSoftOverdraft: true,
			allowOverdraft: true,
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
		headers: ctx.getHeaders({ "Content-Type": "application/json" }),
		body: JSON.stringify({
			bundleType,
			visitId: options?.visitId,
			cabinetId: options?.cabinetId,
			chairId: options?.chairId,
			notes: options?.notes,
			allowSoftOverdraft: true,
			allowOverdraft: true,
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
		headers: ctx.getHeaders({ "Content-Type": "application/json" }),
		body: JSON.stringify({
			visitType,
			visitId: options?.visitId,
			cabinetId: options?.cabinetId,
			chairId: options?.chairId,
			notes: options?.notes,
			allowSoftOverdraft: true,
			allowOverdraft: true,
		}),
	});
}
