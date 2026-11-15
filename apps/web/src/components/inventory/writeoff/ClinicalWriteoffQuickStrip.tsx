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
	readonly onQuickAnesthesiaPackageWriteoff?: (() => void) | undefined;
	readonly onQuickTherapyWriteoff: () => void;
	readonly onQuickSurgeryWriteoff: () => void;
	readonly onQuickHygieneWriteoff?: (() => void) | undefined;
}

export const ClinicalWriteoffQuickStrip: React.FC<
	ClinicalWriteoffQuickStripProps
> = ({
	onQuickCarpuleWriteoff,
	onQuickAnesthesiaPackageWriteoff,
	onQuickTherapyWriteoff,
	onQuickSurgeryWriteoff,
	onQuickHygieneWriteoff,
}) => {
	return (
		<>
			{/* Режим списания: утверждение врачом или медсестрой */}
			<div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-xs">
				<div className="flex items-center gap-2 text-[var(--ink)]">
					<ShieldCheck size={18} className="text-[var(--teal)] shrink-0" />
					<span className="font-bold">
						Списание материалов лечащим врачом или ассистентом
					</span>
				</div>
				<span className="text-[11px] font-semibold text-[var(--teal)] inline-flex items-center gap-1">
					<Check size={12} className="text-[var(--teal)]" aria-hidden="true" />
					<span>Электронный акт списания</span>
				</span>
			</div>

			{/* Экспресс-списание */}
			<div
				className="flex flex-wrap items-center gap-2 p-3 rounded-xl border border-[var(--teal)]/30 bg-[var(--teal)]/5 text-xs"
				data-testid="quick-writeoff-strip"
			>
				<span className="font-bold text-[var(--teal)] flex items-center gap-1">
					<Zap size={14} className="text-[var(--teal)]" />
					<span>Экспресс-списание:</span>
				</span>
				<button
					type="button"
					onClick={onQuickCarpuleWriteoff}
					className="min-h-[44px] h-11 px-4 rounded-xl text-xs font-bold bg-[var(--paper)] border border-[var(--teal)]/40 text-[var(--teal)] hover:bg-[var(--teal-soft)] transition-all cursor-pointer flex items-center gap-2 shadow-2xs active:scale-95"
					data-testid="btn-quick-carpule-writeoff"
					title="Пакетное списание анестезии на приём (карпула + игла) без поштучного подсчета у кресла"
				>
					<PackageCheck size={16} className="text-[var(--teal)] shrink-0" />
					<span>Пакет анестезии на приём</span>
				</button>
				<button
					type="button"
					onClick={onQuickAnesthesiaPackageWriteoff}
					className="min-h-[44px] h-11 px-4 rounded-xl text-xs font-bold bg-[var(--paper)] border border-[var(--teal)]/60 text-[var(--teal)] hover:bg-[var(--teal-soft)] transition-all cursor-pointer flex items-center gap-2 shadow-2xs active:scale-95"
					data-testid="btn-quick-anesthesia-package-writeoff"
					title="Списать полный пакет анестезии (карпула 1.7 мл + игла 30G + антисептик)"
				>
					<PackageCheck size={16} className="text-[var(--teal)] shrink-0" />
					<span>Полный пакет анестезии</span>
				</button>
				<button
					type="button"
					onClick={onQuickTherapyWriteoff}
					className="min-h-[44px] h-11 px-4 rounded-xl text-xs font-bold bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] hover:border-[var(--teal)] hover:bg-[var(--teal-soft)] transition-all cursor-pointer flex items-center gap-2 shadow-2xs active:scale-95"
					data-testid="btn-quick-therapy-writeoff"
					data-cy="btn-quick-therapy-writeoff"
					title="Пакетное списание расходников терапии (стандартный набор: анестезия + композит + расходники)"
				>
					<Layers size={16} className="text-[var(--teal)] shrink-0" />
					<span>✓ Списать стандартный набор терапевта</span>
				</button>
				<button
					type="button"
					onClick={onQuickSurgeryWriteoff}
					className="min-h-[44px] h-11 px-4 rounded-xl text-xs font-bold bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] hover:border-[var(--primary)] hover:bg-[var(--primary-soft)] transition-all cursor-pointer flex items-center gap-2 shadow-2xs active:scale-95"
					data-testid="btn-quick-surgery-writeoff"
					title="Пакетное списание расходников хирургии (анестезия + скальпель + шовный материал)"
				>
					<Sparkles size={16} className="text-[var(--primary)] shrink-0" />
					<span>Пакет «Хирургия»</span>
				</button>
				{onQuickHygieneWriteoff && (
					<button
						type="button"
						onClick={onQuickHygieneWriteoff}
						className="min-h-[44px] h-11 px-4 rounded-xl text-xs font-bold bg-[var(--paper)] border border-[var(--teal,#0d9488)]/40 text-[var(--teal,#0d9488)] hover:bg-[var(--teal,#0d9488)]/10 transition-all cursor-pointer flex items-center gap-2 shadow-2xs active:scale-95"
						data-testid="btn-quick-hygiene-writeoff"
						title="Пакетное списание расходников профгигиены (порошок Air-Flow, паста, щетки)"
					>
						<Sparkles size={16} className="text-[var(--teal,#0d9488)] shrink-0" />
						<span>Пакет «Гигиена»</span>
					</button>
				)}
			</div>
		</>
	);
};
