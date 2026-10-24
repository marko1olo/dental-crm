/**
 * FiscalReceiptLaunchers — Автономная печать кассовых чеков 54-ФЗ (Мандат 8b, <= 120 строк).
 *
 * Тонкий URL-роутер: счёт для чека берётся из базы по ?patientId=/?invoiceId=
 * через StandaloneReceiptLauncherHost. Никаких вбитых счетов и пациентов.
 */

import type React from "react";
import { StandaloneReceiptLauncherHost } from "./StandaloneReceiptLauncherHost";
import { clearUrlTokens } from "../deepLinkUrl";

export function renderFiscalReceiptLauncher({
	isReceiptDirectModalOpen,
	setIsReceiptDirectModalOpen,
}: {
	isReceiptDirectModalOpen?: boolean | undefined;
	setIsReceiptDirectModalOpen?: ((open: boolean) => void) | undefined;
}): React.ReactElement | null {
	if (!isReceiptDirectModalOpen) return null;

	return (
		<StandaloneReceiptLauncherHost
			onClose={() => {
				setIsReceiptDirectModalOpen?.(false);
				clearUrlTokens(["receipt"]);
			}}
		/>
	);
}
