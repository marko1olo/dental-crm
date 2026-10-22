import { ShieldCheck } from "lucide-react";

export interface ClinicalCatalogModalFooterProps {
	onClose: () => void;
}

export function ClinicalCatalogModalFooter({ onClose }: ClinicalCatalogModalFooterProps) {
	return (
		<div className="px-4 py-2.5 border-t border-[var(--glass-border)] bg-[var(--paper-soft)] flex items-center justify-between text-xs text-[var(--muted)] shrink-0">
			<div className="flex items-center gap-2">
				<ShieldCheck size={14} className="text-emerald-500 shrink-0" />
				<span>Федеральные клинические стандарты • 1 142 протокола лечения</span>
			</div>

			<button
				type="button"
				onClick={onClose}
				className="h-7 sm:h-8 px-3 rounded-lg text-xs font-bold border border-[var(--glass-border)] bg-[var(--paper)] hover:bg-[var(--paper-strong)] text-[var(--ink)] transition-colors cursor-pointer"
			>
				Закрыть
			</button>
		</div>
	);
}
