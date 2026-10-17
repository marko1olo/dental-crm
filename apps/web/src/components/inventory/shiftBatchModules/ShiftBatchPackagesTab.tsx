/**
 * ShiftBatchPackagesTab.tsx — Таб экспресс-списания клинических пакетов (1 клик).
 * Входит в единый SSOT ShiftBatchDeductionModal (Мандаты 8e, 8n).
 */

import React from "react";
import {
	AlertTriangle,
	CheckCircle2,
	Minus,
	PackageCheck,
	Plus,
	ShieldCheck,
	Sparkles,
	Syringe,
	Zap,
} from "lucide-react";
import type { OneClickPackageWriteOffResult, ClinicalPackageId } from "../warehousePackageWriteOffEngine.js";

export interface ShiftBatchPackagesTabProps {
	readonly packageQuantityMultiplier: number;
	readonly setPackageQuantityMultiplier: React.Dispatch<React.SetStateAction<number>>;
	readonly submittingPackageId: string | null;
	readonly onPackageClick: (packageId: ClinicalPackageId) => Promise<void>;
	readonly lastPackageResult: OneClickPackageWriteOffResult | null;
}

export const ShiftBatchPackagesTab: React.FC<ShiftBatchPackagesTabProps> = ({
	packageQuantityMultiplier,
	setPackageQuantityMultiplier,
	submittingPackageId,
	onPackageClick,
	lastPackageResult,
}) => {
	return (
		<div className="space-y-4">
			{/* Панель множителя приёмов / пациентов */}
			<div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex items-center justify-between gap-3 flex-wrap">
				<div className="flex items-center gap-2 text-xs font-semibold text-[var(--ink)]">
					<Zap className="w-4 h-4 text-teal-600 shrink-0" />
					<span>Множитель процедур (число пациентов):</span>
				</div>

				<div className="flex items-center gap-2">
					<div className="inline-flex items-center border border-[var(--line)] rounded-lg bg-[var(--paper)] h-8 overflow-hidden shrink-0">
						<button
							type="button"
							onClick={() => setPackageQuantityMultiplier((m) => Math.max(1, m - 1))}
							className="w-8 h-full flex items-center justify-center hover:bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer text-xs font-bold"
						>
							<Minus size={12} />
						</button>
						<span className="w-10 text-center font-bold text-xs font-mono tabular-nums">
							{packageQuantityMultiplier}x
						</span>
						<button
							type="button"
							onClick={() => setPackageQuantityMultiplier((m) => m + 1)}
							className="w-8 h-full flex items-center justify-center hover:bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer text-xs font-bold"
						>
							<Plus size={12} />
						</button>
					</div>

					<div className="flex items-center gap-1">
						{[1, 2, 5, 8].map((preset) => (
							<button
								key={preset}
								type="button"
								onClick={() => setPackageQuantityMultiplier(preset)}
								className={`h-8 px-2.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
									packageQuantityMultiplier === preset
										? "bg-teal-600 text-white border-teal-600"
										: "bg-[var(--paper)] border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)]"
								}`}
							>
								{preset}x
							</button>
						))}
					</div>
				</div>
			</div>

			{/* Сетка карточек пакетов с тач-таргетами >= 44x44px */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
				{/* 1. Карпула анестетика */}
				<div className="p-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] flex flex-col justify-between gap-3 shadow-2xs">
					<div className="space-y-1">
						<div className="flex items-center gap-2 font-bold text-sm text-[var(--ink)]">
							<Syringe className="w-4 h-4 text-teal-600 shrink-0" />
							<span>Карпула анестетика (1.7 мл)</span>
						</div>
						<p className="text-xs text-[var(--muted)]">
							Артикаин / Септанест / Убистезин. 1-клик списание пустых карпул медсестрой (отходы класса Б).
						</p>
					</div>
					<button
						type="button"
						onClick={() => onPackageClick("carpule_quick")}
						disabled={Boolean(submittingPackageId)}
						data-testid="btn-writeoff-anesthetic-carpule"
						className="btn-writeoff-anesthetic-carpule h-11 min-h-[44px] px-4 rounded-xl bg-teal-50 dark:bg-teal-950/30 border border-teal-500/30 text-teal-800 dark:text-teal-200 hover:bg-teal-500/15 active:scale-98 transition-all font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
					>
						<Syringe className="w-4 h-4 text-teal-600" />
						<span>
							{submittingPackageId === "carpule_quick"
								? "Списание..."
								: `Списать препарат (${packageQuantityMultiplier} карп.)`}
						</span>
					</button>
				</div>

				{/* 2. Набор стерилизации */}
				<div className="p-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] flex flex-col justify-between gap-3 shadow-2xs">
					<div className="space-y-1">
						<div className="flex items-center gap-2 font-bold text-sm text-[var(--ink)]">
							<PackageCheck className="w-4 h-4 text-indigo-600 shrink-0" />
							<span>Набор стерилизации</span>
						</div>
						<p className="text-xs text-[var(--muted)]">
							1 лоток со смотровым инструментом в крафт-пакете + 2 пары нитриловых перчаток.
						</p>
					</div>
					<button
						type="button"
						onClick={() => onPackageClick("sterilization_kit")}
						disabled={Boolean(submittingPackageId)}
						data-testid="btn-writeoff-sterilization-kit"
						className="btn-writeoff-sterilization-kit h-11 min-h-[44px] px-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-500/30 text-indigo-800 dark:text-indigo-200 hover:bg-indigo-500/15 active:scale-98 transition-all font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
					>
						<PackageCheck className="w-4 h-4 text-indigo-600" />
						<span>
							{submittingPackageId === "sterilization_kit"
								? "Списание..."
								: `Набор стерилизации (${packageQuantityMultiplier} лот.)`}
						</span>
					</button>
				</div>

				{/* 3. Стандартная анестезия */}
				<div className="p-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] flex flex-col justify-between gap-3 shadow-2xs">
					<div className="space-y-1">
						<div className="flex items-center gap-2 font-bold text-sm text-[var(--ink)]">
							<Syringe className="w-4 h-4 text-teal-600 shrink-0" />
							<span>Стандартная анестезия</span>
						</div>
						<p className="text-xs text-[var(--muted)]">
							Карпула артикаина 1.7 мл + карпульная игла 30G + 4 ватных валика + спиртовая салфетка.
						</p>
					</div>
					<button
						type="button"
						onClick={() => onPackageClick("anesthesia")}
						disabled={Boolean(submittingPackageId)}
						data-testid="btn-writeoff-anesthesia-packet"
						className="btn-writeoff-anesthesia-packet h-11 min-h-[44px] px-4 rounded-xl bg-teal-50 dark:bg-teal-950/30 border border-teal-500/30 text-teal-800 dark:text-teal-200 hover:bg-teal-500/15 active:scale-98 transition-all font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
					>
						<Syringe className="w-4 h-4 text-teal-600" />
						<span>
							{submittingPackageId === "anesthesia"
								? "Списание..."
								: `Списать анестезию (${packageQuantityMultiplier} пак.)`}
						</span>
					</button>
				</div>

				{/* 4. Профгигиена */}
				<div className="p-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] flex flex-col justify-between gap-3 shadow-2xs">
					<div className="space-y-1">
						<div className="flex items-center gap-2 font-bold text-sm text-[var(--ink)]">
							<ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
							<span>Профгигиена</span>
						</div>
						<p className="text-xs text-[var(--muted)]">
							СИЗ + Оптрагейт + порошок Air-Flow + полировочная паста + щетка + нагрудник.
						</p>
					</div>
					<button
						type="button"
						onClick={() => onPackageClick("hygiene")}
						disabled={Boolean(submittingPackageId)}
						data-testid="btn-writeoff-hygiene-packet"
						className="btn-writeoff-hygiene-packet h-11 min-h-[44px] px-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-500/30 text-blue-800 dark:text-blue-200 hover:bg-blue-500/15 active:scale-98 transition-all font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
					>
						<ShieldCheck className="w-4 h-4 text-blue-600" />
						<span>
							{submittingPackageId === "hygiene"
								? "Списание..."
								: `Списать гигиену (${packageQuantityMultiplier} пак.)`}
						</span>
					</button>
				</div>

				{/* 5. Пломба световая */}
				<div className="p-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] flex flex-col justify-between gap-3 shadow-2xs">
					<div className="space-y-1">
						<div className="flex items-center gap-2 font-bold text-sm text-[var(--ink)]">
							<Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
							<span>Пломба световая (Терапия)</span>
						</div>
						<p className="text-xs text-[var(--muted)]">
							Анестезия + СИЗ + нанокомпозит 0.2 г + адгезив + протравка 37% + матрица.
						</p>
					</div>
					<button
						type="button"
						onClick={() => onPackageClick("filling")}
						disabled={Boolean(submittingPackageId)}
						data-testid="btn-writeoff-filling-packet"
						className="btn-writeoff-filling-packet h-11 min-h-[44px] px-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-500/30 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-500/15 active:scale-98 transition-all font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
					>
						<Sparkles className="w-4 h-4 text-emerald-600" />
						<span>
							{submittingPackageId === "filling"
								? "Списание..."
								: `Списать пломбу (${packageQuantityMultiplier} пак.)`}
						</span>
					</button>
				</div>

				{/* 6. Хирургический пакет */}
				<div className="p-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] flex flex-col justify-between gap-3 shadow-2xs">
					<div className="space-y-1">
						<div className="flex items-center gap-2 font-bold text-sm text-[var(--ink)]">
							<ShieldCheck className="w-4 h-4 text-purple-600 shrink-0" />
							<span>Хирургический пакет</span>
						</div>
						<p className="text-xs text-[var(--muted)]">
							Анестетик + игла 27G + скальпель №15 + шовный материал Vicryl + гемостатическая губка.
						</p>
					</div>
					<button
						type="button"
						onClick={() => onPackageClick("surgery")}
						disabled={Boolean(submittingPackageId)}
						data-testid="btn-writeoff-surgery-packet"
						className="btn-writeoff-surgery-packet h-11 min-h-[44px] px-4 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-500/30 text-purple-800 dark:text-purple-200 hover:bg-purple-500/15 active:scale-98 transition-all font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
					>
						<ShieldCheck className="w-4 h-4 text-purple-600" />
						<span>
							{submittingPackageId === "surgery"
								? "Списание..."
								: `Списать хирургию (${packageQuantityMultiplier} пак.)`}
						</span>
					</button>
				</div>
			</div>

			{/* Тост последнего результата списания */}
			{lastPackageResult && (
				<div
					className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
						lastPackageResult.isOverdraft
							? "bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200"
							: "bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200"
					}`}
				>
					{lastPackageResult.isOverdraft ? (
						<AlertTriangle size={15} className="text-amber-600 shrink-0" />
					) : (
						<CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
					)}
					<span className="font-semibold">{lastPackageResult.toastMessage}</span>
				</div>
			)}
		</div>
	);
};

export default ShiftBatchPackagesTab;
