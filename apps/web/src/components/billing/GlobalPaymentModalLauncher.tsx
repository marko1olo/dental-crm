import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { showToast } from "../GlobalToast.js";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders.js";
import {
	type PaymentMethodTab,
	PaymentModal,
} from "./PaymentModal.js";

export interface GlobalPaymentModalContext {
	patientId?: string | undefined;
	patientName?: string | undefined;
	patientPhone?: string | undefined;
	amountRub?: number | undefined;
	defaultMethod?: PaymentMethodTab | undefined;
	visitId?: string | undefined;
	doctorName?: string | undefined;
	clinicLegalName?: string | undefined;
	patientDepositRub?: number | undefined;
	patientFamilyBalanceRub?: number | undefined;
	items?: import("./PaymentModal.js").PaymentModalProps["items"];
}

const hasPayment = (): boolean =>
	typeof window !== "undefined" &&
	/(payment|checkout)/i.test(window.location.href);

const EVTS = [
	"dente:open-payment-modal",
	"dente-open-payment-modal",
	"dente:open-checkout",
] as const;

/**
 * Real outstanding debt of the patient from PostgreSQL via the billing API.
 * Returns 0 when the patient has no active unpaid invoices.
 */
async function fetchOutstandingDebtRub(patientId: string): Promise<number> {
	const headers = denteAdminSecretRequestHeaders();
	const res = await fetch(
		`/api/billing/invoices?patientId=${encodeURIComponent(patientId)}`,
		{ headers },
	).catch(() => null);
	if (!res || !res.ok) return 0;
	const json = (await res.json().catch(() => null)) as {
		data?: Array<{ totalRub?: number; paidRub?: number; status?: string }> | null;
	} | null;
	const invoices = json?.data ?? [];
	let outstandingKop = 0;
	for (const inv of invoices) {
		if (inv.status && ["paid", "refunded", "voided"].includes(inv.status)) continue;
		const total = Math.round((inv.totalRub ?? 0) * 100);
		const paid = Math.round((inv.paidRub ?? 0) * 100);
		outstandingKop += Math.max(0, total - paid);
	}
	return outstandingKop / 100;
}

export const GlobalPaymentModalLauncher: React.FC<{
	readonly activeStaffUser?: {
		readonly name?: string;
		readonly fullName?: string;
	} | null;
}> = ({ activeStaffUser }) => {
	const [isOpen, setIsOpen] = useState<boolean>(hasPayment);
	const [ctx, setCtx] = useState<GlobalPaymentModalContext | null>(null);
	const [resolvedAmountRub, setResolvedAmountRub] = useState<number | null>(null);

	const closeAll = useCallback(() => {
		setIsOpen(false);
		setCtx(null);
		setResolvedAmountRub(null);
		if (typeof window !== "undefined") {
			const u = new URL(window.location.href);
			u.searchParams.delete("payment");
			u.searchParams.delete("checkout");
			const cleanHash = (u.hash || "").replace(/#payment|#checkout/g, "");
			window.history.replaceState(
				{},
				"",
				`${u.pathname}${u.search || ""}${cleanHash}`,
			);
		}
	}, []);

	// Честное разрешение суммы: переданная сумма, иначе реальный долг пациента
	// из базы. Подставлять вымышленные суммы и пациентов запрещено.
	useEffect(() => {
		if (!isOpen || !ctx?.patientId) {
			setResolvedAmountRub(null);
			return;
		}
		if ((ctx.amountRub ?? 0) > 0) {
			setResolvedAmountRub(ctx.amountRub ?? 0);
			return;
		}
		let cancelled = false;
		void fetchOutstandingDebtRub(ctx.patientId).then((debt) => {
			if (cancelled) return;
			if (debt > 0) {
				setResolvedAmountRub(debt);
			} else {
				showToast("У пациента нет неоплаченных счетов.", "info");
				closeAll();
			}
		});
		return () => {
			cancelled = true;
		};
	}, [ctx, isOpen, closeAll]);

	useEffect(() => {
		const onOpen = (e: Event) => {
			const d = (e as CustomEvent<GlobalPaymentModalContext>)?.detail;
			if (d) setCtx(d);
			setIsOpen(true);
		};
		const onHash = () => {
			if (hasPayment()) setIsOpen(true);
		};
		for (const ev of EVTS) window.addEventListener(ev, onOpen);
		window.addEventListener("hashchange", onHash);
		return () => {
			for (const ev of EVTS) window.removeEventListener(ev, onOpen);
			window.removeEventListener("hashchange", onHash);
		};
	}, []);

	if (!isOpen || !ctx?.patientId) return null;
	if (resolvedAmountRub === null || !(resolvedAmountRub > 0)) return null;
	const cashier =
		activeStaffUser?.name || activeStaffUser?.fullName || undefined;

	return (
		<PaymentModal
			isOpen={isOpen}
			amountRub={resolvedAmountRub}
			amountKopecks={Math.round(resolvedAmountRub * 100)}
			defaultMethod={ctx.defaultMethod || "card_terminal"}
			patientId={ctx.patientId}
			patientName={ctx.patientName}
			patientPhone={ctx.patientPhone}
			patientDepositRub={ctx.patientDepositRub ?? 0}
			patientFamilyBalanceRub={ctx.patientFamilyBalanceRub ?? 0}
			cashierName={cashier}
			doctorName={ctx.doctorName}
			clinicLegalName={ctx.clinicLegalName}
			visitId={ctx.visitId}
			items={ctx.items}
			onClose={closeAll}
			onSuccess={() => {
				closeAll();
				showToast(
					`Оплата ${resolvedAmountRub.toLocaleString("ru-RU")} ₽ успешно принята!`,
					"success",
				);
			}}
		/>
	);
};

export default GlobalPaymentModalLauncher;
