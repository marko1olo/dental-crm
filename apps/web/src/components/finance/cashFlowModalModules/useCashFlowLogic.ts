import {
	generateUuidV7,
	getFfd1054Label,
	CASH_EXPENSE_CATALOG,
	CASH_RECEIPT_CATALOG,
} from "@dental/shared";
import { useEffect, useState } from "react";
import {
	denteClinicalMutationHeaders,
	denteClinicalReadHeaders,
} from "../../../lib/denteRequestHeaders";
import { clientLogger } from "../../../services/logging/clientLogger";
import { showToast } from "../../GlobalToast";
import {
	type CashBoxSummary,
	type CashFlowModalProps,
	type CashFlowMode,
	formatMoneyRu,
} from "./types";

export function useCashFlowLogic(props: CashFlowModalProps) {
	const {
		isOpen,
		initialMode = "cash_in",
		onCashIn,
		onCashOut,
		onTransferComplete,
		onClose,
	} = props;
	const [cashFlowMode, setCashFlowMode] = useState<CashFlowMode>(initialMode);
	const [selectedTypeAlias, setSelectedTypeAlias] = useState<string>(
		initialMode === "cash_in" ? "cash_deposit" : "collection",
	);
	const [cashFlowAmount, setCashFlowAmount] = useState<string>("");
	const [cashFlowBasis, setCashFlowBasis] = useState<string>(
		initialMode === "transfer"
			? "Межкассовое перемещение средств"
			: initialMode === "cash_in"
				? "Внесение разменной монеты"
				: "Инкассация выручки в банк",
	);
	const [cashFlowPerson, setCashFlowPerson] = useState<string>("");
	const [isProcessing, setIsProcessing] = useState<boolean>(false);
	const [cashBoxes, setCashBoxes] = useState<CashBoxSummary[]>([]);
	const [fromCashBoxId, setFromCashBoxId] = useState<string>("");
	const [toCashBoxId, setToCashBoxId] = useState<string>("");

	useEffect(() => {
		if (!isOpen) return;
		let active = true;
		const loadCashBoxes = async () => {
			try {
				const res = await fetch("/api/cash/cash-box", {
					credentials: "same-origin",
					headers: denteClinicalReadHeaders(),
				});
				if (!res.ok) return;
				const json = (await res.json()) as { data?: unknown } | unknown;
				const raw =
					json && typeof json === "object" && "data" in json
						? (json as { data?: unknown }).data
						: json;
				if (!active || !Array.isArray(raw)) return;
				const parsed: CashBoxSummary[] = raw
					.filter(
						(item): item is Record<string, unknown> =>
							Boolean(item) && typeof item === "object",
					)
					.map((item) => ({
						id: String(item.id ?? ""),
						name: String(item.name ?? "Касса"),
						type: String(item.type ?? "main"),
						balanceRub: Number(item.balanceRub ?? 0),
					}))
					.filter((b) => b.id.length > 0);
				setCashBoxes(parsed);
				if (parsed.length > 0) {
					setFromCashBoxId((prev) => prev || parsed[0]?.id || "");
					setToCashBoxId((prev) => prev || parsed[1]?.id || parsed[0]?.id || "");
				}
			} catch {
				// Best-effort preload for transfer selector
			}
		};
		void loadCashBoxes();
		return () => {
			active = false;
		};
	}, [isOpen]);

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

		if (cashFlowMode === "transfer") {
			if (!fromCashBoxId || !toCashBoxId) {
				showToast("Выберите исходную и целевую кассу", "warning");
				return;
			}
			if (fromCashBoxId === toCashBoxId) {
				showToast("Исходная и целевая кассы должны различаться", "warning");
				return;
			}
		}

		setIsProcessing(true);
		try {
			if (cashFlowMode === "transfer") {
				const mutationId = generateUuidV7();
				const res = await fetch("/api/cash/cash-transfer", {
					method: "POST",
					credentials: "same-origin",
					headers: denteClinicalMutationHeaders({
						"Content-Type": "application/json",
						"Idempotency-Key": mutationId,
						"X-Idempotency-Key": mutationId,
					}),
					body: JSON.stringify({
						fromCashBoxId,
						toCashBoxId,
						amountRub: amount,
						reasonText: cashFlowBasis.trim() || "Межкассовое перемещение средств",
					}),
				});
				const rawJson = (await res.json().catch(() => null)) as
					| { data?: { message?: string; error?: string }; message?: string; error?: string }
					| null;
				const json = rawJson?.data ?? rawJson;
				if (!res.ok) {
					throw new Error(
						json?.message || "Не удалось выполнить перевод между кассами",
					);
				}
				showToast(
					`Перевод ${formatMoneyRu(amount)} между кассами успешно выполнен`,
					"success",
					3500,
				);
				if (onTransferComplete) {
					await onTransferComplete();
				}
			} else if (cashFlowMode === "cash_in") {
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
		} catch (flowErr: unknown) {
			clientLogger.error("[useCashFlowLogic] Ошибка при фиксации кассовой операции", flowErr, {
				module: "Finance",
			});
			const msg = flowErr instanceof Error ? flowErr.message : "Ошибка при фиксации кассовой операции";
			showToast(msg, "error");
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
		cashBoxes,
		fromCashBoxId,
		setFromCashBoxId,
		toCashBoxId,
		setToCashBoxId,
		isProcessing,
		handleSelectReceiptPreset,
		handleSelectExpensePreset,
		handleSubmit,
	};
}
