/**
 * CoachMarkTooltip.tsx
 *
 * DENTE CRM — Interactive Step-by-Step Clinical Guided Coach Card
 *
 * Authorities:
 * - Mandate 8d: 7 Deadly Sins of UI (Zero cartoon emojis, WCAG AAA contrast, zero text clipping, mobile responsive).
 * - Mandate 8e: Doctor Autonomy (Escape handler, clean dismiss, never obscuring hot actions).
 * - Mandate 8n: Solo Doctor & Small Clinic Sovereignty (Concise, 1-click friendly tips).
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
	CheckCircle2,
	ChevronLeft,
	ChevronRight,
	Sparkles,
	X,
	Zap,
} from "lucide-react";
import {
	calculateTooltipPlacement,
	type SimpleRect,
	type TooltipSide,
	type ViewportDimensions,
} from "./spotlightGeometry";

export interface CoachMarkTooltipProps {
	readonly isOpen: boolean;
	readonly targetRect?: SimpleRect | null;
	readonly stepNumber: number;
	readonly totalSteps: number;
	readonly title: string;
	readonly badge?: string;
	readonly description: string;
	readonly clinicalTip?: string;
	readonly shortcutBadge?: string;
	readonly actionLabel?: string;
	readonly onAction?: () => void;
	readonly onNext: () => void;
	readonly onPrev?: () => void;
	readonly onClose: () => void;
	readonly onNeverShowAgain?: () => void;
	readonly isLastStep?: boolean;
}

export const CoachMarkTooltip: React.FC<CoachMarkTooltipProps> = React.memo(({
	isOpen,
	targetRect,
	stepNumber,
	totalSteps,
	title,
	badge,
	description,
	clinicalTip,
	shortcutBadge,
	actionLabel,
	onAction,
	onNext,
	onPrev,
	onClose,
	onNeverShowAgain,
	isLastStep = false,
}) => {
	const cardRef = useRef<HTMLElement | null>(null);

	// Dynamic viewport tracking with visualViewport support for pinch-zoom and Retina scaling
	const [viewport, setViewport] = useState<ViewportDimensions>(() => {
		if (typeof window === "undefined") {
			return { width: 1920, height: 1080 };
		}
		const vv = window.visualViewport;
		return {
			width: vv ? Math.round(vv.width) : window.innerWidth,
			height: vv ? Math.round(vv.height) : window.innerHeight,
		};
	});

	useEffect(() => {
		if (!isOpen) return;

		let rafId: number | null = null;
		const handleResize = () => {
			if (rafId !== null) cancelAnimationFrame(rafId);
			rafId = requestAnimationFrame(() => {
				const vv = window.visualViewport;
				setViewport({
					width: vv ? Math.round(vv.width) : window.innerWidth,
					height: vv ? Math.round(vv.height) : window.innerHeight,
				});
			});
		};

		window.addEventListener("resize", handleResize, { passive: true });
		window.addEventListener("scroll", handleResize, { passive: true });
		const vv = window.visualViewport;
		if (vv) {
			vv.addEventListener("resize", handleResize, { passive: true });
			vv.addEventListener("scroll", handleResize, { passive: true });
		}

		return () => {
			if (rafId !== null) cancelAnimationFrame(rafId);
			window.removeEventListener("resize", handleResize);
			window.removeEventListener("scroll", handleResize);
			if (vv) {
				vv.removeEventListener("resize", handleResize);
				vv.removeEventListener("scroll", handleResize);
			}
		};
	}, [isOpen]);

	const placement = useMemo(() => {
		return calculateTooltipPlacement(targetRect, 380, 260, viewport, 14);
	}, [targetRect, viewport]);

	// Close on Escape key (Mandate 8e)
	useEffect(() => {
		if (!isOpen) return;

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				e.preventDefault();
				e.stopPropagation();
				onClose();
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, onClose]);

	if (!isOpen) return null;

	const arrowClassMap: Record<TooltipSide, string> = {
		bottom: "tour-tooltip-arrow-top",
		top: "tour-tooltip-arrow-bottom",
		left: "tour-tooltip-arrow-right",
		right: "tour-tooltip-arrow-left",
		center: "",
	};

	const showArrow = placement.side !== "center";
	const arrowClass = arrowClassMap[placement.side] || "";

	let arrowStyle: React.CSSProperties = {};
	if (placement.side === "bottom" || placement.side === "top") {
		arrowStyle = { left: placement.arrowOffsetPx - 6 };
	} else if (placement.side === "left" || placement.side === "right") {
		const verticalOffset = placement.arrowOffsetYPx ?? Math.round(placement.maxHeight / 2);
		arrowStyle = { top: verticalOffset - 6 };
	}

	return (
		<aside
			ref={cardRef}
			style={{
				top: placement.top,
				left: placement.left,
				width: placement.width,
				maxHeight: placement.maxHeight,
			}}
			className="tour-coach-tooltip"
			role="region"
			aria-label={`Обучение шаг ${stepNumber} из ${totalSteps}`}
			data-testid="guided-tour-coach-mark-card"
		>
			{/* Pointer Arrow */}
			{showArrow && (
				<div
					className={`tour-tooltip-arrow ${arrowClass}`}
					style={arrowStyle}
					aria-hidden="true"
				/>
			)}

			{/* Card Header */}
			<div className="px-3.5 py-2.5 bg-[var(--paper-soft,#f8fafc)] border-b border-[var(--line,#e2e8f0)] flex items-center justify-between gap-2 shrink-0 rounded-t-xl">
				<div className="flex items-center gap-2 min-w-0">
					<div className="w-6 h-6 rounded-md bg-[var(--teal-soft,rgba(14,165,233,0.12))] text-[var(--teal,#0ea5e9)] flex items-center justify-center shrink-0">
						<Sparkles size={14} aria-hidden="true" />
					</div>
					<div className="min-w-0">
						<div className="flex items-center gap-1.5 flex-wrap">
							<span className="text-[10px] font-bold uppercase tracking-wider text-[var(--teal,#0ea5e9)]">
								Шаг {stepNumber} из {totalSteps}
							</span>
							{badge && (
								<span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-[var(--paper-subtle,#e2e8f0)] text-[var(--muted,#64748b)]">
									{badge}
								</span>
							)}
						</div>
					</div>
				</div>

				<button
					type="button"
					onClick={onClose}
					className="min-h-[28px] min-w-[28px] flex items-center justify-center rounded-md text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper,#ffffff)] transition-colors cursor-pointer shrink-0"
					aria-label="Закрыть обучение"
					title="Закрыть (Esc)"
					data-testid="coach-mark-close-btn"
				>
					<X size={15} aria-hidden="true" />
				</button>
			</div>

			{/* Card Body with scrollable content if squeezed vertically on mobile (Defect 3 & 8 fix) */}
			<div className="p-3.5 space-y-2.5 text-xs overflow-y-auto no-scrollbar">
				<h3 className="text-sm font-bold text-[var(--ink,#0f172a)] dark:text-[#f8fafc] m-0 leading-tight">
					{title}
				</h3>

				<p className="text-[11px] text-[var(--ink,#1e293b)] dark:text-[#cbd5e1] leading-relaxed m-0 opacity-90">
					{description}
				</p>

				{/* Clinical Tip Box */}
				{clinicalTip && (
					<div className="p-2 rounded-lg bg-[var(--teal-soft,rgba(14,165,233,0.06))] border border-[var(--teal-surface,rgba(14,165,233,0.2))] flex items-start gap-2">
						<Zap size={13} className="text-[var(--teal,#0ea5e9)] shrink-0 mt-0.5" aria-hidden="true" />
						<p className="text-[10px] text-[var(--muted,#64748b)] dark:text-[#94a3b8] leading-normal m-0">
							{clinicalTip}
						</p>
					</div>
				)}

				{/* Shortcut pill & Action link */}
				<div className="flex items-center justify-between gap-2 text-[10px] text-[var(--muted,#64748b)] dark:text-[#94a3b8] pt-0.5">
					{shortcutBadge && (
						<span className="font-medium truncate">{shortcutBadge}</span>
					)}
					{actionLabel && onAction && (
						<button
							type="button"
							onClick={onAction}
							className="text-[var(--teal,#0ea5e9)] hover:underline font-semibold shrink-0 cursor-pointer ml-auto"
							title={`Действие: ${actionLabel}`}
							data-testid="coach-mark-action-btn"
						>
							{actionLabel} →
						</button>
					)}
				</div>
			</div>

			{/* Card Footer */}
			<div className="px-3.5 py-2.5 bg-[var(--paper-soft,#f8fafc)] border-t border-[var(--line,#e2e8f0)] flex items-center justify-between gap-2 shrink-0 rounded-b-xl">
				{onNeverShowAgain && (
					<button
						type="button"
						onClick={onNeverShowAgain}
						className="text-[10px] text-[var(--muted,#64748b)] hover:text-rose-600 dark:hover:text-rose-400 font-medium transition-colors cursor-pointer"
						title="Запомнить выбор навсегда и больше не показывать обучение"
						data-testid="coach-mark-never-show-btn"
					>
						Больше не показывать
					</button>
				)}

				<div className="flex items-center gap-1.5 ml-auto">
					{onPrev && stepNumber > 1 && (
						<button
							type="button"
							onClick={onPrev}
							className="h-7 px-2 rounded-md border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] dark:text-[#f8fafc] text-xs font-semibold inline-flex items-center gap-0.5 hover:bg-[var(--paper-soft,#f8fafc)] transition-all cursor-pointer shadow-2xs"
							aria-label="Предыдущий шаг"
							data-testid="coach-mark-prev-btn"
						>
							<ChevronLeft size={13} aria-hidden="true" />
							<span>Назад</span>
						</button>
					)}

					{!isLastStep ? (
						<button
							type="button"
							onClick={onNext}
							className="h-7 px-2.5 rounded-md bg-[var(--teal,#0ea5e9)] text-white text-xs font-semibold inline-flex items-center gap-1 hover:opacity-90 active:scale-95 transition-all cursor-pointer shadow-2xs"
							aria-label="Следующий шаг"
							data-testid="coach-mark-next-btn"
						>
							<span>Далее</span>
							<ChevronRight size={13} aria-hidden="true" />
						</button>
					) : (
						<button
							type="button"
							onClick={onNext}
							className="h-7 px-2.5 rounded-md bg-emerald-600 text-white text-xs font-semibold inline-flex items-center gap-1 hover:bg-emerald-500 active:scale-95 transition-all cursor-pointer shadow-2xs"
							aria-label="Завершить обучение"
							data-testid="coach-mark-finish-btn"
						>
							<CheckCircle2 size={13} aria-hidden="true" />
							<span>Понятно!</span>
						</button>
					)}
				</div>
			</div>
		</aside>
	);
});

CoachMarkTooltip.displayName = "CoachMarkTooltip";
