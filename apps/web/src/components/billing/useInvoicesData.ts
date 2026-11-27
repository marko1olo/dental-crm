/**
 * apps/web/src/components/billing/useInvoicesData.ts
 *
 * Custom hook for invoices state management, server synchronization,
 * and multi-tab reactive storage updates.
 *
 * Compliance: Mandates 8b, 8e, 8n.
 */

import { useState, useEffect } from "react";
import {
	kopecksToRubles,
	normalizeInvoiceStatus,
	resolveInvoiceTotalAmountRub,
	rublesToKopecks,
} from "@dental/shared";
import { denteClinicalReadHeaders } from "../../lib/denteRequestHeaders.js";
import { clientLogger } from "../../services/logging/clientLogger.js";
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
						...denteClinicalReadHeaders(),
					},
				});
				if (!res.ok) {
					clientLogger.warn("[useInvoicesData] Ошибка ответа сервера при загрузке счетов", { status: res.status }, { module: "Billing" });
					return;
				}
				const rawJson = (await res.json()) as unknown;
				const data =
					rawJson && typeof rawJson === "object" && "data" in rawJson && !Array.isArray(rawJson)
						? (rawJson as { data?: unknown }).data ?? rawJson
						: rawJson;
				const rawList: Record<string, unknown>[] = Array.isArray((data as { invoices?: unknown[] })?.invoices)
					? (data as { invoices: Record<string, unknown>[] }).invoices
					: Array.isArray(data)
						? (data as Record<string, unknown>[])
						: Array.isArray((data as { items?: unknown[] })?.items)
							? (data as { items: Record<string, unknown>[] }).items
							: [];

				if (rawList.length === 0) return;

				const mapped: BillingInvoice[] = rawList.map((raw, idx) => {
					const resolvedTotal = resolveInvoiceTotalAmountRub({
						totalAmountRub: raw.totalAmountRub as number | string | null | undefined,
						totalRub: (raw.totalRub ?? raw.priceRub) as number | string | null | undefined,
						subtotalRub: raw.subtotalRub as number | string | null | undefined,
						discountRub: raw.discountRub as number | string | null | undefined,
					});

					const totalAmountKopecks =
						typeof raw.totalAmountKopecks === "number"
							? raw.totalAmountKopecks
							: typeof raw.totalKopecks === "number"
								? raw.totalKopecks
								: rublesToKopecks(resolvedTotal);

					const invoiceNumber = String(
						raw.number ||
							raw.invoiceNumber ||
							`СЧ-${(raw.id || idx).toString().slice(-6)}`,
					);
					const total = kopecksToRubles(totalAmountKopecks);
					const paidAmountKopecks =
						typeof raw.paidAmountKopecks === "number"
							? raw.paidAmountKopecks
							: typeof raw.paidAmountRub === "number" || typeof raw.paidAmountRub === "string"
								? rublesToKopecks(Number(raw.paidAmountRub) || 0)
								: raw.status === "paid"
									? totalAmountKopecks
									: 0;
					const paid = kopecksToRubles(paidAmountKopecks);
					const normalizedStatus: BillingInvoice["status"] =
						raw.status === "warranty_100"
							? "warranty_100"
							: normalizeInvoiceStatus(
									typeof raw.status === "string" ? raw.status : undefined,
									total,
									paid,
								);

					const rawItemsList = Array.isArray(raw.items) ? raw.items : [];
					const items: InvoiceLineItem[] = rawItemsList.length > 0
						? rawItemsList
								.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
								.map((item, itemIdx) => {
									const itemTotal = typeof item.totalAmountRub === "number"
										? item.totalAmountRub
										: typeof item.totalRub === "number"
											? item.totalRub
											: typeof item.priceRub === "number"
												? item.priceRub * (Number(item.quantity) || 1)
												: 0;
									return {
										id: typeof item.id === "string" ? item.id : `li-${String(raw.id || idx)}-${itemIdx}`,
										code: typeof item.code === "string" ? item.code : typeof item.serviceCode === "string" ? item.serviceCode : undefined,
										code804n: typeof item.code804n === "string" ? item.code804n : undefined,
										serviceCode: typeof item.serviceCode === "string" ? item.serviceCode : null,
										name: typeof item.name === "string" ? item.name : typeof item.title === "string" ? item.title : "Стоматологические услуги",
										serviceName: typeof item.serviceName === "string" ? item.serviceName : undefined,
										title: typeof item.title === "string" ? item.title : undefined,
										quantity: typeof item.quantity === "number" ? item.quantity : Number(item.quantity) || 1,
										priceRub: typeof item.priceRub === "number" ? item.priceRub : Number(item.priceRub) || total,
										unitPriceRub: typeof item.unitPriceRub === "number" ? item.unitPriceRub : undefined,
										totalRub: typeof item.totalRub === "number" ? item.totalRub : undefined,
										totalAmountRub: itemTotal,
										toothNumber: typeof item.toothNumber === "number" || typeof item.toothNumber === "string" ? item.toothNumber : null,
									};
								})
						: total > 0
							? [
									{
										id: `li-${String(raw.id || idx)}`,
										code: String(raw.code || raw.serviceCode || ""),
										name: String(
											raw.title || raw.name || "Стоматологические услуги",
										),
										quantity: Number(raw.quantity) || 1,
										priceRub: total,
										totalAmountRub: total,
									},
								]
							: [];

					return {
						id: String(raw.id || `inv-${Date.now()}-${idx}`),
						organizationId:
							typeof raw.organizationId === "string"
								? raw.organizationId
								: undefined,
						visitId:
							typeof raw.visitId === "string" ? raw.visitId : null,
						number: invoiceNumber,
						invoiceNumber,
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
						totalAmountKopecks,
						paidAmountRub: paid,
						paidAmountKopecks,
						status: normalizedStatus,
						items,
						createdAt:
							typeof raw.createdAt === "string"
								? raw.createdAt
								: new Date().toISOString(),
						paidAt: typeof raw.paidAt === "string" ? raw.paidAt : undefined,
						paymentMethod:
							typeof raw.paymentMethod === "string"
								? raw.paymentMethod
								: undefined,
						originalPaymentId:
							typeof raw.originalPaymentId === "string"
								? raw.originalPaymentId
								: undefined,
						cashBoxId:
							typeof raw.cashBoxId === "string"
								? raw.cashBoxId
								: undefined,
						fiscalStatus:
							typeof raw.fiscalStatus === "string"
								? (raw.fiscalStatus as BillingInvoice["fiscalStatus"])
								: undefined,
						isOfflineQueued:
							typeof raw.isOfflineQueued === "boolean"
								? raw.isOfflineQueued
								: undefined,
						notes: typeof raw.notes === "string" ? raw.notes : undefined,
					};
				});

				if (!memoryGuard.isMounted()) return;

				setInvoices((prev) => {
					const map = new Map<string, BillingInvoice>();
					for (const inv of prev) {
						map.set(inv.id, inv);
						if (inv.number) map.set(inv.number, inv);
					}
					for (const inv of mapped) {
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
				clientLogger.warn("[useInvoicesData] Сбой синхронизации счетов с сервером, продолжение с локальными данными", err, {
					module: "Billing",
				});
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
