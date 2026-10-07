import React from "react";
import {
	Check,
	ChevronDown,
	Plus,
	RotateCcw,
	ShieldCheck,
} from "lucide-react";
import { EndoFileCanal, ToothPulpitis, ApexLocator } from "../icons/DentalIcons";

export interface EndoQuickToolbarProps {
	readonly activeTooth: number;
	readonly handleSwitchTooth: (newTooth: number) => void;
	readonly handleApplyExpressApicalPreset: () => void;
	readonly handleApplyCaOh2Protocol: () => void;
	readonly handleApplyPulpitisPreset: () => void;
	readonly isPresetsMenuOpen: boolean;
	readonly setIsPresetsMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
	readonly handleApplyPrimaryEndoPreset: () => void;
	readonly handleApplyRetreatmentPreset: () => void;
	readonly handleApplyObturationPreset: () => void;
	readonly handleApplyPulpitisObturationPreset: () => void;
	readonly handleApplyPeriodontitisDestructivePreset: () => void;
	readonly handleApplyStandardProtocol: () => void;
	readonly handleResetToDefaults: () => void;
	readonly handleApplyAnatomicalLengths: () => void;
	readonly handleAddCanal: () => void;
}

export const EndoQuickToolbar: React.FC<EndoQuickToolbarProps> = ({
	activeTooth,
	handleSwitchTooth,
	handleApplyExpressApicalPreset,
	handleApplyCaOh2Protocol,
	handleApplyPulpitisPreset,
	isPresetsMenuOpen,
	setIsPresetsMenuOpen,
	handleApplyPrimaryEndoPreset,
	handleApplyRetreatmentPreset,
	handleApplyObturationPreset,
	handleApplyPulpitisObturationPreset,
	handleApplyPeriodontitisDestructivePreset,
	handleApplyStandardProtocol,
	handleResetToDefaults,
	handleApplyAnatomicalLengths,
	handleAddCanal,
}) => {
	return (
		<div className="flex items-center justify-between gap-1.5 px-2.5 sm:px-3 py-1 rounded-xl bg-[var(--surface,#f8fafc)] dark:bg-slate-800/80 border border-[var(--line,#e2e8f0)] dark:border-slate-800 h-8 sm:h-9 min-h-[32px] sm:min-h-[36px] max-h-[36px] overflow-visible shrink-0 relative">
			<div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar flex-nowrap shrink min-w-0">
				{/* FDI Tooth Switcher in 1-row toolbar (Закон Хика, 32-36px) */}
				<div className="flex items-center gap-1 shrink-0 bg-[var(--paper,#ffffff)] dark:bg-slate-900 px-1.5 py-0.5 rounded-lg border border-[var(--line,#cbd5e1)] dark:border-slate-700 h-6 sm:h-7">
					<span className="text-[11px] font-black text-rose-600 dark:text-rose-400 shrink-0">Зуб:</span>
					<select
						value={activeTooth}
						onChange={(e) => handleSwitchTooth(Number(e.target.value))}
						aria-label="Выбор зуба FDI"
						className="h-full text-xs font-black bg-transparent text-[var(--ink,#0f172a)] dark:text-white outline-none cursor-pointer pr-0.5"
					>
						<optgroup label="Верхняя челюсть (18-28)">
							{[18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28].map((t) => (
								<option key={t} value={t} className="text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900">
									#{t}
								</option>
							))}
						</optgroup>
						<optgroup label="Нижняя челюсть (48-38)">
							{[48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38].map((t) => (
								<option key={t} value={t} className="text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900">
									#{t}
								</option>
							))}
						</optgroup>
					</select>
				</div>

				<div className="hidden xl:flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-rose-700 dark:text-rose-300 shrink-0 mr-0.5">
					<EndoFileCanal size={14} className="shrink-0" />
					<span>Протоколы:</span>
				</div>

				{/* Preset 1: Каналы пройдены и обтурированы */}
				<button
					type="button"
					data-testid="btn-express-apical-endo-protocol"
					onClick={handleApplyExpressApicalPreset}
					className="h-6 sm:h-7 px-2 rounded-lg text-xs font-bold bg-[var(--teal,#0d9488)] hover:brightness-110 text-white flex items-center gap-1 shadow-xs transition-all cursor-pointer shrink-0 active:scale-98"
					title="Обтурация канала (гуттаперча + силер): Каналы обработаны и обтурированы до апекса (Apex 0.0 + RVG + AH Plus)"
				>
					<Check size={13} className="shrink-0" />
					<span className="truncate">Пройдены и обтурированы</span>
				</button>

				{/* Preset 2: Временная пломбировка Ca(OH)2 */}
				<button
					type="button"
					data-testid="btn-caoh2-endo-protocol"
					onClick={handleApplyCaOh2Protocol}
					className="h-6 sm:h-7 px-2 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white flex items-center gap-1 shadow-xs transition-all cursor-pointer shrink-0 active:scale-98"
					title="Протокол эндодонтического лечения: Временная повязка Ca(OH)2 (Каласепт / Metapex) на 7–14 дней"
				>
					<ShieldCheck size={13} className="shrink-0" />
					<span className="truncate">Временная Ca(OH)2</span>
				</button>

				{/* Preset 3: Эндодонтия пульпита в 1 визит */}
				<button
					type="button"
					data-testid="btn-endo-preset-pulpitis-complete"
					onClick={handleApplyPulpitisPreset}
					className="h-6 sm:h-7 px-2 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-1 shadow-xs transition-all cursor-pointer shrink-0 active:scale-98"
					title="Протокол эндодонтического лечения: Пульпит в 1 визит (ProTaper F2 + AH Plus)"
				>
					<ToothPulpitis size={13} className="shrink-0" />
					<span className="truncate">Пульпит в 1 визит</span>
				</button>

				{/* Secondary Presets Popover Menu */}
				<div className="relative shrink-0">
					<button
						type="button"
						onClick={() => setIsPresetsMenuOpen((v) => !v)}
						className="h-6 sm:h-7 px-1.5 rounded-lg text-xs font-bold bg-[var(--paper,#ffffff)] dark:bg-slate-700 text-[var(--ink,#0f172a)] dark:text-slate-200 hover:bg-[var(--surface-muted,#e2e8f0)] dark:hover:bg-slate-600 border border-[var(--line,#cbd5e1)] dark:border-slate-600 flex items-center gap-1 transition-all cursor-pointer shrink-0"
						title="Другие протоколы эндодонтии (Первичное, Повторное D-RaCe, Периодонтит деструктивный...)"
					>
						<span className="text-[11px]">Другие</span>
						<ChevronDown size={12} />
					</button>

					{isPresetsMenuOpen && (
						<div
							className="absolute left-0 top-full mt-1.5 z-50 w-64 bg-[var(--paper,#ffffff)] dark:bg-slate-900 border border-[var(--line,#cbd5e1)] dark:border-slate-700 rounded-xl shadow-xl p-1.5 space-y-1 text-xs"
							role="menu"
						>
							<button
								type="button"
								data-testid="btn-endo-preset-primary"
								onClick={() => {
									handleApplyPrimaryEndoPreset();
									setIsPresetsMenuOpen(false);
								}}
								className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-slate-200 font-medium flex items-center gap-2 cursor-pointer"
							>
								<EndoFileCanal size={14} className="text-rose-500 shrink-0" />
								<span className="truncate">
									Первичное эндо (ProTaper + Metapex)
								</span>
							</button>
							<button
								type="button"
								data-testid="btn-endo-preset-retreatment"
								onClick={() => {
									handleApplyRetreatmentPreset();
									setIsPresetsMenuOpen(false);
								}}
								className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-slate-200 font-medium flex items-center gap-2 cursor-pointer"
							>
								<RotateCcw
									size={14}
									className="text-amber-500 shrink-0"
								/>
								<span className="truncate">
									Повторное эндо (D-RaCe + ревизия)
								</span>
							</button>
							<button
								type="button"
								data-testid="btn-endo-preset-obturation"
								onClick={() => {
									handleApplyObturationPreset();
									setIsPresetsMenuOpen(false);
								}}
								className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-slate-200 font-medium flex items-center gap-2 cursor-pointer"
							>
								<Check size={14} className="text-emerald-500 shrink-0" />
								<span className="truncate">
									Постоянная обтурация (GuttaCore / AH Plus)
								</span>
							</button>
							<button
								type="button"
								data-testid="btn-endo-preset-pulpitis-obturation"
								onClick={() => {
									handleApplyPulpitisObturationPreset();
									setIsPresetsMenuOpen(false);
								}}
								className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-slate-200 font-medium flex items-center gap-2 cursor-pointer"
							>
								<Check size={14} className="text-slate-500 shrink-0" />
								<span className="truncate">Пульпит 2 эт. (AH Plus)</span>
							</button>
							<button
								type="button"
								data-testid="btn-endo-preset-periodontitis-destructive"
								onClick={() => {
									handleApplyPeriodontitisDestructivePreset();
									setIsPresetsMenuOpen(false);
								}}
								className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-slate-200 font-medium flex items-center gap-2 cursor-pointer"
							>
								<ShieldCheck
									size={14}
									className="text-purple-500 shrink-0"
								/>
								<span className="truncate">
									Периодонтит (Metapex 14 дн)
								</span>
							</button>
							<button
								type="button"
								data-testid="btn-standard-endo-protocol"
								onClick={() => {
									handleApplyStandardProtocol();
									setIsPresetsMenuOpen(false);
								}}
								className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-[var(--ink,#0f172a)] dark:text-slate-200 font-medium flex items-center gap-2 cursor-pointer"
							>
								<EndoFileCanal
									size={14}
									className="text-indigo-500 shrink-0"
								/>
								<span className="truncate">Стандарт (AH Plus)</span>
							</button>
							<div className="border-t border-[var(--line,#e2e8f0)] dark:border-slate-800 my-1" />
							<button
								type="button"
								onClick={() => {
									handleResetToDefaults();
									setIsPresetsMenuOpen(false);
								}}
								className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-[var(--muted,#64748b)] dark:text-slate-400 font-medium flex items-center gap-2 cursor-pointer"
							>
								<RotateCcw size={14} className="shrink-0" />
								<span>Сброс к анатомическому стандарту</span>
							</button>
						</div>
					)}
				</div>
			</div>

			{/* Right toolbar controls: Autofill WL + Add Canal */}
			<div className="flex items-center gap-1.5 shrink-0">
				<button
					type="button"
					data-testid="btn-endo-anatomical-autofill"
					onClick={handleApplyAnatomicalLengths}
					className="h-6 sm:h-7 px-2 rounded-lg text-xs font-bold bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-950 dark:text-indigo-200 border border-indigo-500/30 flex items-center gap-1 transition-all cursor-pointer shrink-0 active:scale-98"
					title="Автозаполнение анатомической рабочей длины по стандарту FDI"
				>
					<ApexLocator
						size={13}
						className="text-indigo-600 dark:text-indigo-400 shrink-0"
					/>
					<span className="hidden sm:inline">Авто-РД (FDI)</span>
					<span className="sm:hidden">РД</span>
				</button>

				<button
					type="button"
					onClick={handleAddCanal}
					className="h-6 sm:h-7 px-2 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-1 shadow-xs transition-all cursor-pointer shrink-0 active:scale-98"
					title="Добавить дополнительный корневой канал"
				>
					<Plus size={13} className="shrink-0" />
					<span className="hidden sm:inline">Канал</span>
				</button>
			</div>
		</div>
	);
};
