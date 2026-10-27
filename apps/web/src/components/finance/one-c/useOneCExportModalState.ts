import { useMemo, useState } from "react";
import { generateOneCEnterpriseXml, type OneCDocumentType } from "@dental/shared";
import { showToast } from "../../GlobalToast";
import type { OneCExportItem } from "../OneCExportButton";
import { formatMoney, triggerXmlDownload } from "./types";
import { buildOneCExportParams } from "./buildOneCExportParams";

export interface UseOneCExportModalStateParams {
	readonly items: readonly OneCExportItem[];
	readonly patientId: string;
	readonly patientName: string;
	readonly patientPhone: string;
	readonly patientAddress: string;
	readonly clinicName: string;
	readonly clinicInn: string;
	readonly clinicKpp: string;
	readonly contractNumber: string;
	readonly contractDate?: string | undefined;
	readonly initialActNumber?: string | undefined;
	readonly initialDoctorName: string;
	readonly initialTotalRub?: number | undefined;
}

export function useOneCExportModalState(p: UseOneCExportModalStateParams) {
	const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);
	const [docType, setDocType] = useState<OneCDocumentType>("act");
	const [docDate, setDocDate] = useState<string>(todayIso);
	const [actNumber, setActNumber] = useState<string>(
		p.initialActNumber || `АКТ-${todayIso.replace(/-/g, "")}-001`,
	);
	const [selectedContract, setSelectedContract] = useState<string>(p.contractNumber);
	const [selectedContractDate, setSelectedContractDate] = useState<string>(p.contractDate || todayIso);
	const [customDoctorName, setCustomDoctorName] = useState<string>(p.initialDoctorName);
	const [activeSubTab, setActiveSubTab] = useState<"items" | "xml" | "requisites">("items");
	const [isXmlCopied, setIsXmlCopied] = useState(false);
	const [isEditingRequisites, setIsEditingRequisites] = useState(false);

	const calculatedTotalRub = useMemo(() => {
		if (p.items && p.items.length > 0) {
			const totalKop = p.items.reduce((sum, it) => {
				const qty = it.quantity && it.quantity > 0 ? it.quantity : 1;
				const unitPriceKop = Math.round(it.priceRub * 100);
				const discKop = Math.round((it.discountRub || 0) * 100);
				return sum + Math.max(0, unitPriceKop * qty - discKop);
			}, 0);
			return totalKop / 100;
		}
		if (typeof p.initialTotalRub === "number" && p.initialTotalRub > 0) {
			return Math.round(p.initialTotalRub * 100) / 100;
		}
		return 0;
	}, [p.items, p.initialTotalRub]);

	const generatedXml = useMemo(() => {
		try {
			const exportParams = buildOneCExportParams({
				actNumber, docDate, docType, clinicName: p.clinicName, clinicInn: p.clinicInn,
				clinicKpp: p.clinicKpp, patientId: p.patientId, patientName: p.patientName,
				patientPhone: p.patientPhone, patientAddress: p.patientAddress, items: p.items,
				calculatedTotalRub, selectedContract, selectedContractDate, customDoctorName,
			});
			return generateOneCEnterpriseXml(exportParams);
		} catch (err) {
			return `<!-- Ошибка формирования XML: ${err instanceof Error ? err.message : String(err)} -->`;
		}
	}, [actNumber, calculatedTotalRub, p, customDoctorName, docDate, docType, selectedContract, selectedContractDate]);

	const handleCopyXml = () => {
		if (typeof navigator !== "undefined" && navigator.clipboard) {
			void navigator.clipboard.writeText(generatedXml);
			setIsXmlCopied(true);
			showToast("XML-документ CommerceML 2.09 скопирован в буфер", "success", 2500);
			setTimeout(() => setIsXmlCopied(false), 3000);
		}
	};

	const handleCopyAccountantSummary = () => {
		const docName = docType === "act" ? "Акт выполненных работ" : "Счет / Заказ";
		const summaryText = `ВЫГРУЗКА В 1С:ПРЕДПРИЯТИЕ 8.3\nДокумент: ${docName} № ${actNumber} от ${docDate}\nКлиника: ${p.clinicName} (ИНН ${p.clinicInn} / КПП ${p.clinicKpp})\nПациент: ${p.patientName} (Договор ${selectedContract} от ${selectedContractDate})\nВрач: ${customDoctorName}\nПозиций: ${p.items.length}\nИтого: ${formatMoney(calculatedTotalRub)} (Без НДС - пп. 2 п. 2 ст. 149 НК РФ)`;
		if (typeof navigator !== "undefined" && navigator.clipboard) {
			void navigator.clipboard.writeText(summaryText);
			showToast("Сводка для бухгалтерии скопирована в буфер", "success", 2500);
		}
	};

	const handleDownloadXml = () => {
		if (!generatedXml || generatedXml.startsWith("<!-- Ошибка")) {
			showToast("Ошибка в структуре XML для 1С", "error");
			return;
		}
		const filename = `1C_Export_${actNumber.replace(/[^a-zA-Z0-9_-]/g, "_")}_${docDate}.xml`;
		triggerXmlDownload(generatedXml, filename);
		showToast(`Файл выгрузки 1С:Предприятие (${filename}) успешно сформирован и скачан!`, "success", 5000);
	};

	return {
		todayIso, docType, setDocType, docDate, setDocDate, actNumber, setActNumber,
		selectedContract, setSelectedContract, selectedContractDate, setSelectedContractDate,
		customDoctorName, setCustomDoctorName, activeSubTab, setActiveSubTab,
		isXmlCopied, isEditingRequisites, setIsEditingRequisites, calculatedTotalRub,
		generatedXml, handleCopyXml, handleCopyAccountantSummary, handleDownloadXml,
	};
}
