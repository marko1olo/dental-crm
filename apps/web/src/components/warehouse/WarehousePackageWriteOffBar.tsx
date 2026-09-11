/**
 * ============================================================================
 * WAREHOUSE PACKAGE WRITE-OFF BAR (МАНДАТЫ 8e, 8k, 8n)
 * Сенсорная панель 1-кликового пакетного списания клинических расходников
 * с мягким овердрафтом склада (без комиссии из 3 человек и без блокировки приёма).
 *
 * ТРЕБОВАНИЯ И ИНВАРИАНТЫ:
 * - Быстрые кнопки: btn-writeoff-anesthesia-packet, btn-writeoff-hygiene-packet,
 *   btn-writeoff-filling-packet, btn-writeoff-surgery-packet.
 * - Тач-таргеты >= 44x44px.
 * - 0 мультяшных эмодзи (строго векторные Lucide-иконки: Syringe, PackageCheck, Sparkles, ShieldCheck).
 * - 0 disabled кнопок без причины: дефицит на складе не блокирует кнопку (мягкий овердрафт).
 * ============================================================================
 */

import React, { useState } from "react";
import {
	AlertTriangle,
	CheckCircle2,
	PackageCheck,
	ShieldCheck,
	Sparkles,
	Syringe,
	Zap,
} from "lucide-react";
import type { InventoryItem } from "../inventory/useInventoryLogic";
import {
	CLINICAL_WRITEOFF_PACKAGES,
	type ClinicalPackageId,
	handleOneClickPackageWriteOff,
	type OneClickPackageWriteOffResult,
} from "./warehousePackageWriteOffEngine";

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
			{/* HEADER & GUARANTEE LABEL */}
			<div className="flex items-center justify-between flex-wrap gap-2">
				<div className="flex items-center gap-2 text-xs font-bold text-[var(--ink,#0f172a)]">
					<Zap size={16} className="text-teal-600 shrink-0" />
					<span>1-Клик пакетное списание расходников:</span>
				</div>

				<div
					className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20"
					title="Задержка накладной не блокирует прием врача (мягкий овердрафт)"
				>
					<ShieldCheck size={14} className="shrink-0 text-teal-600" />
					<span>Мягкий овердрафт активен (без блокировок)</span>
				</div>
			</div>

			{/* FAST ACTION BUTTONS STRIP */}
			<div className="flex items-center gap-2 flex-wrap">
				{/* 1. АНЕСТЕЗИЯ */}
				<button
					type="button"
					onClick={() => handlePackageClick("anesthesia")}
					disabled={Boolean(submittingPackageId)}
					className="btn-writeoff-anesthesia-packet min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-bold bg-[var(--paper,#ffffff)] border border-teal-500/30 text-teal-800 dark:text-teal-200 hover:bg-teal-500/10 active:scale-98 transition-all flex items-center gap-2 shadow-xs cursor-pointer"
					data-testid="btn-writeoff-anesthesia-packet"
					title="1-клик списание пакета: Артикаин 1.7 мл + карпульная игла 30G + ватные валики (4 шт.)"
				>
					<Syringe size={16} className="text-teal-600 shrink-0" />
					<span>
						{submittingPackageId === "anesthesia" ? "Списание..." : "Стандартная анестезия"}
					</span>
				</button>

				{/* 2. ПРОФГИГИЕНА */}
				<button
					type="button"
					onClick={() => handlePackageClick("hygiene")}
					disabled={Boolean(submittingPackageId)}
					className="btn-writeoff-hygiene-packet min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-bold bg-[var(--paper,#ffffff)] border border-blue-500/30 text-blue-800 dark:text-blue-200 hover:bg-blue-500/10 active:scale-98 transition-all flex items-center gap-2 shadow-xs cursor-pointer"
					data-testid="btn-writeoff-hygiene-packet"
					title="1-клик списание пакета: СИЗ + Оптрагейт + порошок Air-Flow + паста + щетка + валики"
				>
					<PackageCheck size={16} className="text-blue-600 shrink-0" />
					<span>
						{submittingPackageId === "hygiene" ? "Списание..." : "Профгигиена"}
					</span>
				</button>

				{/* 3. ПЛОМБА СВЕТОВАЯ (ТЕРАПИЯ) */}
				<button
					type="button"
					onClick={() => handlePackageClick("filling")}
					disabled={Boolean(submittingPackageId)}
					className="btn-writeoff-filling-packet min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-bold bg-[var(--paper,#ffffff)] border border-emerald-500/30 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-500/10 active:scale-98 transition-all flex items-center gap-2 shadow-xs cursor-pointer"
					data-testid="btn-writeoff-filling-packet"
					title="1-клик списание пакета: СИЗ + анестетик + нанокомпозит + адгезив + матрица"
				>
					<Sparkles size={16} className="text-emerald-600 shrink-0" />
					<span>
						{submittingPackageId === "filling" ? "Списание..." : "Пломба световая"}
					</span>
				</button>

				{/* 4. ХИРУРГИЯ */}
				<button
					type="button"
					onClick={() => handlePackageClick("surgery")}
					disabled={Boolean(submittingPackageId)}
					className="btn-writeoff-surgery-packet min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-bold bg-[var(--paper,#ffffff)] border border-purple-500/30 text-purple-800 dark:text-purple-200 hover:bg-purple-500/10 active:scale-98 transition-all flex items-center gap-2 shadow-xs cursor-pointer"
					data-testid="btn-writeoff-surgery-packet"
					title="1-клик списание пакета: Анестетик + игла 27G + скальпель + шовник + губка"
				>
					<ShieldCheck size={16} className="text-purple-600 shrink-0" />
					<span>
						{submittingPackageId === "surgery" ? "Списание..." : "Хирургический пакет"}
					</span>
				</button>
			</div>

			{/* LAST WRITE-OFF STATUS TOAST / BADGE */}
			{lastResult && !compact && (
				<div
					className={`p-2.5 rounded-lg border text-xs flex items-center gap-2 ${
						lastResult.isOverdraft
							? "bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200"
							: "bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200"
					}`}
					data-testid="warehouse-writeoff-last-result"
				>
					{lastResult.isOverdraft ? (
						<AlertTriangle size={15} className="text-amber-600 shrink-0" />
					) : (
						<CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
					)}
					<span className="font-semibold">{lastResult.toastMessage}</span>
				</div>
			)}
		</div>
	);
};

export default WarehousePackageWriteOffBar;
