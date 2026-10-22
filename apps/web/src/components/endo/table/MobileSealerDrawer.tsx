import React from "react";
import { Check, X } from "lucide-react";
import type { EndoCanalData } from "@dental/shared";
import { ENDO_SEALER_OPTIONS } from "../endoCanalConstants";

export interface MobileSealerDrawerProps {
	readonly activeCanalForSealer: EndoCanalData | null;
	readonly onClose: () => void;
	readonly onSelectSealer: (canalId: string, sealer: string) => void;
}

export const MobileSealerDrawer: React.FC<MobileSealerDrawerProps> = ({
	activeCanalForSealer,
	onClose,
	onSelectSealer,
}) => {
	if (!activeCanalForSealer) return null;

	return (
		<div
			className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
			onClick={onClose}
		>
			<div
				className="bg-[var(--paper,#ffffff)] dark:bg-slate-900 border-t border-[var(--line,#e2e8f0)] dark:border-slate-800 rounded-t-[24px] p-4 shadow-2xl max-h-[85vh] overflow-y-auto space-y-3 animate-in slide-in-from-bottom duration-250 pb-[calc(1rem+env(safe-area-inset-bottom))]"
				onClick={(e) => e.stopPropagation()}
			>
				<div className="w-10 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto -mt-1 mb-2" />
				<div className="flex items-center justify-between pb-2 border-b border-[var(--line,#e2e8f0)] dark:border-slate-800">
					<div>
						<h3 className="text-sm font-black text-[var(--ink,#0f172a)] dark:text-white">
							Выбор силера (обтурация)
						</h3>
						<p className="text-xs text-slate-500 dark:text-slate-400">
							Канал: {activeCanalForSealer.canalName}
						</p>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="min-h-[44px] min-w-[44px] rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
						aria-label="Закрыть выбор силера"
					>
						<X size={18} />
					</button>
				</div>
				<div className="space-y-2 pt-1">
					{ENDO_SEALER_OPTIONS.map((opt) => {
						const isSelected =
							activeCanalForSealer.sealer === opt ||
							(!activeCanalForSealer.sealer && opt.startsWith("AH Plus"));
						return (
							<button
								key={opt}
								type="button"
								onClick={() => {
									onSelectSealer(activeCanalForSealer.id, opt);
									onClose();
								}}
								className={`w-full min-h-[50px] p-3 rounded-xl border flex items-center justify-between text-left transition-all cursor-pointer ${
									isSelected
										? "bg-rose-50/80 dark:bg-rose-950/40 border-rose-500 text-rose-950 dark:text-rose-100 font-bold"
										: "bg-[var(--surface,#f8fafc)] dark:bg-slate-800/80 border-[var(--line,#cbd5e1)] dark:border-slate-700 text-[var(--ink,#0f172a)] dark:text-slate-200"
								}`}
							>
								<div className="min-w-0 pr-2">
									<div className="text-xs font-bold truncate">{opt}</div>
									<div className="text-[10px] text-slate-500 dark:text-slate-400">
										{opt.includes("биокерамик")
											? "Биокерамический гидрофильный герметик (Septodont/FKG)"
											: opt.includes("эпоксид")
												? "Эпоксидно-аминовый золотой стандарт СтАР"
												: opt.includes("Ca(OH)2")
													? "Временная лекарственная антисептическая паста"
													: "Эндодонтический пломбировочный материал"}
									</div>
								</div>
								{isSelected && (
									<Check size={18} className="text-rose-600 shrink-0 font-bold" />
								)}
							</button>
						);
					})}
				</div>
			</div>
		</div>
	);
};
