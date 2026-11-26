/**
 * VisitEmkHabitsControls.tsx — Живые клинические привычки у кресла:
 * 1) Кнопка «Как в прошлый раз» с превью последнего визита (0px шума при отсутствии прошлых визитов)
 * 2) Живые чипы ближайших свободных окон врача для записи повторного приёма в 1 тап
 */

import React from "react";
import { createPortal } from "react-dom";
import { Calendar, Check, Clock, History, Loader2, X } from "lucide-react";
import { formatKopecksToRub } from "@dental/shared";
import {
	formatSlotChipLabel,
	type NextFreeSlotCandidate,
	type RecentVisitSummaryItem,
} from "./visitChairsideHabitsApi";

export interface EmkRecentVisitCopyButtonProps {
	readonly recentVisits: readonly RecentVisitSummaryItem[];
	readonly onCopyRecentVisit: (visit: RecentVisitSummaryItem) => void;
}

export const EmkRecentVisitCopyButton: React.FC<EmkRecentVisitCopyButtonProps> = ({
	recentVisits,
	onCopyRecentVisit,
}) => {
	const [isOpen, setIsOpen] = React.useState(false);
	const buttonRef = React.useRef<HTMLButtonElement>(null);
	const popoverRef = React.useRef<HTMLDivElement>(null);
	const [popoverPos, setPopoverPos] = React.useState<{ top: number; left: number }>({ top: 0, left: 0 });

	React.useEffect(() => {
		if (!isOpen) return;
		const updatePos = () => {
			const rect = buttonRef.current?.getBoundingClientRect();
			if (!rect) return;
			const maxLeft = Math.max(12, window.innerWidth - 360);
			setPopoverPos({
				top: rect.bottom + 6,
				left: Math.min(Math.max(12, rect.left), maxLeft),
			});
		};
		updatePos();
		const handleOutside = (e: MouseEvent) => {
			const target = e.target as Node;
			if (
				popoverRef.current && !popoverRef.current.contains(target) &&
				buttonRef.current && !buttonRef.current.contains(target)
			) {
				setIsOpen(false);
			}
		};
		const handleEsc = (e: KeyboardEvent) => {
			if (e.key === "Escape") setIsOpen(false);
		};
		document.addEventListener("mousedown", handleOutside);
		window.addEventListener("keydown", handleEsc);
		window.addEventListener("resize", updatePos);
		return () => {
			document.removeEventListener("mousedown", handleOutside);
			window.removeEventListener("keydown", handleEsc);
			window.removeEventListener("resize", updatePos);
		};
	}, [isOpen]);

	// 0px визуального шума, если прошлых визитов нет (Мандат 8ba)
	if (recentVisits.length === 0) return null;

	const popoverContent = isOpen ? (
		<div
			ref={popoverRef}
			style={{ top: popoverPos.top, left: popoverPos.left }}
			className="fixed z-[120] w-[340px] max-w-[calc(100vw-24px)] rounded-xl border border-[var(--line)] bg-[var(--paper-strong,var(--paper))] shadow-xl p-3 flex flex-col gap-2"
			data-testid="recent-visit-preview-popover"
			role="dialog"
			aria-label="Перенести данные прошлого визита"
		>
			<div className="flex items-center justify-between gap-2 pb-1.5 border-b border-[var(--line)]">
				<span className="text-xs font-semibold text-[var(--ink)]">Прошлые приёмы пациента</span>
				<button
					type="button"
					onClick={() => setIsOpen(false)}
					className="w-6 h-6 rounded-md inline-flex items-center justify-center text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] cursor-pointer"
					aria-label="Закрыть список прошлых приёмов"
				>
					<X className="w-3.5 h-3.5 shrink-0" />
				</button>
			</div>
			<div className="flex flex-col gap-2 max-h-72 overflow-y-auto">
				{recentVisits.map((visit) => {
					const dateObj = new Date(visit.visitDate);
					const dateLabel = Number.isNaN(dateObj.getTime())
						? visit.visitDate
						: dateObj.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
					return (
						<div
							key={visit.id}
							className="p-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] flex flex-col gap-1.5"
						>
							<div className="flex items-center justify-between gap-2 text-xs">
								<span className="font-semibold text-[var(--ink)]">{dateLabel}</span>
								{visit.services.length > 0 && (
									<span className="text-[11px] font-mono text-[var(--ink-muted)] tabular-nums">
										{visit.services.length} усл.
									</span>
								)}
							</div>
							{visit.diagnosis && (
								<div className="text-xs font-medium text-[var(--ink)] line-clamp-2">
									{visit.diagnosis}
								</div>
							)}
							{visit.complaint && (
								<div className="text-[11px] text-[var(--ink-muted)] line-clamp-2">
									{visit.complaint}
								</div>
							)}
							{visit.services.length > 0 && (
								<div className="flex flex-wrap gap-1 pt-0.5">
									{visit.services.slice(0, 3).map((srv) => (
										<span
											key={srv.id}
											className="px-1.5 py-0.5 rounded bg-[var(--paper-soft)] border border-[var(--line)] text-[10px] text-[var(--ink)] truncate max-w-full"
										>
											{srv.title} · {formatKopecksToRub(srv.totalPriceKopecks)}
										</span>
									))}
								</div>
							)}
							<button
								type="button"
								onClick={() => {
									onCopyRecentVisit(visit);
									setIsOpen(false);
								}}
								data-testid={`btn-apply-recent-visit-${visit.id}`}
								className="mt-1 h-8 px-2.5 rounded-lg text-xs font-medium bg-[var(--primary)] text-white hover:opacity-90 transition-opacity inline-flex items-center justify-center gap-1.5 cursor-pointer"
							>
								<Check className="w-3.5 h-3.5 shrink-0" />
								<span>Перенести в текущий приём</span>
							</button>
						</div>
					);
				})}
			</div>
		</div>
	) : null;

	return (
		<>
			<button
				ref={buttonRef}
				type="button"
				onClick={() => setIsOpen((prev) => !prev)}
				data-testid="btn-copy-recent-visit"
				className="secondary-button h-[28px] px-2.5 rounded-lg text-xs font-medium border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] inline-flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
				title="Скопировать жалобы, диагноз и услуги из последнего приёма"
			>
				<History className="w-3.5 h-3.5 text-[var(--primary)] shrink-0" />
				<span className="hidden md:inline">Как в прошлый раз</span>
				<span className="md:hidden">Прошлый приём</span>
			</button>
			{typeof document !== "undefined" && popoverContent
				? createPortal(popoverContent, document.body)
				: popoverContent}
		</>
	);
};

