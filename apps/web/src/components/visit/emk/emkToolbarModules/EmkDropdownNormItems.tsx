import React from "react";
import { ShieldCheck } from "lucide-react";

export interface EmkDropdownNormItemsProps {
	onClose: () => void;
	onApplyNorm?: (() => void) | undefined;
	onApplyPhysiologicalNorm?: (() => void) | undefined;
	onApplyOrthoNorm?: (() => void) | undefined;
	onApplySurgeryNorm?: (() => void) | undefined;
}

export function EmkDropdownNormItems({
	onClose,
	onApplyNorm,
	onApplyPhysiologicalNorm,
	onApplyOrthoNorm,
	onApplySurgeryNorm,
}: EmkDropdownNormItemsProps) {
	return (
		<>
			<div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
				Клинические нормы
			</div>

			{Boolean(onApplyNorm || onApplyPhysiologicalNorm) && (
				<button
					type="button"
					data-testid="btn-quick-soap-norm"
					onClick={() => {
						if (onApplyNorm) onApplyNorm();
						else if (onApplyPhysiologicalNorm) onApplyPhysiologicalNorm();
						onClose();
					}}
					className="w-full text-left px-2.5 py-1.5 rounded-lg font-medium text-[var(--ink)] hover:bg-[var(--paper-soft)] hover:text-[var(--teal-ink,var(--teal))] flex items-center gap-2 cursor-pointer transition-colors"
					title="Первичный или профилактический осмотр, норма"
				>
					<ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
					<span>Терапевтический осмотр (Норма)</span>
				</button>
			)}

			{Boolean(onApplyOrthoNorm) && (
				<button
					type="button"
					data-testid="btn-quick-soap-ortho-norm"
					onClick={() => {
						if (onApplyOrthoNorm) onApplyOrthoNorm();
						onClose();
					}}
					className="w-full text-left px-2.5 py-1.5 rounded-lg font-medium text-[var(--ink)] hover:bg-[var(--paper-soft)] hover:text-[var(--teal-ink,var(--teal))] flex items-center gap-2 cursor-pointer transition-colors"
					title="Контрольный осмотр ортопеда (окклюзия стабильна)"
				>
					<ShieldCheck className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
					<span>Контроль ортопеда</span>
				</button>
			)}

			{Boolean(onApplySurgeryNorm) && (
				<button
					type="button"
					data-testid="btn-quick-soap-surgery-norm"
					onClick={() => {
						if (onApplySurgeryNorm) onApplySurgeryNorm();
						onClose();
					}}
					className="w-full text-left px-2.5 py-1.5 rounded-lg font-medium text-[var(--ink)] hover:bg-[var(--paper-soft)] hover:text-[var(--teal-ink,var(--teal))] flex items-center gap-2 cursor-pointer transition-colors"
					title="Послеоперационный контрольный осмотр хирурга"
				>
					<ShieldCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
					<span>Контроль хирурга</span>
				</button>
			)}
		</>
	);
}
