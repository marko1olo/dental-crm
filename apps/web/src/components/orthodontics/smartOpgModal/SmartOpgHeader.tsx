import React from "react";
import { Sparkles, X } from "lucide-react";

interface SmartOpgHeaderProps {
	patientName: string;
	backendLabel?: string | undefined;
	onClose: () => void;
}

export const SmartOpgHeader: React.FC<SmartOpgHeaderProps> = ({
	patientName,
	backendLabel,
	onClose,
}) => {
	const cleanName = patientName.replace(/\s*\(.*\)/, "");

	return (
		<header className="flex items-center justify-between px-3 sm:px-6 py-2.5 sm:py-3.5 bg-[var(--paper-soft)] border-b border-[var(--line)] shrink-0">
			<div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
				<div className="p-1.5 sm:p-2 bg-sky-500/10 text-sky-500 rounded-xl border border-sky-500/20 shrink-0">
					<Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
				</div>
				<div className="min-w-0">
					<div className="flex items-center gap-2">
						<h2 className="text-xs sm:text-base font-bold text-[var(--ink)] tracking-wide truncate">
							Анализ ОПТГ (Smart OPG) · {cleanName}
						</h2>
						<span className="hidden sm:inline-block text-[11px] px-2 py-0.5 rounded-full bg-[var(--paper-strong)] text-[var(--muted)] border border-[var(--line)] font-semibold shrink-0">
							{backendLabel || "Локальный анализ"}
						</span>
					</div>
					<p className="text-[11px] sm:text-xs text-[var(--muted)] truncate">
						Анализ зубных дуг, выявление ретенции зубов мудрости и очагов
					</p>
				</div>
			</div>

			<div className="flex items-center gap-2 shrink-0">
				<button
					type="button"
					onClick={onClose}
					className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-hover,#f1f5f9)] transition-colors cursor-pointer"
					aria-label="Закрыть"
					data-testid="btn-close-smart-opg"
				>
					<X className="w-5 h-5" />
				</button>
			</div>
		</header>
	);
};
