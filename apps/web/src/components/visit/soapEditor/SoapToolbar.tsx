import React from "react";
import {
	Check,
	Clock,
	Copy,
	Edit3,
	Eye,
	FileText,
	MoreHorizontal,
	Printer,
	Sparkles,
	X,
} from "lucide-react";
import { ALL_FDI_ADULT_TEETH } from "./constants";
import type { SoapToolbarProps } from "./types";
import { playTactileEarcon } from "../../../lib/intercomSound";

export const SoapToolbar: React.FC<SoapToolbarProps> = ({
	selectedTooth,
	onSelectTooth,
	selectedSurfaces,
	onChangeSurfaces,
	isLocked,
	isCorrectionMode,
	onEnableCorrection,
	isTemplatesOpen,
	onToggleTemplates,
	onApplyNorm,
	activeViewMode,
	onChangeViewMode,
	copied,
	onCopyFullText,
	onExplicitSave,
	isSoapMoreOpen,
	onToggleSoapMore,
	soapMoreRef,
	saveStatus,
	unsavedDraftNotice,
	onRestoreDraft,
	onDiscardDraft,
}) => {
	return (
		<>
			{/* ── ТУЛБАР 1 СТРОКА (ХИК / HIG: 32-36px кнопки) ── */}
			<div className="flex items-center justify-between gap-2 px-3 py-2 bg-[var(--paper-soft)] border-b border-[var(--line)] overflow-x-auto scrollbar-none flex-nowrap min-h-[36px]">
				<div className="flex items-center gap-2 shrink-0">
					<div
						className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider text-[var(--muted)]"
						aria-label="Медицинская карта • Дневник приёма"
						title="Медицинская карта • Дневник приёма"
					>
						<FileText className="w-4 h-4 text-[var(--teal,var(--brand-primary))]" />
						<span>Медицинская карта • Дневник приёма</span>
					</div>

					{/* Селектор целевого зуба */}
					<div className="flex items-center gap-1 ml-2 pl-2 border-l border-[var(--line)]">
						<label
							htmlFor="soap-select-tooth"
							className="text-xs font-semibold text-[var(--muted)]"
						>
							Зуб:
						</label>
						<select
							id="soap-select-tooth"
							value={selectedTooth ?? ""}
							onChange={(e) => {
								const t = e.target.value ? Number(e.target.value) : null;
								onSelectTooth(t);
							}}
							className="min-h-[44px] sm:min-h-0 sm:h-7 px-2 text-xs font-bold bg-[var(--paper)] border border-[var(--line)] rounded-lg text-[var(--teal,var(--brand-primary))] focus:outline-none focus:ring-1 focus:ring-[var(--teal)]"
						>
							<option value="">Без зуба</option>
							{ALL_FDI_ADULT_TEETH.map((t) => (
								<option key={t} value={t}>
									{t} зуб
								</option>
							))}
						</select>
					</div>

					{/* Поверхности */}
					<input
						type="text"
						value={selectedSurfaces}
						onChange={(e) => onChangeSurfaces(e.target.value)}
						placeholder="Поверхности (MOD, вест...)"
						aria-label="Поверхности зуба"
						className="min-h-[44px] sm:min-h-0 sm:h-7 w-32 px-2 text-xs bg-[var(--paper)] border border-[var(--line)] rounded-lg text-[var(--ink)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-[var(--teal)]"
					/>
				</div>

				{/* Правый блок кнопок прямого действия */}
				<div className="flex items-center gap-1.5 shrink-0 flex-nowrap">
					{/* Индикатор закрытого визита и кнопка ревизии («Исправленному верить», Мандат 8e) */}
					{isLocked && (
						!isCorrectionMode ? (
							<button
								type="button"
								onClick={onEnableCorrection}
								data-testid="btn-soap-enable-correction"
								className="min-h-[44px] sm:min-h-0 sm:h-8 px-2.5 text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer bg-amber-500 hover:bg-amber-600 text-white transition-colors shadow-xs"
								title="Приём закрыт. Нажмите для внесения правок с версионным аудитом («Исправленному верить»)"
							>
								<Edit3 className="w-3.5 h-3.5" />
								<span className="hidden md:inline">Внести исправление («Исправленному верить»)</span>
								<span className="md:hidden">Исправить</span>
							</button>
						) : (
							<div
								data-testid="badge-soap-correction-active"
								className="min-h-[44px] sm:min-h-0 sm:h-8 px-2.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
								title="Режим исправления закрытого дневника («Исправленному верить»)"
							>
								<Check className="w-3.5 h-3.5 text-emerald-600" />
								<span>Исправленному верить</span>
							</div>
						)
					)}

					{/* Кнопка "Клинические шаблоны (448)" (Мандат 8e: никогда не disabled!) */}
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

					{/* Физиологическая норма (Мандат 8e: никогда не disabled!) */}
					<button
						type="button"
						onClick={onApplyNorm}
						disabled={false}
						data-testid="btn-soap-physio-norm"
						className="secondary-button min-h-[44px] sm:min-h-0 sm:h-8 px-3 text-[13px] font-semibold rounded-lg flex items-center gap-1 cursor-pointer bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 transition-colors"
						title="Соматически здоров / норма: зафиксировать физиологическую норму в дневнике приёма"
						aria-label="Соматически здоров / Норма"
					>
						<Check className="w-3.5 h-3.5" />
						<span>Норма</span>
					</button>

					{/* Переключение режима отображения (Каноничный Segmented Control) */}
					<div
						className="inline-flex items-center p-[2px] rounded-[9px] bg-[var(--paper-soft)] border border-[var(--line-subtle)] gap-[2px] shadow-2xs"
						role="tablist"
						aria-label="Режим отображения дневника"
					>
						<button
							type="button"
							role="tab"
							aria-selected={activeViewMode === "fields"}
							onClick={() => onChangeViewMode("fields")}
							className={`min-h-[44px] sm:min-h-0 sm:h-7 px-2.5 text-[12.5px] rounded-[7px] flex items-center gap-1 cursor-pointer transition-all select-none ${
								activeViewMode === "fields"
									? "bg-[var(--paper)] text-[var(--ink)] border border-[var(--line-subtle)] shadow-xs font-semibold"
									: "bg-transparent border border-transparent text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)]/60 font-medium"
							}`}
						>
							<Edit3 className="w-3 h-3" />
							<span>Поля</span>
						</button>
						<button
							type="button"
							role="tab"
							aria-selected={activeViewMode === "full_text"}
							onClick={() => onChangeViewMode("full_text")}
							className={`min-h-[44px] sm:min-h-0 sm:h-7 px-2.5 text-[12.5px] rounded-[7px] flex items-center gap-1 cursor-pointer transition-all select-none ${
								activeViewMode === "full_text"
									? "bg-[var(--paper)] text-[var(--ink)] border border-[var(--line-subtle)] shadow-xs font-semibold"
									: "bg-transparent border border-transparent text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)]/60 font-medium"
							}`}
						>
							<Eye className="w-3 h-3" />
							<span>Печать</span>
						</button>
					</div>

					{/* Скопировать в буфер */}
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

					{/* Кнопка ручного сохранения (Мандат 8e: никогда не disabled!) */}
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

					{/* Дополнительные действия «...» (Мандаты 8d, 8e, 8p: 1 строка тулбара 32–36px) */}
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
											} catch (printErr) {
												console.warn("[VisitSoapEditor] print failed:", printErr);
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

					{/* Индикатор сохранения (Мандат 8e: Debounced Autosave «СОХРАНЕНО» / «OK») */}
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
								<Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 inline" aria-hidden="true" />
								<span className="hidden 2xl:inline">СОХРАНЕНО</span>
								<span className="2xl:hidden">OK</span>
							</span>
						) : (
							""
						)}
					</span>
				</div>
			</div>

			{/* ── ТИХИЙ НЕБЛОКИРУЮЩИЙ БАННЕР ОБНАРУЖЕНИЯ ЧЕРНОВИКА (МАНДАТЫ 8C, 8E) ── */}
			{unsavedDraftNotice && (
				<div
					data-testid="banner-draft-recovery"
					role="alert"
					className="flex items-center justify-between gap-3 px-3 py-1.5 bg-amber-500/10 border-b border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs shrink-0"
				>
					<div className="flex items-center gap-2 min-w-0">
						<Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
						<span className="font-medium truncate">
							Обнаружен несохранённый черновик от {unsavedDraftNotice.timeStr}
						</span>
					</div>
					<div className="flex items-center gap-1.5 shrink-0">
						<button
							type="button"
							onClick={onRestoreDraft}
							data-testid="btn-restore-draft"
							className="min-h-[26px] h-[26px] px-2.5 text-xs font-bold rounded-md bg-teal-600 hover:bg-teal-700 text-white cursor-pointer transition-colors shadow-2xs inline-flex items-center gap-1"
							aria-label="Восстановить черновик"
						>
							<Check className="w-3 h-3" />
							<span>Восстановить</span>
						</button>
						<button
							type="button"
							onClick={onDiscardDraft}
							data-testid="btn-discard-draft"
							className="min-h-[26px] h-[26px] px-2 text-xs font-semibold rounded-md bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] border border-[var(--line)] cursor-pointer transition-colors inline-flex items-center gap-1"
							aria-label="Сбросить черновик"
						>
							<X className="w-3 h-3 text-[var(--muted)]" />
							<span>Сбросить</span>
						</button>
					</div>
				</div>
			)}
		</>
	);
};

