/**
 * apps/web/src/components/billing/installments/usePatientInstallmentsState.ts
 *
 * State and mutation management for PatientInstallmentsModal.
 * Strictly <= 120 lines per Mandate 8b.
 */

import { useState, useEffect } from "react";
import {
	type InstallmentPlan, type FiscalReceipt54FzResult, type TreatmentPresetType,
	generateInstallmentReminder,
	recordInstallmentPayment, TREATMENT_INSTALLMENT_PRESETS,
} from "../installmentsEngine.js";
import { rublesToKopecks, kopecksToRubles, percentageOfKopecks, basisPointsFromPercent } from "@dental/shared";
import {
	isPlainRecord,
	readApiErrorMessage,
} from "../../../lib/apiResponseHandler.js";
import { denteClinicalReadHeaders } from "../../../lib/denteRequestHeaders.js";
import { clientLogger } from "../../../services/logging/clientLogger.js";
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

interface ClinicCashBoxItem {
	readonly id: string;
	readonly type: string;
	readonly isMain?: boolean | undefined;
	readonly isCashless?: boolean | undefined;
}

function pickCashBoxIdForMethod(
	boxes: readonly ClinicCashBoxItem[],
	method: "card" | "cash" | "sbp",
): string | undefined {
	if (boxes.length === 0) return undefined;
	if (method === "cash") {
		return boxes.find((b) => b.isMain || b.type === "main" || b.type === "extra")?.id ?? boxes[0]?.id;
	}
	if (method === "sbp") {
		return (
			boxes.find((b) => b.type === "sbp")?.id ??
			boxes.find((b) => b.isCashless || b.type === "cashless")?.id ??
			boxes[0]?.id
		);
	}
	return boxes.find((b) => b.isCashless || b.type === "cashless")?.id ?? boxes[0]?.id;
}

