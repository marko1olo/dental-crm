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
	generateInstallmentSchedule, evaluateInstallmentStatus,
	generateInstallmentContractNumber, recordInstallmentPayment,
	TREATMENT_INSTALLMENT_PRESETS,
} from "../installmentsEngine.js";
import { rublesToKopecks } from "@dental/shared";
import { showToast } from "../../GlobalToast.js";
import { useOptionalAppLogicContext } from "../../../contexts/AppLogicContext.js";
import { usePatientInstallmentsApi, isUuid } from "../usePatientInstallmentsApi.js";
import type { PatientInstallmentsModalProps, InstallmentsSubView } from "./installmentsTypes.js";

export function usePatientInstallmentsState(props: PatientInstallmentsModalProps) {
	const {
		isOpen, patientId = "pat-demo-1", patientName = "Смирнова Елена Васильевна",
		patientPhone = "+7 (926) 345-67-89", clinicName = "ООО «ДЕНТЕ»",
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
		setCustomPayAmountRub(((target.amountKopecks - target.paidKopecks) / 100).toFixed(0));
		setActiveSubView("quick_pay");
	};

	const handleExecutePayment = async () => {
		if (!selectedPaymentItemId) return;
		const target = plan.schedule.find((s) => s.id === selectedPaymentItemId);
		if (!target) return;
		const enteredKop = customPayAmountRub ? rublesToKopecks(Math.max(1, Number(customPayAmountRub))) : (target.amountKopecks - target.paidKopecks);
		try {
			if (isUuid(selectedPaymentItemId)) await installmentsApi.payTranche(selectedPaymentItemId);
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
		const downPaymentKop = Math.round((totalKop * newDownPaymentPercent) / 100);
		const validMonths = ([3, 6, 12, 24].includes(newMonthsCount) ? newMonthsCount : (newMonthsCount <= 4 ? 3 : (newMonthsCount <= 8 ? 6 : (newMonthsCount <= 18 ? 12 : 24)))) as 3 | 6 | 12 | 24;
		const presetCfg = TREATMENT_INSTALLMENT_PRESETS[selectedPreset];

		if (isUuid(patientId)) {
			const serverPlan = await installmentsApi.createContract({ patientId, totalAmountRub: newTotalRubles, downPaymentRub: Math.round((newTotalRubles * newDownPaymentPercent) / 100), monthsCount: validMonths, notes: presetCfg.notes });
			if (serverPlan) { setPlan(serverPlan); onPlanUpdate?.(serverPlan); setActiveSubView("schedule"); showToast(`Договор рассрочки ${serverPlan.contractNumber} оформлен!`, "success"); return; }
		}

		const schedule = generateInstallmentSchedule({ totalAmountKopecks: totalKop, downPaymentKopecks: downPaymentKop, monthsCount: newMonthsCount, startDateIso: new Date().toISOString(), dueDayOfMonth: 15 });
		const evalResult = evaluateInstallmentStatus(schedule, new Date().toISOString());
		const newPlan: InstallmentPlan = {
			id: `inst-plan-${selectedPreset}-${patientId}-${Date.now()}`, contractNumber: generateInstallmentContractNumber(patientId, new Date().toISOString(), 1),
			patientId, patientName, patientPhone, doctorName: "Лечащий врач", treatmentTitle: presetCfg.title,
			totalAmountKopecks: totalKop, downPaymentKopecks: downPaymentKop, monthsCount: newMonthsCount,
			monthlyPaymentKopecks: schedule.length > 1 ? schedule[1]!.amountKopecks : 0, startDateIso: new Date().toISOString(),
			schedule: evalResult.updatedSchedule, paidAmountKopecks: evalResult.paidAmountKopecks, remainingDebtKopecks: evalResult.remainingDebtKopecks,
			overdueDebtKopecks: evalResult.overdueDebtKopecks, status: evalResult.status, nextPaymentDueItem: evalResult.nextPaymentDueItem,
			daysUntilNextPayment: evalResult.daysUntilNextPayment, createdAtIso: new Date().toISOString(), notes: presetCfg.notes,
		};
		setPlan(newPlan); onPlanUpdate?.(newPlan); setActiveSubView("schedule"); showToast(`Договор рассрочки ${newPlan.contractNumber} оформлен!`, "success");
	};

	return {
		plan, setPlan, activeSubView, setActiveSubView, selectedPaymentItemId, setSelectedPaymentItemId,
		selectedPaymentMethod, setSelectedPaymentMethod, customPayAmountRub, setCustomPayAmountRub,
		lastReceipt, selectedPreset, setSelectedPreset, newTotalRubles, setNewTotalRubles,
		newDownPaymentPercent, setNewDownPaymentPercent, newMonthsCount, setNewMonthsCount,
		reminderData, handleInitiateQuickPay, handleExecutePayment, handleCreateNewPlan,
	};
}
