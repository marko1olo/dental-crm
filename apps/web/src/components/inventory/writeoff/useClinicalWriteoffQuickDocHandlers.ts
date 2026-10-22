import { useCallback } from "react";
import { showToast } from "../../GlobalToast.js";
import {
	type ClinicalWriteoffLine,
	createQuickAnesthesiaPackageWriteoffDocument,
	createQuickCarpuleWriteoffDocument,
	createQuickVisitWriteoffDocument,
} from "./clinicalWriteoffEngine.js";
import type { CabinetStockBatch } from "./clinicalWriteoffPresets.js";

export function useClinicalWriteoffQuickDocHandlers({
	selectedCabinetId,
	stockBatches,
	doctorFullName,
	doctorSpecialty,
	patientName,
	setLines,
	setActNumber,
	setNotes,
	setIsSingleSigner,
}: {
	selectedCabinetId: string;
	stockBatches: readonly CabinetStockBatch[];
	doctorFullName: string;
	doctorSpecialty: string;
	patientName: string;
	setLines: (lines: ClinicalWriteoffLine[]) => void;
	setActNumber: (actNumber: string) => void;
	setNotes: (notes: string) => void;
	setIsSingleSigner: (isSingle: boolean) => void;
}) {
	const handleQuickCarpuleWriteoff = useCallback(() => {
		const doc = createQuickCarpuleWriteoffDocument({
			count: 2,
			cabinetId: selectedCabinetId,
			cabinetNameRu: selectedCabinetId === "cab_02_surgery" ? "Кабинет №2 (Хирургия)" : "Кабинет №1 (Терапия)",
			stockBatches,
			doctorFullName,
			doctorSpecialty,
			patientName,
		});
		setLines([...doc.lines]);
		setActNumber(doc.actNumber);
		if (doc.notes) setNotes(doc.notes);
		setIsSingleSigner(true);
		showToast("2 карпулы анестетика добавлены в акт списания!", "success");
	}, [selectedCabinetId, stockBatches, doctorFullName, doctorSpecialty, patientName, setLines, setActNumber, setNotes, setIsSingleSigner]);

	const handleQuickAnesthesiaPackageWriteoff = useCallback(() => {
		const doc = createQuickAnesthesiaPackageWriteoffDocument({
			cabinetId: selectedCabinetId,
			cabinetNameRu: selectedCabinetId === "cab_02_surgery" ? "Кабинет №2 (Хирургия)" : "Кабинет №1 (Терапия)",
			stockBatches,
			doctorFullName,
			doctorSpecialty,
			patientName,
		});
		setLines([...doc.lines]);
		setActNumber(doc.actNumber);
		if (doc.notes) setNotes(doc.notes);
		setIsSingleSigner(true);
		showToast("Стандартный пакет анестезии добавлен в акт списания!", "success");
	}, [selectedCabinetId, stockBatches, doctorFullName, doctorSpecialty, patientName, setLines, setActNumber, setNotes, setIsSingleSigner]);

	const handleQuickTherapyWriteoff = useCallback(() => {
		const doc = createQuickVisitWriteoffDocument({
			visitType: "therapy",
			cabinetId: selectedCabinetId,
			cabinetNameRu: selectedCabinetId === "cab_02_surgery" ? "Кабинет №2 (Хирургия)" : "Кабинет №1 (Терапия)",
			stockBatches,
			doctorFullName,
			doctorSpecialty,
			patientName,
		});
		setLines([...doc.lines]);
		setActNumber(doc.actNumber);
		if (doc.notes) setNotes(doc.notes);
		setIsSingleSigner(true);
		showToast("Акт списания материалов терапии сформирован!", "success");
	}, [selectedCabinetId, stockBatches, doctorFullName, doctorSpecialty, patientName, setLines, setActNumber, setNotes, setIsSingleSigner]);

	const handleQuickSurgeryWriteoff = useCallback(() => {
		const doc = createQuickVisitWriteoffDocument({
			visitType: "surgery",
			cabinetId: selectedCabinetId,
			cabinetNameRu: selectedCabinetId === "cab_02_surgery" ? "Кабинет №2 (Хирургия)" : "Кабинет №1 (Терапия)",
			stockBatches,
			doctorFullName,
			doctorSpecialty,
			patientName,
		});
		setLines([...doc.lines]);
		setActNumber(doc.actNumber);
		if (doc.notes) setNotes(doc.notes);
		setIsSingleSigner(true);
		showToast("Акт списания материалов хирургии сформирован!", "success");
	}, [selectedCabinetId, stockBatches, doctorFullName, doctorSpecialty, patientName, setLines, setActNumber, setNotes, setIsSingleSigner]);

	return {
		handleQuickCarpuleWriteoff,
		handleQuickAnesthesiaPackageWriteoff,
		handleQuickTherapyWriteoff,
		handleQuickSurgeryWriteoff,
	};
}