export function usePatientInstallmentsState(props: PatientInstallmentsModalProps) {
	const {
		isOpen, patientId = "", patientName = "",
		clinicName = "",
		initialPlan, onPlanUpdate,
	} = props;

	const [plan, setPlan] = useState<InstallmentPlan | null>(() => initialPlan ?? null);
	const [isContractLoading, setIsContractLoading] = useState<boolean>(false);
	const [cashBoxes, setCashBoxes] = useState<readonly ClinicCashBoxItem[]>([]);
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

	useEffect(() => {
		setActiveSubView("schedule");
		setSelectedPaymentItemId(null);
		setCustomPayAmountRub("");
		setLastReceipt(null);
		setPlan(initialPlan ?? null);
	}, [isOpen, patientId, initialPlan]);

	useEffect(() => {
		if (!isOpen || !patientId || !isUuid(patientId) || initialPlan) {
			return undefined;
		}
		let cancelled = false;
		setIsContractLoading(true);
		installmentsApi
			.fetchActiveContract()
			.then((serverPlan) => {
				if (!cancelled) {
					setPlan(serverPlan ?? null);
					if (serverPlan) {
						onPlanUpdate?.(serverPlan);
					}
				}
			})
			.finally(() => {
				if (!cancelled) {
					setIsContractLoading(false);
				}
			});
		return () => {
			cancelled = true;
		};
	}, [isOpen, patientId, initialPlan, installmentsApi, onPlanUpdate]);

	useEffect(() => {
		if (!isOpen) return undefined;
		let cancelled = false;
		const headers =
			appLogic?.auth?.denteClinicalReadHeaders?.() ?? denteClinicalReadHeaders();
		const loadCashBoxes = async () => {
			try {
				const res = await fetch("/api/cash/cash-box", {
					credentials: "same-origin",
					headers,
				});
				if (!res.ok) {
					const errMsg = await readApiErrorMessage(
						res,
						"Не удалось загрузить список касс",
					);
					clientLogger.warn(
						"[usePatientInstallmentsState] Ошибка загрузки касс",
						{ status: res.status, message: errMsg },
						{ module: "Billing" },
					);
					if (!cancelled) {
						showToast(errMsg, "error");
					}
					return;
				}
				const json: unknown = await res.json();
				const raw = isPlainRecord(json) && json.data !== undefined ? json.data : json;
				if (!cancelled && Array.isArray(raw)) {
					setCashBoxes(
						raw
							.filter(isPlainRecord)
							.map((b) => ({
								id: String(b.id ?? ""),
								type: String(b.type ?? "main"),
								isMain: Boolean(b.isMain),
								isCashless: Boolean(b.isCashless),
							}))
							.filter((b) => b.id.length > 0),
					);
				}
			} catch (err: unknown) {
				clientLogger.warn(
					"[usePatientInstallmentsState] Сетевая ошибка загрузки касс",
					err,
					{ module: "Billing" },
				);
				if (!cancelled) {
					showToast("Не удалось загрузить список касс (проверьте сеть)", "error");
				}
			}
		};
		void loadCashBoxes();
		return () => {
			cancelled = true;
		};
	}, [isOpen, appLogic?.auth]);

	const handleInitiateQuickPay = (itemId?: string) => {
		if (!plan) {
			showToast("Сначала оформите договор рассрочки для пациента", "info");
			setActiveSubView("create_preset");
			return;
		}
		const target = itemId ? plan.schedule.find((s) => s.id === itemId) : plan.nextPaymentDueItem || plan.schedule.find((s) => s.paidKopecks < s.amountKopecks);
		if (!target) { showToast("Все платежи по рассрочке уже оплачены!", "success"); return; }
		setSelectedPaymentItemId(target.id);
		setCustomPayAmountRub(String(kopecksToRubles(target.amountKopecks - target.paidKopecks)));
		setActiveSubView("quick_pay");
	};

	const handleExecutePayment = async () => {
		if (!plan || !selectedPaymentItemId) return;
		const target = plan.schedule.find((s) => s.id === selectedPaymentItemId);
		if (!target) return;
		const enteredKop = customPayAmountRub ? rublesToKopecks(Math.max(1, Number(customPayAmountRub))) : (target.amountKopecks - target.paidKopecks);
		try {
			if (!isUuid(selectedPaymentItemId)) {
				throw new Error("Оплата возможна только по сохранённому серверному договору рассрочки.");
			}
			const cashBoxId = pickCashBoxIdForMethod(cashBoxes, selectedPaymentMethod);
			const ok = await installmentsApi.payTranche(selectedPaymentItemId, {
				amountPaidKopecks: enteredKop,
				...(cashBoxId ? { cashBoxId } : {}),
			});
			if (!ok) {
				throw new Error("Не удалось зафиксировать оплату транша на сервере.");
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

	const reminderData = plan
		? generateInstallmentReminder({ patientName, clinicName, plan, sbpQrUrl: "https://qr.nspk.ru/pay-installment-0pct" })
		: null;

	const handleCreateNewPlan = async () => {
		const totalKop = rublesToKopecks(newTotalRubles);
		const downPaymentKop = percentageOfKopecks(totalKop, basisPointsFromPercent(newDownPaymentPercent));
		const validMonths = toInstallmentMonths(newMonthsCount);
		const presetCfg = TREATMENT_INSTALLMENT_PRESETS[selectedPreset];

		if (!isUuid(patientId)) {
			showToast("Не выбран пациент для оформления договора рассрочки", "error");
			return;
		}

		try {
			const cashBoxId = pickCashBoxIdForMethod(cashBoxes, selectedPaymentMethod);
			const serverPlan = await installmentsApi.createContract({
				patientId,
				totalAmountRub: newTotalRubles,
				downPaymentRub: kopecksToRubles(downPaymentKop),
				monthsCount: validMonths,
				...(cashBoxId ? { cashBoxId } : {}),
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
		plan, setPlan, isContractLoading, activeSubView, setActiveSubView, selectedPaymentItemId, setSelectedPaymentItemId,
		selectedPaymentMethod, setSelectedPaymentMethod, customPayAmountRub, setCustomPayAmountRub,
		lastReceipt, setLastReceipt, selectedPreset, setSelectedPreset, newTotalRubles, setNewTotalRubles,
		newDownPaymentPercent, setNewDownPaymentPercent, newMonthsCount, setNewMonthsCount,
		reminderData, handleInitiateQuickPay, handleExecutePayment, handleCreateNewPlan,
	};
}
