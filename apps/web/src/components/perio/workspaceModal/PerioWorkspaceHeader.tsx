/**
 * PerioWorkspaceHeader.tsx — Верхний тулбар кабинета пародонтологии DENTE CRM
 * Содержит статус сохранения ЭМК, сводные бейджи BOP/карманов, 1-клик пресеты
 * и ровно 1 Primary CTA кнопку #0d9488 (Мандаты 8am, 8e, 8ze).
 */

import React from "react";
import { Activity, Check, Clock, Save, X, Sparkles, Printer, BarChart3 } from "lucide-react";

export interface PerioWorkspaceHeaderProps {
	readonly patientName?: string | undefined;
	readonly syncStatus: "idle" | "saving" | "saved";
	readonly lastSavedAt: string | null;
	readonly fmbsPercent: number;
	readonly deepPocketsCount: number;
	readonly isModal?: boolean | undefined;
	readonly onClose?: (() => void) | undefined;
	readonly onSetAllIntact: () => void;
	readonly onApplyPreset: (presetId: string) => void;
	readonly onToggleIndicesDetails: () => void;
	readonly onPrintProtocol: () => void;
	readonly onSave: () => void;
}

export const PerioWorkspaceHeader: React.FC<PerioWorkspaceHeaderProps> = React.memo(({
	patientName = "Пациент пародонтологии",
	syncStatus,
	lastSavedAt,
	fmbsPercent,
	deepPocketsCount,
	isModal = false,
	onClose,
	onSetAllIntact,
	onApplyPreset,
	onToggleIndicesDetails,
	onPrintProtocol,
	onSave,
}) => {
	return (
		<div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] pb-3">
			<div className="flex items-center gap-2.5 min-w-0">
				<div className="w-9 h-9 rounded-xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center shrink-0">
					<Activity className="w-5 h-5 text-teal-600 dark:text-teal-400" />
				</div>
				<div className="min-w-0">
					<div className="flex items-center gap-2 flex-wrap">
						<h2 className="text-sm sm:text-base font-bold text-[var(--ink)] leading-tight whitespace-nowrap">
							Кабинет пародонтологии
						</h2>
						{patientName && (
							<span className="text-xs px-2 py-0.5 rounded bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--muted)] truncate max-w-[220px]">
								{patientName}
							</span>
						)}
					</div>
					<p className="text-xs text-[var(--muted)] flex items-center gap-2 pt-0.5 flex-wrap">
						{syncStatus === "saved" ? (
							<span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
								<Check className="w-3.5 h-3.5" /> Сохранено {lastSavedAt ? `в ${lastSavedAt}` : ""}
							</span>
						) : syncStatus === "saving" ? (
							<span className="inline-flex items-center gap-1 text-teal-600 dark:text-teal-400 font-medium animate-pulse">
								<Clock className="w-3.5 h-3.5" /> Сохранение...
							</span>
						) : (
							<span>Черновик</span>
						)}
						<button
							type="button"
							onClick={onToggleIndicesDetails}
							className="text-rose-600 dark:text-rose-400 font-semibold hover:underline cursor-pointer"
							title="Нажмите для подробного расчета индексов"
						>
							• BOP: {fmbsPercent}%
						</button>
						{deepPocketsCount > 0 && (
							<span className="text-amber-600 dark:text-amber-400 font-medium">
								{"• Карманы \u2265 4 мм: "}{deepPocketsCount}
							</span>
						)}
					</p>
				</div>
			</div>

			<div className="perio-toolbar-actions flex items-center gap-2 flex-wrap sm:flex-nowrap">
				<button
					type="button"
					onClick={onSetAllIntact}
					disabled={false}
					data-testid="perio-toolbar-norm-1click-btn"
					className="min-h-[44px] min-w-[44px] h-9 px-3 rounded-lg bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-[var(--ink)] font-semibold text-xs flex items-center gap-1.5 border border-[var(--line)] cursor-pointer transition-all shrink-0 whitespace-nowrap"
				>
					<Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Пародонт интактен (Норма)
				</button>
				<button
					type="button"
					onClick={() => onApplyPreset("pro_hygiene_express")}
					disabled={false}
					data-testid="perio-toolbar-prophy-1click-btn"
					className="min-h-[44px] min-w-[44px] h-9 px-3 rounded-lg bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-[var(--ink)] font-semibold text-xs flex items-center gap-1.5 border border-[var(--line)] cursor-pointer transition-all shrink-0 whitespace-nowrap"
				>
					<Sparkles className="w-3.5 h-3.5 text-sky-500" /> Профгигиена
				</button>
				<button
					type="button"
					onClick={() => onApplyPreset("periodontitis_severe_express")}
					disabled={false}
					data-testid="perio-preset-severe-btn"
					data-preset-card="perio-preset-severe-periodontitis-card"
					className="min-h-[44px] min-w-[44px] h-9 px-2.5 rounded-lg bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-rose-600 dark:text-rose-400 font-semibold text-xs flex items-center gap-1 border border-[var(--line)] cursor-pointer transition-all shrink-0 whitespace-nowrap"
				>
					Пародонтит тяжелый (6-8 мм)
				</button>
				<button
					type="button"
					onClick={onToggleIndicesDetails}
					disabled={false}
					data-testid="perio-calc-indices-btn"
					className="min-h-[44px] min-w-[44px] h-9 px-2.5 rounded-lg bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-[var(--ink)] font-semibold text-xs flex items-center gap-1.5 border border-[var(--line)] cursor-pointer transition-all shrink-0 whitespace-nowrap"
					title="Расчёт индексов пародонта и BOP"
				>
					<BarChart3 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" /> Расчёт BOP
				</button>
				<button
					type="button"
					onClick={onPrintProtocol}
					disabled={false}
					data-testid="perio-print-protocol-btn"
					className="min-h-[44px] min-w-[44px] h-9 px-2.5 rounded-lg bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-[var(--ink)] font-semibold text-xs flex items-center gap-1.5 border border-[var(--line)] cursor-pointer transition-all shrink-0 whitespace-nowrap"
					title="Печать протокола осмотра"
				>
					<Printer className="w-3.5 h-3.5 text-[var(--muted)]" /> Печать
				</button>
				<button
					type="button"
					onClick={onSave}
					disabled={false}
					data-testid="perio-save-draft-btn"
					className="perio-desktop-primary-cta perio-primary-cta-btn min-h-[44px] min-w-[44px] h-9 px-4 rounded-lg !bg-[#0d9488] hover:!bg-[#0f766e] !text-white font-bold text-xs items-center justify-center gap-1.5 shadow-sm cursor-pointer transition-all shrink-0 whitespace-nowrap"
					title="Сохранить статус десны (Зафиксировать статус пародонта)"
				>
					<Save className="w-4 h-4 !text-white" /> <span>✓ Зафиксировать статус пародонта</span>
				</button>
				{isModal && onClose && (
					<button
						type="button"
						onClick={onClose}
						disabled={false}
						className="min-h-[44px] min-w-[44px] h-9 w-9 rounded-lg bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)] border border-[var(--line)] flex items-center justify-center cursor-pointer transition-all shrink-0"
						title="Закрыть"
					>
						<X className="w-4 h-4" />
					</button>
				)}
			</div>
		</div>
	);
});

PerioWorkspaceHeader.displayName = "PerioWorkspaceHeader";
