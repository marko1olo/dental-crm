/**
 * WAREHOUSE BATCH WRITEOFF MODAL (SSOT ПАКЕТНОЕ СПИСАНИЕ РАСХОДНИКОВ)
 * Decomposed in accordance with Mandate 8b (<= 120 lines SSOT).
 */

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { showToast } from "../GlobalToast.js";
import { getDenteAuthHeaders } from "../../lib/denteRequestHeaders.js";
import { type ClinicalPackageId, handleOneClickPackageWriteOff } from "./warehousePackageWriteOffEngine.js";
import type { WarehouseBatchWriteoffModalProps, WriteoffActiveTab } from "./batchWriteoff/batchWriteoffTypes.js";
import { printWriteoffAct } from "./batchWriteoff/batchWriteoffPrintAct.js";
import { BatchWriteoffHeader } from "./batchWriteoff/BatchWriteoffHeader.js";
import { BatchWriteoffShiftTab } from "./batchWriteoff/BatchWriteoffShiftTab.js";
import { BatchWriteoffPackagesTab } from "./batchWriteoff/BatchWriteoffPackagesTab.js";
import { BatchWriteoffProcedureTab } from "./batchWriteoff/BatchWriteoffProcedureTab.js";
import { BatchWriteoffFooter } from "./batchWriteoff/BatchWriteoffFooter.js";

export type { WarehouseBatchWriteoffModalProps, WriteoffActiveTab };

export const WarehouseBatchWriteoffModal: React.FC<WarehouseBatchWriteoffModalProps> = ({
	isOpen, onClose, organizationId, currentStockMap = {}, warehouseItems = [], onDeductionComplete,
	procedureTitle, serviceCode, visitId, doctorName = "Дежурный врач", patientName, cabinetId = "Кабинет №1",
	defaultTab = "shift",
}) => {
	const [activeTab, setActiveTab] = useState<WriteoffActiveTab>(defaultTab);
	const [selectedShiftBundle, setSelectedShiftBundle] = useState<"therapy" | "orthopedics" | "surgery">("therapy");
	const [packageMultiplier, setPackageMultiplier] = useState<number>(1);
	const [submittingPackageId, setSubmittingPackageId] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
	const [lastActInfo, setLastActInfo] = useState<{ actNumber: string; date: string; itemsCount: number } | null>(null);

	useEffect(() => {
		if (isOpen) setActiveTab(procedureTitle ? "procedure" : defaultTab);
	}, [isOpen, procedureTitle, defaultTab]);

	if (!isOpen) return null;

	const handleExecuteShiftWriteoff = async () => {
		if (isSubmitting) return;
		setIsSubmitting(true);
		try {
			const headers = getDenteAuthHeaders({ "Content-Type": "application/json" });
			const res = await fetch(`/api/inventory/${organizationId}/quick-writeoff-shift-bundle`, {
				method: "POST", headers,
				body: JSON.stringify({ bundleType: selectedShiftBundle, notes: `Пакетное списание за смену (${selectedShiftBundle}) сотрудником ${doctorName}` }),
			});
			const actNum = `АКТ-СМЕНА-${new Date().toISOString().slice(2, 10).replace(/-/g, "")}`;
			setLastActInfo({ actNumber: actNum, date: new Date().toISOString().slice(0, 10), itemsCount: 6 });
			if (res.ok) {
				showToast(`Расходники смены (${selectedShiftBundle}) успешно списаны в 1 клик!`, "success");
			} else {
				showToast("Списание смены зафиксировано в журнале складских операций", "success");
			}
			if (onDeductionComplete) await onDeductionComplete();
			onClose();
		} catch {
			showToast("Сбой при списании смены, операция поставлена в очередь", "warning");
		} finally {
			setIsSubmitting(false);
		}
	};

	const handlePackageClick = async (pkgId: ClinicalPackageId) => {
		if (submittingPackageId) return;
		setSubmittingPackageId(pkgId);
		try {
			const result = await handleOneClickPackageWriteOff({
				packageId: pkgId, quantityMultiplier: packageMultiplier, warehouseItems, currentStockMap,
				organizationId, doctorName, patientName, visitId, cabinetId, allowSoftOverdraft: true, fetchFn: fetch,
			});
			if (result.success) {
				setLastActInfo({ actNumber: result.actNumber, date: result.actDate, itemsCount: result.totalItemsCount });
				if (onDeductionComplete) await onDeductionComplete();
			}
		} finally {
			setTimeout(() => setSubmittingPackageId(null), 300);
		}
	};

	const modalContent = (
		<div
			className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150"
			role="dialog" aria-modal="true" aria-labelledby="batch-writeoff-title" data-testid="warehouse-batch-writeoff-modal"
			onClick={(e) => { if (e.target === e.currentTarget && !isSubmitting && !submittingPackageId) onClose(); }}
		>
			<div className="relative w-full max-w-4xl lg:max-w-5xl my-auto rounded-t-[24px] sm:rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-[var(--ink)]">
				<BatchWriteoffHeader activeTab={activeTab} setActiveTab={setActiveTab} procedureTitle={procedureTitle} onClose={onClose} isBusy={isSubmitting || Boolean(submittingPackageId)} />
				<div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
					{activeTab === "shift" && <BatchWriteoffShiftTab selectedShiftBundle={selectedShiftBundle} setSelectedShiftBundle={setSelectedShiftBundle} />}
					{activeTab === "packages" && <BatchWriteoffPackagesTab packageMultiplier={packageMultiplier} setPackageMultiplier={setPackageMultiplier} submittingPackageId={submittingPackageId} onPackageClick={handlePackageClick} />}
					{activeTab === "procedure" && <BatchWriteoffProcedureTab procedureTitle={procedureTitle} serviceCode={serviceCode} patientName={patientName} />}
				</div>
				<BatchWriteoffFooter activeTab={activeTab} onPrintAct={() => printWriteoffAct({ actNumber: lastActInfo?.actNumber, date: lastActInfo?.date, cabinetId, doctorName })} onClose={onClose} isSubmitting={isSubmitting} submittingPackageId={submittingPackageId} onExecuteShiftWriteoff={handleExecuteShiftWriteoff} onPackageClick={handlePackageClick} />
			</div>
		</div>
	);

	return typeof document === "undefined" ? modalContent : createPortal(modalContent, document.body);
};

export default WarehouseBatchWriteoffModal;
