import { PackageCheck, ShieldCheck, Sparkles, Syringe, Zap } from "lucide-react";
import type React from "react";

export interface NurseCarpule1ClickPackagesProps {
	readonly onPackageClick: (
		packageId: "anesthesia" | "hygiene" | "filling" | "surgery",
	) => void;
	readonly onShiftCloseClassBDisposal: () => void;
}

export const NurseCarpule1ClickPackages: React.FC<
	NurseCarpule1ClickPackagesProps
> = ({ onPackageClick, onShiftCloseClassBDisposal }) => {
	return (
		<div className="p-3 rounded-xl border border-teal-500/20 bg-teal-500/5 flex flex-col gap-2">
			<div className="flex items-center justify-between">
				<span className="text-xs font-bold text-teal-800 dark:text-teal-200 flex items-center gap-1.5 min-w-0">
					<Zap
						size={14}
						className="text-teal-600 dark:text-teal-400 shrink-0"
					/>
					<span className="truncate">Пакетное списание в 1 клик:</span>
				</span>
				<span className="text-[11px] font-semibold text-teal-700 dark:text-teal-300 shrink-0">
					Мягкий овердрафт активен
				</span>
			</div>
			<div className="flex items-center gap-2 flex-wrap">
				{/* 1. Анестезия */}
				<button
					type="button"
					onClick={() => onPackageClick("anesthesia")}
					className="btn-writeoff-anesthesia-packet min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-bold border border-teal-500/40 bg-[var(--paper,#ffffff)] text-teal-800 dark:text-teal-200 hover:bg-teal-500/10 active:scale-98 transition-all flex items-center gap-2 cursor-pointer shadow-xs min-w-0"
					data-testid="btn-writeoff-anesthesia-packet"
					title="Пакет: анестезия 1.7 мл + карпульная игла 30G + валики"
				>
					<Syringe
						size={16}
						className="text-teal-600 dark:text-teal-400 shrink-0"
					/>
					<span className="truncate min-w-0">Стандартная анестезия</span>
				</button>

				{/* 2. Профгигиена */}
				<button
					type="button"
					onClick={() => onPackageClick("hygiene")}
					className="btn-writeoff-hygiene-packet min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-bold border border-blue-500/40 bg-[var(--paper,#ffffff)] text-blue-800 dark:text-blue-200 hover:bg-blue-500/10 active:scale-98 transition-all flex items-center gap-2 cursor-pointer shadow-xs min-w-0"
					data-testid="btn-writeoff-hygiene-packet"
					title="Пакет: СИЗ + Оптрагейт + порошок Air-Flow + паста + щетка"
				>
					<PackageCheck
						size={16}
						className="text-blue-600 dark:text-blue-400 shrink-0"
					/>
					<span className="truncate min-w-0">Профгигиена</span>
				</button>

				{/* 3. Пломба световая */}
				<button
					type="button"
					onClick={() => onPackageClick("filling")}
					className="btn-writeoff-filling-packet min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-bold border border-emerald-500/40 bg-[var(--paper,#ffffff)] text-emerald-800 dark:text-emerald-200 hover:bg-emerald-500/10 active:scale-98 transition-all flex items-center gap-2 cursor-pointer shadow-xs min-w-0"
					data-testid="btn-writeoff-filling-packet"
					title="Пакет: СИЗ + анестетик + нанокомпозит + адгезив + матрица"
				>
					<Sparkles
						size={16}
						className="text-emerald-600 dark:text-emerald-400 shrink-0"
					/>
					<span className="truncate min-w-0">Пломба световая</span>
				</button>

				{/* 4. Хирургия */}
				<button
					type="button"
					onClick={() => onPackageClick("surgery")}
					className="btn-writeoff-surgery-packet min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-bold border border-purple-500/40 bg-[var(--paper,#ffffff)] text-purple-800 dark:text-purple-200 hover:bg-purple-500/10 active:scale-98 transition-all flex items-center gap-2 cursor-pointer shadow-xs min-w-0"
					data-testid="btn-writeoff-surgery-packet"
					title="Пакет: Анестетик + игла 27G + скальпель + шовник + губка"
				>
					<ShieldCheck
						size={16}
						className="text-purple-600 dark:text-purple-400 shrink-0"
					/>
					<span className="truncate min-w-0">Хирургия</span>
				</button>

				{/* 5. Сдача отходов смены (Класс Б, СанПиН 2.1.3684-21) */}
				<button
					type="button"
					onClick={onShiftCloseClassBDisposal}
					className="btn-shift-close-class-b-disposal min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-bold border border-amber-500/40 bg-[var(--paper,#ffffff)] text-amber-800 dark:text-amber-200 hover:bg-amber-500/10 active:scale-98 transition-all flex items-center gap-2 cursor-pointer shadow-xs min-w-0"
					data-testid="btn-shift-close-class-b-disposal"
					title="1-клик сдача отходов смены (Класс Б, СанПиН 2.1.3684-21) без комиссии из 3 человек"
				>
					<ShieldCheck
						size={16}
						className="text-amber-600 dark:text-amber-400 shrink-0"
					/>
					<span className="truncate min-w-0">
						Сдать отходы смены (Класс Б)
					</span>
				</button>
			</div>
		</div>
	);
};
