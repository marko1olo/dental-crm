import {
	getFfd1054Label,
	CASH_EXPENSE_CATALOG,
	CASH_RECEIPT_CATALOG,
} from "@dental/shared";
import { useState } from "react";
import { showToast } from "../../GlobalToast";
import { type CashFlowModalProps, formatMoneyRu } from "./types";

export function useCashFlowLogic(props: CashFlowModalProps) {
	const { initialMode = "cash_in", onCashIn, onCashOut, onClose } = props;
	const [cashFlowMode, setCashFlowMode] = useState<"cash_in" | "cash_out">(
		initialMode,
	);
	const [selectedTypeAlias, setSelectedTypeAlias] = useState<string>(
		initialMode === "cash_in" ? "cash_deposit" : "collection",
	);
	const [cashFlowAmount, setCashFlowAmount] = useState<string>("");
	const [cashFlowBasis, setCashFlowBasis] = useState<string>(
		initialMode === "cash_in"
			? "Внесение разменной монеты"
			: "Инкассация выручки в банк",
	);
	const [cashFlowPerson, setCashFlowPerson] = useState<string>("");
	const [isProcessing, setIsProcessing] = useState<boolean>(false);

	const handleSelectReceiptPreset = (alias: string) => {
		setSelectedTypeAlias(alias);
		const preset = CASH_RECEIPT_CATALOG.find((r) => r.alias === alias);
		if (preset) setCashFlowBasis(preset.name);
	};

	const handleSelectExpensePreset = (alias: string) => {
		setSelectedTypeAlias(alias);
		const preset = CASH_EXPENSE_CATALOG.find((e) => e.alias === alias);
		if (preset) setCashFlowBasis(preset.name);
	};

	const handleSubmit = async (e?: React.FormEvent) => {
		if (e) e.preventDefault();
		const amount = Number.parseFloat(cashFlowAmount.replace(",", "."));
		if (!amount || Number.isNaN(amount) || amount <= 0) {
			showToast("Укажите корректную сумму операции (больше 0 ₽)", "warning");
			return;
		}

		setIsProcessing(true);
		try {
			if (cashFlowMode === "cash_in") {
				if (onCashIn)
					await onCashIn(
						amount,
						cashFlowBasis || "Внесение наличных",
						selectedTypeAlias,
					);
				const item = CASH_RECEIPT_CATALOG.find(
					(r) => r.alias === selectedTypeAlias,
				);
				const ffdLabel =
					item?.ffdTag1054 != null
						? ` (Кассовый чек: ${getFfd1054Label(item.ffdTag1054)})`
						: " (Нефискально)";
				showToast(
					`Внесение ${formatMoneyRu(amount)} успешно зафиксировано${ffdLabel}`,
					"success",
					3500,
				);
			} else {
				if (onCashOut)
					await onCashOut(
						amount,
						cashFlowBasis || "Изъятие наличных",
						cashFlowPerson || undefined,
						selectedTypeAlias,
					);
				const item = CASH_EXPENSE_CATALOG.find(
					(e) => e.alias === selectedTypeAlias,
				);
				const ffdLabel =
					item?.ffdTag1054 != null
						? ` (Кассовый чек: ${getFfd1054Label(item.ffdTag1054)})`
						: " (Нефискально)";
				showToast(
					`Изъятие ${formatMoneyRu(amount)} успешно зафиксировано${ffdLabel}`,
					"success",
					3500,
				);
			}
			onClose();
		} catch {
			showToast("Ошибка при фиксации кассовой операции", "error");
		} finally {
			setIsProcessing(false);
		}
	};

	return {
		cashFlowMode,
		setCashFlowMode,
		selectedTypeAlias,
		setSelectedTypeAlias,
		cashFlowAmount,
		setCashFlowAmount,
		cashFlowBasis,
		setCashFlowBasis,
		cashFlowPerson,
		setCashFlowPerson,
		isProcessing,
		handleSelectReceiptPreset,
		handleSelectExpensePreset,
		handleSubmit,
	};
}
