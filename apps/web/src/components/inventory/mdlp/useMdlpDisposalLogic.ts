import {
	MDLP_OPERATION_CODES,
	MDLP_OPERATION_CONFIGS,
	type Gs1DataMatrixParseResult,
	type MdlpCarpuleQueueItem,
	type MdlpOperationCode,
	type MdlpSchema10560Document,
	calculateQueueStats,
	cleanScannerBarcodeString,
	createCarpuleQueueItem,
	formatSeniorNurseDisposalActData,
	generateAuthenticDentalBarcode,
	generateMdlpSchema10560Payload,
	generateSeniorNurseDisposalActHtml,
	isGs1DataMatrixCandidate,
	parseGs1DataMatrixWithPku,
	processScannerInput,
	sortQueueByFefo,
	validateQueueForDisposal,
} from "@dental/shared";
import React, { useCallback, useMemo, useRef, useState } from "react";
import { showToast } from "../../GlobalToast.js";
import { executeSeniorNurseDisposalActInBackground } from "./SeniorNurseDisposalActModal.js";
import type { MdlpDisposalQueueModalProps } from "./MdlpDisposalQueueModal.js";

export function useMdlpDisposalLogic(props: MdlpDisposalQueueModalProps) {
	const {
		initialItems = [],
		organizationId = "00000000123456",
		organizationName = 'ООО "ДЕНТЕ КЛИНИК"',
		patientId,
		patientName = "Смирнов Алексей Викторович",
		visitId,
		doctorId,
		doctorName = "Д-р Кузнецов М.С.",
		cabinetId = "cab_01_therapy",
		onConfirmDisposal,
	} = props;

	const [barcodeInput, setBarcodeInput] = useState<string>("");
	const [items, setItems] = useState<MdlpCarpuleQueueItem[]>(() => [...initialItems]);
	const [lastScanned, setLastScanned] = useState<Gs1DataMatrixParseResult | null>(null);
	const [isDisposing, setIsDisposing] = useState<boolean>(false);
	const [successDoc, setSuccessDoc] = useState<MdlpSchema10560Document | null>(null);
	const [isActModalOpen, setIsActModalOpen] = useState<boolean>(false);

	const [operationCode, setOperationCode] = useState<MdlpOperationCode>(MDLP_OPERATION_CODES.DISPOSAL_MEDICAL_CARE);
	const [scannerAutoMode] = useState<boolean>(true);
	const scannerInputRef = useRef<HTMLInputElement | null>(null);

	const [docNum] = useState<string>(() => {
		const now = new Date();
		const seq = String((now.getTime() % 900) + 100);
		return `СХ-10560-${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}-${seq}`;
	});
	const [docDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
	const [reason, setReason] = useState<string>(
		() => MDLP_OPERATION_CONFIGS[MDLP_OPERATION_CODES.DISPOSAL_MEDICAL_CARE].titleRu,
	);

	const stats = useMemo(() => calculateQueueStats(items), [items]);
	const validation = useMemo(() => validateQueueForDisposal(items, false), [items]);

	const handleSelectOperationCode = useCallback((code: MdlpOperationCode) => {
		setOperationCode(code);
		setReason(MDLP_OPERATION_CONFIGS[code].titleRu);
	}, []);

	const handleAddBarcode = useCallback((rawCode: string) => {
		if (!rawCode || rawCode.trim().length === 0) {
			showToast("Введите или отсканируйте 2D DataMatrix код карпулы анестетика", "warning");
			return;
		}
		const cleaned = cleanScannerBarcodeString(rawCode);
		const parsed = parseGs1DataMatrixWithPku(cleaned);
		setLastScanned(parsed);
		if (!parsed.isValid) {
			showToast(parsed.errors[0] || "Некорректный формат кода маркировки DataMatrix Честный ЗНАК", "warning");
			return;
		}
		const defaultCost = parsed.recognizedDrug
			? parsed.recognizedDrug.vasoconstrictor === "1:100000" ? 450 : 420
			: parsed.pkuInfo?.standardPriceRub ?? 380;
		const newItem = createCarpuleQueueItem(cleaned, {
			costRub: defaultCost, patientId, patientName, visitId, doctorId, doctorName, cabinetId,
		});
		setItems((prev) => {
			if (newItem.sgtin && prev.some((p) => p.sgtin === newItem.sgtin)) {
				showToast(`Препарат с SGTIN ${newItem.sgtin} уже есть в очереди списания`, "info");
				return prev;
			}
			return [newItem, ...prev];
		});
		setBarcodeInput("");
		scannerInputRef.current?.focus();
	}, [patientId, patientName, visitId, doctorId, doctorName, cabinetId]);

	const handleScannerInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
		const value = e.target.value;
		setBarcodeInput(value);
		if (scannerAutoMode && isGs1DataMatrixCandidate(value)) {
			const scannerRes = processScannerInput(value);
			if (scannerRes.isCompleteBarcode && scannerRes.parsed.isValid) {
				handleAddBarcode(scannerRes.cleanedInput);
				showToast(`2D-сканер: ${scannerRes.parsed.recognizedDrug?.tradeName ?? scannerRes.parsed.gtin} добавлен в очередь`, "info");
			}
		}
	}, [scannerAutoMode, handleAddBarcode]);

	const handleScannerPaste = useCallback((e: React.ClipboardEvent<HTMLInputElement>) => {
		const pasted = e.clipboardData.getData("text");
		if (isGs1DataMatrixCandidate(pasted)) {
			e.preventDefault();
			const scannerRes = processScannerInput(pasted);
			if (scannerRes.parsed.isValid) {
				handleAddBarcode(scannerRes.cleanedInput);
				showToast(`Штрихкод из буфера: ${scannerRes.parsed.recognizedDrug?.tradeName ?? scannerRes.parsed.gtin} добавлен`, "info");
			} else {
				setBarcodeInput(pasted);
			}
		}
	}, [handleAddBarcode]);

	const handleBarcodeInputKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter" || e.key === "Tab") {
			e.preventDefault();
			handleAddBarcode(barcodeInput);
		}
	}, [barcodeInput, handleAddBarcode]);

	const handleRemoveItem = useCallback((id: string) => {
		setItems((prev) => prev.filter((it) => it.id !== id));
	}, []);

	const handleSortFefo = useCallback(() => {
		setItems((prev) => sortQueueByFefo(prev));
	}, []);

	const handleClearQueue = useCallback(() => {
		setItems([]);
		setLastScanned(null);
		setSuccessDoc(null);
	}, []);

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
	}, [patientId, patientName, visitId, doctorId, doctorName, cabinetId]);

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
	}, [patientId, patientName, visitId, doctorId, doctorName, cabinetId]);

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

	const handleOpenActModal = useCallback(() => {
		if (items.length === 0) {
			showToast("Очередь списания пуста", "info");
			return;
		}
		setIsActModalOpen(true);
	}, [items.length]);

	const handleConfirmDisposal = async () => {
		if (items.length === 0) {
			showToast("Очередь списания пуста", "warning");
			return;
		}
		if (!validation.isValid) {
			showToast(validation.errors[0] || "Проверьте корректность кодов маркировки", "warning");
			return;
		}
		setIsDisposing(true);
		try {
			const opConfig = MDLP_OPERATION_CONFIGS[operationCode];
			const schemaDoc = generateMdlpSchema10560Payload({
				subjectId: organizationId, docNum, docDate, withdrawalType: opConfig.schema10560WithdrawalType,
				patientId: patientId ?? null, visitId: visitId ?? null, doctorId: doctorId ?? null,
				items: items.map((it) => ({
					sgtin: it.sgtin, gtin: it.gtin, serialNumber: it.serialNumber, series: it.series, lot: it.series,
					expirationDate: it.expirationDate, costRub: it.costRub, tradeName: it.drugInfo?.tradeName, inn: it.drugInfo?.inn,
				})),
				notes: reason,
			});
			try {
				const res = await fetch("/api/mdlp/dispose-batch", {
					method: "POST", headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						docNum, docDate, reason, patientId: patientId ?? null, visitId: visitId ?? null, doctorId: doctorId ?? null,
						items: items.map((it) => ({
							sgtin: it.sgtin, gtin: it.gtin, serialNumber: it.serialNumber, series: it.series, lot: it.series,
							costRub: it.costRub, tradeName: it.drugInfo?.tradeName, inn: it.drugInfo?.inn, reason,
						})),
					}),
				});
				if (!res.ok) throw new Error(`HTTP ${res.status}`);
				showToast(`Списание по Схеме 10560 успешно зарегистрировано в МДЛП (${items.length} поз.)`, "info");
			} catch {
				showToast(`Сформирован официальный XML документ Схемы 10560 для МДЛП (${items.length} поз.)`, "info");
			}
			setSuccessDoc(schemaDoc);
			try {
				await executeSeniorNurseDisposalActInBackground({
					items, organizationName, approverName: doctorName, approverRole: "doctor", notes: `Фоновое списание (${docNum})`,
				});
			} catch {}
			if (onConfirmDisposal) await onConfirmDisposal(schemaDoc, items);
		} catch (err) {
			showToast(`Ошибка формирования документа МДЛП: ${err instanceof Error ? err.message : String(err)}`, "error");
		} finally {
			setIsDisposing(false);
		}
	};

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
		items, lastScanned, isDisposing, successDoc, isActModalOpen, setIsActModalOpen,
		operationCode, scannerInputRef, barcodeInput, stats, validation,
		handleSelectOperationCode, handleScannerInputChange, handleScannerPaste, handleBarcodeInputKeyDown,
		handleRemoveItem, handleSortFefo, handleClearQueue, handleAddCarpuleBatch, handleQuickNurseCarpulesDisposal,
		handleDirectPrintAct, handleOpenActModal, handleConfirmDisposal, handleDownloadXml,
	};
}
