/**
 * TreatmentPlanPresenterHeader.tsx — шапка презентации планов лечения и навигационная панель табов.
 */

import React from "react";
import {
	Bot,
	Calendar,
	Clock,
	Coins,
	Copy,
	FileText,
	Layers,
	Maximize2,
	Minimize2,
	Printer,
	Tablet,
	X,
} from "lucide-react";

export type PresenterTabId =
	| "comparison"
	| "stages"
	| "roadmap"
	| "finance"
	| "print_appendix"
	| "ai_audit";

export interface TreatmentPlanPresenterHeaderProps {
	readonly patientName: string;
	readonly doctorFullName: string;
	readonly planAgeDays: number;
	readonly isFullscreen: boolean;
	readonly onToggleFullscreen: () => void;
	readonly activeTab: PresenterTabId;
	readonly onSelectTab: (tab: PresenterTabId) => void;
	readonly onCopyTiersSummary: () => void;
	readonly onPrintAppendix: () => void;
	readonly onClose: () => void;
	readonly aiAuditResult: unknown;
	readonly isAiAuditing: boolean;
	readonly onRunAiAudit: () => void;
}

export const TreatmentPlanPresenterHeader: React.FC<TreatmentPlanPresenterHeaderProps> = ({
	patientName,
	doctorFullName,
	planAgeDays,
	isFullscreen,
	onToggleFullscreen,
	activeTab,
	onSelectTab,
	onCopyTiersSummary,
	onPrintAppendix,
	onClose,
	aiAuditResult,
	isAiAuditing,
	onRunAiAudit,
}) => {
	return (
		<header className="treatment-presenter-header">
			<div className="treatment-presenter-header-main">
				<div className="treatment-presenter-title-group min-w-0 flex-1">
					<div className="treatment-presenter-icon-badge shrink-0">
						<Tablet size={20} />
					</div>
					<div className="treatment-presenter-header-meta min-w-0 flex-1">
						<h2 id="treatment-presenter-modal-title" className="treatment-presenter-main-title flex items-center gap-2 flex-wrap">
							<span className="truncate">Презентация планов лечения</span>
							<span className="treatment-presenter-law-badge whitespace-nowrap" title="Прейскурант и стандарты лечения">
								Прейскурант клиники
							</span>
							{planAgeDays > 30 && (
								<span
									className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-800 dark:text-amber-300 font-bold border border-amber-500/30 text-xs inline-flex items-center gap-1 shadow-2xs whitespace-nowrap"
									title="План составлен более 30 дней назад, цены могут быть скорректированы. Создание нарядов ЗТЛ, оказание услуг и оплата не блокируются (согласовано врачом)."
									data-testid="presenter-expired-unblocked-badge"
								>
									<Clock size={12} className="text-amber-600 dark:text-amber-400 shrink-0" />
									План составлен более 30 дней назад, цены могут быть скорректированы
								</span>
							)}
						</h2>
						<p className="treatment-presenter-subtitle truncate">
							Пациент: <strong className="text-[var(--tp-text-main)]">{patientName || "Не указан"}</strong>
							{doctorFullName ? <> · Врач: {doctorFullName}</> : null}
						</p>
					</div>
				</div>

				{/* Header Actions */}
				<div className="flex items-center gap-1.5 shrink-0">
					<button
						type="button"
						onClick={onCopyTiersSummary}
						className="min-h-[44px] sm:min-h-[32px] sm:h-8 px-3 py-1 rounded-lg text-xs font-bold bg-[var(--tp-surface-soft)] hover:bg-[var(--tp-surface)] text-[var(--tp-text-main)] border border-[var(--tp-border)] shadow-xs flex items-center gap-1.5 cursor-pointer transition-all touch-manipulation hover:border-[var(--tp-primary)]"
						title="Скопировать смету для пациента (WhatsApp / Telegram)"
						data-testid="presenter-copy-tiers-summary-btn"
					>
						<Copy size={14} className="text-[var(--tp-primary)] shrink-0" />
						<span className="hidden sm:inline">Скопировать смету</span>
						<span className="sm:hidden">Копия</span>
					</button>

					<button
						type="button"
						onClick={onPrintAppendix}
						className="min-h-[44px] sm:min-h-[32px] sm:h-8 px-2.5 py-1 rounded-lg text-xs font-bold bg-[var(--tp-surface-soft)] hover:bg-[var(--tp-surface)] text-[var(--tp-text-main)] border border-[var(--tp-border)] shadow-xs flex items-center gap-1.5 cursor-pointer transition-all touch-manipulation"
						title="Печать Приложения №1 к Договору (ПП РФ № 736)"
						data-testid="presenter-header-print-btn"
					>
						<Printer size={14} className="shrink-0" />
						<span className="hidden md:inline">Печать №1</span>
					</button>

					<button
						type="button"
						onClick={onToggleFullscreen}
						className="treatment-presenter-close-btn sm:w-8 sm:h-8 sm:min-w-[32px] sm:min-h-[32px] rounded-lg"
						title={isFullscreen ? "Выйти из полноэкранного режима" : "Полноэкранный режим"}
						aria-label={isFullscreen ? "Выйти из полноэкранного режима" : "Полноэкранный режим"}
						data-testid="presenter-fullscreen-btn"
					>
						{isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
					</button>

					<button
						type="button"
						onClick={onClose}
						className="treatment-presenter-close-btn sm:w-8 sm:h-8 sm:min-w-[32px] sm:min-h-[32px] rounded-lg"
						aria-label="Закрыть модальное окно"
						data-testid="close-treatment-presenter-btn"
					>
						<X size={18} />
					</button>
				</div>
			</div>

			{/* Navigation Tabs */}
			<nav className="treatment-presenter-tabs" aria-label="Режимы просмотра">
				<button
					type="button"
					onClick={() => onSelectTab("comparison")}
					className={"treatment-presenter-tab-btn " + (activeTab === "comparison" ? "active" : "")}
					data-testid="tab-comparison-btn"
				>
					<Layers size={14} />
					<span>3-Tier Сравнение</span>
				</button>
				<button
					type="button"
					onClick={() => onSelectTab("stages")}
					className={"treatment-presenter-tab-btn " + (activeTab === "stages" ? "active" : "")}
					data-testid="tab-stages-btn"
				>
					<Clock size={14} />
					<span>Клинические этапы</span>
				</button>
				<button
					type="button"
					onClick={() => onSelectTab("roadmap")}
					className={"treatment-presenter-tab-btn " + (activeTab === "roadmap" ? "active" : "")}
					data-testid="tab-roadmap-btn"
				>
					<Calendar size={14} />
					<span>Дорожная карта</span>
				</button>
				<button
					type="button"
					onClick={() => onSelectTab("finance")}
					className={"treatment-presenter-tab-btn " + (activeTab === "finance" ? "active" : "")}
					data-testid="tab-finance-btn"
				>
					<Coins size={14} />
					<span>Финансы & НДФЛ</span>
				</button>
				<button
					type="button"
					onClick={() => onSelectTab("print_appendix")}
					className={"treatment-presenter-tab-btn " + (activeTab === "print_appendix" ? "active" : "")}
					data-testid="tab-print-btn"
				>
					<FileText size={14} />
					<span>Приложение №1</span>
				</button>
				<button
					type="button"
					onClick={() => {
						onSelectTab("ai_audit");
						if (!aiAuditResult && !isAiAuditing) {
							onRunAiAudit();
						}
					}}
					className={"treatment-presenter-tab-btn " + (activeTab === "ai_audit" ? "active" : "")}
					data-testid="tab-ai-audit-btn"
				>
					<Bot size={14} className="text-amber-500" />
					<span>ИИ-Аудит & Комментарий</span>
				</button>
			</nav>
		</header>
	);
};
