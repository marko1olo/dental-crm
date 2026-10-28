/**
 * PresenterHeader.tsx — Шапка презентера планов лечения у кресла (SSOT).
 * Мандат 8b: Золотой стандарт modularity (120–160 строк).
 * Мандат 8e: Автономия врача — кнопки никогда не блокируются, мгновенный доступ к пресетам.
 * Apple HIG: Touch targets >= 36-44px, 0px горизонтального скролла.
 */

import React from "react";
import { Sparkles, Printer, Copy, Minimize2, Maximize2, X, Calculator, Send } from "lucide-react";

export type PresenterModalTab = "comparison" | "stages" | "print";

export interface PresenterHeaderProps {
	readonly patientName: string;
	readonly doctorFullName: string;
	readonly activeTab: PresenterModalTab;
	readonly onTabChange: (tab: PresenterModalTab) => void;
	readonly isFullscreen: boolean;
	readonly onToggleFullscreen: () => void;
	readonly onPrint: () => void;
	readonly onClose: () => void;
	readonly onCopyTiersSummary: () => void;
	readonly isCopilotOpen: boolean;
	readonly onToggleCopilot: () => void;
	readonly copilotPrompt: string;
	readonly onCopilotPromptChange: (val: string) => void;
	readonly onCopilotSend: () => void;
	readonly onSelectCopilotPreset: (prompt: string) => void;
	readonly onToggleDiscounts?: () => void;
}

