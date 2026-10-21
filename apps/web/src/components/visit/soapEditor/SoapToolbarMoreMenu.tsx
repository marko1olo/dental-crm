import { Check, Copy, MoreHorizontal, Printer } from "lucide-react";
import type React from "react";

export interface SoapToolbarMoreMenuProps {
	readonly isSoapMoreOpen: boolean;
	readonly onToggleSoapMore: (
		open: boolean | ((v: boolean) => boolean),
	) => void;
	readonly soapMoreRef: React.RefObject<HTMLDivElement | null>;
	readonly onExplicitSave: () => void;
	readonly onCopyFullText: () => void;
	readonly onChangeViewMode: (mode: "fields" | "full_text") => void;
	readonly saveStatus: "idle" | "saving" | "saved";
}

export const SoapToolbarMoreMenu: React.FC<SoapToolbarMoreMenuProps> = ({
	isSoapMoreOpen,
	onToggleSoapMore,
	soapMoreRef,
	onExplicitSave,
	onCopyFullText,
	onChangeViewMode,
	saveStatus,
}) => {
	return (
		<>
			<div className="relative inline-block" ref={soapMoreRef}>
				<button
					type="button"
					data-testid="btn-soap-more-actions"
					onClick={() => onToggleSoapMore((v) => !v)}
					className="min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 sm:h-8 sm:w-8 rounded-lg flex items-center justify-center text-[var(--ink)] hover:bg-[var(--paper-soft)] border border-transparent hover:border-[var(--line)] transition-colors cursor-pointer"
					title="Дополнительные действия дневника"
					aria-label="Дополнительные действия"
					aria-expanded={isSoapMoreOpen}
				>
					<MoreHorizontal className="w-4 h-4" />
				</button>
				{isSoapMoreOpen && (
					<div
						data-testid="soap-more-dropdown"
						className="absolute right-0 top-full mt-1 z-50 min-w-[200px] p-1 bg-[var(--paper)] border border-[var(--line)] rounded-xl shadow-lg flex flex-col gap-1 text-xs"
					>
						<button
							type="button"
							onClick={() => {
								onToggleSoapMore(false);
								onExplicitSave();
							}}
							data-testid="btn-soap-more-save"
							className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-[var(--paper-soft)] text-[var(--ink)] text-left cursor-pointer border-none bg-transparent"
						>
							<Check className="w-4 h-4 text-[var(--teal)] shrink-0" />
							<span>Сохранить дневник</span>
						</button>
						<button
							type="button"
							onClick={() => {
								onToggleSoapMore(false);
								onCopyFullText();
							}}
							className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-[var(--paper-soft)] text-[var(--ink)] text-left cursor-pointer border-none bg-transparent"
						>
							<Copy className="w-4 h-4 text-[var(--teal)] shrink-0" />
							<span>Скопировать дневник</span>
						</button>
						<button
							type="button"
							onClick={() => {
								onToggleSoapMore(false);
								onChangeViewMode("full_text");
								setTimeout(() => {
									try {
										window.print();
									} catch (err) {
										console.warn("[VisitSoapEditor] print failed:", err);
									}
								}, 100);
							}}
							className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-[var(--paper-soft)] text-[var(--ink)] text-left cursor-pointer border-none bg-transparent"
						>
							<Printer className="w-4 h-4 text-sky-600 shrink-0" />
							<span>Печать карты</span>
						</button>
					</div>
				)}
			</div>

			<span
				id="diary-autosave-status"
				data-tour="diary-autosave-status"
				data-testid="soap-autosave-status"
				className="text-[11px] font-semibold shrink-0 min-w-max text-right inline-flex items-center justify-end gap-1 whitespace-nowrap"
			>
				{saveStatus === "saving" ? (
					<span className="text-amber-600 dark:text-amber-400 inline-flex items-center gap-1 animate-pulse shrink-0 whitespace-nowrap">
						<span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping inline-block shrink-0" />
						<span className="hidden sm:inline">Сохранение...</span>
						<span className="sm:hidden">...</span>
					</span>
				) : saveStatus === "saved" ? (
					<span
						className="text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1 font-bold shrink-0 whitespace-nowrap"
						title="Сохранено"
					>
						<Check
							className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 inline"
							aria-hidden="true"
						/>
						<span className="hidden 2xl:inline">СОХРАНЕНО</span>
						<span className="2xl:hidden">OK</span>
					</span>
				) : (
					""
				)}
			</span>
		</>
	);
};
