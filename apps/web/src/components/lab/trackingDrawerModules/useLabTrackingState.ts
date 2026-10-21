import { useState, useEffect } from "react";
import { showToast } from "../../GlobalToast";
import { rublesToKopecks } from "@dental/shared";
import { checkDentalLabFinancialGate, createDoctorClinicalOverride } from "../dentalLabFinancialGateEngine";
import {
	type LabOrderStageKey,
	LAB_ORDER_STAGES,
	calculateLabFinancialSplit,
	type DentalLabOrderData,
} from "../labMath";

export interface UseLabTrackingStateProps {
	order: DentalLabOrderData | null;
	patientDepositRub?: number | undefined;
	stageTotalRub?: number | undefined;
	stagePaidRub?: number | undefined;
	chiefDoctorName?: string | undefined;
	onStageUpdate?: ((orderId: string, stage: LabOrderStageKey, note?: string | undefined) => Promise<void> | void) | undefined;
	onFittingDateUpdate?: ((orderId: string, dates: { frameworkTrialDate?: string | undefined; ceramicTrialDate?: string | undefined; deliveryDate?: string | undefined }) => Promise<void> | void) | undefined;
}

export function useLabTrackingState({
	order, patientDepositRub, stageTotalRub, stagePaidRub, onStageUpdate, onFittingDateUpdate,
}: UseLabTrackingStateProps) {
	const [activeStage, setActiveStage] = useState<LabOrderStageKey>("sent_to_lab");
	const [stageNote, setStageNote] = useState<string>("");
	const [isUpdating, setIsUpdating] = useState<boolean>(false);
	const [gateOverride, setGateOverride] = useState<{ authorized: boolean; doctorName: string; timestampIso: string; reason: string } | null>(null);
	const [isInstallmentModalOpen, setIsInstallmentModalOpen] = useState<boolean>(false);
	const [frameworkTrialDate, setFrameworkTrialDate] = useState<string>("");
	const [ceramicTrialDate, setCeramicTrialDate] = useState<string>("");
	const [deliveryDate, setDeliveryDate] = useState<string>("");

	useEffect(() => {
		if (!order) return;
		setActiveStage(order.currentStage || "sent_to_lab");
		setFrameworkTrialDate(order.frameworkTrialDate ? order.frameworkTrialDate.slice(0, 10) : "");
		setCeramicTrialDate(order.ceramicTrialDate ? order.ceramicTrialDate.slice(0, 10) : "");
		setDeliveryDate(order.deliveryDate ? order.deliveryDate.slice(0, 10) : order.dueDate ? order.dueDate.slice(0, 10) : "");
	}, [order]);

	const financialSplit = calculateLabFinancialSplit(order?.priceRub || 0, order?.doctorSharePct ?? 50);
	const financialGateResult = checkDentalLabFinancialGate({
		stageTotalKopecks: rublesToKopecks(stageTotalRub ?? (order?.priceRub || 0)),
		paidKopecks: rublesToKopecks(stagePaidRub ?? 0), availableDepositKopecks: rublesToKopecks(patientDepositRub ?? 0),
		labOrderPriceKopecks: rublesToKopecks(order?.priceRub || 0), minAdvancePercent: 50,
		doctorOverride: gateOverride ?? undefined, chiefDoctorOverride: gateOverride ?? undefined,
	});

	const currentStageIndex = LAB_ORDER_STAGES.findIndex((s) => s.id === activeStage);
	const nextStage = currentStageIndex < LAB_ORDER_STAGES.length - 1 ? LAB_ORDER_STAGES[currentStageIndex + 1] : null;

	const handleAdvanceStage = async (targetStage?: LabOrderStageKey) => {
		const stageToSet = targetStage || nextStage?.id;
		if (!stageToSet || !order?.id) {
			if (!nextStage && !targetStage) showToast("Заказ ЗТЛ уже на завершающем этапе.", "info");
			return;
		}
		if ((stageToSet === "in_progress" || stageToSet === "sent_to_lab") && !financialGateResult.isGatePassed && !gateOverride) {
			setGateOverride(createDoctorClinicalOverride(order.doctorName || "Лечащий врач", "Перевод этапа ЗТЛ — автономия врача"));
		}
		setIsUpdating(true);
		try {
			if (onStageUpdate) await onStageUpdate(order.id, stageToSet, stageNote.trim() || undefined);
			setActiveStage(stageToSet); setStageNote("");
			showToast(`Этап наряда ЗТЛ: ${LAB_ORDER_STAGES.find((s) => s.id === stageToSet)?.name}`, "success");
		} catch (err: any) {
			showToast(err.message || "Ошибка обновления этапа ЗТЛ", "error");
		} finally { setIsUpdating(false); }
	};

	const handleSaveFittingDates = async () => {
		if (!order?.id) return;
		setIsUpdating(true);
		try {
			if (onFittingDateUpdate) {
				await onFittingDateUpdate(order.id, {
					...(frameworkTrialDate ? { frameworkTrialDate } : {}),
					...(ceramicTrialDate ? { ceramicTrialDate } : {}),
					...(deliveryDate ? { deliveryDate } : {}),
				});
			}
			showToast("Даты клинических примерок сохранены", "success");
		} catch (err: any) {
			showToast(err.message || "Ошибка сохранения дат", "error");
		} finally { setIsUpdating(false); }
	};

	return {
		activeStage, currentStageIndex, stageNote, setStageNote, isUpdating,
		gateOverride, setGateOverride, isInstallmentModalOpen, setIsInstallmentModalOpen,
		frameworkTrialDate, setFrameworkTrialDate, ceramicTrialDate, setCeramicTrialDate,
		deliveryDate, setDeliveryDate, financialSplit, financialGateResult,
		handleAdvanceStage, handleSaveFittingDates,
	};
}
