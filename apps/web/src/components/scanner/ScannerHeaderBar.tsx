import React from "react";
import { Camera, ShieldCheck, Sparkles, FileText } from "lucide-react";

export interface ScannerHeaderBarProps {
	readonly activeSubTab: "scanner" | "sanpin";
	readonly onSelectSubTab: (tab: "scanner" | "sanpin") => void;
}

/**
 * Шапка сканера документов и журналов стерилизации (Мандаты 8b, 8am, 8ze <= 120 строк).
 * На смартфонах: адаптивный 2-колоночный таб-бар на 100% ширины без вылезания за правый край.
 */
export function ScannerHeaderBar({ activeSubTab, onSelectSubTab }: ScannerHeaderBarProps) {
	return (
		<header className="scanner-header-bar flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)]">
			<div className="scanner-header-title-group flex items-center gap-3">
				<div className="scanner-header-icon w-9 h-9 rounded-xl bg-[var(--teal-surface,#ccfbf1)] text-[var(--teal,#0d9488)] flex items-center justify-center shrink-0">
					{activeSubTab === "sanpin" ? <Sparkles size={20} /> : <Camera size={20} />}
				</div>
				<div className="min-w-0">
					<h1 className="scanner-header-title text-sm sm:text-base font-bold text-[var(--ink)]">
						{activeSubTab === "sanpin" ? (
							<>
								<span className="sm:hidden">Журналы стерилизации</span>
								<span className="hidden sm:inline">Журналы стерилизации и санитарного режима</span>
							</>
						) : (
							<>
								<span className="sm:hidden">Оцифровка документов</span>
								<span className="hidden sm:inline">Оцифровка документов регистратуры</span>
							</>
						)}
					</h1>
					<p className="scanner-header-subtitle text-[11px] sm:text-xs text-[var(--muted)] hidden sm:block truncate">
						{activeSubTab === "sanpin"
							? "Автоклавирование, предстерилизационная очистка, упаковка инструментов и списание в 1 клик"
							: "Быстрое сканирование паспорта, СНИЛС, полиса ОМС и прикрепление к медкарте"}
					</p>
				</div>
			</div>

			{/* Сегментированный переключатель режимов: на мобильном — 2 равные колонки на 100% ширины */}
			<div
				className="scanner-mode-switcher w-full sm:w-auto grid grid-cols-2 sm:flex items-center gap-1 p-1 rounded-xl bg-[var(--paper)] border border-[var(--line)] shadow-2xs"
				role="tablist"
				aria-label="Выбор рабочего режима"
			>
				<button
					type="button"
					role="tab"
					aria-selected={activeSubTab === "sanpin"}
					data-testid="scanner-tab-sanpin"
					onClick={() => onSelectSubTab("sanpin")}
					className={`min-h-[44px] sm:min-h-[34px] h-11 sm:h-[34px] px-2.5 sm:px-3.5 rounded-lg border-none cursor-pointer inline-flex items-center justify-center gap-1.5 text-xs sm:text-[13px] font-semibold transition-all ${
						activeSubTab === "sanpin"
							? "bg-[var(--teal,#0d9488)] text-white shadow-xs"
							: "bg-transparent text-[var(--ink-secondary)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)]"
					}`}
				>
					<Sparkles size={15} className="shrink-0" />
					<span className="hidden sm:inline">Журналы стерилизации</span>
					<span className="sm:hidden">Стерилизация</span>
				</button>
				<button
					type="button"
					role="tab"
					aria-selected={activeSubTab === "scanner"}
					data-testid="scanner-tab-camera"
					onClick={() => onSelectSubTab("scanner")}
					className={`min-h-[44px] sm:min-h-[34px] h-11 sm:h-[34px] px-2.5 sm:px-3.5 rounded-lg border-none cursor-pointer inline-flex items-center justify-center gap-1.5 text-xs sm:text-[13px] font-semibold transition-all ${
						activeSubTab === "scanner"
							? "bg-[var(--teal,#0d9488)] text-white shadow-xs"
							: "bg-transparent text-[var(--ink-secondary)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)]"
					}`}
				>
					<FileText size={15} className="shrink-0" />
					<span className="hidden sm:inline">Сканер документов</span>
					<span className="sm:hidden">Сканер</span>
				</button>
			</div>

			<div className="scanner-header-telemetry hidden md:flex items-center gap-2">
				<div className="scanner-status-chip">
					<span className="scanner-status-dot" />
					<span>{activeSubTab === "sanpin" ? "ЦСО активен" : "Сканер активен"}</span>
				</div>
				<div className="scanner-status-chip">
					<ShieldCheck size={13} className="text-[var(--teal)]" />
					<span>{activeSubTab === "sanpin" ? "Стерилизация и дезинфекция" : "Защита данных пациентов"}</span>
				</div>
			</div>
		</header>
	);
}

export default ScannerHeaderBar;
