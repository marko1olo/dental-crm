import { Check, Copy, Edit3, Sparkles } from "lucide-react";
import type React from "react";
import { SoapToolbarViewModeTabs } from "./SoapToolbarViewModeTabs";

export interface SoapToolbarActionsProps {
	readonly isLocked: boolean;
	readonly isCorrectionMode: boolean;
	readonly onEnableCorrection: () => void;
	readonly onToggleTemplates: () => void;
	readonly onApplyNorm: () => void;
	readonly activeViewMode: "fields" | "full_text";
	readonly onChangeViewMode: (mode: "fields" | "full_text") => void;
	readonly copied: boolean;
	readonly onCopyFullText: () => void;
	readonly onExplicitSave: () => void;
}

export const SoapToolbarActions: React.FC<SoapToolbarActionsProps> = ({
	isLocked,
	isCorrectionMode,
	onEnableCorrection,
	onToggleTemplates,
	onApplyNorm,
	activeViewMode,
	onChangeViewMode,
	copied,
	onCopyFullText,
	onExplicitSave,
}) => {
	return (
		<>
			{isLocked &&
				(!isCorrectionMode ? (
					<button
						type="button"
						onClick={onEnableCorrection}
						data-testid="btn-soap-enable-correction"
						className="min-h-[44px] sm:min-h-0 sm:h-8 px-2.5 text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer bg-amber-500 hover:bg-amber-600 text-white transition-colors shadow-xs"
						title="Приём закрыт. Нажмите для внесения правок («Исправленному верить»)"
					>
						<Edit3 className="w-3.5 h-3.5" />
						<span className="hidden md:inline">Внести исправление</span>
						<span className="md:hidden">Исправить</span>
					</button>
				) : (
					<div
						data-testid="badge-soap-correction-active"
						className="min-h-[44px] sm:min-h-0 sm:h-8 px-2.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
					>
						<Check className="w-3.5 h-3.5 text-emerald-600" />
						<span>Исправленному верить</span>
					</div>
				))}

			<button
				type="button"
				onClick={onToggleTemplates}
				data-testid="btn-open-stomt-templates"
				className="secondary-button min-h-[44px] sm:min-h-0 sm:h-8 px-3.5 text-[13px] font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer bg-teal-600 hover:bg-teal-700 text-white transition-colors shadow-xs"
				title="Открыть каталог 448 клинических шаблонов"
				aria-label="Клинические шаблоны (448)"
			>
				<Sparkles className="w-3.5 h-3.5" />
				<span>Клинические шаблоны (448)</span>
			</button>

			<button
				type="button"
				onClick={onApplyNorm}
				disabled={false}
				data-testid="btn-soap-physio-norm"
				className="secondary-button min-h-[44px] sm:min-h-0 sm:h-8 px-3 text-[13px] font-semibold rounded-lg flex items-center gap-1 cursor-pointer bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 transition-colors"
				title="Соматически здоров / Интактные зубы: зафиксировать физиологическую норму в 1 клик"
				aria-label="Соматически здоров / Интактные зубы (Норма)"
			>
				<Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
				<span>Норма</span>
			</button>

			<SoapToolbarViewModeTabs
				activeViewMode={activeViewMode}
				onChangeViewMode={onChangeViewMode}
			/>

			<button
				type="button"
				onClick={onCopyFullText}
				className="min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 sm:h-8 sm:w-8 rounded-lg flex items-center justify-center text-[var(--ink)] hover:bg-[var(--paper-soft)] border border-transparent hover:border-[var(--line)] transition-colors cursor-pointer"
				title="Скопировать медицинскую запись в буфер обмена"
			>
				{copied ? (
					<Check className="w-4 h-4 text-emerald-600" />
				) : (
					<Copy className="w-4 h-4" />
				)}
			</button>

			<button
				type="button"
				onClick={onExplicitSave}
				disabled={false}
				data-testid="btn-soap-save"
				className="secondary-button min-h-[44px] sm:min-h-0 sm:h-8 px-3 text-[13px] font-semibold rounded-lg flex items-center gap-1 cursor-pointer bg-[var(--teal-soft,rgba(13,148,136,0.1))] hover:bg-[var(--teal-soft,rgba(13,148,136,0.2))] text-[var(--teal)] border border-[var(--teal-surface,var(--teal))] transition-colors"
				title="Сохранить дневник приёма сейчас"
				aria-label="Сохранить дневник"
			>
				<Check className="w-3.5 h-3.5 text-[var(--teal)]" />
				<span className="hidden xl:inline">Сохранить</span>
			</button>
		</>
	);
};
