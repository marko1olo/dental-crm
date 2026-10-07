import {
	Check,
	Layers,
	PackageCheck,
	ShieldCheck,
	Sparkles,
	Zap,
} from "lucide-react";
import React from "react";

export interface ClinicalWriteoffQuickStripProps {
	readonly onQuickCarpuleWriteoff: () => void;
	readonly onQuickAnesthesiaPackageWriteoff: () => void;
	readonly onQuickTherapyWriteoff: () => void;
	readonly onQuickSurgeryWriteoff: () => void;
}

export const ClinicalWriteoffQuickStrip: React.FC<
	ClinicalWriteoffQuickStripProps
> = ({
	onQuickCarpuleWriteoff,
	onQuickAnesthesiaPackageWriteoff,
	onQuickTherapyWriteoff,
	onQuickSurgeryWriteoff,
}) => {
	return (
		<>
			{/* Режим списания: утверждение врачом или медсестрой */}
			<div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-line bg-paper text-xs">
				<div className="flex items-center gap-2 text-ink">
					<ShieldCheck size={18} className="text-teal-600 shrink-0" />
					<span className="font-bold">
						Списание материалов лечащим врачом или ассистентом
					</span>
				</div>
				<span className="text-[11px] font-semibold text-teal-700 dark:text-teal-300 inline-flex items-center gap-1">
					<Check size={12} className="text-teal-600" aria-hidden="true" />
					<span>Электронный акт списания</span>
				</span>
			</div>

			{/* Экспресс-списание */}
			<div
				className="flex flex-wrap items-center gap-2 p-3 rounded-xl border border-teal-500/30 bg-teal-500/5 text-xs"
				data-testid="quick-writeoff-strip"
			>
				<span className="font-bold text-teal-800 dark:text-teal-300 flex items-center gap-1">
					<Zap size={14} className="text-teal-600" />
					<span>Экспресс-списание:</span>
				</span>
				<button
					type="button"
					onClick={onQuickCarpuleWriteoff}
					className="min-h-[44px] h-11 px-4 rounded-xl text-xs font-bold bg-[var(--paper)] border border-teal-500/40 text-teal-800 dark:text-teal-200 hover:bg-teal-500/10 transition-all cursor-pointer flex items-center gap-2 shadow-2xs active:scale-95"
					data-testid="btn-quick-carpule-writeoff"
					title="Списать 1 использованную карпулу анестетика (Артикаин)"
				>
					<PackageCheck size={16} className="text-teal-600 shrink-0" />
					<span>Карпула анестетика (1 шт.)</span>
				</button>
				<button
					type="button"
					onClick={onQuickAnesthesiaPackageWriteoff}
					className="min-h-[44px] h-11 px-4 rounded-xl text-xs font-bold bg-[var(--paper)] border border-teal-500/60 text-teal-900 dark:text-teal-100 hover:bg-teal-500/10 transition-all cursor-pointer flex items-center gap-2 shadow-2xs active:scale-95"
					data-testid="btn-quick-anesthesia-package-writeoff"
					title="Списать стандартный пакет анестезии (карпула 1.7 мл + игла 30G + антисептик)"
				>
					<PackageCheck size={16} className="text-teal-600 shrink-0" />
					<span>Пакет анестезии (карпула + игла + антисептик)</span>
				</button>
				<button
					type="button"
					onClick={onQuickTherapyWriteoff}
					className="min-h-[44px] h-11 px-4 rounded-xl text-xs font-bold bg-[var(--paper)] border border-blue-500/40 text-blue-800 dark:text-blue-200 hover:bg-blue-500/10 transition-all cursor-pointer flex items-center gap-2 shadow-2xs active:scale-95"
					data-testid="btn-quick-therapy-writeoff"
					title="Пакетное списание расходников терапии (анестезия + композит + расходники)"
				>
					<Layers size={16} className="text-blue-600 shrink-0" />
					<span>Пакет «Терапия»</span>
				</button>
				<button
					type="button"
					onClick={onQuickSurgeryWriteoff}
					className="min-h-[44px] h-11 px-4 rounded-xl text-xs font-bold bg-[var(--paper)] border border-purple-500/40 text-purple-800 dark:text-purple-200 hover:bg-purple-500/10 transition-all cursor-pointer flex items-center gap-2 shadow-2xs active:scale-95"
					data-testid="btn-quick-surgery-writeoff"
					title="Пакетное списание расходников хирургии (анестезия + скальпель + шовный материал)"
				>
					<Sparkles size={16} className="text-purple-600 shrink-0" />
					<span>Пакет «Хирургия»</span>
				</button>
			</div>
		</>
	);
};
