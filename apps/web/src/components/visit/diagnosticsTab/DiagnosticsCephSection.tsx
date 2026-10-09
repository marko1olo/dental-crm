import { Activity, ChevronDown, ChevronRight } from "lucide-react";
import React from "react";

export interface DiagnosticsCephSectionProps {
	isOpen: boolean;
	setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
	onOpenCephModal: () => void;
}

export function DiagnosticsCephSection({
	isOpen,
	setIsOpen,
	onOpenCephModal,
}: DiagnosticsCephSectionProps) {
	return (
		<div className="border border-[var(--line-subtle)] rounded-xl overflow-hidden bg-[var(--paper-soft)] hover:border-[var(--teal)]/40 shadow-2xs transition-all">
			<button
				type="button"
				onClick={() => setIsOpen((prev) => !prev)}
				data-testid="toggle-advanced-diagnostics-btn"
				className="w-full p-3 flex items-center justify-between gap-3 text-left bg-transparent border-0 hover:bg-[var(--paper)]/50 transition-colors cursor-pointer"
				aria-expanded={isOpen}
			>
				<div className="flex items-center gap-2.5">
					<div className="w-6 h-6 rounded-md bg-[var(--paper)] border border-[var(--line-subtle)] text-[var(--muted)] flex items-center justify-center shrink-0">
						{isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
					</div>
					<div className="flex items-center gap-2 flex-wrap">
						<span className="text-xs font-bold text-[var(--ink)]">
							Расширенная и ортодонтическая диагностика (ТРГ / Цефалометрия)
						</span>
						<span className="text-[10px] font-semibold text-[var(--muted)] bg-[var(--paper)] px-2 py-0.5 rounded-md border border-[var(--line-subtle)]">
							Для ортодонтии и челюстно-лицевой хирургии
						</span>
					</div>
				</div>
				<div className="flex items-center gap-2">
					<span className="text-[11px] text-[var(--muted)] shrink-0 hidden sm:inline">
						{isOpen ? "Свернуть секцию" : "Развернуть протокол ТРГ"}
					</span>
				</div>
			</button>

			<div
				data-testid="visit-ceph-diagnostic-card"
				className={`p-3 pt-0 border-t border-[var(--line-subtle)] ${isOpen ? "block" : "hidden"}`}
			>
				<div className="p-3 rounded-lg bg-[var(--paper)] border border-[var(--line-subtle)] hover:border-[var(--teal)]/40 flex flex-col justify-between gap-2.5 shadow-2xs transition-all mt-2">
					<div className="flex items-start gap-3">
						<div className="w-9 h-9 rounded-lg bg-[var(--paper-soft)] border border-[var(--line-subtle)] text-[var(--teal)] flex items-center justify-center shrink-0 shadow-2xs">
							<Activity size={18} />
						</div>
						<div className="min-w-0 flex-1">
							<div className="flex items-center gap-2 flex-wrap">
								<strong className="text-xs sm:text-sm font-bold text-[var(--ink)]">
									Цефалометрический анализ ТРГ
								</strong>
								<span className="text-[10px] font-semibold text-[var(--muted)] bg-[var(--paper-soft)] px-1.5 py-0.5 rounded border border-[var(--line-subtle)]">
									Протокол ТРГ
								</span>
							</div>
							<p className="text-xs text-[var(--muted)] m-0 mt-0.5 leading-snug">
								Разметка анатомических ориентиров (S, N, A, B, Pog, Go, Gn), расчет угловых и линейных параметров Steiner / Tweed / Ricketts / McNamara, определение типа роста и перенос ортодонтического заключения в дневник приёма.
							</p>
						</div>
					</div>

					<div className="flex items-center justify-end pt-1 border-t border-[var(--line-subtle)]">
						<button
							type="button"
							onClick={onOpenCephModal}
							data-testid="open-visit-ceph-modal-btn"
							className="diag-btn"
						>
							<Activity size={14} className="text-[var(--teal)]" />
							<span>Открыть анализ ТРГ</span>
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
