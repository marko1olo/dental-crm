import React from "react";
import { Sparkles, X } from "lucide-react";
import type { PeriodPreset } from "./retroactiveSanpinEngine";
import { RetroactiveBatchTab } from "./RetroactiveBatchTab";

export interface RetroactiveSanpinBatchModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly onSuccess?: () => void;
	readonly initialPreset?: PeriodPreset | undefined;
}

export function RetroactiveSanpinBatchModal({
	isOpen,
	onClose,
	onSuccess,
	initialPreset = "current_month",
}: RetroactiveSanpinBatchModalProps) {
	if (!isOpen) return null;

	return (
		<div
			className="sanpin-modal-overlay fixed inset-0 bg-black/65 backdrop-blur-xs flex items-center justify-center z-[1050] p-4"
			onClick={onClose}
		>
			<div
				className="sanpin-modal-container bg-[var(--paper)] text-[var(--ink)] rounded-2xl w-full max-w-[1380px] max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-[var(--line)]"
				onClick={(e) => e.stopPropagation()}
			>
				<div className="sanpin-modal-header px-6 py-4 flex items-center justify-between border-b border-[var(--line)] bg-[var(--paper-soft)]">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 rounded-xl bg-[var(--primary)] flex items-center justify-center text-white shadow-xs">
							<Sparkles size={22} />
						</div>
						<div>
							<h3 className="m-0 text-base sm:text-lg font-bold flex items-center gap-2 text-[var(--ink)]">
								Пакетное закрытие журналов стерилизации
								<span className="text-xs font-bold px-2 py-0.5 rounded-md bg-[var(--primary)]/10 text-[var(--primary)]">
									Автозаполнение
								</span>
							</h3>
							<p className="m-0 text-xs text-[var(--muted)]">
								Автоматическое ретроспективное формирование всех журналов клиники за выбранный период
							</p>
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="sanpin-btn sanpin-btn-ghost p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] cursor-pointer transition-colors"
						aria-label="Закрыть"
					>
						<X size={20} />
					</button>
				</div>

				<div className="flex-1 overflow-y-auto px-6 py-5">
					<RetroactiveBatchTab
						initialPreset={initialPreset}
						onSuccess={onSuccess}
						onClose={onClose}
						isModal
					/>
				</div>
			</div>
		</div>
	);
}
