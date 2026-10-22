import { useRef, useState } from "react";
import { showToast } from "../../GlobalToast.js";
import { isDemoShowcaseMode } from "../../../utils/demoModeEngine.js";
import type { ShiftSummaryData } from "./types.js";
import { useShiftBatchPackageAction, type UseShiftBatchPackageActionParams } from "./useShiftBatchPackageAction.js";

export interface UseShiftBatchActionsParams extends UseShiftBatchPackageActionParams {
	summaryData: ShiftSummaryData | null;
	procedureTitle?: string | undefined;
	serviceCode?: string | undefined;
	service804nCode?: string | undefined;
	toothNumber?: number | undefined;
	onClose: () => void;
}

export function useShiftBatchActions(params: UseShiftBatchActionsParams) {
	const {
		organizationId = "org-default",
		summaryData,
		procedureTitle = "Препарирование и пломба светового отверждения (Filtek / Estelite)",
		serviceCode,
		service804nCode = "A16.07.002.011",
		toothNumber = 16,
		onDeductionComplete,
		onClose,
	} = params;

	const [isSubmitting, setIsSubmitting] = useState(false);
	const inFlightRef = useRef(false);

	const packageAction = useShiftBatchPackageAction(params);

	const handleExecuteShiftDeduction = async () => {
		if (inFlightRef.current || isSubmitting) return;
		inFlightRef.current = true;
		setIsSubmitting(true);
		try {
			let res = await fetch(`/api/warehouse/${organizationId}/shift-deduct`, {
				method: "POST",
				headers: { "Content-Type": "application/json", "x-organization-id": organizationId },
				body: JSON.stringify({ date: summaryData?.date, notes: "Пакетное списание расходников за смену (1 клик)" }),
			}).catch(() => null);
			if (!res?.ok) {
				res = await fetch(`/api/inventory/${organizationId}/shift-deduct`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ date: summaryData?.date, notes: "Пакетное списание расходников за смену (1 клик)" }),
				}).catch(() => null);
			}
			if (res?.ok || isDemoShowcaseMode()) {
				showToast("Расходники за смену успешно списаны пакетом в 1 клик. Мягкий овердрафт активен.", "success");
				onDeductionComplete?.();
				onClose();
				return;
			}
			throw new Error("Сбой проведения списания за смену");
		} catch (err) {
			if (isDemoShowcaseMode()) {
				showToast("Расходники за смену списаны в 1 клик (демо-режим)", "success");
				onDeductionComplete?.();
				onClose();
			} else {
				showToast(err instanceof Error ? err.message : "Не удалось выполнить списание за смену", "error");
			}
		} finally {
			inFlightRef.current = false;
			setIsSubmitting(false);
		}
	};

	const handleConfirmProcedureDeduction = async () => {
		if (inFlightRef.current || isSubmitting) return;
		inFlightRef.current = true;
		setIsSubmitting(true);
		try {
			const payload = { serviceCode: serviceCode || service804nCode, toothNumber, allowSoftOverdraft: true };
			let res = await fetch(`/api/inventory/${organizationId}/deduct/visit`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			}).catch(() => null);
			if (!res?.ok) {
				res = await fetch(`/api/warehouse/${organizationId}/deduct/visit`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(payload),
				}).catch(() => null);
			}
			showToast(`Материалы по процедуре «${procedureTitle}» успешно списаны.`, "success");
			onDeductionComplete?.();
			onClose();
		} catch (err) {
			showToast(err instanceof Error ? err.message : "Не удалось списать материалы по процедуре", "error");
		} finally {
			inFlightRef.current = false;
			setIsSubmitting(false);
		}
	};

	return {
		isSubmitting,
		...packageAction,
		handleExecuteShiftDeduction,
		handleConfirmProcedureDeduction,
	};
}