export interface EmkFollowupSlotsPopoverButtonProps {
	readonly slots: readonly NextFreeSlotCandidate[];
	readonly isLoadingSlots: boolean;
	readonly bookingSlotKey: string | null;
	readonly onOpenPopover: () => void;
	readonly onBookSlot: (slot: NextFreeSlotCandidate) => Promise<void>;
}

export const EmkFollowupSlotsPopoverButton: React.FC<EmkFollowupSlotsPopoverButtonProps> = ({
	slots,
	isLoadingSlots,
	bookingSlotKey,
	onOpenPopover,
	onBookSlot,
}) => {
	const [isOpen, setIsOpen] = React.useState(false);
	const buttonRef = React.useRef<HTMLButtonElement>(null);
	const popoverRef = React.useRef<HTMLDivElement>(null);
	const [popoverPos, setPopoverPos] = React.useState<{ top: number; right: number }>({ top: 0, right: 12 });

	React.useEffect(() => {
		if (!isOpen) return;
		const updatePos = () => {
			const rect = buttonRef.current?.getBoundingClientRect();
			if (!rect) return;
			setPopoverPos({
				top: rect.bottom + 6,
				right: Math.max(12, window.innerWidth - rect.right),
			});
		};
		updatePos();
		const handleOutside = (e: MouseEvent) => {
			const target = e.target as Node;
			if (
				popoverRef.current && !popoverRef.current.contains(target) &&
				buttonRef.current && !buttonRef.current.contains(target)
			) {
				setIsOpen(false);
			}
		};
		const handleEsc = (e: KeyboardEvent) => {
			if (e.key === "Escape") setIsOpen(false);
		};
		document.addEventListener("mousedown", handleOutside);
		window.addEventListener("keydown", handleEsc);
		window.addEventListener("resize", updatePos);
		return () => {
			document.removeEventListener("mousedown", handleOutside);
			window.removeEventListener("keydown", handleEsc);
			window.removeEventListener("resize", updatePos);
		};
	}, [isOpen]);

	const handleToggle = () => {
		const next = !isOpen;
		setIsOpen(next);
		if (next) onOpenPopover();
	};

	const popoverContent = isOpen ? (
		<div
			ref={popoverRef}
			style={{ top: popoverPos.top, right: popoverPos.right }}
			className="fixed z-[120] w-[320px] max-w-[calc(100vw-24px)] rounded-xl border border-[var(--line)] bg-[var(--paper-strong,var(--paper))] shadow-xl p-3 flex flex-col gap-2"
			data-testid="followup-slots-popover"
			role="dialog"
			aria-label="Ближайшие свободные окна врача"
		>
			<div className="flex items-center justify-between gap-2 pb-1.5 border-b border-[var(--line)]">
				<span className="text-xs font-semibold text-[var(--ink)]">Свободные окна для записи</span>
				<button
					type="button"
					onClick={() => setIsOpen(false)}
					className="w-6 h-6 rounded-md inline-flex items-center justify-center text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] cursor-pointer"
					aria-label="Закрыть список свободных окон"
				>
					<X className="w-3.5 h-3.5 shrink-0" />
				</button>
			</div>
			{isLoadingSlots ? (
				<div className="py-4 flex items-center justify-center gap-2 text-xs text-[var(--ink-muted)]">
					<Loader2 className="w-4 h-4 animate-spin shrink-0 text-[var(--primary)]" />
					<span>Поиск свободных окон...</span>
				</div>
			) : slots.length === 0 ? (
				<div className="py-3 text-xs text-[var(--ink-muted)] text-center">
					Свободных окон на ближайшие недели не найдено.
				</div>
			) : (
				<div className="flex flex-col gap-1.5">
					{slots.map((slot) => {
						const slotKey = `${slot.offsetDays}-${slot.startsAt}`;
						const isBooking = bookingSlotKey === slotKey;
						return (
							<button
								key={slotKey}
								type="button"
								onClick={async () => {
									await onBookSlot(slot);
									setIsOpen(false);
								}}
								data-testid={`followup-slot-chip-${slot.offsetDays}`}
								className="min-h-[38px] px-2.5 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] hover:border-[var(--primary)] text-left flex items-center justify-between gap-2 transition-colors cursor-pointer"
							>
								<div className="flex items-center gap-2 min-w-0">
									{isBooking ? (
										<Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin text-[var(--primary)]" />
									) : (
										<Clock className="w-3.5 h-3.5 shrink-0 text-[var(--primary)]" />
									)}
									<span className="text-xs font-medium text-[var(--ink)] truncate">
										{formatSlotChipLabel(slot)}
									</span>
								</div>
								{slot.chairName && (
									<span className="text-[11px] text-[var(--ink-muted)] shrink-0">
										{slot.chairName}
									</span>
								)}
							</button>
						);
					})}
				</div>
			)}
		</div>
	) : null;

	return (
		<>
			<button
				ref={buttonRef}
				type="button"
				onClick={handleToggle}
				className="border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-medium rounded-lg px-2.5 py-1 text-xs shadow-2xs hover:bg-[var(--paper-soft)] transition-colors inline-flex items-center gap-1.5 cursor-pointer"
				data-testid="btn-schedule-next-stage"
				title="Выбрать ближайшее свободное окно для повторного визита"
			>
				<Calendar className="w-3.5 h-3.5 shrink-0 text-[var(--primary)]" />
				<span className="hidden sm:inline">След. визит</span>
				<span className="sm:hidden">Окна</span>
			</button>
			{typeof document !== "undefined" && popoverContent
				? createPortal(popoverContent, document.body)
				: popoverContent}
		</>
	);
};

