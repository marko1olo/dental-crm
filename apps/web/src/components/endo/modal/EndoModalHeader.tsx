import React from "react";
import { X } from "lucide-react";
import { EndoFileCanal } from "../../icons/DentalIcons";

interface EndoModalHeaderProps {
	readonly toothAnatomicalName: string;
	readonly toothState?: string | undefined;
	readonly isLoadingFromDb: boolean;
	readonly onClose: () => void;
}

export const EndoModalHeader: React.FC<EndoModalHeaderProps> = ({
	toothAnatomicalName,
	toothState,
	isLoadingFromDb,
	onClose,
}) => (
	<>
		{/* Apple HIG Drag Handle for Mobile */}
		<div className="sm:hidden w-full pt-2.5 pb-1 flex justify-center shrink-0">
			<div className="w-9 h-1 bg-slate-300 dark:bg-slate-600 rounded-full" />
		</div>

		{/* Top Header */}
		<header className="flex items-center justify-between gap-3 p-3.5 sm:p-6 border-b border-[var(--line,#e2e8f0)] dark:border-slate-800 bg-[var(--surface,#f8fafc)] dark:bg-slate-900/90 shrink-0">
			<div className="flex items-center gap-3 min-w-0">
				<div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/40 flex items-center justify-center shrink-0">
					<EndoFileCanal size={24} />
				</div>
				<div className="min-w-0">
					<div className="flex items-center gap-1.5 flex-wrap">
						<span className="text-[10px] sm:text-xs uppercase font-black tracking-wider text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-950/80 px-2 py-0.5 rounded-md border border-rose-500/30">
							{isLoadingFromDb ? "Загрузка каналов..." : "Эндодонтический журнал каналов"}
						</span>
						{toothState && (
							<span className="text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded bg-orange-100 dark:bg-orange-950/80 text-orange-800 dark:text-orange-300 border border-orange-500/30">
								{toothState}
							</span>
						)}
					</div>
					<h2 className="text-sm sm:text-xl font-bold text-[var(--ink,#0f172a)] dark:text-white m-0 mt-0.5 leading-snug break-words">
						{toothAnatomicalName}
					</h2>
				</div>
			</div>

			<button
				type="button"
				onClick={onClose}
				data-testid="endo-modal-close-btn"
				className="icon-button secondary-button min-h-[44px] min-w-[44px] p-2 rounded-xl text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] dark:text-slate-400 dark:hover:text-white hover:bg-[var(--surface-muted,#e2e8f0)] dark:hover:bg-slate-800 transition-colors flex items-center justify-center cursor-pointer shrink-0"
				aria-label="Закрыть модальное окно"
			>
				<X size={22} />
			</button>
		</header>
	</>
);
