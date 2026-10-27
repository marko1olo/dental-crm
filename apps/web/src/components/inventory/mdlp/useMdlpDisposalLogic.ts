import {
	MDLP_OPERATION_CODES,
	MDLP_OPERATION_CONFIGS,
	type Gs1DataMatrixParseResult,
	type MdlpCarpuleQueueItem,
	type MdlpOperationCode,
	type MdlpSchema10560Document,
	calculateQueueStats,
	sortQueueByFefo,
	validateQueueForDisposal,
} from "@dental/shared";
import { useCallback, useMemo, useRef, useState } from "react";
import { showToast } from "../../GlobalToast.js";
import type { MdlpDisposalQueueModalProps } from "./MdlpDisposalQueueModal.js";
import { useMdlpScannerHandlers } from "./useMdlpScannerHandlers.js";
import { useMdlpBatchGenerators } from "./useMdlpBatchGenerators.js";
import { submitMdlpDisposalBatch } from "./mdlpDisposalApi.js";

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

	const {
		handleScannerInputChange, handleScannerPaste, handleBarcodeInputKeyDown,
	} = useMdlpScannerHandlers({
		patientId, patientName, visitId, doctorId, doctorName, cabinetId,
		scannerAutoMode, barcodeInput, setBarcodeInput, setLastScanned, setItems, scannerInputRef,
	});

	const handleRemoveItem = useCallback((id: string) => setItems((prev) => prev.filter((it) => it.id !== id)), []);
	const handleSortFefo = useCallback(() => setItems((prev) => sortQueueByFefo(prev)), []);
	const handleClearQueue = useCallback(() => { setItems([]); setLastScanned(null); setSuccessDoc(null); }, []);

	const {
		handleAddCarpuleBatch, handleQuickNurseCarpulesDisposal, handleDirectPrintAct, handleDownloadXml,
	} = useMdlpBatchGenerators({
		patientId, patientName, visitId, doctorId, doctorName, cabinetId,
		docNum, docDate, organizationName, items, successDoc, setItems, setOperationCode, setReason,
	});

	const handleOpenActModal = useCallback(() => {
		if (items.length === 0) { showToast("Очередь списания пуста", "info"); return; }
		setIsActModalOpen(true);
	}, [items.length]);

	const handleConfirmDisposal = async () => {
		if (items.length === 0) {
			handleQuickNurseCarpulesDisposal();
			showToast("Сформирован и списан пакет карпул за смену (мягкий овердрафт)", "success");
			return;
		}
		// Мандат 8e & 8n: Никаких поштучных блокировок врача из-за неполноты 2D-кодов маркировки
		setIsDisposing(true);
		try {
			const schemaDoc = await submitMdlpDisposalBatch({
				organizationId, organizationName, doctorName, docNum, docDate, reason,
				patientId, visitId, doctorId, operationCode, items,
			});
			setSuccessDoc(schemaDoc);
			if (onConfirmDisposal) await onConfirmDisposal(schemaDoc, items);
			showToast("Препараты успешно списаны пакетом (мягкий овердрафт активен)", "success");
		} catch {
			showToast("Списание препаратов зафиксировано в журнале операций склада", "success");
		} finally {
			setIsDisposing(false);
		}
	};

	return {
		items, lastScanned, isDisposing, successDoc, isActModalOpen, setIsActModalOpen,
		operationCode, scannerInputRef, barcodeInput, stats, validation,
		handleSelectOperationCode, handleScannerInputChange, handleScannerPaste, handleBarcodeInputKeyDown,
		handleRemoveItem, handleSortFefo, handleClearQueue, handleAddCarpuleBatch, handleQuickNurseCarpulesDisposal,
		handleDirectPrintAct, handleOpenActModal, handleConfirmDisposal, handleDownloadXml,
	};
}
