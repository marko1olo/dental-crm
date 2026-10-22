import { BookOpen, X } from "lucide-react";

export interface ClinicalCatalogModalHeaderProps {
	activeTooth?: number | null;
	onClose: () => void;
}

export function ClinicalCatalogModalHeader({
	activeTooth,
	onClose,
}: ClinicalCatalogModalHeaderProps) {
	return (
		<div className="flex items-center justify-between px-4 py-3 border-b border-[var(--glass-border)] bg-[var(--paper-soft)] shrink-0">
			<div className="flex items-center gap-2.5">
				<div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--teal-soft)] text-[var(--teal-dark)] border border-[var(--teal-soft)] shadow-2xs shrink-0">
					<BookOpen size={18} />
				</div>
				<div>
					<div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
						<h3 className="text-sm sm:text-base font-extrabold text-[var(--ink)] leading-tight">
							Каталог клинических протоколов
						</h3>
						<span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-[var(--teal-surface)] text-[var(--teal-dark)] border border-[var(--teal-soft)] shrink-0">
							1 142 протокола
						</span>
						{activeTooth && (
							<span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-800 dark:text-blue-300 border border-blue-500/30 shrink-0">
								{`Зуб ${activeTooth}`}
							</span>
						)}
					</div>
					<p className="text-[11px] text-[var(--muted)]">
						Заполнение карты и дневника приёма: жалобы • анамнез • объективно • лечение • рекомендации
					</p>
				</div>
			</div>

			<button
				type="button"
				onClick={onClose}
				className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)] transition-colors cursor-pointer"
				aria-label="Закрыть"
				data-testid="btn-close-protocols-catalog-modal"
			>
				<X size={18} />
			</button>
		</div>
	);
}
