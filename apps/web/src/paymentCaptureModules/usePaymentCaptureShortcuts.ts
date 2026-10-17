import { percentageOfKopecks } from "@dental/shared";
import { money } from "../AppHelpers";
import { fromKopecks, rubAmountForInput, toKopecks } from "../components/payments/cashDeskAmounts";
import { showToast } from "../components/GlobalToast";
import type { DoctorDiscountPreset } from "../PaymentDiscountsAndSplitSection";
import { digitsOnly } from "../PaymentFiscalCashierBar";
import { normalizeRubAmountInput } from "../rubAmountInput";
import type { PaymentCaptureProps } from "./types";

export function usePaymentCaptureShortcuts(
	props: PaymentCaptureProps,
	selectedDoctorDiscount: DoctorDiscountPreset | null,
	setSelectedDoctorDiscount: (d: DoctorDiscountPreset | null) => void,
	setIsSplit5050Mode: (m: boolean) => void,
	setIsSplitModalOpen: (o: boolean) => void,
) {
	const applyDoctorDiscount = (preset: DoctorDiscountPreset) => {
		if (selectedDoctorDiscount === preset) {
			setSelectedDoctorDiscount(null);
			return;
		}
		setSelectedDoctorDiscount(preset);
		const base = props.remainingDebt && props.remainingDebt > 0 ? props.remainingDebt : (normalizeRubAmountInput(props.amount) ?? 0);
		if (preset === "warranty_100") {
			props.onAmountChange("0");
			showToast("Применена 100% скидка врача: гарантийная переделка (к оплате 0 ₽, без пароля)", "info");
			return;
		}
		if (preset === "colleague_100") {
			props.onAmountChange("0");
			showToast("Применена 100% скидка для персонала (к оплате 0 ₽, без пароля)", "info");
			return;
		}
		if (base > 0) {
			const baseKop = toKopecks(base);
			if (baseKop !== null && baseKop > 0) {
				const pctMap: Record<string, { pct: number; label: string }> = {
					percent_50: { pct: 5000, label: "50%" },
					percent_20: { pct: 8000, label: "20%" },
					percent_10: { pct: 9000, label: "10%" },
				};
				const cfg = pctMap[preset];
				if (cfg) {
					const discountedKop = percentageOfKopecks(baseKop, cfg.pct);
					const discountedRub = fromKopecks(discountedKop);
					props.onAmountChange(rubAmountForInput(discountedRub));
					showToast(`Применена скидка врача ${cfg.label}: ${money(discountedRub)}`, "info");
				}
			}
		} else {
			showToast("Укажите базовую сумму платежа или выберите долг для расчета скидки", "warning");
		}
	};

	const applySplit5050Preset = () => {
		const total = normalizeRubAmountInput(props.amount) ?? (props.remainingDebt && props.remainingDebt > 0 ? props.remainingDebt : 0);
		if (total > 0) {
			const half = Math.round(total / 2);
			props.onAmountChange(String(half));
			props.onMethodChange("cash");
			showToast(`Комбинированная оплата 50/50: 1-я часть (${money(half)}, Наличные). 2-я часть (${money(total - half)}, Карта) принимается следом.`, "info");
		} else {
			setIsSplit5050Mode(true);
			setIsSplitModalOpen(true);
		}
	};

	const applyPatientTaxDefaults = () => {
		const d = props.patientDefaults;
		if (d.fullName?.trim() && !props.payerFullName.trim()) props.onPayerFullNameChange(d.fullName.trim());
		if (d.birthDate?.trim() && !props.payerBirthDate.trim()) props.onPayerBirthDateChange(d.birthDate.trim());
		if (d.identityDocument?.trim() && !props.payerIdentityDocument.trim()) props.onPayerIdentityDocumentChange(d.identityDocument.trim());
		if (d.taxpayerInn?.trim() && !props.payerInn.trim()) props.onPayerInnChange(digitsOnly(d.taxpayerInn, 12));
		if (!props.payerRelationship.trim()) props.onPayerRelationshipChange("пациент");
		showToast("Заполнены данные пациента", "info");
	};

	return { applyDoctorDiscount, applySplit5050Preset, applyPatientTaxDefaults };
}
