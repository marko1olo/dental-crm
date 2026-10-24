/**
 * StandaloneReceiptLauncherHost — честный хост печати кассового чека по deep-link.
 *
 * Счёт берётся из базы: /api/invoices?patientId= (по ?invoiceId= или последний
 * счёт пациента). Пациент, номер, сумма и позиции — реальные данные; без
 * пациента в ссылке — гид, без счетов — честное уведомление.
 */

import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { AppLoadingState } from "../../../../../AppBootState";
import { lazyWithRetry } from "../../../../../lib/lazyWithRetry";
import { useAppStore } from "../../../../../store/appStore";
import { showToast } from "../../../../GlobalToast";
import type { BillingInvoice, InvoiceLineItem } from "../../../../billing/invoiceTypes";
import StandaloneDeepLinkMissingState from "../StandaloneDeepLinkMissingState";
import { readPatientIdFromUrl } from "../useLauncherPatientDebt";
import { fetchLauncherInvoiceForReceipt } from "../launcherFinanceApi";

const CashReceiptPrintModal = lazyWithRetry(() =>
	import("../../../../finance/CashReceiptPrintModal").then((m) => ({ default: m.CashReceiptPrintModal })),
);

function toBillingInvoice(raw: Record<string, unknown>): BillingInvoice {
	const items = Array.isArray(raw.items) ? (raw.items as Array<Record<string, unknown>>) : [];
	const lineItems: InvoiceLineItem[] = items.map((it, idx) => ({
		id: String(it.id ?? `item-${idx}`),
		code: typeof it.code === "string" ? it.code : undefined,
		code804n: typeof it.code804n === "string" ? it.code804n : undefined,
		serviceCode: typeof it.serviceCode === "string" ? it.serviceCode : undefined,
		name: String(it.name ?? it.serviceName ?? "Услуга"),
		quantity: Number(it.quantity ?? 1) || 1,
		priceRub: Number(it.priceRub ?? it.totalAmountRub ?? 0) || 0,
		totalRub: Number(it.totalAmountRub ?? it.priceRub ?? 0) || 0,
	}));
	return {
		id: String(raw.id ?? ""),
		number: String(raw.number ?? raw.invoiceNumber ?? ""),
		patientId: String(raw.patientId ?? ""),
		patientName: String(raw.patientName ?? "Пациент"),
		patientPhone: typeof raw.patientPhone === "string" ? raw.patientPhone : undefined,
		doctorName: typeof raw.doctorName === "string" ? raw.doctorName : "",
		date: String(raw.date ?? ""),
		totalAmountRub: Number(raw.totalAmountRub ?? 0) || 0,
		paidAmountRub: Number(raw.paidAmountRub ?? 0) || 0,
		status: (raw.status as BillingInvoice["status"]) ?? "issued",
		items: lineItems,
		createdAt: typeof raw.createdAt === "string" ? raw.createdAt : new Date().toISOString(),
	};
}

export const StandaloneReceiptLauncherHost: React.FC<{ onClose: () => void }> = ({ onClose }) => {
	const patientId = useMemo(() => readPatientIdFromUrl(), []);
	const invoiceId = useMemo(() => {
		if (typeof window === "undefined") return null;
		return new URLSearchParams(window.location.search || "").get("invoiceId");
	}, []);
	const [invoice, setInvoice] = useState<BillingInvoice | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const profile = useAppStore((s) => s.clinicProfileDraft);

	useEffect(() => {
		if (!patientId) {
			setIsLoading(false);
			return;
		}
		let cancelled = false;
		void fetchLauncherInvoiceForReceipt(patientId, invoiceId).then((raw) => {
			if (cancelled) return;
			setInvoice(raw ? toBillingInvoice(raw) : null);
			setIsLoading(false);
			if (!raw) showToast("Счетов для печати чека у пациента не найдено.", "info");
		});
		return () => {
			cancelled = true;
		};
	}, [patientId, invoiceId]);

	if (!patientId) {
		return (
			<StandaloneDeepLinkMissingState
				title="Пациент не указан"
				message="Кассовый чек печатается по счёту конкретного пациента. Откройте печать из карточки счёта или добавьте ?patientId= в ссылку."
				testId="standalone-receipt-missing-state"
				onClose={onClose}
			/>
		);
	}
	if (isLoading) return <AppLoadingState message="Загрузка счёта из базы..." />;
	if (!invoice) return null;

	return (
		<CashReceiptPrintModal
			isOpen={true}
			invoice={invoice}
			clinicName={profile?.legalName || profile?.clinicName || ""}
			clinicInn={profile?.inn || ""}
			clinicAddress={profile?.address || ""}
			defaultFormat="80mm"
			onClose={onClose}
		/>
	);
};
