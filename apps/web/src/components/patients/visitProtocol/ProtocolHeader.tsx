import React from "react";
import { FileText, Printer, Save, ShieldCheck, X } from "lucide-react";
import { ToothMolar } from "../../icons/DentalIcons";

export interface ProtocolHeaderProps {
	readonly date?: string | undefined;
	readonly patientName: string;
	readonly doctorName: string;
	readonly onOpenLabOrder: () => void;
	readonly onApplySomaticNorm: () => void;
	readonly onPrint: () => void;
	readonly onSave: () => void;
	readonly onClose?: (() => void) | undefined;
}

export const ProtocolHeader: React.FC<ProtocolHeaderProps> = ({
	date,
	patientName,
	doctorName,
	onOpenLabOrder,
	onApplySomaticNorm,
	onPrint,
	onSave,
	onClose,
}) => {
	return (
		<div className="flex items-center justify-between gap-2 flex-wrap pb-3 border-b border-[var(--glass-border)] print:hidden">
			<div className="flex items-center gap-2.5 min-w-0">
				<div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center shrink-0">
					<FileText className="w-4 h-4" />
				</div>
				<div className="min-w-0">
					<div className="flex items-center gap-2 flex-wrap">
						<h3 className="text-sm font-black m-0 text-[var(--ink)]">Протокол приёма</h3>
						{date && (
							<span className="text-[11px] font-bold px-1.5 py-0.2 rounded bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20">
								{date}
							</span>
						)}
						<span className="text-[11px] font-bold text-[var(--muted)]">
							{patientName} • {doctorName}
						</span>
					</div>
					<p className="text-[11px] text-[var(--muted)] m-0">
						Электронный дневник приёма • Диагноз • Автосписание материалов
					</p>
				</div>
			</div>

			<div className="flex items-center gap-2 shrink-0 flex-wrap">
				<button
					type="button"
					data-testid="btn-visit-lab-order"
					onClick={onOpenLabOrder}
					className="min-h-[44px] sm:min-h-[36px] px-3 text-xs font-bold rounded-xl border border-teal-500/30 bg-teal-500/10 hover:bg-teal-500/20 text-teal-800 dark:text-teal-200 transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
					title="Оформить наряд-заказ в зуботехническую лабораторию (ЗТЛ)"
				>
					<ToothMolar className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
					<span>Наряд ЗТЛ</span>
				</button>

				<button
					type="button"
					data-testid="btn-visit-somatic-norm"
					onClick={onApplySomaticNorm}
					className="min-h-[44px] sm:min-h-[36px] px-3 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
					title="Заполнить соматику и статус физиологической нормой"
				>
					<ShieldCheck className="w-4 h-4" />
					<span>Норма соматики</span>
				</button>

				<button
					type="button"
					data-testid="btn-print-visit-protocol"
					onClick={onPrint}
					className="min-h-[44px] sm:min-h-[36px] px-3 text-xs font-semibold rounded-xl border border-[var(--glass-border)] bg-[var(--paper-strong)] hover:bg-[var(--glass-hover,var(--paper-soft))] text-[var(--ink)] transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
					title="Печать протокола приёма"
				>
					<Printer className="w-3.5 h-3.5" />
					<span>Печать</span>
				</button>

				<button
					type="button"
					data-testid="btn-save-visit-protocol"
					onClick={onSave}
					className="min-h-[44px] sm:min-h-[36px] px-3.5 text-xs font-semibold rounded-xl bg-[var(--teal)] hover:opacity-95 text-white transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-xs"
				>
					<Save className="w-3.5 h-3.5" />
					<span>Сохранить</span>
				</button>

				{onClose && (
					<button
						type="button"
						onClick={onClose}
						className="min-h-[44px] sm:min-h-[36px] min-w-[44px] sm:min-w-[36px] rounded-xl border border-[var(--glass-border)] bg-[var(--paper-strong)] text-[var(--muted)] hover:text-[var(--ink)] flex items-center justify-center cursor-pointer transition-all shadow-2xs"
						aria-label="Закрыть"
					>
						<X className="w-4 h-4" />
					</button>
				)}
			</div>
		</div>
	);
};
