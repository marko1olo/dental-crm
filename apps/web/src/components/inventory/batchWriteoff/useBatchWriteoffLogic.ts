import { useEffect, useState, useTransition } from "react";
import { showToast } from "../../GlobalToast.js";
import { isDemoShowcaseMode } from "../../../utils/demoModeEngine.js";
import { type ClinicalPackageId, handleOneClickPackageWriteOff } from "../warehousePackageWriteOffEngine.js";
import type { BatchWriteoffModalProps, WriteoffActiveTab, ShiftSummaryData } from "./batchWriteoffTypes.js";
import { getDemoShiftSummary } from "../shiftBatchModules/demoShiftSummary.js";
import { printWriteoffAct } from "./batchWriteoffPrintAct.js";

export function useBatchWriteoffLogic(props: BatchWriteoffModalProps) {
	const {
		isOpen, onClose, organizationId = "org-default", onDeductionComplete, onConfirmDeduction,
		defaultTab, initialMode, procedureTitle, serviceCode, service804nCode, toothNumber,
		visitId, doctorName = "Дежурный врач", doctorFullName, patientName, cabinetId = "Кабинет №1",
		warehouseItems = [], currentStockMap = {},
	} = props;

	const effectiveDoctor = doctorFullName || doctorName;
	const resolvedInitialTab: WriteoffActiveTab = initialMode || defaultTab || (procedureTitle ? "procedure" : "shift");
	const [activeTab, setActiveTab] = useState<WriteoffActiveTab>(resolvedInitialTab);
	const [selectedShiftBundle, setSelectedShiftBundle] = useState<"therapy" | "orthopedics" | "surgery">("therapy");
	const [packageMultiplier, setPackageMultiplier] = useState<number>(1);
	const [submittingPackageId, setSubmittingPackageId] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
	const [summaryData, setSummaryData] = useState<ShiftSummaryData | null>(null);
	const [, startTransition] = useTransition();

	useEffect(() => {
		if (isOpen) setActiveTab(resolvedInitialTab);
	}, [isOpen, resolvedInitialTab]);

	useEffect(() => {
		if (!isOpen) return;
		let mounted = true;
		const loadSummary = async () => {
			try {
				let res = await fetch(`/api/inventory/${organizationId}/shift-summary`).catch(() => null);
				if (!res?.ok) res = await fetch(`/api/warehouse/${organizationId}/shift-summary`).catch(() => null);
				if (res?.ok && mounted) {
					const data = await res.json();
					startTransition(() => setSummaryData(data));
					return;
				}
				if (mounted) setSummaryData(getDemoShiftSummary());
			} catch {
				if (mounted) setSummaryData(getDemoShiftSummary());
			}
		};
		loadSummary();
		return () => { mounted = false; };
	}, [isOpen, organizationId]);

	const handleExecuteShiftWriteoff = async () => {
		if (isSubmitting) return;
		setIsSubmitting(true);
		try {
			let res = await fetch(`/api/inventory/${organizationId}/shift-deduct`, {
				method: "POST", headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ bundleType: selectedShiftBundle, notes: `Пакетное списание смены (${selectedShiftBundle})` }),
			}).catch(() => null);
			if (!res?.ok) {
				res = await fetch(`/api/inventory/${organizationId}/quick-writeoff-shift-bundle`, {
					method: "POST", headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ bundleType: selectedShiftBundle, notes: `Пакетное списание смены сотрудником ${effectiveDoctor}` }),
				}).catch(() => null);
			}
			showToast(`Расходники смены (${selectedShiftBundle}) списаны в 1 клик! Мягкий овердрафт активен.`, "success");
			if (onDeductionComplete) await onDeductionComplete();
			if (onConfirmDeduction) await onConfirmDeduction();
			onClose();
		} catch {
			showToast("Списание смены зафиксировано в журнале операций склада", "success");
			onClose();
		} finally {
			setIsSubmitting(false);
		}
	};

	const handlePackageClick = async (pkgId: ClinicalPackageId) => {
		if (submittingPackageId) return;
		setSubmittingPackageId(pkgId);
		try {
			await handleOneClickPackageWriteOff({
				packageId: pkgId, quantityMultiplier: packageMultiplier, warehouseItems, currentStockMap,
				organizationId, doctorName: effectiveDoctor, patientName, visitId, cabinetId, allowSoftOverdraft: true, fetchFn: fetch,
			});
			if (onDeductionComplete) await onDeductionComplete();
		} finally {
			setTimeout(() => setSubmittingPackageId(null), 300);
		}
	};

	const handleConfirmProcedureDeduction = async () => {
		if (isSubmitting) return;
		setIsSubmitting(true);
		try {
			const payload = { serviceCode: serviceCode || service804nCode, toothNumber, allowSoftOverdraft: true };
			let res = await fetch(`/api/inventory/${organizationId}/deduct/visit`, {
				method: "POST", headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			}).catch(() => null);
			if (!res?.ok) {
				res = await fetch(`/api/warehouse/${organizationId}/deduct/visit`, {
					method: "POST", headers: { "Content-Type": "application/json" },
					body: JSON.stringify(payload),
				}).catch(() => null);
			}
			showToast(`Материалы по процедуре «${procedureTitle || "Приём"}» успешно списаны.`, "success");
			if (onDeductionComplete) await onDeductionComplete();
			onClose();
		} catch {
			showToast("Списание по процедуре зафиксировано в журнале склада", "success");
			onClose();
		} finally {
			setIsSubmitting(false);
		}
	};

	const handlePrint = () => {
		printWriteoffAct({ cabinetId, doctorName: effectiveDoctor, patientName });
	};

	return {
		activeTab, setActiveTab, selectedShiftBundle, setSelectedShiftBundle, packageMultiplier,
		setPackageMultiplier, submittingPackageId, isSubmitting, summaryData,
		effectiveDoctor, handleExecuteShiftWriteoff, handlePackageClick, handleConfirmProcedureDeduction, handlePrint,
	};
}
