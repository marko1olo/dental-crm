import React from "react";
import { Sparkles, ShieldCheck, X } from "lucide-react";

export interface EmrProtocolHeaderProps {
	readonly onClose: () => void;
	readonly patientFullName?: string | null | undefined;
	readonly medicalCardNumber?: string | null | undefined;
	readonly targetTooth?: string | undefined;
}

export const EmrProtocolHeader: React.FC<EmrProtocolHeaderProps> = React.memo(
	function EmrProtocolHeader({
		onClose,
		patientFullName,
		medicalCardNumber,
		targetTooth,
	}) {
		return (
			<header className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] shrink-0">
				<div className="flex items-center gap-3 min-w-0">
					<div className="flex items-center justify-center w-11 h-11 rounded-xl bg-[var(--teal-soft,#f0fdfa)] text-[var(--teal,#0d9488)] border border-[var(--teal,#0d9488)]/30 shrink-0">
						<Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />
					</div>
					<div className="min-w-0">
						<div className="flex items-center gap-2 flex-wrap">
							<h2 className="text-sm sm:text-base lg:text-lg font-bold text-[var(--ink,#0f172a)] truncate">
								Генератор клинических протоколов
							</h2>
							<span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[var(--ok-bg,#f0fdf4)] text-[var(--ok-fg,#059669)] border border-[var(--ok-fg,#059669)]/30 shrink-0">
								<ShieldCheck className="w-3.5 h-3.5" />
								Стандарты СтАР
							</span>
						</div>
						<p className="text-xs text-[var(--muted,#64748b)] truncate mt-0.5">
							{patientFullName ? `Пациент: ${patientFullName}` : "Синтез клинического протокола"}
							{medicalCardNumber ? ` · Карта № ${medicalCardNumber}` : ""}
							{targetTooth ? ` · Зуб FDI № ${targetTooth}` : ""}
						</p>
					</div>
				</div>

				<button
					type="button"
					onClick={onClose}
					className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] w-11 h-11 rounded-xl text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-strong,#f1f5f9)] transition-colors cursor-pointer shrink-0 ml-2"
					aria-label="Закрыть генератор"
				>
					<X className="w-5 h-5" />
				</button>
			</header>
		);
	},
);
