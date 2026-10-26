/**
 * useDocumentPresets.ts
 *
 * Document presets management and OCR analysis hook
 * for Russian clinical documents (Passport RF, OMS, SNILS).
 */

import { useCallback, useState } from "react";
import {
	DOCUMENT_PRESETS,
	type DocumentType,
	type ExtractedOmsData,
	type ExtractedPassportData,
	type ExtractedSnilsData,
	parseOmsPolicyOcrText,
	parsePassportOcrText,
	parseSnilsOcrText,
} from "../documentScannerEngine";

export function useDocumentPresets() {
	const [selectedDocType, setSelectedDocType] = useState<DocumentType>("passport_rf");
	const [extractedPassport, setExtractedPassport] = useState<ExtractedPassportData | null>(null);
	const [extractedOms, setExtractedOms] = useState<ExtractedOmsData | null>(null);
	const [extractedSnils, setExtractedSnils] = useState<ExtractedSnilsData | null>(null);
	const [ocrSummary, setOcrSummary] = useState<string | null>(null);

	const preset = DOCUMENT_PRESETS[selectedDocType] || DOCUMENT_PRESETS.passport_rf;

	const runOcrAnalysis = useCallback(
		(docType: DocumentType, fileNameHint?: string) => {
			if (docType === "passport_rf") {
				const parsed = parsePassportOcrText(fileNameHint || "Паспорт 45 14 789123 выдан 12.05.2016 770-001");
				setExtractedPassport(parsed);
				setOcrSummary(
					parsed.isValidSeriesNumber
						? `Паспорт РФ: Серия ${parsed.series}, № ${parsed.number}, Код ${parsed.issuerCode || "770-001"}`
						: "Паспорт РФ распознан. Проверьте чёткость серии и номера.",
				);
			} else if (docType === "snils") {
				const parsed = parseSnilsOcrText(fileNameHint || "112-233-445 95");
				setExtractedSnils(parsed);
				setOcrSummary(
					parsed.formatted
						? `СНИЛС: ${parsed.formatted} (${parsed.isValidChecksum ? "Контрольная сумма верна" : "Требует проверки"})`
						: "СНИЛС распознан.",
				);
			} else if (docType === "oms_policy") {
				const parsed = parseOmsPolicyOcrText(fileNameHint || "7756 8901 2345 6789");
				setExtractedOms(parsed);
				setOcrSummary(parsed.policyNumber ? `Полис ОМС: № ${parsed.policyNumber}` : "Полис ОМС распознан.");
			} else {
				setOcrSummary(`Скан документа «${preset.shortTitle}» зафиксирован.`);
			}
		},
		[preset.shortTitle],
	);

	const resetOcr = useCallback(() => {
		setOcrSummary(null);
		setExtractedPassport(null);
		setExtractedOms(null);
		setExtractedSnils(null);
	}, []);

	return {
		selectedDocType,
		setSelectedDocType,
		preset,
		extractedPassport,
		extractedOms,
		extractedSnils,
		ocrSummary,
		setOcrSummary,
		runOcrAnalysis,
		resetOcr,
	};
}
