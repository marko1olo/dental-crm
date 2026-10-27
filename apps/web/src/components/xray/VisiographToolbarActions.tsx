/**
 * VisiographToolbarActions.tsx — Кнопки действий визиографа и рентгена
 * Mandate 8b: строго <= 120 строк.
 * Mandate 8am: ровно 1 Primary CTA (var(--teal)), вторичные — нейтральные с 1px border var(--line).
 */

import React from "react";
import { Camera, Eye, Sliders, Sparkles, SunMedium, Undo2 } from "lucide-react";

export interface VisiographToolbarActionsProps {
	readonly onCaptureScan: () => void;
	readonly isInverted: boolean;
	readonly onToggleInvert: () => void;
	readonly activeFilter?: "standard" | "endo" | "bone" | "enamel" | undefined;
	readonly onSelectFilter: (filter: "standard" | "endo" | "bone" | "enamel") => void;
	readonly onAdjustContrast?: () => void;
	readonly isCapturing?: boolean;
}

export function VisiographToolbarActions({
	onCaptureScan,
	isInverted,
	onToggleInvert,
	activeFilter = "standard",
	onSelectFilter,
	onAdjustContrast,
	isCapturing = false,
}: VisiographToolbarActionsProps) {
	return (
		<div
			className="flex items-center gap-2 flex-wrap sm:flex-nowrap"
			data-testid="visiograph-toolbar-actions"
			role="toolbar"
			aria-label="Панель инструментов радиовизиографа"
		>
			{/* РО В Н О  1  P R I M A R Y  C T A : Захват снимка с сенсора */}
			<button
				type="button"
				onClick={onCaptureScan}
				disabled={isCapturing}
				data-testid="btn-xray-primary-capture"
				className="h-9 min-h-[36px] sm:min-h-[36px] px-3.5 rounded-xl bg-[var(--teal,#0d9488)] hover:bg-[var(--teal-dark,#0f766e)] text-[var(--on-teal,#ffffff)] text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm active:scale-98 transition-all cursor-pointer touch-manipulation disabled:opacity-60"
				title="Захватить прицельный снимок с визиографа"
			>
				<Camera size={15} />
				<span>{isCapturing ? "Захват..." : "Захват снимка"}</span>
			</button>

			{/* ВТОРИЧНЫЕ НЕЙТРАЛЬНЫЕ РЕГУЛЯТОРЫ (1px border var(--line), без радуги) */}
			<div className="inline-flex items-center gap-1 p-0.5 rounded-xl border border-[var(--line,#e2e8f0)] dark:border-[var(--line,#334155)] bg-[var(--paper-soft,#f8fafc)] dark:bg-[var(--paper-soft,#1e293b)]">
				{(["standard", "endo", "bone", "enamel"] as const).map((filterKey) => {
					const labels = { standard: "Стандарт", endo: "Эндо", bone: "Кость", enamel: "Эмаль" };
					const isAct = activeFilter === filterKey;
					return (
						<button
							key={filterKey}
							type="button"
							onClick={() => onSelectFilter(filterKey)}
							data-testid={`btn-filter-${filterKey}`}
							className={`h-8 min-h-[32px] px-2.5 rounded-lg text-xs transition-all cursor-pointer ${
								isAct
									? "bg-[var(--paper,#ffffff)] dark:bg-[var(--paper,#0f172a)] text-[var(--ink,#0f172a)] dark:text-[var(--ink,#f8fafc)] font-semibold shadow-2xs border border-[var(--line-strong,#cbd5e1)]"
									: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] border border-transparent"
							}`}
						>
							{labels[filterKey]}
						</button>
					);
				})}
			</div>

			<button
				type="button"
				onClick={onToggleInvert}
				data-testid="btn-xray-invert"
				className={`h-8 min-h-[32px] sm:min-h-[32px] px-2.5 rounded-lg border text-xs font-medium inline-flex items-center gap-1.5 transition-all cursor-pointer touch-manipulation ${
					isInverted
						? "border-[var(--teal,#0d9488)] bg-[var(--teal-soft,rgba(13,148,136,0.1))] text-[var(--teal,#0d9488)] font-semibold"
						: "border-[var(--line,#e2e8f0)] dark:border-[var(--line,#334155)] bg-[var(--paper,#ffffff)] dark:bg-[var(--paper,#0f172a)] text-[var(--ink,#0f172a)] dark:text-[var(--ink,#f8fafc)] hover:bg-[var(--paper-soft)]"
				}`}
				title="Инвертировать цвета (Негатив/Позитив)"
			>
				<Eye size={14} className={isInverted ? "text-[var(--teal,#0d9488)]" : "text-[var(--muted,#64748b)]"} />
				<span>Инверсия</span>
			</button>

			{onAdjustContrast && (
				<button
					type="button"
					onClick={onAdjustContrast}
					data-testid="btn-xray-contrast"
					className="h-8 min-h-[32px] sm:min-h-[32px] px-2.5 rounded-lg border border-[var(--line,#e2e8f0)] dark:border-[var(--line,#334155)] bg-[var(--paper,#ffffff)] dark:bg-[var(--paper,#0f172a)] text-[var(--ink,#0f172a)] dark:text-[var(--ink,#f8fafc)] hover:bg-[var(--paper-soft)] text-xs font-medium inline-flex items-center gap-1.5 transition-all cursor-pointer touch-manipulation"
					title="Настройка яркости и контрастности"
				>
					<SunMedium size={14} className="text-[var(--muted,#64748b)]" />
					<span>Контраст</span>
				</button>
			)}
		</div>
	);
}
