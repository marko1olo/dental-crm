import { useCallback, useEffect, useMemo, useState } from "react";
import { showToast } from "../../GlobalToast.js";
import {
	type ClinicalWriteoffDocument, type ClinicalWriteoffLine,
	type CompletedClinicalService, aggregateWriteoffFromServices, calculateClinicalWriteoffTotals,
	calculateLineCostKopecks, createQuickAnesthesiaPackageWriteoffDocument, createQuickCarpuleWriteoffDocument,
	createQuickVisitWriteoffDocument, exportClinicalWriteoffToCsv, generateAct0504230Html,
	generateFormM11Html, generateTorg16Html, updateLineActualQuantity, validateWriteoffDocument,
} from "./clinicalWriteoffEngine.js";
import {
	type CabinetStockBatch, DEFAULT_CLINIC_LEGAL_INFO, DENTAL_CABINET_STOCK_PRESETS, type DiscrepancyReasonCode,
} from "./clinicalWriteoffPresets.js";
import { type SupplierPurchaseOrderView, formatSupplierPurchaseOrderTextRu } from "../inventorySupplierOrders.js";
import { isDemoShowcaseMode } from "../../../lib/demoMode.js";
import { useAppStore } from "../../../store/appStore.js";
import type { ClinicalWriteoffModalProps } from "./ClinicalWriteoffModal.js";

