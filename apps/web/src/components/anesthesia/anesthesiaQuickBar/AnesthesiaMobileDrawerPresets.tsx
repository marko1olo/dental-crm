import { Check, CheckCircle2, Syringe } from "lucide-react";

export interface AnesthesiaMobileDrawerPresetsProps {
	disabled?: boolean | undefined;
	onApplyUltracainForte: () => void;
	onApplySeptanest100k?: (() => void) | undefined;
	onApplyUltracain200k: () => void;
	onApplyScandonestCardio: () => void;
	onApplyNoAnesthesia: () => void;
	onClose: () => void;
}

export function AnesthesiaMobileDrawerPresets({
	disabled,
	onApplyUltracainForte,
	onApplySeptanest100k,
	onApplyUltracain200k,
	onApplyScandonestCardio,
	onApplyNoAnesthesia,
	onClose,
}: AnesthesiaMobileDrawerPresetsProps) {
	return (
		<div className="grid grid-cols-1 gap-2">
			<button
				type="button"
				disabled={disabled}
				onClick={() => {
					onApplyUltracainForte();
					onClose();
				}}
				className="w-full min-h-[50px] px-3.5 py-2.5 rounded-xl border border-emerald-600/30 bg-emerald-500/10 text-[var(--ink)] font-bold text-sm flex items-center justify-between active:scale-98 transition-all"
				title="Норма: Артикаин 1:100 000 (Ультракаин Д-С Форте 1:100 000, 1 карпула 1.7 мл)"
			>
				<span className="flex items-center gap-2">
					<CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
					<span>Норма: Артикаин 1:100 000 (1 карпула)</span>
					<span className="sr-only">Ультракаин Д-С Форте 1:100 000</span>
				</span>
				<span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
					Норма
				</span>
			</button>
			<button
				type="button"
				disabled={disabled}
				onClick={() => {
					onApplyUltracain200k();
					onClose();
				}}
				className="w-full min-h-[50px] px-3.5 py-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-semibold text-sm flex items-center justify-between active:scale-98 transition-all"
				title="Щадящий адреналин: Артикаин 1:200 000 (Ультракаин Д-С 1:200 000, 1 карпула 1.7 мл)"
			>
				<span className="flex items-center gap-2">
					<Syringe size={18} className="text-teal-600 shrink-0" />
					<span>Щадящий адреналин: Артикаин 1:200 000</span>
					<span className="sr-only">Ультракаин Д-С 1:200 000</span>
				</span>
				<span className="text-xs text-[var(--muted)]">Щадящий</span>
			</button>
			<button
				type="button"
				disabled={disabled}
				onClick={() => {
					onApplyScandonestCardio();
					onClose();
				}}
				className="w-full min-h-[50px] px-3.5 py-2.5 rounded-xl border border-amber-600/30 bg-amber-500/10 text-[var(--ink)] font-bold text-sm flex items-center justify-between active:scale-98 transition-all"
				title="Кардио-защита: Мепивакаин без адреналина (Скандонест 3%, 1 карпула 1.7 мл)"
			>
				<span className="flex items-center gap-2">
					<Syringe size={18} className="text-amber-600 shrink-0" />
					<span>Кардио-защита: Мепивакаин без адреналина</span>
					<span className="sr-only">Скандонест без адреналина</span>
				</span>
				<span className="text-xs font-semibold text-amber-700 dark:text-amber-300">
					Кардио
				</span>
			</button>
			<button
				type="button"
				disabled={disabled}
				onClick={() => {
					onApplyNoAnesthesia();
					onClose();
				}}
				className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-[var(--line-subtle)] bg-[var(--paper-soft)] text-[var(--muted)] font-medium text-xs flex items-center justify-between active:scale-98 transition-all"
			>
				<span>Без анестезии / Интактно</span>
				<Check size={14} />
			</button>
		</div>
	);
}
