import React from "react";
import { FileEdit, Printer, ShieldCheck, Undo2 } from "lucide-react";

export interface MedicalCardHeaderToolbarProps {
	activeTab: "formula" | "indices" | "anamnesis";
	setActiveTab: (tab: "formula" | "indices" | "anamnesis") => void;
	handleApplyGlobalNorm: () => void;
	hasReviseSnapshot: boolean;
	handleCancelRevise: () => void;
	isRevising: boolean;
	revisionCount: number;
	handleBeginRevise: () => void;
	disabled?: boolean | undefined;
	isSigned?: boolean | undefined;
	onPrintBlank: () => void;
	onFastPrint: () => void;
}

const btnClass = "inline-flex items-center gap-1.5 min-h-[44px] px-3 py-2 text-xs font-bold rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] shadow-2xs hover:border-[var(--teal)] hover:text-[var(--teal)] transition-colors cursor-pointer";
const tabClass = (isActive: boolean) =>
	`min-h-[44px] px-3 py-2 text-xs font-bold rounded-lg border transition-colors cursor-pointer shrink-0 ${
		isActive ? "border-[var(--teal)] bg-[var(--teal)] text-white shadow-xs" : "border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:border-[var(--teal)]"
	}`;

export const MedicalCardHeaderToolbar: React.FC<MedicalCardHeaderToolbarProps> = React.memo(
	function MedicalCardHeaderToolbar({
		activeTab, setActiveTab, handleApplyGlobalNorm, hasReviseSnapshot,
		handleCancelRevise, isRevising, revisionCount, handleBeginRevise,
		disabled, isSigned, onPrintBlank, onFastPrint,
	}) {
		const isRevised = isRevising || revisionCount > 0;
		return (
			<div className="flex flex-wrap items-center justify-between gap-2.5 mb-4 pb-1 overflow-x-auto">
				<div className="flex gap-2 shrink-0">
					<button type="button" className={tabClass(activeTab === "formula")} onClick={() => setActiveTab("formula")}>
						Зубная формула FDI и КПУ
					</button>
					<button type="button" className={tabClass(activeTab === "indices")} onClick={() => setActiveTab("indices")}>
						Индексы и Пародонт (CPITN)
					</button>
					<button type="button" className={tabClass(activeTab === "anamnesis")} onClick={() => setActiveTab("anamnesis")}>
						Анамнез, СОПР и План
					</button>
				</div>
				<div className="flex flex-wrap gap-2 items-center shrink-0">
					<button
						type="button"
						data-testid="btn-043-global-norm-1click"
						className={`${btnClass} text-emerald-700 dark:text-emerald-400 border-emerald-500/40`}
						onClick={handleApplyGlobalNorm}
						title="Заполнить всю медицинскую карту нормой. Врач правит только патологию!"
					>
						<ShieldCheck className="w-4 h-4 text-emerald-600" />
						Заполнить нормой
					</button>
					{hasReviseSnapshot && (
						<button
							type="button"
							data-testid="btn-043-undo-norm"
							className={`${btnClass} text-amber-700 dark:text-amber-400 border-amber-500/40`}
							onClick={handleCancelRevise}
							title="Отменить применение нормы и вернуть исходные записи"
						>
							<Undo2 className="w-4 h-4 text-amber-600" />
							Отменить норму
						</button>
					)}
					{(disabled || isSigned) && (
						<button
							type="button"
							data-testid="btn-043-revise"
							className={`${btnClass} ${isRevising ? "border-amber-500 bg-amber-50 dark:bg-amber-950/30 text-amber-800" : ""}`}
							onClick={isRevising ? handleCancelRevise : handleBeginRevise}
							title="Внести исправление в закрытую карту («Исправленному верить»)"
						>
							<FileEdit className="w-4 h-4" />
							{isRevising ? "Отменить ревизию" : "Внести исправление («Исправленному верить»)"}
						</button>
					)}
					<span
						data-testid="form043-stamp-badge"
						className={`min-h-[44px] px-3 py-1.5 rounded-lg text-[11px] font-bold tracking-wider uppercase inline-flex items-center border ${
							isRevised
								? "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/40"
								: isSigned
									? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/40"
									: "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30"
						}`}
					>
						{isRevised
							? `ИСПРАВЛЕННОМУ ВЕРИТЬ (РЕДАКЦИЯ ${revisionCount + (isRevising ? 1 : 0)})`
							: isSigned ? "ПОДПИСАНО ВРАЧОМ" : "ЧЕРНОВИК — ДЛЯ ПРЕДВАРИТЕЛЬНОГО ОЗНАКОМЛЕНИЯ"}
					</span>
					<button
						type="button"
						data-testid="btn-043-print-blank"
						className={btnClass}
						onClick={onPrintBlank}
						title="Печать бланка со строками «________» для ручного заполнения"
					>
						<Printer className="w-4 h-4" />
						Бланк («________»)
					</button>
					<button
						type="button"
						data-testid="btn-043-fast-print"
						className={`${btnClass} border-[var(--teal)]/40 text-[var(--teal)]`}
						onClick={onFastPrint}
						title="Печать медицинской карты в любой момент"
					>
						<Printer className="w-4 h-4" />
						Печать карты
					</button>
				</div>
			</div>
		);
	},
);