export const DEFAULT_CLINICAL_SERVICES: readonly CompletedClinicalService[] = [
	{ serviceCode: "A16.07.002.001", toothNumber: 26, serviceTitle: "Пломбирование зуба светоотверждаемым композитом", quantityMultiplier: 1 },
	{ serviceCode: "A16.07.004", toothNumber: 26, serviceTitle: "Местная анестезия инфильтрационная", quantityMultiplier: 1 },
];

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
	const stockBatches = propStockBatches ?? (isDemo ? DENTAL_CABINET_STOCK_PRESETS : []);

	const services = useMemo((): readonly CompletedClinicalService[] => {
		if (initialServices && initialServices.length > 0) return initialServices;
		if (isDemo) return DEFAULT_CLINICAL_SERVICES;
		try {
			const activeVisitServices = (useAppStore.getState() as any)?.dashboard?.activeVisit?.completedServices;
			if (Array.isArray(activeVisitServices) && activeVisitServices.length > 0) {
				return activeVisitServices.map((s: any) => ({
					serviceCode: s.serviceCode || s.code || "A16.07.002.001",
					toothNumber: s.toothNumber ? Number(s.toothNumber) : undefined,
					serviceTitle: s.serviceTitle || s.title || s.name || "Клиническая процедура",
					quantityMultiplier: s.quantityMultiplier ?? s.quantity ?? 1,
				}));
			}
		} catch {}
		return [];
	}, [initialServices, isDemo]);

	const [actNumber, setActNumber] = useState<string>(
		() => `АКТ-СПИС-${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(Date.now()).slice(-4)}`,
	);
	const [actDate, setActDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
	const [selectedCabinetId, setSelectedCabinetId] = useState<string>(cabinetId);
	const [statutoryFormType] = useState<"0504230" | "M11" | "TORG16">(defaultFormType);
	const [notes, setNotes] = useState<string>("");
	const [isSingleSigner, setIsSingleSigner] = useState<boolean>(true);

	const [lines, setLines] = useState<ClinicalWriteoffLine[]>(() =>
		isOpen && services.length > 0 ? aggregateWriteoffFromServices(services, stockBatches, selectedCabinetId, actDate) : []
	);

	useEffect(() => {
		if (isOpen) {
			setLines(aggregateWriteoffFromServices(services, stockBatches, selectedCabinetId, actDate));
		}
	}, [isOpen, services, stockBatches, selectedCabinetId, actDate]);

	const totals = useMemo(() => calculateClinicalWriteoffTotals(lines), [lines]);
	const validation = useMemo(
		() =>
			validateWriteoffDocument({
				lines,
				actNumber,
				actDate,
				doctorFullName,
				patientName,
			}),
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

	const handleRemoveLine = useCallback((lineId: string) => {
		setLines((prev) => prev.filter((l) => l.id !== lineId));
	}, []);

	const handleQuickCarpuleWriteoff = useCallback(() => {
		const doc = createQuickCarpuleWriteoffDocument({
			count: 2, cabinetId: selectedCabinetId,
			cabinetNameRu: selectedCabinetId === "cab_02_surgery" ? "Кабинет №2 (Хирургия)" : "Кабинет №1 (Терапия)",
			stockBatches, doctorFullName, doctorSpecialty, patientName,
		});
		setLines([...doc.lines]);
		setActNumber(doc.actNumber);
		if (doc.notes) setNotes(doc.notes);
		setIsSingleSigner(true);
		showToast("2 карпулы анестетика добавлены в акт списания!", "success");
	}, [selectedCabinetId, stockBatches, doctorFullName, doctorSpecialty, patientName]);

	const handleQuickAnesthesiaPackageWriteoff = useCallback(() => {
		const doc = createQuickAnesthesiaPackageWriteoffDocument({
			cabinetId: selectedCabinetId,
			cabinetNameRu: selectedCabinetId === "cab_02_surgery" ? "Кабинет №2 (Хирургия)" : "Кабинет №1 (Терапия)",
			stockBatches, doctorFullName, doctorSpecialty, patientName,
		});
		setLines([...doc.lines]);
		setActNumber(doc.actNumber);
		if (doc.notes) setNotes(doc.notes);
		setIsSingleSigner(true);
		showToast("Стандартный пакет анестезии добавлен в акт списания!", "success");
	}, [selectedCabinetId, stockBatches, doctorFullName, doctorSpecialty, patientName]);

	const handleQuickTherapyWriteoff = useCallback(() => {
		const doc = createQuickVisitWriteoffDocument({
			visitType: "therapy", cabinetId: selectedCabinetId,
			cabinetNameRu: selectedCabinetId === "cab_02_surgery" ? "Кабинет №2 (Хирургия)" : "Кабинет №1 (Терапия)",
			stockBatches, doctorFullName, doctorSpecialty, patientName,
		});
		setLines([...doc.lines]);
		setActNumber(doc.actNumber);
		if (doc.notes) setNotes(doc.notes);
		setIsSingleSigner(true);
		showToast("Акт списания материалов терапии сформирован!", "success");
	}, [selectedCabinetId, stockBatches, doctorFullName, doctorSpecialty, patientName]);

	const handleQuickSurgeryWriteoff = useCallback(() => {
		const doc = createQuickVisitWriteoffDocument({
			visitType: "surgery", cabinetId: selectedCabinetId,
			cabinetNameRu: selectedCabinetId === "cab_02_surgery" ? "Кабинет №2 (Хирургия)" : "Кабинет №1 (Терапия)",
			stockBatches, doctorFullName, doctorSpecialty, patientName,
		});
		setLines([...doc.lines]);
		setActNumber(doc.actNumber);
		if (doc.notes) setNotes(doc.notes);
		setIsSingleSigner(true);
		showToast("Акт списания материалов хирургии сформирован!", "success");
	}, [selectedCabinetId, stockBatches, doctorFullName, doctorSpecialty, patientName]);

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

	const handleGenerateSupplierOrder = () => {
		const deficitLines = lines.filter((l) => l.stockStatus === "deficit" || l.stockStatus === "warning" || l.stockAvailable < l.actualQuantity);
		const poItems = deficitLines.map((l) => {
			const shortfall = Math.max(0, Number((l.actualQuantity - l.stockAvailable).toFixed(2)));
			const threshold = l.criticalThreshold > 0 ? l.criticalThreshold : 2;
			const suggested = Math.max(threshold * 2, shortfall + threshold, 1);
			const lineCost = calculateLineCostKopecks(l.unitCostKopecks, suggested);
			return {
				sku: l.sku || l.materialId, materialName: l.nameRu, category: l.category as any, unit: l.unit,
				currentStock: l.stockAvailable, criticalThreshold: threshold, shortfall, suggestedOrderQuantity: suggested,
				unitCostKopecks: l.unitCostKopecks, unitCostFormatted: `${(l.unitCostKopecks / 100).toFixed(2)} ₽`,
				totalCostKopecks: lineCost, totalCostFormatted: `${(lineCost / 100).toFixed(2)} ₽`,
			};
		});
		const totalCost = poItems.reduce((acc, i) => acc + i.totalCostKopecks, 0);
		const orderView: SupplierPurchaseOrderView = {
			id: `po_draft_${Date.now()}`, orderNumber: `ПО-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-001`,
			orderDate: new Date().toISOString().slice(0, 10), clinicNameRu: DEFAULT_CLINIC_LEGAL_INFO.clinicNameRu,
			reason: "stock_deficit", items: poItems, totalItemsCount: poItems.length, totalCostKopecks: totalCost,
			totalCostFormatted: `${(totalCost / 100).toFixed(2)} ₽`,
		};
		const text = formatSupplierPurchaseOrderTextRu(orderView);
		if (typeof navigator !== "undefined" && navigator?.clipboard?.writeText) void navigator.clipboard.writeText(text);
		showToast(`Черновик заказа поставщику на ${poItems.length} поз. скопирован в буфер!`, "success");
	};

	const handlePrintAct = (formType: "0504230" | "M11" | "TORG16") => {
		const html = formType === "0504230" ? generateAct0504230Html(currentDocument) : formType === "M11" ? generateFormM11Html(currentDocument) : generateTorg16Html(currentDocument);
		const printWin = window.open("", "_blank");
		if (printWin) {
			printWin.document.write(html);
			printWin.document.close();
			printWin.focus();
			setTimeout(() => printWin.print(), 250);
		}
	};

	const handleExportCsv = () => {
		const csv = exportClinicalWriteoffToCsv([currentDocument]);
		const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = `${actNumber}.csv`;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	};

	return {
		patientName, patientId, doctorFullName, doctorSpecialty, selectedCabinetId, setSelectedCabinetId,
		actNumber, setActNumber, actDate, setActDate, services, lines, totals, validation,
		handleQuantityChange, handleReasonChange, handleSerialNumberChange, handleResetToNorm, handleRemoveLine,
		handleQuickCarpuleWriteoff, handleQuickAnesthesiaPackageWriteoff, handleQuickTherapyWriteoff, handleQuickSurgeryWriteoff,
		handleConfirm, handleGenerateSupplierOrder, handlePrintAct, handleExportCsv,
	};
}
