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
				className="w-full min-h-[48px] px-3.5 py-2.5 rounded-xl border border-emerald-600/30 bg-emerald-500/10 text-[var(--ink)] font-bold text-sm flex items-center justify-between active:scale-98 transition-all"
			>
				<span className="flex items-center gap-2">
					<CheckCircle2 size={16} className="text-emerald-600" />
					<span>Убистезин форте 1:100 000 (1.7 мл)</span>
				</span>
				<span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
					Норма
				</span>
			</button>
			{onApplySeptanest100k && (
				<button
					type="button"
					disabled={disabled}
					onClick={() => {
						onApplySeptanest100k();
						onClose();
					}}
					className="w-full min-h-[48px] px-3.5 py-2.5 rounded-xl border border-teal-600/30 bg-teal-500/10 text-[var(--ink)] font-bold text-sm flex items-center justify-between active:scale-98 transition-all"
				>
					<span className="flex items-center gap-2">
						<Syringe size={16} className="text-teal-600" />
						<span>Септанест 1:100 000 (1.7 мл)</span>
					</span>
					<span className="text-xs font-semibold text-teal-700 dark:text-teal-300">
						1 карп.
					</span>
				</button>
			)}
			<button
				type="button"
				disabled={disabled}
				onClick={() => {
					onApplyUltracain200k();
					onClose();
				}}
				className="w-full min-h-[48px] px-3.5 py-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-semibold text-sm flex items-center justify-between active:scale-98 transition-all"
			>
				<span className="flex items-center gap-2">
					<Syringe size={16} className="text-teal-600" />
					<span>Ультракаин Д-С 1:200 000 (1.7 мл)</span>
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
				className="w-full min-h-[48px] px-3.5 py-2.5 rounded-xl border border-amber-600/30 bg-amber-500/10 text-[var(--ink)] font-bold text-sm flex items-center justify-between active:scale-98 transition-all"
			>
				<span className="flex items-center gap-2">
					<Syringe size={16} className="text-amber-600" />
					<span>Скандонест без адреналина (1.7 мл)</span>
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
