import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
	type ChestnyZnakScannedItem,
	calculateChestnyZnakSummary,
	createChestnyZnakScannedItem,
} from "@dental/shared";
import { showToast } from "../../GlobalToast";
import { submitMdlpBarcodeScan } from "../mdlpScanningPresets.js";
import {
	type MdlpScanMode,
	type MdlpScanningModalProps,
	isAcceptanceMode,
	isSpoilageMode,
} from "./types.js";
import { useMdlpXmlExport } from "./useMdlpXmlExport.js";
import { useMdlpDisposalActions } from "./useMdlpDisposalActions.js";

export function useMdlpModalState(props: MdlpScanningModalProps) {
	const {
		isOpen, initialMode = "warehouse_acceptance",
		subjectId = "00000000123456", shipperId = "00000000654321",
		patientId = null, visitId = null, doctorId = null, onDeferredDisposal,
	} = props;

	const scannerInputId = useId();
	const [mode, setMode] = useState<MdlpScanMode>(initialMode);
	const [barcodeInput, setBarcodeInput] = useState("");
	const [docNum, setDocNum] = useState(() => {
		if (isAcceptanceMode(initialMode)) return "УПД-2026-0891";
		if (isSpoilageMode(initialMode)) return "АКТ-СПИСАНИЕ-0042";
		return "АКТ-ВЫБЫТИЕ-0042";
	});
	const [docDate, setDocDate] = useState(() => new Date().toISOString().slice(0, 10));
	const [scannedItems, setScannedItems] = useState<readonly ChestnyZnakScannedItem[]>([]);
	const inputRef = useRef<HTMLInputElement>(null);

	const xml = useMdlpXmlExport(
		mode, docNum, docDate, subjectId, shipperId,
		patientId, visitId, doctorId, scannedItems,
	);
	const actions = useMdlpDisposalActions(
		isOpen, mode, docNum, docDate, patientId, visitId, doctorId,
		scannedItems, setScannedItems, onDeferredDisposal,
	);

	useEffect(() => {
		if (isOpen) inputRef.current?.focus();
	}, [isOpen, mode]);

	const handleModeSwitch = (newMode: MdlpScanMode) => {
		setMode(newMode);
		if (isAcceptanceMode(newMode)) setDocNum("УПД-2026-0891");
		else if (isSpoilageMode(newMode)) setDocNum("АКТ-СПИСАНИЕ-0042");
		else setDocNum("АКТ-ВЫБЫТИЕ-0042");
		xml.setGeneratedXml(null);
		xml.setXmlDocType(null);
	};

	const handleScanSubmit = async (e?: React.FormEvent) => {
		if (e) e.preventDefault();
		const raw = barcodeInput.trim();
		if (!raw) {
			showToast("Поднесите 2D-сканер или выберите медикамент из аварийной выдачи", "info");
			inputRef.current?.focus();
			return;
		}
		const newItem = createChestnyZnakScannedItem(raw, { costRub: 450 });
		setScannedItems((prev) => [newItem, ...prev]);
		setBarcodeInput("");
		xml.setGeneratedXml(null);
		const isVerified = newItem.status === "verified";
		actions.playBeep(isVerified);
		submitMdlpBarcodeScan(raw, true).catch(() => null);
		if (isVerified) showToast(`Отсканировано: ${newItem.tradeName}`, "success");
		else if (newItem.status === "warning") showToast(`Внимание: ${newItem.statusReason}`, "warning");
		else showToast(`Ошибка маркировки: ${newItem.statusReason}`, "error");
		inputRef.current?.focus();
	};

	const handleRemoveItem = (id: string) => {
		setScannedItems((prev) => prev.filter((it) => it.id !== id));
		xml.setGeneratedXml(null);
	};

	const handleClearAll = () => {
		setScannedItems([]);
		xml.setGeneratedXml(null);
		xml.setXmlDocType(null);
		showToast("Список сканирования очищен", "info");
	};

	const summary = useMemo(() => calculateChestnyZnakSummary(scannedItems), [scannedItems]);

	return {
		scannerInputId, mode, barcodeInput, setBarcodeInput, docNum, setDocNum,
		docDate, setDocDate, scannedItems, generatedXml: xml.generatedXml,
		xmlDocType: xml.xmlDocType, isCopied: xml.isCopied, crptStatus: actions.crptStatus,
		offlineQueue: actions.offlineQueue, showOfflineDrawer: actions.showOfflineDrawer,
		setShowOfflineDrawer: actions.setShowOfflineDrawer,
		showEmergencyScannerBypass: actions.showEmergencyScannerBypass,
		setShowEmergencyScannerBypass: actions.setShowEmergencyScannerBypass,
		inputRef, summary, handleModeSwitch,
		handleDeferredDisposal: actions.handleDeferredDisposal,
		handleQuickShiftCarpulesDisposal: actions.handleQuickShiftCarpulesDisposal,
		handleEmergencyDispense: actions.handleEmergencyDispense,
		handleSyncOfflineQueue: actions.handleSyncOfflineQueue,
		handleConfirmDisposal: actions.handleConfirmDisposal,
		handleScanSubmit, handleRemoveItem, handleClearAll,
		handleGenerateXml: xml.handleGenerateXml,
		handleCopyXml: xml.handleCopyXml,
		handleDownloadXml: xml.handleDownloadXml,
	};
}
