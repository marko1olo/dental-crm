/**
 * WAREHOUSE PACKAGE WRITE-OFF BAR (МАНДАТЫ 8e, 8k, 8n)
 * Сенсорная панель 1-кликового пакетного списания клинических расходников
 * с мягким овердрафтом склада (без комиссии из 3 человек и без блокировки приёма).
 * Декомпозирован до <= 120 строк.
 */

import React, { useState } from "react";
import { ShieldCheck, Zap } from "lucide-react";
import type { InventoryItem } from "./useInventoryLogic.js";
import { WarehousePackageButtons } from "./WarehousePackageButtons.js";
import { WarehousePackageResultAlert } from "./WarehousePackageResultAlert.js";
import {
	type ClinicalPackageId,
	handleOneClickPackageWriteOff,
	type OneClickPackageWriteOffResult,
} from "./warehousePackageWriteOffEngine.js";

export interface WarehousePackageWriteOffBarProps {
	readonly warehouseItems?: readonly InventoryItem[] | undefined;
	readonly currentStockMap?: Record<string, number> | undefined;
	readonly organizationId?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly nurseName?: string | undefined;
	readonly patientName?: string | undefined;
	readonly visitId?: string | undefined;
	readonly cabinetId?: string | undefined;
	readonly allowSoftOverdraft?: boolean | undefined;
	readonly onWriteOffComplete?: ((result: OneClickPackageWriteOffResult) => void) | undefined;
	readonly onToast?: ((message: string, type: "success" | "warning" | "info" | "error") => void) | undefined;
	readonly fetchFn?: typeof fetch | undefined;
	readonly className?: string | undefined;
	readonly compact?: boolean | undefined;
}

export const WarehousePackageWriteOffBar: React.FC<WarehousePackageWriteOffBarProps> = ({
	warehouseItems,
	currentStockMap,
	organizationId,
	doctorName,
	nurseName,
	patientName,
	visitId,
	cabinetId,
	allowSoftOverdraft = true,
	onWriteOffComplete,
	onToast,
	fetchFn,
	className = "",
	compact = false,
}) => {
	const [submittingPackageId, setSubmittingPackageId] = useState<string | null>(null);
	const [lastResult, setLastResult] = useState<OneClickPackageWriteOffResult | null>(null);

	const handlePackageClick = async (packageId: ClinicalPackageId) => {
		if (submittingPackageId) return;
		setSubmittingPackageId(packageId);

		try {
			const result = await handleOneClickPackageWriteOff({
				packageId,
				warehouseItems,
				currentStockMap,
				organizationId,
				doctorName,
				nurseName,
				patientName,
				visitId,
				cabinetId,
				allowSoftOverdraft,
				onToast,
				fetchFn,
			});

			setLastResult(result);
			if (onWriteOffComplete) {
				onWriteOffComplete(result);
			}
		} finally {
			setTimeout(() => {
				setSubmittingPackageId(null);
			}, 350);
		}
	};

	return (
		<div
			className={`warehouse-package-writeoff-bar p-3.5 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] flex flex-col gap-2.5 ${className}`}
			data-testid="warehouse-package-writeoff-bar"
		>
			<div className="flex items-center justify-between flex-wrap gap-2">
				<div className="flex items-center gap-2 text-xs font-bold text-[var(--ink,#0f172a)] min-w-0">
					<Zap size={16} className="text-teal-600 shrink-0" />
					<span className="truncate">Пакетное списание расходных материалов:</span>
				</div>

				<div
					className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20 shrink-0"
					title="Задержка накладной не блокирует прием врача (расход сверх остатка)"
				>
					<ShieldCheck size={14} className="shrink-0 text-teal-600" />
					<span>Расход сверх остатка разрешен</span>
				</div>
			</div>

			<WarehousePackageButtons
				submittingPackageId={submittingPackageId}
				onPackageClick={handlePackageClick}
			/>

			<WarehousePackageResultAlert lastResult={lastResult} compact={compact} />
		</div>
	);
};

export default WarehousePackageWriteOffBar;
