/**
 * apps/web/src/components/billing/installments/usePatientInstallmentsState.ts
 *
 * State and mutation management for PatientInstallmentsModal.
 * Strictly <= 120 lines per Mandate 8b.
 */

import { useState, useEffect } from "react";
import {
	type InstallmentPlan, type FiscalReceipt54FzResult, type TreatmentPresetType,
	createDefaultInternalInstallmentsPreset, generateInstallmentReminder,
	recordInstallmentPayment, TREATMENT_INSTALLMENT_PRESETS,
} from "../installmentsEngine.js";
import { rublesToKopecks, kopecksToRubles, percentageOfKopecks } from "@dental/shared";
import { showToast } from "../../GlobalToast.js";
import { useOptionalAppLogicContext } from "../../../contexts/AppLogicContext.js";
import { usePatientInstallmentsApi, isUuid } from "../usePatientInstallmentsApi.js";
import type { PatientInstallmentsModalProps, InstallmentsSubView } from "./installmentsTypes.js";

function toInstallmentMonths(months: number): 3 | 6 | 10 | 12 | 18 | 24 {
	if (months === 3 || months === 6 || months === 10 || months === 12 || months === 18 || months === 24) return months;
	if (months <= 4) return 3;
	if (months <= 8) return 6;
	if (months <= 11) return 10;
	if (months <= 15) return 12;
	if (months <= 20) return 18;
	return 24;
}

export function usePatientInstallmentsState(props: PatientInstallmentsModalProps) {
	const {
		isOpen, patientId = "", patientName = "",
		patientPhone = "", clinicName = "",
		initialPlan, onPlanUpdate,
	} = props;

	const [plan, setPlan] = useState<InstallmentPlan>(() => initialPlan || createDefaultInternalInstallmentsPreset(patientId, patientName, "aligners", new Date().toISOString(), patientPhone));
	const [activeSubView, setActiveSubView] = useState<InstallmentsSubView>("schedule");
	const [selectedPaymentItemId, setSelectedPaymentItemId] = useState<string | null>(null);
	const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<"card" | "cash" | "sbp">("card");
	const [customPayAmountRub, setCustomPayAmountRub] = useState<string>("");
	const [lastReceipt, setLastReceipt] = useState<FiscalReceipt54FzResult | null>(null);
	const [selectedPreset, setSelectedPreset] = useState<TreatmentPresetType>("aligners");
	const [newTotalRubles, setNewTotalRubles] = useState<number>(360000);
	const [newDownPaymentPercent, setNewDownPaymentPercent] = useState<number>(30);
	const [newMonthsCount, setNewMonthsCount] = useState<number>(10);

	const appLogic = useOptionalAppLogicContext();
	const installmentsApi = usePatientInstallmentsApi({
		patientId,
		getMutationHeaders: () => appLogic?.auth?.denteClinicalMutationHeaders?.() ?? {},
		getReadHeaders: () => appLogic?.auth?.denteClinicalReadHeaders?.() ?? {},
	});

	useEffect(() => { if (initialPlan) setPlan(initialPlan); }, [initialPlan]);

	useEffect(() => {
		if (isOpen && patientId && isUuid(patientId) && !initialPlan) {
			installmentsApi.fetchActiveContract().then((serverPlan) => {
				if (serverPlan) { setPlan(serverPlan); onPlanUpdate?.(serverPlan); }
			});
		}
	}, [isOpen, patientId, initialPlan, installmentsApi, onPlanUpdate]);

	const handleInitiateQuickPay = (itemId?: string) => {
		const target = itemId ? plan.schedule.find((s) => s.id === itemId) : plan.nextPaymentDueItem || plan.schedule.find((s) => s.paidKopecks < s.amountKopecks);
		if (!target) { showToast("Все платежи по рассрочке уже оплачены!", "success"); return; }
		setSelectedPaymentItemId(target.id);
		setCustomPayAmountRub(String(kopecksToRubles(target.amountKopecks - target.paidKopecks)));
		setActiveSubView("quick_pay");
	};

	const handleExecutePayment = async () => {
		if (!selectedPaymentItemId) return;
		const target = plan.schedule.find((s) => s.id === selectedPaymentItemId);
		if (!target) return;
		const enteredKop = customPayAmountRub ? rublesToKopecks(Math.max(1, Number(customPayAmountRub))) : (target.amountKopecks - target.paidKopecks);
		try {
			// PLN-03 [SEV-1]: Передаем фактическую сумму частичной оплаты amountPaidKopecks на бэкенд
			if (isUuid(selectedPaymentItemId)) {
				const ok = await installmentsApi.payTranche(selectedPaymentItemId, { amountPaidKopecks: enteredKop });
				if (!ok) {
					throw new Error("Не удалось зафиксировать оплату транша на сервере.");
				}
			}
			const { updatedPlan, receipt } = recordInstallmentPayment({
				plan, paymentItemId: selectedPaymentItemId, paidAmountKopecks: enteredKop,
				paymentMethod: selectedPaymentMethod, paidAtIso: new Date().toISOString(),
			});
			setPlan(updatedPlan); setLastReceipt(receipt); onPlanUpdate?.(updatedPlan); setActiveSubView("schedule");
			showToast(`Платеж ${receipt.formattedAmount} принят! Чек ${receipt.receiptNumber} сформирован.`, "success");
		} catch (err) {
			showToast(err instanceof Error ? err.message : "Ошибка проведения платежа", "error");
		}
	};

	const reminderData = generateInstallmentReminder({ patientName, clinicName, plan, sbpQrUrl: "https://qr.nspk.ru/pay-installment-0pct" });

	const handleCreateNewPlan = async () => {
		const totalKop = rublesToKopecks(newTotalRubles);
		const downPaymentKop = percentageOfKopecks(totalKop, newDownPaymentPercent * 100);
		const validMonths = toInstallmentMonths(newMonthsCount);
		const presetCfg = TREATMENT_INSTALLMENT_PRESETS[selectedPreset];

		if (!isUuid(patientId)) {
			showToast("Не выбран пациент для оформления договора рассрочки", "error");
			return;
		}

		try {
			const serverPlan = await installmentsApi.createContract({
				patientId,
				totalAmountRub: newTotalRubles,
				downPaymentRub: kopecksToRubles(downPaymentKop),
				monthsCount: validMonths,
				notes: presetCfg.notes,
			});
			if (serverPlan) {
				setPlan(serverPlan);
				onPlanUpdate?.(serverPlan);
				setActiveSubView("schedule");
				showToast(`Договор рассрочки ${serverPlan.contractNumber} оформлен!`, "success");
				return;
			}
			showToast("Ошибка сохранения договора рассрочки на сервере", "error");
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : "Ошибка сохранения договора рассрочки";
			showToast(msg, "error");
		}
	};

	return {
		plan, setPlan, activeSubView, setActiveSubView, selectedPaymentItemId, setSelectedPaymentItemId,
		selectedPaymentMethod, setSelectedPaymentMethod, customPayAmountRub, setCustomPayAmountRub,
		lastReceipt, selectedPreset, setSelectedPreset, newTotalRubles, setNewTotalRubles,
		newDownPaymentPercent, setNewDownPaymentPercent, newMonthsCount, setNewMonthsCount,
		reminderData, handleInitiateQuickPay, handleExecutePayment, handleCreateNewPlan,
	};
}
