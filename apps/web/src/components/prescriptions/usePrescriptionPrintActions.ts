/**
 * usePrescriptionPrintActions.ts — Print, Copy Memo & Insert to Diary Handlers
 * Decomposed hook <= 120 lines (Mandate 8b).
 */

import { useCallback, useState } from "react";
import { showToast } from "../GlobalToast";
import { formatPatientPrescriptionMemo } from "./generator";
import type { PrescriptionDrugItem } from "./PrescriptionPrintModal";
import { printHtmlViaDetachedIframe } from "./prescriptionIframePrinter";
import { generatePatientMemoPrintHtml } from "./prescriptionPrintHtml";

export interface PrescriptionPrintActionsParams {
	readonly activeItems: readonly PrescriptionDrugItem[];
	readonly clinic: string;
	readonly address: string;
	readonly phone: string;
	readonly patientName: string;
	readonly patientBirth: string;
	readonly patientCard: string;
	readonly docName: string;
	readonly docSpecialty: string;
	readonly prescriptionDate: string;
	readonly generatePrintHtml: () => string;
	readonly persistPrescriptionToBackend: () => void;
	readonly onInsertToDiary?: ((text: string) => void) | undefined;
}

export function usePrescriptionPrintActions(p: PrescriptionPrintActionsParams) {
	const [isMemoCopied, setIsMemoCopied] = useState<boolean>(false);

	const handlePrint = useCallback(
		(customHtml?: string | unknown) => {
			const html =
				typeof customHtml === "string" ? customHtml : p.generatePrintHtml();
			printHtmlViaDetachedIframe(html);
			p.persistPrescriptionToBackend();
		},
		[p.generatePrintHtml, p.persistPrescriptionToBackend],
	);

	const handlePrintPatientMemo = useCallback(() => {
		if (p.activeItems.length === 0) {
			showToast("Выберите хотя бы один препарат для памятки", "warning", 3000);
			return;
		}
		const memoHtml = generatePatientMemoPrintHtml({
			clinic: p.clinic,
			address: p.address,
			phone: p.phone,
			patientName: p.patientName,
			patientBirth: p.patientBirth,
			patientCard: p.patientCard,
			docName: p.docName,
			docSpecialty: p.docSpecialty,
			prescriptionDate: p.prescriptionDate,
			activeItems: p.activeItems,
		});
		handlePrint(memoHtml);
	}, [p, handlePrint]);

	const handleCopyPatientMemo = useCallback(() => {
		if (p.activeItems.length === 0) {
			showToast("Выберите хотя бы один препарат", "warning", 3000);
			return;
		}
		const presets = p.activeItems.map((item) => ({
			id: item.id,
			tradeNameRu: item.tradeName,
			activeSubstanceRu: item.tradeName,
			category: item.category || "other",
			categoryLabelRu: "Препарат",
			latinRp: item.latinName,
			formRu: item.form,
			dosageRu: item.dosage,
			quantityLabel: item.quantity,
			dispenseLatin: item.dispenseLatin,
			signaRu: item.signaRussian,
			validityDays: 60,
		}));
		const memoText = formatPatientPrescriptionMemo({
			clinicName: p.clinic,
			clinicPhone: p.phone,
			patientName: p.patientName || "Пациент",
			doctorName: p.docName,
			prescriptionDate:
				p.prescriptionDate || new Date().toISOString().slice(0, 10),
			medications: presets,
		});
		if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
			navigator.clipboard.writeText(memoText).catch(() => {});
		}
		setIsMemoCopied(true);
		setTimeout(() => setIsMemoCopied(false), 2000);
		showToast(
			"Схема приёма лекарств скопирована для отправки пациенту в мессенджер",
			"success",
			3000,
		);
	}, [p]);

	const handleInsertToDiary = useCallback(
		(itemsToInsert?: PrescriptionDrugItem[]) => {
			const items = itemsToInsert || p.activeItems;
			if (items.length === 0) {
				showToast("Выберите препараты для добавления в карту", "warning", 3000);
				return;
			}
			const lines = items.map(
				(i, idx) => `${idx + 1}. ${i.tradeName}: ${i.signaRussian}`,
			);
			const text = `\n[Назначения]:\n${lines.join("\n")}\n`;
			if (p.onInsertToDiary) {
				p.onInsertToDiary(text);
				showToast("Назначения перенесены в дневник приёма", "success", 2500);
			} else {
				showToast("Дневник приёма недоступен для вставки", "info", 2500);
			}
		},
		[p.activeItems, p.onInsertToDiary],
	);

	return {
		isMemoCopied,
		handlePrint,
		handlePrintPatientMemo,
		handleCopyPatientMemo,
		handleInsertToDiary,
	};
}