export const PresenterHeader: React.FC<PresenterHeaderProps> = ({
	patientName,
	doctorFullName,
	activeTab,
	onTabChange,
	isFullscreen,
	onToggleFullscreen,
	onPrint,
	onClose,
	onCopyTiersSummary,
	isCopilotOpen,
	onToggleCopilot,
	copilotPrompt,
	onCopilotPromptChange,
	onCopilotSend,
	onSelectCopilotPreset,
	onToggleDiscounts,
}) => {
	return (
		<header className="flex flex-col border-b border-[var(--line)] bg-[var(--paper-soft)] shrink-0">
			{/* Тактильный Drag Handle для смартфонов (Apple HIG) */}
			<div className="sm:hidden flex justify-center pt-2 pb-1 bg-[var(--paper-soft)] shrink-0">
				<div className="w-9 h-1 rounded-full bg-[var(--line)]" />
			</div>

			{/* Верхняя строка: заголовок, врач/пациент и быстрые действия */}
			<div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-[var(--line)]/50">
				<div className="flex items-center gap-3">
					<div className="p-2 rounded-xl bg-[var(--teal)]/10 text-[var(--teal)] shrink-0">
						<Sparkles className="w-5 h-5" />
					</div>
					<div>
						<div className="flex items-center gap-2">
							<h2 id="treatment-presenter-modal-title" className="text-base sm:text-lg font-black text-[var(--ink)] m-0">
								Презентация планов лечения
							</h2>
							<span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[var(--teal)]/10 text-[var(--teal)] hidden sm:inline-block">
								Прейскурант клиники
							</span>
						</div>
						<p className="text-xs text-[var(--muted)] m-0 truncate max-w-xl">
							Пациент: <strong className="text-[var(--ink)]">{patientName}</strong> · Врач:{" "}
							<span className="text-[var(--ink)]">{doctorFullName}</span>
						</p>
					</div>
				</div>

				<div className="flex items-center gap-1.5">
					<button
						type="button"
						onClick={onPrint}
						className="w-10 h-10 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--line-subtle)] flex items-center justify-center transition-all cursor-pointer"
						title="Печать сметы"
						data-testid="presenter-header-print-btn"
					>
						<Printer className="w-4 h-4" />
					</button>

					<button
						type="button"
						onClick={onCopyTiersSummary}
						className="min-h-[40px] px-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-xs font-semibold text-[var(--ink)] hover:bg-[var(--line-subtle)] hidden sm:inline-flex items-center gap-1.5 cursor-pointer"
						title="Скопировать смету для пациента"
						data-testid="presenter-copy-tiers-summary-btn"
					>
						<Copy className="w-4 h-4 text-[var(--muted)]" />
						<span>Скопировать смету для пациента</span>
					</button>

					<button
						type="button"
						onClick={onToggleFullscreen}
						className="w-10 h-10 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--line-subtle)] flex items-center justify-center transition-all cursor-pointer"
						title={isFullscreen ? "Свернуть" : "На весь экран"}
						data-testid="presenter-fullscreen-btn"
					>
						{isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
					</button>

					<button
						type="button"
						onClick={onClose}
						className="w-10 h-10 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--line-subtle)] flex items-center justify-center transition-all cursor-pointer"
						title="Закрыть окно"
						data-testid="btn-close-presenter"
					>
						<X className="w-5 h-5" />
					</button>
				</div>
			</div>

			{/* Полоса навигационных табов и Копайлот */}
			<div className="flex items-center justify-between px-4 sm:px-6 py-2 overflow-x-auto scrollbar-none gap-2">
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={() => onTabChange("comparison")}
						className={`min-h-[44px] sm:min-h-[36px] px-4 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
							activeTab === "comparison"
								? "bg-[var(--teal)] text-[var(--paper-strong,#ffffff)] shadow-sm"
								: "bg-transparent text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--line-subtle)]"
						}`}
						data-testid="tab-tiers-selector"
					>
						3 Варианта сметы
					</button>
					<button
						type="button"
						onClick={() => onTabChange("print")}
						className={`min-h-[44px] sm:min-h-[36px] px-4 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
							activeTab === "print"
								? "bg-[var(--teal)] text-[var(--paper-strong,#ffffff)] shadow-sm"
								: "bg-transparent text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--line-subtle)]"
						}`}
						data-testid="tab-print-preview"
					>
						Сводка для договора
					</button>
					<button
						type="button"
						onClick={onToggleDiscounts}
						className="min-h-[44px] sm:min-h-[36px] px-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-xs font-semibold whitespace-nowrap shrink-0 text-[var(--ink)] hover:bg-[var(--line-subtle)] inline-flex items-center gap-1.5 cursor-pointer"
						data-testid="toggle-discount-panel-btn"
					>
						<Calculator className="w-3.5 h-3.5 text-[var(--muted)]" />
						<span>Скидки</span>
					</button>
				</div>

				{/* Кнопка AI Copilot */}
				<div className="flex items-center gap-2 shrink-0">
					<button
						type="button"
						onClick={onToggleCopilot}
						className="min-h-[36px] px-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-xs font-bold whitespace-nowrap text-[var(--ink)] hover:bg-[var(--line-subtle)] inline-flex items-center gap-1.5 cursor-pointer"
						data-testid="toggle-copilot-panel-btn"
					>
						<Sparkles className="w-3.5 h-3.5 text-amber-500" />
						<span>AI Копайлот</span>
					</button>
				</div>
			</div>

			{/* Панель Копайлота */}
			{isCopilotOpen && (
				<div className="p-3 bg-[var(--paper)] border-t border-[var(--line)] flex flex-col gap-2.5">
					<div className="flex items-center justify-between gap-2 flex-wrap">
						<span className="text-xs font-bold text-[var(--ink)]">AI Copilot у кресла</span>
						<div className="flex items-center gap-1.5 flex-wrap">
							<button
								type="button"
								onClick={() => onSelectCopilotPreset("Оптимизировать бюджет плана лечения")}
								className="min-h-[36px] px-2.5 py-1 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-xs font-semibold text-[var(--ink)] hover:bg-[var(--line-subtle)] cursor-pointer"
								data-testid="presenter-copilot-btn-budget_optimize"
							>
								Оптимизировать бюджет
							</button>
							<button
								type="button"
								onClick={() => onSelectCopilotPreset("Замена импланта на мостовидный протез")}
								className="min-h-[36px] px-2.5 py-1 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-xs font-semibold text-[var(--ink)] hover:bg-[var(--line-subtle)] cursor-pointer"
								data-testid="presenter-copilot-btn-implant_to_bridge"
							>
								Мост вместо импланта
							</button>
							<button
								type="button"
								onClick={() => onSelectCopilotPreset("All-on-4 верхняя челюсть")}
								className="min-h-[36px] px-2.5 py-1 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-xs font-semibold text-[var(--ink)] hover:bg-[var(--line-subtle)] cursor-pointer"
								data-testid="presenter-copilot-btn-all_on_4_upper"
							>
								All-on-4 Верх
							</button>
							<button
								type="button"
								onClick={() => onSelectCopilotPreset("All-on-4 нижняя челюсть")}
								className="min-h-[36px] px-2.5 py-1 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-xs font-semibold text-[var(--ink)] hover:bg-[var(--line-subtle)] cursor-pointer"
								data-testid="presenter-copilot-btn-all_on_4_lower"
							>
								All-on-4 Низ
							</button>
							<button
								type="button"
								onClick={() => onSelectCopilotPreset("Костная пластика Bio-Oss")}
								className="min-h-[36px] px-2.5 py-1 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-xs font-semibold text-[var(--ink)] hover:bg-[var(--line-subtle)] cursor-pointer"
								data-testid="presenter-copilot-btn-bone_graft_bio_oss"
							>
								Костная пластика
							</button>
							<button
								type="button"
								onClick={() => onSelectCopilotPreset("Пересчет анестезии и изоляции")}
								className="min-h-[36px] px-2.5 py-1 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-xs font-semibold text-[var(--ink)] hover:bg-[var(--line-subtle)] cursor-pointer"
								data-testid="presenter-copilot-btn-recalculate_anesthesia_isolation"
							>
								Анестезия
							</button>
						</div>
					</div>

					<div className="flex items-center gap-2">
						<input
							type="text"
							value={copilotPrompt}
							onChange={(e) => onCopilotPromptChange(e.target.value)}
							placeholder="Запрос к копайлоту..."
							className="flex-1 min-h-[36px] px-3 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-xs text-[var(--ink)]"
						/>
						<button
							type="button"
							onClick={onCopilotSend}
							className="min-h-[36px] min-w-[36px] px-3 rounded-lg bg-[var(--teal)] text-[var(--paper-strong,#ffffff)] text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
							data-testid="presenter-copilot-send-btn"
						>
							<Send className="w-3.5 h-3.5" />
							<span className="hidden sm:inline">Отправить</span>
						</button>
					</div>
				</div>
			)}
		</header>
	);
};

export default PresenterHeader;
