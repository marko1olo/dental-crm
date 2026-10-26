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
			className="btn-writeoff-anesthetic-carpule h-10 min-h-[44px] px-3 rounded-xl text-xs font-semibold bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] hover:bg-[var(--paper-soft)] active:scale-98 transition inline-flex items-center gap-2 shadow-xs cursor-pointer min-w-0"
			data-testid="btn-writeoff-anesthetic-carpule"
			title="Списание использованных карпул анестетика медсестрой без комиссии"
		>
			<Syringe size={15} className="text-teal-600 dark:text-teal-400 shrink-0" />
			<span className="truncate min-w-0">
				{submittingPackageId === "carpule_quick" ? "Списание..." : "Списать анестетик"}
			</span>
		</button>

		{/* 2. НАБОР СТЕРИЛИЗАЦИИ */}
		<button
			type="button"
			onClick={() => onPackageClick("sterilization_kit")}
			disabled={Boolean(submittingPackageId)}
			className="btn-writeoff-sterilization-kit h-10 min-h-[44px] px-3 rounded-xl text-xs font-semibold bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] hover:bg-[var(--paper-soft)] active:scale-98 transition inline-flex items-center gap-2 shadow-xs cursor-pointer min-w-0"
			data-testid="btn-writeoff-sterilization-kit"
			title="Списание набора стерилизации: 1 лоток + перчатки"
		>
			<PackageCheck size={15} className="text-teal-600 dark:text-teal-400 shrink-0" />
			<span className="truncate min-w-0">
				{submittingPackageId === "sterilization_kit" ? "Списание..." : "Набор стерилизации"}
			</span>
		</button>

		{/* 3. АНЕСТЕЗИЯ */}
		<button
			type="button"
			onClick={() => onPackageClick("anesthesia")}
			disabled={Boolean(submittingPackageId)}
			className="btn-writeoff-anesthesia-packet h-10 min-h-[44px] px-3 rounded-xl text-xs font-semibold bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] hover:bg-[var(--paper-soft)] active:scale-98 transition inline-flex items-center gap-2 shadow-xs cursor-pointer min-w-0"
			data-testid="btn-writeoff-anesthesia-packet"
			title="Списание пакета: Артикаин 1.7 мл + карпульная игла 30G + расходники"
		>
			<Syringe size={15} className="text-teal-600 dark:text-teal-400 shrink-0" />
			<span className="truncate min-w-0">
				{submittingPackageId === "anesthesia" ? "Списание..." : "Стандартная анестезия"}
			</span>
		</button>

		{/* 4. ПРОФГИГИЕНА */}
		<button
			type="button"
			onClick={() => onPackageClick("hygiene")}
			disabled={Boolean(submittingPackageId)}
			className="btn-writeoff-hygiene-packet h-10 min-h-[44px] px-3 rounded-xl text-xs font-semibold bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] hover:bg-[var(--paper-soft)] active:scale-98 transition inline-flex items-center gap-2 shadow-xs cursor-pointer min-w-0"
			data-testid="btn-writeoff-hygiene-packet"
			title="Списание пакета: СИЗ + Оптрагейт + порошок Air-Flow + паста + щетка"
		>
			<PackageCheck size={15} className="text-teal-600 dark:text-teal-400 shrink-0" />
			<span className="truncate min-w-0">
				{submittingPackageId === "hygiene" ? "Списание..." : "Профгигиена"}
			</span>
		</button>

		{/* 5. ПЛОМБА СВЕТОВАЯ */}
		<button
			type="button"
			onClick={() => onPackageClick("filling")}
			disabled={Boolean(submittingPackageId)}
			className="btn-writeoff-filling-packet h-10 min-h-[44px] px-3 rounded-xl text-xs font-semibold bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] hover:bg-[var(--paper-soft)] active:scale-98 transition inline-flex items-center gap-2 shadow-xs cursor-pointer min-w-0"
			data-testid="btn-writeoff-filling-packet"
			title="Списание пакета: СИЗ + анестетик + нанокомпозит + адгезив + матрица"
		>
			<Sparkles size={15} className="text-teal-600 dark:text-teal-400 shrink-0" />
			<span className="truncate min-w-0">
				{submittingPackageId === "filling" ? "Списание..." : "Пломба световая"}
			</span>
		</button>

		{/* 6. ХИРУРГИЯ */}
		<button
			type="button"
			onClick={() => onPackageClick("surgery")}
			disabled={Boolean(submittingPackageId)}
			className="btn-writeoff-surgery-packet h-10 min-h-[44px] px-3 rounded-xl text-xs font-semibold bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] hover:bg-[var(--paper-soft)] active:scale-98 transition inline-flex items-center gap-2 shadow-xs cursor-pointer min-w-0"
			data-testid="btn-writeoff-surgery-packet"
			title="Списание пакета: Анестетик + игла 27G + скальпель + шовник + губка"
		>
			<ShieldCheck size={15} className="text-teal-600 dark:text-teal-400 shrink-0" />
			<span className="truncate min-w-0">
				{submittingPackageId === "surgery" ? "Списание..." : "Хирургический пакет"}
			</span>
		</button>
	</div>
);
