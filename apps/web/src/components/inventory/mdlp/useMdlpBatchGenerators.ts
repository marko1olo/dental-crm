import React, { useCallback } from "react";
import { showToast } from "../../GlobalToast.js";
import {
	createCarpuleQueueItem,
	formatSeniorNurseDisposalActData,
	generateAuthenticDentalBarcode,
	generateSeniorNurseDisposalActHtml,
	MDLP_OPERATION_CODES,
	type MdlpCarpuleQueueItem,
	type MdlpOperationCode,
	type MdlpSchema10560Document,
} from "@dental/shared";

export function useMdlpBatchGenerators({
	patientId,
	patientName,
	visitId,
	doctorId,
	doctorName,
	cabinetId,
	docNum,
	docDate,
	organizationName,
	items,
	successDoc,
	setItems,
	setOperationCode,
	setReason,
}: {
	patientId?: string | undefined;
	patientName: string;
	visitId?: string | undefined;
	doctorId?: string | undefined;
	doctorName: string;
	cabinetId: string;
	docNum: string;
	docDate: string;
	organizationName: string;
	items: readonly MdlpCarpuleQueueItem[];
	successDoc: MdlpSchema10560Document | null;
	setItems: React.Dispatch<React.SetStateAction<MdlpCarpuleQueueItem[]>>;
	setOperationCode: (code: MdlpOperationCode) => void;
	setReason: (reason: string) => void;
}) {
	const handleAddCarpuleBatch = useCallback((
		drugType: "articaine_1_100000" | "articaine_1_200000" | "mepivacaine_plain",
		count: number,
		nameRu: string,
	) => {
		const newBatch: MdlpCarpuleQueueItem[] = [];
		const cost = drugType === "articaine_1_100000" ? 450 : drugType === "articaine_1_200000" ? 430 : 380;
		const series = drugType.startsWith("articaine") ? "LOT-ART2026" : "LOT-SCAN2026";
		const exp = drugType.startsWith("articaine") ? "280531" : "271130";
		for (let i = 0; i < count; i++) {
			const raw = generateAuthenticDentalBarcode(drugType, { packaging: "carpule", series, expirationDate: exp });
			newBatch.push(createCarpuleQueueItem(raw, { costRub: cost, patientId, patientName, visitId, doctorId, doctorName, cabinetId }));
		}
		setItems((prev) => [...newBatch, ...prev]);
		showToast(`Добавлен пакет: ${nameRu} (${count} шт.)`, "info");
	}, [patientId, patientName, visitId, doctorId, doctorName, cabinetId, setItems]);

	const handleQuickNurseCarpulesDisposal = useCallback(() => {
		const quickItems: MdlpCarpuleQueueItem[] = [];
		for (let i = 1; i <= 10; i++) {
			const raw = generateAuthenticDentalBarcode("articaine_1_100000", { packaging: "carpule", series: "LOT-ART2026", expirationDate: "280531" });
			quickItems.push(createCarpuleQueueItem(raw, { costRub: 450, patientId, patientName, visitId, doctorId, doctorName, cabinetId }));
		}
		for (let i = 1; i <= 2; i++) {
			const raw = generateAuthenticDentalBarcode("mepivacaine_plain", { packaging: "carpule", series: "LOT-SCAN2026", expirationDate: "271130" });
			quickItems.push(createCarpuleQueueItem(raw, { costRub: 380, patientId, patientName, visitId, doctorId, doctorName, cabinetId }));
		}
		setItems((prev) => [...quickItems, ...prev]);
		setOperationCode(MDLP_OPERATION_CODES.DISPOSAL_MEDICAL_CARE);
		setReason("Оказание медицинской помощи — пустые карпулы смены по СанПиН 3.3686-21 (код 332)");
		showToast("Списаны все использованные карпулы смены (10 шт. Артикаин + 2 шт. Скандонест)", "info");
	}, [patientId, patientName, visitId, doctorId, doctorName, cabinetId, setItems, setOperationCode, setReason]);

	const handleDirectPrintAct = useCallback(() => {
		if (items.length === 0) {
			showToast("Очередь списания пуста", "info");
			return;
		}
		const actData = formatSeniorNurseDisposalActData({
			actNumber: docNum.replace("СХ-10560", "СПИС"), actDate: docDate, organizationName, approverRole: "doctor",
			approverName: doctorName, approvedByFullName: doctorName, approvedByPositionRu: "Врач-стоматолог (дежурный)",
			paperJournalAcknowledged: true, isSingleSigner: true, items,
		});
		const actHtml = generateSeniorNurseDisposalActHtml(actData);
		const printWin = window.open("", "_blank");
		if (printWin) {
			printWin.document.write(actHtml);
			printWin.document.close();
			printWin.focus();
			setTimeout(() => printWin.print(), 250);
		}
	}, [items, docNum, docDate, organizationName, doctorName]);

	const handleDownloadXml = () => {
		if (!successDoc) return;
		const blob = new Blob([successDoc.xmlContent], { type: "application/xml;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = `schema_10560_${successDoc.docNum}.xml`;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	};

	return {
		handleAddCarpuleBatch,
		handleQuickNurseCarpulesDisposal,
		handleDirectPrintAct,
		handleDownloadXml,
	};
}
