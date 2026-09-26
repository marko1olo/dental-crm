/**
 * apps/web/src/components/finance/modal/payment/usePaymentDiscountsAndPresets.ts
 *
 * Doctor Autonomy Discounts, Warranty 100%, and Invoice/Act print handlers.
 */

import { useState, useMemo } from "react";
import {
	calculatePaymentDiscount,
	type PaymentDiscountCalculation,
} from "../../cashboxOperations.js";
import {
	generateInvoicePrintHtml,
	generateActPrintHtml,
} from "./paymentModalPrintHtml.js";
import { hardwarePrinter } from "../../../../services/hardware/HardwarePrinter.js";
import { showToast } from "../../../GlobalToast.js";

export interface UsePaymentDiscountsAndPresetsParams {
	readonly rawTotalDueRub: number;
	readonly initialWarranty100?: boolean | undefined;
	readonly initialDiscountPercent?: number | undefined;
	readonly initialCustomDiscountRub?: number | undefined;
	readonly initialDiscountReason?: string | undefined;
	readonly invoiceId?: string | undefined;
	readonly clinicLegalName: string;
	readonly patientName: string;
	readonly effectiveCashier: string;
	readonly onPrintInvoice?: (() => void) | undefined;
	readonly onPrintAct?: (() => void) | undefined;
	readonly onDiscountChanged?: ((newTotalRub: number) => void) | undefined;
}

