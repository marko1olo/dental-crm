/**
 * apps/web/src/components/billing/useInvoicesData.ts
 *
 * Custom hook for invoices state management, server synchronization,
 * and multi-tab reactive storage updates.
 *
 * Compliance: Mandates 8b, 8e, 8n.
 */

import { useState, useEffect } from "react";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders.js";
import type { useMemoryLeakGuard } from "../../hooks/useMemoryLeakGuard.js";
import type { BillingInvoice, InvoiceLineItem } from "./invoiceTypes.js";
import { loadStoredInvoices, saveStoredInvoices } from "./invoicesStorage.js";

export interface UseInvoicesDataParams {
	readonly initialInvoices?: BillingInvoice[] | undefined;
	readonly patientId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly currentDoctorName?: string | undefined;
	readonly memoryGuard: ReturnType<typeof useMemoryLeakGuard>;
}

export function useInvoicesData({
	initialInvoices,
	patientId,
	patientName,
	currentDoctorName = "Врач-стоматолог",
	memoryGuard,
}: UseInvoicesDataParams) {
	const [invoices, setInvoices] = useState<BillingInvoice[]>(() => {
		if (initialInvoices && initialInvoices.length > 0) {
			return initialInvoices;
		}
		const stored = loadStoredInvoices();
		return stored.length > 0 ? stored : [];
	});

	// Server synchronization (Mandates 8e, 8n) with AbortController memory protection
	useEffect(() => {
		const abortController = memoryGuard.createAbortController();
		const syncInvoices = async () => {
			try {
				const url = `/api/invoices${patientId ? `?patientId=${encodeURIComponent(patientId)}` : ""}`;
				const res = await fetch(url, {
					signal: abortController.signal,
					headers: {
						...denteAdminSecretRequestHeaders(),
					},
				});
				if (!res.ok) return;
				const data = (await res.json()) as unknown;
				const rawList: Record<string, unknown>[] = Array.isArray(data)
					? (data as Record<string, unknown>[])
					: Array.isArray((data as { items?: unknown[] })?.items)
						? (data as { items: Record<string, unknown>[] }).items
						: Array.isArray((data as { invoices?: unknown[] })?.invoices)
							? (data as { invoices: Record<string, unknown>[] }).invoices
							: [];

				if (rawList.length === 0) return;

				const mapped: BillingInvoice[] = rawList.map((raw, idx) => {
					if (raw.number && raw.status && Array.isArray(raw.items)) {
						return raw as unknown as BillingInvoice;
					}

					const numMatch =
						typeof raw.notes === "string"
							? raw.notes.match(
									/(?:Наряд|Счет|СЧТ|НРД|АКТ)[\s-]*([A-ZА-Я0-9-]+)/i,
								)
							: null;
					const invoiceNumber = String(
						raw.number ||
							(numMatch
								? numMatch[1]
								: `СЧ-${(raw.id || idx).toString().slice(-6)}`),
					);
					const total =
						typeof raw.totalAmountRub === "number"
							? raw.totalAmountRub
							: typeof raw.priceRub === "number"
								? raw.priceRub
								: 0;

					return {
						id: String(raw.id || `inv-${Date.now()}-${idx}`),
						number: invoiceNumber,
						patientId: String(raw.patientId || patientId || ""),
						patientName: String(raw.patientName || patientName || "Пациент"),
						patientPhone:
							typeof raw.patientPhone === "string"
								? raw.patientPhone
								: undefined,
						doctorName: String(raw.doctorName || currentDoctorName),
						date:
							typeof raw.date === "string"
								? raw.date
								: typeof raw.createdAt === "string"
									? new Date(raw.createdAt).toLocaleDateString("ru-RU")
									: new Date().toLocaleDateString("ru-RU"),
						totalAmountRub: total,
						paidAmountRub:
							typeof raw.paidAmountRub === "number"
								? raw.paidAmountRub
								: raw.status === "paid"
									? total
									: 0,
						status: (raw.status as BillingInvoice["status"]) || "issued",
						items:
							Array.isArray(raw.items) && raw.items.length > 0
								? (raw.items as InvoiceLineItem[])
								: [
										{
											id: `li-${String(raw.id || idx)}`,
											code: String(raw.code || raw.serviceCode || "A16.07.002"),
											name: String(
												raw.title || raw.name || "Стоматологический прием",
											),
											quantity: Number(raw.quantity) || 1,
											priceRub: total,
										},
									],
						createdAt:
							typeof raw.createdAt === "string"
								? raw.createdAt
								: new Date().toISOString(),
						paidAt: typeof raw.paidAt === "string" ? raw.paidAt : undefined,
						paymentMethod:
							typeof raw.paymentMethod === "string"
								? raw.paymentMethod
								: undefined,
						notes: typeof raw.notes === "string" ? raw.notes : undefined,
					};
				});

				if (!memoryGuard.isMounted()) return;

				setInvoices((prev) => {
					const map = new Map<string, BillingInvoice>();
					for (const inv of mapped) {
						map.set(inv.id, inv);
						if (inv.number) map.set(inv.number, inv);
					}
					for (const inv of prev) {
						map.set(inv.id, inv);
						if (inv.number) map.set(inv.number, inv);
					}
					const merged = Array.from(new Set(map.values()));
					saveStoredInvoices(merged);
					return merged;
				});
			} catch (err: unknown) {
				if ((err as Error)?.name === "AbortError") {
					return;
				}
				// Soft fallback: continue working with local data (Mandates 8e, 8n)
			}
		};

		void syncInvoices();
	}, [patientId, patientName, currentDoctorName, memoryGuard]);

	// Real-time reactive synchronization across tabs and modules (Treatment Plans -> Invoices)
	useEffect(() => {
		if (typeof window === "undefined") return;
		const handleExternalInvoiceUpdate = (evt?: Event) => {
			const customDetail = (evt as CustomEvent<BillingInvoice>)?.detail;
			const stored = loadStoredInvoices();
			setInvoices((prev) => {
				const map = new Map<string, BillingInvoice>();
				if (customDetail?.id) {
					map.set(customDetail.id, customDetail);
					if (customDetail.number) map.set(customDetail.number, customDetail);
				}
				for (const inv of stored) {
					map.set(inv.id, inv);
					if (inv.number) map.set(inv.number, inv);
				}
				for (const inv of prev) {
					if (!map.has(inv.id) && (!inv.number || !map.has(inv.number))) {
						map.set(inv.id, inv);
						if (inv.number) map.set(inv.number, inv);
					}
				}
				return Array.from(new Set(map.values()));
			});
		};

		const unlisten1 = memoryGuard.safeAddEventListener(
			window,
			"dente-invoices-updated",
			handleExternalInvoiceUpdate,
		);
		const unlisten2 = memoryGuard.safeAddEventListener(
			window,
			"storage",
			handleExternalInvoiceUpdate,
		);
		return () => {
			unlisten1();
			unlisten2();
		};
	}, [memoryGuard]);

	return {
		invoices,
		setInvoices,
	};
}
