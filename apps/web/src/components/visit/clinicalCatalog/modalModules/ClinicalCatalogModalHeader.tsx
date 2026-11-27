import { ArrowLeft, BookOpen, X } from "lucide-react";

export interface ClinicalCatalogModalHeaderProps {
	activeTooth?: number | null;
	onClose: () => void;
	embedded?: boolean;
}

export function ClinicalCatalogModalHeader({
	activeTooth,
	onClose,
	embedded = false,
}: ClinicalCatalogModalHeaderProps) {
	return (
		<div className="flex items-start sm:items-center justify-between gap-2.5 px-4 py-3 border-b border-[var(--glass-border)] bg-[var(--paper-soft)] shrink-0">
			<div className="flex items-start sm:items-center gap-2.5 min-w-0 flex-1">
				<div className="hidden md:flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--teal-soft)] text-[var(--teal-dark)] border border-[var(--teal-soft)] shadow-2xs shrink-0">
					<BookOpen size={18} />
				</div>
				<div className="min-w-0 flex-1">
					{embedded && (
						<button
							type="button"
							onClick={onClose}
							data-testid="btn-catalog-back-to-protocol"
							className="md:hidden mb-2 h-9 px-3 rounded-lg border border-[var(--line)] bg-[var(--paper)] dark:bg-white/5 hover:bg-[var(--paper-soft)] text-[var(--ink)] text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
						>
							<ArrowLeft className="w-3.5 h-3.5 shrink-0" />
							<span>Назад к протоколу</span>
						</button>
					)}
					<div className="flex items-center gap-1.5 flex-wrap">
						<h3 className="text-sm sm:text-base font-extrabold text-[var(--ink)] leading-tight">
							Каталог клинических протоколов
						</h3>
						<span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-[var(--teal-surface)] text-[var(--teal-dark)] border border-[var(--teal-soft)] shrink-0">
							1 142 протокола
						</span>
						{activeTooth && (
							<span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-[var(--primary-soft)] text-[var(--primary)] border border-[var(--primary-line)] shrink-0">
								{`Зуб ${activeTooth}`}
							</span>
						)}
					</div>
					<p className="text-[11px] text-[var(--muted)] mt-0.5">
						Заполнение карты и дневника приёма: жалобы • анамнез • объективно • лечение • рекомендации
					</p>
				</div>
			</div>

			<button
				type="button"
				onClick={onClose}
				className="w-9 h-9 sm:w-8 sm:h-8 rounded-lg border border-[var(--line)] bg-[var(--paper)] dark:bg-white/5 hover:bg-[var(--paper-soft)] flex items-center justify-center text-[var(--ink-muted)] hover:text-[var(--ink)] transition-colors cursor-pointer shrink-0"
				aria-label="Закрыть"
				data-testid="btn-close-protocols-catalog-modal"
			>
				<X size={18} />
			</button>
		</div>
	);
}
