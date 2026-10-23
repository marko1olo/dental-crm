import { useState } from "react";
import {
	type ChestnyZnakScannedItem,
	generateMdlpSchema444Payload,
	generateMdlpSchema531Payload,
	generateMdlpSchema701Payload,
} from "@dental/shared";
import { showToast } from "../../GlobalToast";
import { type MdlpScanMode, isAcceptanceMode, isSpoilageMode } from "./types.js";

export function useMdlpXmlExport(
	mode: MdlpScanMode, docNum: string, docDate: string,
	subjectId: string, shipperId: string,
	patientId: string | null | undefined,
	visitId: string | null | undefined,
	doctorId: string | null | undefined,
	scannedItems: readonly ChestnyZnakScannedItem[],
) {
	const [generatedXml, setGeneratedXml] = useState<string | null>(null);
	const [xmlDocType, setXmlDocType] = useState<string | null>(null);
	const [isCopied, setIsCopied] = useState(false);

	const mapItems = (items: readonly ChestnyZnakScannedItem[]) =>
		items.map((it) => ({
			sgtin: it.sgtin || it.rawBarcode,
			gtin: it.gtin, serialNumber: it.serialNumber, costRub: it.costRub,
			vatValueRub: it.costRub ? Math.round(it.costRub * (it.vatRate / 100) * 100) / 100 : 0,
		}));

	const handleGenerateXml = () => {
		if (scannedItems.length === 0) {
			showToast("Нет отсканированных упаковок для формирования документа", "warning");
			return;
		}
		try {
			if (isAcceptanceMode(mode)) {
				const doc = generateMdlpSchema701Payload({ subjectId, shipperId, docNum, docDate, receivingType: 1, items: mapItems(scannedItems) });
				setGeneratedXml(doc.xmlContent); setXmlDocType("701");
				showToast("Сформирован XML для приёмки на склад", "success");
			} else if (isSpoilageMode(mode)) {
				const doc = generateMdlpSchema444Payload({ subjectId, docNum, docDate, patientId, cardNumber: "Медицинская карта приёма", visitId, doctorId, items: mapItems(scannedItems) });
				setGeneratedXml(doc.xmlContent); setXmlDocType("444");
				showToast("Сформирован XML списания по акту", "success");
			} else {
				const doc = generateMdlpSchema531Payload({ subjectId, docNum, docDate, withdrawalType: 13, patientId, visitId, doctorId, items: mapItems(scannedItems) });
				setGeneratedXml(doc.xmlContent); setXmlDocType("531");
				showToast("Сформирован XML списания при оказании медпомощи", "success");
			}
		} catch (err: unknown) {
			showToast(err instanceof Error ? err.message : "Ошибка формирования XML", "error");
		}
	};

	const handleCopyXml = async () => {
		if (!generatedXml) return;
		try {
			await navigator.clipboard.writeText(generatedXml);
			setIsCopied(true);
			showToast("XML скопирован в буфер обмена", "success");
			setTimeout(() => setIsCopied(false), 2000);
		} catch {
			showToast("Не удалось скопировать XML", "error");
		}
	};

	const handleDownloadXml = () => {
		if (!generatedXml) return;
		const filename = `mdlp_export_${xmlDocType || "doc"}_${docNum.replace(/[^a-zA-Z0-9_-]/g, "_")}.xml`;
		const blob = new Blob([generatedXml], { type: "application/xml;charset=utf-8" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url; a.download = filename; a.click();
		URL.revokeObjectURL(url);
		showToast(`Файл ${filename} сохранен`, "success");
	};

	return { generatedXml, setGeneratedXml, xmlDocType, setXmlDocType, isCopied, handleGenerateXml, handleCopyXml, handleDownloadXml };
}
