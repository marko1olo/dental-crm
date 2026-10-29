import { useCallback, useEffect, useMemo, useState } from "react";
import { showToast } from "../../GlobalToast.js";
import {
	type ClinicalWriteoffDocument,
	type ClinicalWriteoffLine,
	aggregateWriteoffFromServices,
	calculateClinicalWriteoffTotals,
	updateLineActualQuantity,
	validateWriteoffDocument,
} from "./clinicalWriteoffEngine.js";
import {
	DEFAULT_CLINIC_LEGAL_INFO,
	DENTAL_CABINET_STOCK_PRESETS,
	type DiscrepancyReasonCode,
} from "./clinicalWriteoffPresets.js";
import { isDemoShowcaseMode } from "../../../lib/demoMode.js";
import type { ClinicalWriteoffModalProps } from "./ClinicalWriteoffModal.js";
import { useClinicalWriteoffExportHandlers } from "./useClinicalWriteoffExportHandlers.js";
import { useClinicalWriteoffQuickDocHandlers } from "./useClinicalWriteoffQuickDocHandlers.js";
import {
	DEFAULT_CLINICAL_SERVICES,
	useClinicalWriteoffServices,
} from "./useClinicalWriteoffServices.js";

export { DEFAULT_CLINICAL_SERVICES };

export function useClinicalWriteoffLogic(props: ClinicalWriteoffModalProps) {
	const {
		isOpen, onClose, onConfirmWriteoff, initialServices, patientName: propPatientName, patientId: propPatientId,
		patientBirthDate = "1988-04-12", doctorFullName: propDoctorFullName, doctorSpecialty = "Врач-стоматолог терапевт",
		assistantFullName = "Смирнова А.В. (ассистент)", cabinetId = "cab_01_therapy",
		stockBatches: propStockBatches, defaultFormType = "0504230",
	} = props;

	const isDemo = isDemoShowcaseMode();
	const patientName = propPatientName ?? (isDemo ? "Смирнов Алексей Викторович" : "Пациент");
	const patientId = propPatientId ?? (isDemo ? "PAT-2026-0881" : "");
	const doctorFullName = propDoctorFullName ?? (isDemo ? "Д-р Кузнецов М.С." : "Лечащий врач");
	const stockBatches = (propStockBatches ?? (isDemo ? DENTAL_CABINET_STOCK_PRESETS : [])) as any;
	const services = useClinicalWriteoffServices(initialServices as any);

	const [actNumber, setActNumber] = useState<string>(
		() => `АКТ-СПИС-${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(Date.now()).slice(-4)}`,
	);
	const [actDate, setActDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
	const [selectedCabinetId, setSelectedCabinetId] = useState<string>(cabinetId);
	const [statutoryFormType] = useState<"0504230" | "M11" | "TORG16">((defaultFormType as any) || "0504230");
	const [notes, setNotes] = useState<string>("");
	const [isSingleSigner, setIsSingleSigner] = useState<boolean>(true);

	const [lines, setLines] = useState<ClinicalWriteoffLine[]>(() =>
		isOpen && services.length > 0 ? aggregateWriteoffFromServices(services, stockBatches, selectedCabinetId, actDate) : []
	);

	useEffect(() => {
		if (isOpen) setLines(aggregateWriteoffFromServices(services, stockBatches, selectedCabinetId, actDate));
	}, [isOpen, services, stockBatches, selectedCabinetId, actDate]);

	const totals = useMemo(() => calculateClinicalWriteoffTotals(lines), [lines]);
	const validation = useMemo(
		() => validateWriteoffDocument({ lines, actNumber, actDate, doctorFullName, patientName }),
		[lines, actNumber, actDate, doctorFullName, patientName],
	);

	const handleQuantityChange = useCallback((lineId: string, newQty: number) => {
		setLines((prev) => prev.map((l) => (l.id === lineId ? updateLineActualQuantity(l, newQty) : l)));
	}, []);
	const handleReasonChange = useCallback((lineId: string, reasonCode: DiscrepancyReasonCode) => {
		setLines((prev) => prev.map((l) => (l.id === lineId ? { ...l, discrepancyReasonCode: reasonCode } : l)));
	}, []);
	const handleSerialNumberChange = useCallback((lineId: string, serial: string) => {
		setLines((prev) => prev.map((l) => (l.id === lineId ? { ...l, serialNumber: serial } : l)));
	}, []);
	const handleResetToNorm = useCallback((lineId: string) => {
		setLines((prev) => prev.map((l) => (l.id === lineId ? updateLineActualQuantity(l, l.standardQuantity) : l)));
	}, []);
	const handleRemoveLine = useCallback((lineId: string) => setLines((prev) => prev.filter((l) => l.id !== lineId)), []);

	const {
		handleQuickCarpuleWriteoff, handleQuickAnesthesiaPackageWriteoff,
		handleQuickTherapyWriteoff, handleQuickSurgeryWriteoff,
	} = useClinicalWriteoffQuickDocHandlers({
		selectedCabinetId, stockBatches, doctorFullName, doctorSpecialty, patientName,
		setLines, setActNumber, setNotes, setIsSingleSigner,
	});

	const currentDocument = useMemo<ClinicalWriteoffDocument>(() => ({
		id: `doc_writeoff_${Date.now()}`, actNumber, actDate, patientId, patientName, patientBirthDate,
		doctorFullName, doctorSpecialty, assistantFullName, cabinetId: selectedCabinetId,
		cabinetNameRu: selectedCabinetId === "cab_02_surgery" ? "Кабинет №2 (Хирургия)" : "Кабинет №1 (Терапия)",
		completedServices: services, lines, totals, statutoryFormType, status: "confirmed",
		notes: notes.trim() || undefined, confirmedAt: new Date().toISOString(), clinicInfo: DEFAULT_CLINIC_LEGAL_INFO, isSingleSigner,
	}), [
		actNumber, actDate, patientId, patientName, patientBirthDate, doctorFullName, doctorSpecialty,
		assistantFullName, selectedCabinetId, services, lines, totals, statutoryFormType, notes, isSingleSigner,
	]);

	const handleConfirm = async () => {
		if (!validation.isValid) {
			showToast(validation.errors[0] ?? "Заполните обязательные поля акта списания", "warning");
			return;
		}
		if (onConfirmWriteoff) await onConfirmWriteoff(currentDocument);
		onClose();
	};

	const { handleGenerateSupplierOrder, handlePrintAct, handleExportCsv } =
		useClinicalWriteoffExportHandlers(currentDocument, lines, actNumber);

	return {
		patientName, patientId, doctorFullName, doctorSpecialty, selectedCabinetId, setSelectedCabinetId,
		actNumber, setActNumber, actDate, setActDate, services, lines, totals, validation,
		handleQuantityChange, handleReasonChange, handleSerialNumberChange, handleResetToNorm, handleRemoveLine,
		handleQuickCarpuleWriteoff, handleQuickAnesthesiaPackageWriteoff, handleQuickTherapyWriteoff, handleQuickSurgeryWriteoff,
		handleConfirm, handleGenerateSupplierOrder, handlePrintAct, handleExportCsv,
	};
}
