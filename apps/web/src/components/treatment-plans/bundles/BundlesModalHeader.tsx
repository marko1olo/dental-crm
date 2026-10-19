import React from "react";
import { PackageCheck, X } from "lucide-react";

interface BundlesModalHeaderProps {
	onClose: () => void;
}

export const BundlesModalHeader: React.FC<BundlesModalHeaderProps> = ({ onClose }) => (
	<div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-[var(--line)] bg-[var(--paper-strong)] shrink-0">
		<div className="flex items-center gap-3 min-w-0">
			<div className="p-2 rounded-xl bg-[var(--teal)]/10 text-[var(--teal)] border border-[var(--teal)]/20 shrink-0">
				<PackageCheck size={20} />
			</div>
			<div className="min-w-0">
				<div className="flex items-center gap-2 flex-wrap">
					<h2 className="text-sm sm:text-base font-black tracking-tight break-words">
						Клинические пакеты лечения («Все включено»)
					</h2>
					<span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[var(--teal)]/15 text-[var(--teal-dark)] dark:text-teal-300 border border-[var(--teal)]/30 shrink-0">
						Быстрый выбор
					</span>
					<span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-[var(--paper-soft)] text-[var(--muted)] border border-[var(--line)] shrink-0">
						Каталог клинических услуг
					</span>
				</div>
				<p className="text-xs text-[var(--muted)] leading-normal break-words mt-0.5">
					Быстрое добавление полного комплекса услуг в план лечения или счет пациента
				</p>
			</div>
		</div>
		<button
			type="button"
			onClick={onClose}
			className="min-h-[44px] min-w-[44px] p-2 rounded-xl text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors cursor-pointer shrink-0 flex items-center justify-center touch-manipulation"
			title="Закрыть окно (Esc)"
			aria-label="Закрыть окно"
			data-testid="bundles-modal-close-btn"
		>
			<X size={20} />
		</button>
	</div>
);
