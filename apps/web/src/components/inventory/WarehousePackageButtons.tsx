import { PackageCheck, ShieldCheck, Sparkles, Syringe } from "lucide-react";
import type React from "react";
import type { ClinicalPackageId } from "./warehousePackageWriteOffEngine.js";

export interface WarehousePackageButtonsProps {
	readonly submittingPackageId: string | null;
	readonly onPackageClick: (id: ClinicalPackageId) => void;
}

export const WarehousePackageButtons: React.FC<WarehousePackageButtonsProps> = ({
	submittingPackageId,
	onPackageClick,
}) => (
	<div className="flex items-center gap-2 flex-wrap">
		{/* 1. КАРПУЛА АНЕСТЕТИКА */}
		<button
			type="button"
			onClick={() => onPackageClick("carpule_quick")}
			disabled={Boolean(submittingPackageId)}
			className="btn-writeoff-anesthetic-carpule min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-bold bg-[var(--paper,#ffffff)] border border-teal-500/30 text-teal-800 dark:text-teal-200 hover:bg-teal-500/10 active:scale-98 transition-all flex items-center gap-2 shadow-xs cursor-pointer min-w-0"
			data-testid="btn-writeoff-anesthetic-carpule"
			title="Списание использованных карпул анестетика медсестрой без комиссии"
		>
			<Syringe size={16} className="text-teal-600 dark:text-teal-400 shrink-0" />
			<span className="truncate min-w-0">
				{submittingPackageId === "carpule_quick" ? "Списание..." : "Списать препарат"}
			</span>
		</button>

		{/* 2. НАБОР СТЕРИЛИЗАЦИИ */}
		<button
			type="button"
			onClick={() => onPackageClick("sterilization_kit")}
			disabled={Boolean(submittingPackageId)}
			className="btn-writeoff-sterilization-kit min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-bold bg-[var(--paper,#ffffff)] border border-indigo-500/30 text-indigo-800 dark:text-indigo-200 hover:bg-indigo-500/10 active:scale-98 transition-all flex items-center gap-2 shadow-xs cursor-pointer min-w-0"
			data-testid="btn-writeoff-sterilization-kit"
			title="Списание набора стерилизации: 1 лоток + перчатки"
		>
			<PackageCheck size={16} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
			<span className="truncate min-w-0">
				{submittingPackageId === "sterilization_kit" ? "Списание..." : "Набор стерилизации: 1 лоток + перчатки"}
			</span>
		</button>

		{/* 3. АНЕСТЕЗИЯ */}
		<button
			type="button"
			onClick={() => onPackageClick("anesthesia")}
			disabled={Boolean(submittingPackageId)}
			className="btn-writeoff-anesthesia-packet min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-bold bg-[var(--paper,#ffffff)] border border-teal-500/30 text-teal-800 dark:text-teal-200 hover:bg-teal-500/10 active:scale-98 transition-all flex items-center gap-2 shadow-xs cursor-pointer min-w-0"
			data-testid="btn-writeoff-anesthesia-packet"
			title="Списание пакета: Артикаин 1.7 мл + карпульная игла 30G + ватные валики (4 шт.)"
		>
			<Syringe size={16} className="text-teal-600 dark:text-teal-400 shrink-0" />
			<span className="truncate min-w-0">
				{submittingPackageId === "anesthesia" ? "Списание..." : "Стандартная анестезия"}
			</span>
		</button>

		{/* 4. ПРОФГИГИЕНА */}
		<button
			type="button"
			onClick={() => onPackageClick("hygiene")}
			disabled={Boolean(submittingPackageId)}
			className="btn-writeoff-hygiene-packet min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-bold bg-[var(--paper,#ffffff)] border border-blue-500/30 text-blue-800 dark:text-blue-200 hover:bg-blue-500/10 active:scale-98 transition-all flex items-center gap-2 shadow-xs cursor-pointer min-w-0"
			data-testid="btn-writeoff-hygiene-packet"
			title="Списание пакета: СИЗ + Оптрагейт + порошок Air-Flow + паста + щетка + валики"
		>
			<PackageCheck size={16} className="text-blue-600 dark:text-blue-400 shrink-0" />
			<span className="truncate min-w-0">
				{submittingPackageId === "hygiene" ? "Списание..." : "Профгигиена"}
			</span>
		</button>

		{/* 5. ПЛОМБА СВЕТОВАЯ */}
		<button
			type="button"
			onClick={() => onPackageClick("filling")}
			disabled={Boolean(submittingPackageId)}
			className="btn-writeoff-filling-packet min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-bold bg-[var(--paper,#ffffff)] border border-emerald-500/30 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-500/10 active:scale-98 transition-all flex items-center gap-2 shadow-xs cursor-pointer min-w-0"
			data-testid="btn-writeoff-filling-packet"
			title="Списание пакета: СИЗ + анестетик + нанокомпозит + адгезив + матрица"
		>
			<Sparkles size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
			<span className="truncate min-w-0">
				{submittingPackageId === "filling" ? "Списание..." : "Пломба световая"}
			</span>
		</button>

		{/* 6. ХИРУРГИЯ */}
		<button
			type="button"
			onClick={() => onPackageClick("surgery")}
			disabled={Boolean(submittingPackageId)}
			className="btn-writeoff-surgery-packet min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-bold bg-[var(--paper,#ffffff)] border border-purple-500/30 text-purple-800 dark:text-purple-200 hover:bg-purple-500/10 active:scale-98 transition-all flex items-center gap-2 shadow-xs cursor-pointer min-w-0"
			data-testid="btn-writeoff-surgery-packet"
			title="Списание пакета: Анестетик + игла 27G + скальпель + шовник + губка"
		>
			<ShieldCheck size={16} className="text-purple-600 dark:text-purple-400 shrink-0" />
			<span className="truncate min-w-0">
				{submittingPackageId === "surgery" ? "Списание..." : "Хирургический пакет"}
			</span>
		</button>
	</div>
);
