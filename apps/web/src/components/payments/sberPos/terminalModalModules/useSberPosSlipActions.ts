import type { SberPosTransactionResponse } from "@dental/shared";
import { useState } from "react";
import { hardwarePrinter } from "../../../../services/hardware/HardwarePrinter.js";
import { showToast } from "../../../GlobalToast.js";

export function useSberPosSlipActions(
	lastResponse: SberPosTransactionResponse | null,
) {
	const [activeSlipTab, setActiveSlipTab] = useState<"customer" | "merchant">(
		"customer",
	);
	const [isCopied, setIsCopied] = useState<boolean>(false);
	const [isPrinting, setIsPrinting] = useState<boolean>(false);

	const handleCopySlip = () => {
		if (!lastResponse) {
			showToast(
				"Слип-чек будет доступен после авторизации платежа на терминале",
				"info",
			);
			return;
		}
		const text =
			activeSlipTab === "customer"
				? lastResponse.customerSlip
				: lastResponse.merchantSlip;
		navigator.clipboard.writeText(text);
		setIsCopied(true);
		setTimeout(() => setIsCopied(false), 2000);
	};

	const handlePrintSlip = async () => {
		if (!lastResponse) {
			showToast(
				"Слип-чек будет доступен после авторизации платежа на терминале",
				"info",
			);
			return;
		}
		const slipText =
			activeSlipTab === "customer"
				? lastResponse.customerSlip
				: lastResponse.merchantSlip;
		if (!slipText?.trim()) {
			showToast("Текст слип-чека пуст", "warning");
			return;
		}
		setIsPrinting(true);
		try {
			const res = await hardwarePrinter.printBankSlip(slipText, {
				title: `Банковский слип #${lastResponse.rrn || lastResponse.authCode || ""}`,
			});
			if (res.success) {
				showToast("Слип-чек отправлен на термопринтер", "success");
			} else {
				showToast(res.error || "Сбой вывода слип-чека на печать", "warning");
			}
		} catch (err: unknown) {
			showToast(
				err instanceof Error ? err.message : "Ошибка печати банковского слипа",
				"error",
			);
		} finally {
			setIsPrinting(false);
		}
	};

	return {
		activeSlipTab,
		setActiveSlipTab,
		isCopied,
		isPrinting,
		handleCopySlip,
		handlePrintSlip,
	};
}