export interface SoapMobileActionBarProps {
	isTemplatesOpen: boolean;
	onToggleTemplates: () => void;
	onApplyNorm: () => void;
	activeViewMode: "fields" | "full_text";
	onChangeViewMode: (mode: "fields" | "full_text") => void;
}

export const SoapMobileActionBar: React.FC<SoapMobileActionBarProps> = ({
	isTemplatesOpen,
	onToggleTemplates,
	onApplyNorm,
	activeViewMode,
	onChangeViewMode,
}) => {
	return (
		/* ── МОБИЛЬНЫЙ ДОК ДЕЙСТВИЙ (ФИКСИРОВАН ВНИЗУ ЭКРАНА С SAFE-AREA) ── */
		<div
			className="soap-mobile-action-bar sticky bottom-0 z-30 md:hidden flex items-center justify-between gap-1.5 p-2 bg-[var(--paper)]/95 backdrop-blur-md border-t border-[var(--line)] shadow-lg"
			style={{ paddingBottom: "max(8px, env(safe-area-inset-bottom, 8px))" }}
		>
			<button
				type="button"
				onClick={onToggleTemplates}
				className="flex-1 min-h-[44px] px-3 text-[13px] font-semibold rounded-xl flex items-center justify-center gap-1.5 bg-teal-600 active:bg-teal-700 text-white shadow-xs touch-manipulation cursor-pointer"
				title="Каталог 448 клинических шаблонов"
			>
				<Sparkles className="w-4 h-4 shrink-0" />
				<span className="truncate">Шаблоны (448)</span>
			</button>

			<button
				type="button"
				onClick={() => {
					playTactileEarcon("norm");
					onApplyNorm();
				}}
				className="min-h-[44px] px-3.5 text-[13px] font-semibold rounded-xl flex items-center justify-center gap-1 bg-emerald-500/15 active:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 touch-manipulation cursor-pointer shrink-0"
				title="Заполнить нормой"
			>
				<Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
				<span>Норма</span>
			</button>

			<div className="flex items-center bg-[var(--paper-soft)] border border-[var(--line-subtle)] p-0.5 rounded-xl shrink-0">
				<button
					type="button"
					onClick={() => onChangeViewMode("fields")}
					className={`min-h-[44px] px-2.5 text-[12.5px] font-semibold rounded-lg flex items-center justify-center touch-manipulation cursor-pointer ${
						activeViewMode === "fields"
							? "bg-[var(--paper)] text-[var(--teal,var(--brand-primary))] shadow-2xs"
							: "text-[var(--muted)]"
					}`}
					title="Режим редактирования полей"
				>
					<Edit3 className="w-3.5 h-3.5" />
				</button>
				<button
					type="button"
					onClick={() => onChangeViewMode("full_text")}
					className={`min-h-[44px] px-2.5 text-[12.5px] font-semibold rounded-lg flex items-center justify-center touch-manipulation cursor-pointer ${
						activeViewMode === "full_text"
							? "bg-[var(--paper)] text-[var(--teal,var(--brand-primary))] shadow-2xs"
							: "text-[var(--muted)]"
					}`}
					title="Печатный предпросмотр"
				>
					<Eye className="w-3.5 h-3.5" />
				</button>
			</div>
		</div>
	);
};
