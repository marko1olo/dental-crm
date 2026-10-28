import { Check, Copy, Edit3, Sparkles } from "lucide-react";
import React from "react";
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
						className="min-h-[44px] sm:min-h-0 sm:h-8 px-2.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] border border-[var(--line)] hover:border-[var(--line-strong)] transition-colors shadow-2xs"
						title="Приём закрыт. Нажмите для внесения правок («Исправленному верить»)"
					>
						<Edit3 className="w-3.5 h-3.5 text-[var(--ink-muted)]" />
						<span className="hidden md:inline">Внести исправление</span>
						<span className="md:hidden">Исправить</span>
					</button>
				) : (
					<div
						data-testid="badge-soap-correction-active"
						className="min-h-[44px] sm:min-h-0 sm:h-8 px-2.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 bg-[var(--paper-soft)] text-[var(--ink)] border border-[var(--line)]"
					>
						<Check className="w-3.5 h-3.5 text-[var(--ink-muted)]" />
						<span>Исправленному верить</span>
					</div>
				))}

			<button
				type="button"
				onClick={onToggleTemplates}
				data-testid="btn-open-stomt-templates"
				className="secondary-button min-h-[44px] sm:min-h-0 sm:h-8 px-3.5 text-[13px] font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] border border-[var(--line)] hover:border-[var(--line-strong)] transition-colors shadow-2xs"
				title="Открыть каталог 448 клинических шаблонов"
				aria-label="Клинические шаблоны (448)"
			>
				<Sparkles className="w-3.5 h-3.5 text-[var(--ink-muted)]" />
				<span>Клинические шаблоны (448)</span>
			</button>

			<button
				type="button"
				onClick={onApplyNorm}
				disabled={false}
				data-testid="btn-soap-physio-norm"
				className="secondary-button min-h-[44px] sm:min-h-0 sm:h-8 px-3 text-[13px] font-semibold rounded-lg flex items-center gap-1 cursor-pointer bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] border border-[var(--line)] hover:border-[var(--line-strong)] transition-colors shadow-2xs"
				title="Соматически здоров / Интактные зубы: зафиксировать физиологическую норму в 1 клик"
				aria-label="Соматически здоров / Интактные зубы (Норма)"
			>
				<Check className="w-3.5 h-3.5 text-[var(--ink-muted)]" />
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
					<Copy className="w-4 h-4 text-[var(--ink-muted)]" />
				)}
			</button>

			<button
				type="button"
				onClick={onExplicitSave}
				disabled={false}
				data-testid="btn-soap-save"
				className="secondary-button min-h-[44px] sm:min-h-0 sm:h-8 px-3 text-[13px] font-semibold rounded-lg flex items-center gap-1 cursor-pointer bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] border border-[var(--line)] hover:border-[var(--line-strong)] transition-colors shadow-2xs"
				title="Сохранить дневник приёма сейчас"
				aria-label="Сохранить дневник"
			>
				<Check className="w-3.5 h-3.5 text-[var(--ink-muted)]" />
				<span className="hidden xl:inline">Сохранить</span>
			</button>
		</>
	);
};
