import { useState } from "react";
import type { TreatmentPlanItem } from "../../../../treatment-plans/types";
import { showToast } from "../../../../GlobalToast";
import {
	generateCompletedActAndWarrantyHtml,
	numberToWordsRu,
} from "../../../invoiceEngine";
import { hardwarePrinter } from "../../../../../services/hardware/HardwarePrinter";
import { formatMoneyRu } from "../fiscalModalRefundLogic";
import { generateSalesSlipHtml } from "./salesSlipTemplate";
import { buildActParams } from "./actParamsBuilder";

export interface UseCompletedWorksActAndSlipStateParams {
	readonly activeItems: readonly TreatmentPlanItem[];
	readonly totalSumRub: number;
	readonly patientId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly patientPhone?: string | undefined;
	readonly cashierFullName?: string | undefined;
	readonly clinicName?: string | undefined;
	readonly oneCClinicInn?: string | undefined;
	readonly oneCClinicKpp?: string | undefined;
	readonly oneCPatientAddress?: string | undefined;
}

export function useCompletedWorksActAndSlipState({
	activeItems,
	totalSumRub,
	patientId = "00000000-0000-0000-0000-000000000001",
	patientName = "Пациент",
	patientPhone = "+7 (___) ___-__-__",
	cashierFullName = "Кассир-администратор",
	clinicName = "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
	oneCClinicInn = "",
	oneCClinicKpp = "",
	oneCPatientAddress = "",
}: UseCompletedWorksActAndSlipStateParams) {
	const [actNumber, setActNumber] = useState<string>(
		`АКТ-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`,
	);
	const [contractNumber, setContractNumber] = useState<string>(
		`ДОГ-${new Date().getFullYear()}/${(patientId || "patient").slice(0, 5).toUpperCase()}`,
	);

	const handleCopyActData = () => {
		const lines = [
			`АКТ № ${actNumber} СДАЧИ-ПРИЕМКИ ВЫПОЛНЕННЫХ СТОМАТОЛОГИЧЕСКИХ РАБОТ`,
			`Дата: ${new Date().toLocaleDateString("ru-RU")}, Договор: № ${contractNumber}`,
			`Исполнитель: ${clinicName}, Пациент: ${patientName}`,
			"",
			...activeItems.map((it, i) => {
				const toothPart = it.toothNumber ? ` [Зуб ${it.toothNumber}]` : "";
				const codePart = it.code804n ? ` (${it.code804n})` : "";
				const qty = it.quantity || 1;
				const sum = it.priceRub * qty - (it.discountRub || 0);
				return `${i + 1}. ${it.name}${codePart}${toothPart} — ${qty} шт. × ${formatMoneyRu(it.priceRub)} = ${formatMoneyRu(sum)}`;
			}),
			"",
			`ИТОГО ОКАЗАНО УСЛУГ: ${formatMoneyRu(totalSumRub)} (${numberToWordsRu(totalSumRub)})`,
			`Исполнитель: _________________ / ${cashierFullName}`,
			`Заказчик:    _________________ / ${patientName}`,
		];
		navigator.clipboard.writeText(lines.join("\n"));
		showToast("Текст Акта выполненных работ скопирован в буфер!", "success", 2500);
	};

	const handlePrintSalesSlip = async () => {
		const docNum = `ТЧ-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
		const nowStr = new Date().toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
		const html = generateSalesSlipHtml({ docNum, nowStr, clinicName, patientName, patientPhone, totalSumRub, cashierFullName, activeItems });
		try {
			await hardwarePrinter.printHtmlWithPopupFallback(html, { title: `Товарный чек № ${docNum}`, downloadFilename: `tovarniy_check_${docNum}.html` });
			showToast("Товарный чек отправлен на печать (без фискализации)", "success", 3000);
		} catch (printErr: unknown) {
			console.warn("[FiscalReceipt54FzModal] Print tovarniy check failed:", printErr);
			showToast("Ошибка отправки товарного чека на печать", "error");
		}
	};

	const handlePrintAct = async () => {
		const actParams = buildActParams({
			actNumber,
			contractNumber,
			clinicName,
			oneCClinicInn,
			oneCClinicKpp,
			cashierFullName,
			patientId,
			patientName,
			patientPhone,
			oneCPatientAddress,
			activeItems,
		});
		const html = generateCompletedActAndWarrantyHtml(actParams);
		try {
			await hardwarePrinter.printHtmlWithPopupFallback(html, { title: `Акт выполненных работ № ${actNumber}`, downloadFilename: `act_${actNumber}.html` });
			showToast("Акт выполненных работ отправлен на печать", "success", 3000);
		} catch (err) {
			console.warn("[FiscalReceipt54FzModal] Print act failed:", err);
			showToast("Ошибка отправки акта на печать", "error");
		}
	};

	return {
		actNumber,
		setActNumber,
		contractNumber,
		setContractNumber,
		handleCopyActData,
		handlePrintSalesSlip,
		handlePrintAct,
	};
}