export interface EmkInlineFollowupChipsProps {
	readonly slots: readonly NextFreeSlotCandidate[];
	readonly bookingSlotKey: string | null;
	readonly onBookSlot: (slot: NextFreeSlotCandidate) => Promise<void>;
}

export const EmkInlineFollowupChips: React.FC<EmkInlineFollowupChipsProps> = ({
	slots,
	bookingSlotKey,
	onBookSlot,
}) => {
	if (slots.length === 0) return null;
	return (
		<div className="flex items-center gap-1.5 flex-wrap pt-1" data-testid="completion-followup-slot-chips">
			<span className="text-xs text-[var(--ink-muted)] font-medium">Записать повторно:</span>
			{slots.slice(0, 4).map((slot) => {
				const slotKey = `${slot.offsetDays}-${slot.startsAt}`;
				const isBooking = bookingSlotKey === slotKey;
				return (
					<button
						key={slotKey}
						type="button"
						onClick={() => void onBookSlot(slot)}
						data-testid={`completion-slot-chip-${slot.offsetDays}`}
						className="h-8 px-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-xs font-medium text-[var(--ink)] inline-flex items-center gap-1.5 cursor-pointer transition-colors"
					>
						{isBooking ? (
							<Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--primary)] shrink-0" />
						) : (
							<Calendar className="w-3.5 h-3.5 text-[var(--primary)] shrink-0" />
						)}
						<span>{formatSlotChipLabel(slot)}</span>
					</button>
				);
			})}
		</div>
	);
};
