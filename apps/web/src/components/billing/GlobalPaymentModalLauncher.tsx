import type React from "react";
import { useEffect, useState } from "react";
import { showToast } from "../GlobalToast.js";
import {
	type PaymentMethodTab,
	PaymentModal,
	type PaymentModalProps,
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
	items?: PaymentModalProps["items"];
}

const DEFAULT_ITEMS: NonNullable<PaymentModalProps["items"]> = [
	{
		id: "1",
		name: "Приём и лечение",
		quantity: 1,
		priceRub: 15400,
		discountRub: 0,
		amountRub: 15400,
	},
];

const hasPayment = (): boolean =>
	typeof window !== "undefined" &&
	/(payment|checkout)/i.test(window.location.href);

const EVTS = [
	"dente:open-payment-modal",
	"dente-open-payment-modal",
	"dente:open-checkout",
] as const;

export const GlobalPaymentModalLauncher: React.FC<{
	readonly activeStaffUser?: {
		readonly name?: string;
		readonly fullName?: string;
	} | null;
}> = ({ activeStaffUser }) => {
	const [isOpen, setIsOpen] = useState<boolean>(hasPayment);
	const [ctx, setCtx] = useState<GlobalPaymentModalContext | null>(null);

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

	if (!isOpen) return null;
	const sum = ctx?.amountRub ?? 15400;
	const cashier =
		activeStaffUser?.name || activeStaffUser?.fullName || "Воронова А. В.";
	const onClose = () => {
		setIsOpen(false);
		setCtx(null);
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
	};

	return (
		<PaymentModal
			isOpen={isOpen}
			amountRub={sum}
			amountKopecks={sum * 100}
			defaultMethod={ctx?.defaultMethod || "card_terminal"}
			patientId={ctx?.patientId || "pat_mikhailov"}
			patientName={ctx?.patientName || "Михайлов Артем Евгеньевич"}
			patientPhone={ctx?.patientPhone || "+7 (926) 345-67-89"}
			patientDepositRub={5000}
			patientFamilyBalanceRub={18500}
			cashierName={cashier}
			doctorName={ctx?.doctorName || "Д-р Воронов А. В."}
			clinicLegalName={ctx?.clinicLegalName || "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»"}
			visitId={ctx?.visitId}
			items={ctx?.items || DEFAULT_ITEMS}
			onClose={onClose}
			onSuccess={() => {
				onClose();
				showToast(
					`Оплата ${sum.toLocaleString("ru-RU")} ₽ успешно принята!`,
					"success",
				);
			}}
		/>
	);
};

export default GlobalPaymentModalLauncher;