export function usePaymentDiscountsAndPresets(params: UsePaymentDiscountsAndPresetsParams) {
	const {
		rawTotalDueRub,
		initialWarranty100 = false,
		initialDiscountPercent = 0,
		initialCustomDiscountRub = 0,
		initialDiscountReason = "",
		invoiceId,
		clinicLegalName,
		patientName,
		effectiveCashier,
		onPrintInvoice,
		onPrintAct,
		onDiscountChanged,
	} = params;

	const [isWarranty100, setIsWarranty100] = useState<boolean>(initialWarranty100);
	const [discountPercent, setDiscountPercent] = useState<number>(
		initialDiscountPercent || (initialWarranty100 ? 100 : 0),
	);
	const [customDiscountRub, setCustomDiscountRub] = useState<number>(initialCustomDiscountRub);
	const [discountReason, setDiscountReason] = useState<string>(
		initialDiscountReason || (initialWarranty100 ? "Гарантийная переделка" : ""),
	);

	const discountCalc: PaymentDiscountCalculation = useMemo(() => {
		return calculatePaymentDiscount(rawTotalDueRub, {
			isWarranty100,
			customDiscountRub,
			discountPercent,
		});
	}, [rawTotalDueRub, isWarranty100, customDiscountRub, discountPercent]);

	const { discountRub, totalDueRub, effectiveDiscountPercent, totalDueKopecks } = discountCalc;

	const applyDiscountPreset = (percent: number, reason: string) => {
		const newPercent = Math.max(0, Math.min(100, percent));
		const isWarranty = newPercent === 100 && (reason.includes("Гарант") || isWarranty100);
		setIsWarranty100(isWarranty);
		setDiscountPercent(newPercent);
		setCustomDiscountRub(0);
		setDiscountReason(reason);

		const calc = calculatePaymentDiscount(rawTotalDueRub, {
			isWarranty100: isWarranty,
			customDiscountRub: 0,
			discountPercent: newPercent,
		});
		if (onDiscountChanged) onDiscountChanged(calc.totalDueRub);

		if (newPercent === 0) {
			showToast("Скидка сброшена (Без скидки 0%)", "info", 1500);
		} else {
			showToast(
				`Применена скидка ${newPercent}% (${reason}): к оплате ${calc.totalDueRub.toLocaleString("ru-RU")} ₽`,
				"info",
				2500,
			);
		}
	};

	const applyWarranty100Preset = () => {
		setIsWarranty100(true);
		setDiscountPercent(100);
		setCustomDiscountRub(0);
		setDiscountReason("Гарантийная переделка");
		if (onDiscountChanged) onDiscountChanged(0);
		showToast("Применена скидка 100% (Гарантийная переделка • 0 ₽)", "info", 2500);
	};

	const handleCustomPercentChange = (val: number) => {
		const clamped = Math.max(0, Math.min(100, val));
		const isWarranty = clamped === 100;
		setIsWarranty100(isWarranty);
		setDiscountPercent(clamped);
		setCustomDiscountRub(0);
		setDiscountReason(clamped > 0 ? "Индивидуальная скидка врача" : "");

		const calc = calculatePaymentDiscount(rawTotalDueRub, {
			isWarranty100: isWarranty,
			customDiscountRub: 0,
			discountPercent: clamped,
		});
		if (onDiscountChanged) onDiscountChanged(calc.totalDueRub);
	};

	const handleCustomDiscountRubChange = (val: number) => {
		const clamped = Math.max(0, val);
		setIsWarranty100(false);
		setDiscountPercent(0);
		setCustomDiscountRub(clamped);
		setDiscountReason(clamped > 0 ? "Индивидуальная скидка врача (в рублях)" : "");

		const calc = calculatePaymentDiscount(rawTotalDueRub, {
			isWarranty100: false,
			customDiscountRub: clamped,
			discountPercent: 0,
		});
		if (onDiscountChanged) onDiscountChanged(calc.totalDueRub);
	};

	const handleQuickPrintInvoice = () => {
		if (onPrintInvoice) {
			onPrintInvoice();
			return;
		}
		const invoiceNumber = invoiceId
			? `СЧ-${invoiceId.slice(0, 8).toUpperCase()}`
			: `СЧ-${Date.now().toString().slice(-6)}`;
		const invoiceHtml = generateInvoicePrintHtml({
			invoiceNumber,
			clinicLegalName,
			patientName,
			effectiveCashier,
			rawTotalDueRub,
			discountRub,
			effectiveDiscountPercent,
			discountReason,
			totalDueRub,
			isWarranty100,
		});
		void hardwarePrinter
			.printHtmlWithPopupFallback(invoiceHtml, {
				title: `Счет № ${invoiceNumber}`,
				downloadFilename: `Schet_${invoiceNumber}.html`,
			})
			.then(() => {
				showToast("Печать счета отправлена на принтер", "success");
			})
			.catch(() => {
				showToast("Ошибка отправки счета на печать", "error");
			});
	};

	const handleQuickPrintAct = () => {
		if (onPrintAct) {
			onPrintAct();
			return;
		}
		const actNumber = invoiceId
			? `АКТ-${invoiceId.slice(0, 8).toUpperCase()}`
			: `АКТ-${Date.now().toString().slice(-6)}`;
		const actHtml = generateActPrintHtml({
			actNumber,
			clinicLegalName,
			patientName,
			effectiveCashier,
			rawTotalDueRub,
			discountRub,
			effectiveDiscountPercent,
			discountReason,
			totalDueRub,
			isWarranty100,
		});
		void hardwarePrinter
			.printHtmlWithPopupFallback(actHtml, {
				title: `Акт № ${actNumber}`,
				downloadFilename: `Akt_${actNumber}.html`,
			})
			.then(() => {
				showToast("Печать акта отправлена на принтер", "success");
			})
			.catch(() => {
				showToast("Ошибка отправки акта на печать", "error");
			});
	};

	return {
		isWarranty100,
		setIsWarranty100,
		discountPercent,
		setDiscountPercent,
		customDiscountRub,
		setCustomDiscountRub,
		discountReason,
		setDiscountReason,
		discountCalc,
		discountRub,
		totalDueRub,
		effectiveDiscountPercent,
		totalDueKopecks,
		applyDiscountPreset,
		applyWarranty100Preset,
		handleCustomPercentChange,
		handleCustomDiscountRubChange,
		handleQuickPrintInvoice,
		handleQuickPrintAct,
	};
}
