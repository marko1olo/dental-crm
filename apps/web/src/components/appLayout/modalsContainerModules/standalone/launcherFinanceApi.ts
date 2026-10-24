/**
 * launcherFinanceApi — честные загрузчики данных для deep-link лаунчеров.
 *
 * ЗАКОН ЧЕСТНОСТИ: standalone-лаунчер не имеет права показывать вымышленного
 * пациента или сумму. Все цифры приходят из PostgreSQL через API клиники,
 * тем же контуром, что и живой раздел «Касса» (демо-режим — та же база).
 */

import { denteAdminSecretRequestHeaders } from "../../../../lib/denteRequestHeaders";

export interface LauncherPatient {
	id: string;
	fullName: string;
	phone?: string | undefined;
	birthDate?: string | undefined;
}

export interface LauncherFamilyGroup {
	id: string;
	name: string | null;
	balanceRub: number;
	headPatientName?: string | null | undefined;
}

async function getJson<T>(url: string): Promise<T | null> {
	try {
		const res = await fetch(url, { headers: denteAdminSecretRequestHeaders() });
		if (!res.ok) return null;
		return (await res.json()) as T;
	} catch {
		return null;
	}
}

/** Реальная карточка пациента из базы (или null, если такого пациента нет). */
export async function fetchLauncherPatient(patientId: string): Promise<LauncherPatient | null> {
	const data = await getJson<{
		fullName?: string;
		name?: string;
		phone?: string;
		birthDate?: string;
	}>(`/api/patients/${encodeURIComponent(patientId)}`);
	if (!data) return null;
	return {
		id: patientId,
		fullName: data.fullName || data.name || "Пациент",
		phone: data.phone || undefined,
		birthDate: data.birthDate || undefined,
	};
}

/**
 * Реальный неоплаченный долг пациента из счетов базы.
 * Оплаченные / возвращённые / аннулированные счета не учитываются.
 * Возвращает 0, когда неоплаченных счетов нет.
 */
export async function fetchLauncherOutstandingDebtRub(patientId: string): Promise<number> {
	const json = await getJson<{
		data?: Array<{ totalRub?: number; paidRub?: number; status?: string }> | null;
	} | null>(`/api/billing/invoices?patientId=${encodeURIComponent(patientId)}`);
	let outstandingKop = 0;
	for (const inv of json?.data ?? []) {
		if (inv.status && ["paid", "refunded", "voided"].includes(inv.status)) continue;
		const total = Math.round((inv.totalRub ?? 0) * 100);
		const paid = Math.round((inv.paidRub ?? 0) * 100);
		outstandingKop += Math.max(0, total - paid);
	}
	return outstandingKop / 100;
}

/** Семейный счёт пациента из базы; null — семейного счёта у пациента нет. */
export async function fetchLauncherFamilyGroup(patientId: string): Promise<LauncherFamilyGroup | null> {
	const data = await getJson<{
		id?: string;
		name?: string | null;
		balance?: string | number;
		headPatientName?: string | null;
	} | null>(`/api/finance/family/patient/${encodeURIComponent(patientId)}`);
	if (!data?.id) return null;
	return {
		id: data.id,
		name: data.name ?? null,
		balanceRub: Number(data.balance ?? 0) || 0,
		headPatientName: data.headPatientName ?? null,
	};
}

/** Реальный счёт для печати чека: по invoiceId, иначе последний неоплаченный/оплаченный счёт пациента. */
export async function fetchLauncherInvoiceForReceipt(
	patientId: string,
	invoiceId?: string | null,
): Promise<Record<string, unknown> | null> {
	const json = await getJson<{ invoices?: Array<Record<string, unknown>> } | null>(
		`/api/invoices?patientId=${encodeURIComponent(patientId)}`,
	);
	const invoices = json?.invoices ?? [];
	if (invoices.length === 0) return null;
	if (invoiceId) {
		const found = invoices.find((inv) => inv.id === invoiceId);
		if (found) return found;
	}
	const unpaid = invoices.find((inv) => inv.status !== "paid");
	return unpaid ?? invoices[0] ?? null;
}

export interface LauncherDocument {
	id: string;
	kind: string;
	title: string;
	status: string;
	patientId?: string | null;
	totalAmountRub?: number | null;
	createdAt?: string | null;
}

/** Реальные документы пациента из базы (GET /api/documents?patientId=). */
export async function fetchLauncherPatientDocuments(patientId: string): Promise<LauncherDocument[]> {
	const json = await getJson<{ data?: Array<Record<string, unknown>> } | null>(
		`/api/documents?patientId=${encodeURIComponent(patientId)}&limit=100`,
	);
	const rows = json?.data ?? [];
	return rows.map((row) => ({
		id: String(row.id ?? ""),
		kind: String(row.kind ?? ""),
		title: String(row.title ?? ""),
		status: String(row.status ?? ""),
		patientId: typeof row.patientId === "string" ? row.patientId : null,
		totalAmountRub: row.totalAmountRub != null ? Number(row.totalAmountRub) : null,
		createdAt: typeof row.createdAt === "string" ? row.createdAt : null,
	}));
}

/** Наличные в ящике за день: реальные платежи базы тем же расчётом, что у смены кассира. */
export async function fetchCashInDrawerRub(): Promise<number> {
	const json = await getJson<{
		data?: Array<{ amountRub?: number; method?: string; paidAt?: string; createdAt?: string }> | null;
	} | null>("/api/billing/payments?period=day");
	const rows = json?.data ?? [];
	const dayKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(new Date().getDate()).padStart(2, "0")}`;
	let cashKop = 0;
	for (const p of rows) {
		const when = p.paidAt || p.createdAt || "";
		if (!when.startsWith(dayKey)) continue;
		if (p.method !== "cash") continue;
		cashKop += Math.round((p.amountRub ?? 0) * 100);
	}
	return cashKop / 100;
}

/** Служебное внесение / изъятие наличных — реальные кассовые операции смены. */
export async function submitCashOperation(
	direction: "in" | "out",
	payload: Record<string, unknown>,
): Promise<boolean> {
	const primary = direction === "in" ? "/api/cash/cash-introduction" : "/api/cash/cash-withdrawal";
	const fallback = direction === "in" ? "/api/fiscal/cash-in" : "/api/fiscal/cash-out";
	try {
		const res = await fetch(primary, {
			method: "POST",
			headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
			body: JSON.stringify(payload),
		});
		if (res.ok) return true;
		if (res.status === 404 || res.status === 405) {
			const fb = await fetch(fallback, {
				method: "POST",
				headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
				body: JSON.stringify(payload),
			});
			return fb.ok;
		}
		return false;
	} catch {
		return false;
	}
}
