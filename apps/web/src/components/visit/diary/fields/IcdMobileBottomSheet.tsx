import React, { useEffect, useRef } from "react";
import { Search, X } from "lucide-react";
import { ICD_GROUP_COLORS, type ICD10_DICTIONARY } from "../../../../lib/icd10";

export interface IcdMobileBottomSheetProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly filteredIcd: readonly (typeof ICD10_DICTIONARY)[number][];
	readonly onSelectIcd: (code: string) => void;
	readonly searchValue: string;
	readonly onSearchChange: (val: string) => void;
}

export const IcdMobileBottomSheet: React.FC<IcdMobileBottomSheetProps> = ({
	isOpen,
	onClose,
	filteredIcd,
	onSelectIcd,
	searchValue,
	onSearchChange,
}) => {
	const sheetRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (isOpen) {
			// Фокус на инпут при открытии шторки
			window.setTimeout(() => inputRef.current?.focus(), 150);
		}
	}, [isOpen]);

	if (!isOpen) return null;

	return (
		<div
			className="sm:hidden fixed inset-0 z-[9999] flex items-end justify-center bg-black/50 backdrop-blur-xs transition-opacity duration-200"
			onClick={onClose}
			role="dialog"
			aria-modal="true"
			aria-label="Выбор диагноза по МКБ-10"
		>
			<div
				ref={sheetRef}
				className="w-full max-h-[85vh] bg-[var(--paper)] text-[var(--ink)] border-t border-[var(--line)] rounded-t-[24px] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-250 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]"
				onClick={(e) => e.stopPropagation()}
			>
				{/* Apple HIG Drag Handle 36x5px */}
				<div className="pt-3 pb-2 flex justify-center shrink-0">
					<div
						className="w-9 h-1.5 rounded-full bg-[var(--line-strong,#94a3b8)] opacity-60"
						data-testid="icd-bottom-sheet-drag-handle"
						aria-hidden="true"
					/>
				</div>

				{/* Header */}
				<div className="px-4 py-2 flex items-center justify-between border-b border-[var(--line)] shrink-0">
					<div className="font-bold text-sm text-[var(--ink)]">
						Диагноз по МКБ-10
					</div>
					<button
						type="button"
						onClick={onClose}
						className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--muted)] hover:bg-[var(--paper-soft)] hover:text-[var(--ink)] transition-colors min-h-[44px] min-w-[44px]"
						aria-label="Закрыть"
					>
						<X className="w-5 h-5" />
					</button>
				</div>

				{/* Search input in bottom sheet */}
				<div className="p-3 border-b border-[var(--line)] shrink-0">
					<div className="relative">
						<Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none" />
						<input
							ref={inputRef}
							type="text"
							value={searchValue}
							onChange={(e) => onSearchChange(e.target.value)}
							placeholder="Поиск по коду (K02) или названию..."
							className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] text-sm outline-none focus:border-[var(--teal)] focus:ring-2 focus:ring-[var(--teal)]/20 min-h-[44px]"
						/>
						{searchValue && (
							<button
								type="button"
								onClick={() => onSearchChange("")}
								className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] min-h-[44px] min-w-[44px]"
								aria-label="Очистить поиск"
							>
								<X className="w-4 h-4" />
							</button>
						)}
					</div>
				</div>

				{/* Options List with Touch Target >= 44px */}
				<div className="flex-1 overflow-y-auto overscroll-contain px-2 py-2 divide-y divide-[var(--line-subtle,var(--line))]">
					{filteredIcd.length === 0 ? (
						<div className="p-6 text-center text-xs text-[var(--muted)]">
							Диагнозы не найдены. Введите код вручную.
						</div>
					) : (
						filteredIcd.map((icd) => (
							<button
								key={icd.code}
								type="button"
								onClick={() => {
									onSelectIcd(icd.code);
									onClose();
								}}
								className="w-full text-left py-3 px-3 flex items-start gap-3 rounded-lg hover:bg-[var(--paper-soft)] transition-colors min-h-[48px] active:bg-[var(--paper-strong)] cursor-pointer"
								data-testid={`icd-option-${icd.code}`}
							>
								<span
									className={`px-2 py-1 rounded text-xs font-mono font-bold shrink-0 mt-0.5 ${
										ICD_GROUP_COLORS[icd.group] ?? "bg-slate-500/10 text-slate-700 dark:text-slate-300"
									}`}
								>
									{icd.code}
								</span>
								<div className="flex-1 min-w-0">
									<div className="font-semibold text-xs text-[var(--ink)] break-words leading-snug">
										{icd.label}
									</div>
									<div className="text-[11px] text-[var(--muted)] mt-0.5">
										{icd.group}
									</div>
								</div>
							</button>
						))
					)}
				</div>
			</div>
		</div>
	);
};
