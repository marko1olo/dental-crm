import * as React from "react";
import {
	AlertTriangle,
	Calendar,
	CalendarPlus,
	CheckCircle2,
	Clock,
	ExternalLink,
	Eye,
	Link2,
	Phone,
} from "lucide-react";
import type { PipelineCard, PipelineStage, PipelineViewMode } from "./types";
import { formatRub } from "./types";

export interface PipelineCardItemProps {
	card: PipelineCard;
	stageKey: PipelineStage;
	viewMode?: PipelineViewMode;
	copiedToken: string | null;
	isGeneratingLink: string | null;
	onCopyOrGenerateLink: (card: PipelineCard) => void;
}

function getInitials(name: string): string {
	if (!name) return "П";
	const parts = name.trim().split(/\s+/);
	const first = parts[0];
	const second = parts[1];
	if (first && second && first[0] && second[0]) {
		return (first[0] + second[0]).toUpperCase();
	}
	if (first) {
		return first.slice(0, 2).toUpperCase();
	}
	return "П";
}

export const PipelineCardItem: React.FC<PipelineCardItemProps> = ({
	card,
	stageKey,
	viewMode = "horizontal",
	copiedToken,
	isGeneratingLink,
	onCopyOrGenerateLink,
}) => {
	const isApproved = card.budgetStatus === "accepted" || card.status === "Approved";
	const isHorizontal = viewMode === "horizontal";

	return (
		<div className="p-3.5 sm:p-4 rounded-2xl border border-[var(--line)] bg-[var(--paper)] hover:border-[var(--line-strong)] hover:shadow-sm transition space-y-3 text-xs w-full max-w-full overflow-hidden">
			{/* Top Row: Patient Info, Phone, and Total Amount */}
			<div className="flex items-start justify-between gap-2.5 sm:gap-3">
				<div className="flex items-start sm:items-center gap-2.5 min-w-0 flex-1">
					<div className="w-8 h-8 rounded-full bg-[var(--teal,#0d9488)]/10 text-[var(--teal,#0d9488)] flex items-center justify-center font-bold text-xs shrink-0 select-none mt-0.5 sm:mt-0">
						{getInitials(card.patientName)}
					</div>
					<div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-x-2.5 gap-y-0.5 min-w-0 flex-1">
						<span className="font-semibold text-sm sm:text-base text-[var(--text)] leading-snug break-words">
							{card.patientName}
						</span>
						{card.patientPhone && (
							<a
								href={`tel:${card.patientPhone}`}
								className="min-h-[32px] sm:min-h-0 py-1 sm:py-0 text-xs text-[var(--muted)] hover:text-[var(--teal,#0d9488)] transition inline-flex items-center gap-1 whitespace-nowrap shrink-0 touch-manipulation"
								title="Позвонить пациенту"
							>
								<Phone className="w-3.5 h-3.5 text-[var(--teal,#0d9488)] shrink-0" />
								<span>{card.patientPhone}</span>
							</a>
						)}
					</div>
				</div>

				<div className="text-right shrink-0 pl-1">
					<span className="font-bold font-mono text-sm sm:text-base text-[var(--teal,#0d9488)] block whitespace-nowrap">
						{formatRub(card.netTotalRub)}
					</span>
					{Boolean(card.discountRub) && (
						<span className="text-[11px] text-emerald-500 font-mono block whitespace-nowrap">
							-{formatRub(card.discountRub)}
						</span>
					)}
				</div>
			</div>

			{/* Middle Row: Plan title, Doctor, Visit badge, and Status Pills (ZERO MATRYOSHKA INNER BORDER) */}
			<div
				className={`flex gap-3 pt-2 border-t border-[var(--line-subtle)] ${
					isHorizontal
						? "flex-col lg:flex-row lg:items-center lg:justify-between"
						: "flex-col"
				}`}
			>
				{/* Metadata & Status Pills */}
				<div className="flex flex-wrap items-center gap-2 min-w-0 text-xs">
					<span className="font-medium text-[var(--text)]">
						{card.title || card.name}
					</span>
					<span className="text-[var(--line-strong)]">•</span>
					<span className="text-[var(--muted)]">
						Врач: <strong className="font-medium text-[var(--text)]">{card.doctorName || "Не назначен"}</strong>
					</span>

					{/* Status & Visit Badges */}
					{card.hasFutureAppointment && card.nextAppointmentDate && (
						<span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[11px] font-medium flex items-center gap-1 shrink-0">
							<Calendar className="w-3 h-3 shrink-0" />
							<span>Запись: {new Date(card.nextAppointmentDate).toLocaleDateString("ru-RU")}</span>
						</span>
					)}

					{isApproved && (
						<span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[11px] font-medium flex items-center gap-1 shrink-0">
							<CheckCircle2 className="w-3 h-3 shrink-0" />
							<span>✓ Одобрено пациентом</span>
						</span>
					)}

					{card.budgetStatus === "viewed" && !isApproved && (
						<span className="px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/20 text-cyan-500 text-[11px] font-medium flex items-center gap-1 shrink-0">
							<Eye className="w-3 h-3 shrink-0" />
							<span>Открыта пациентом</span>
						</span>
					)}

					{stageKey === "no_appointment" && (
						<span className="px-2 py-0.5 rounded-md bg-teal-500/10 border border-teal-500/25 text-teal-700 dark:text-teal-300 text-[11px] font-medium flex items-center gap-1 shrink-0">
							<AlertTriangle className="w-3 h-3 shrink-0" />
							<span>Без записи</span>
						</span>
					)}

					{stageKey === "in_progress_abandoned" && (
						<span className="px-2 py-0.5 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[11px] font-medium flex items-center gap-1 shrink-0">
							<Clock className="w-3 h-3 shrink-0" />
							<span>Пауза {card.daysSinceLastActivity} дн.</span>
						</span>
					)}
				</div>

				{/* Action Buttons: Unified height 36px on desktop, >= 44px on touch, rounded-xl */}
				<div className="grid grid-cols-2 sm:flex sm:flex-nowrap items-stretch sm:items-center gap-2 shrink-0 pt-1 lg:pt-0 w-full sm:w-auto">
					<a
						href={`#/schedule?patientId=${card.patientId}`}
						className="min-h-[44px] sm:min-h-[36px] h-11 sm:h-9 px-2 sm:px-3.5 rounded-xl bg-[var(--paper-soft)] hover:bg-[var(--line-subtle)] border border-[var(--line)] text-[11px] sm:text-[13px] font-medium text-[var(--text)] transition flex items-center justify-center gap-1 sm:gap-1.5 shadow-sm touch-manipulation whitespace-nowrap"
						style={{ borderRadius: "10px" }}
					>
						<CalendarPlus className="w-3.5 h-3.5 text-[var(--teal,#0d9488)] shrink-0" />
						<span>Записать на приём</span>
					</a>

					<button
						type="button"
						onClick={() => onCopyOrGenerateLink(card)}
						disabled={isGeneratingLink === card.id}
						className={`min-h-[44px] sm:min-h-[36px] h-11 sm:h-9 px-2 sm:px-3.5 rounded-xl border text-[11px] sm:text-[13px] font-medium transition flex items-center justify-center gap-1 sm:gap-1.5 shadow-sm touch-manipulation whitespace-nowrap ${
							copiedToken === card.id
								? "bg-emerald-500/20 border-emerald-500/40 text-emerald-500"
								: "bg-[var(--paper-soft)] hover:bg-[var(--line-subtle)] border-[var(--line)] text-[var(--text)]"
						}`}
						style={{ borderRadius: "10px" }}
						title="Скопировать ссылку для согласования сметы"
					>
						{copiedToken === card.id ? (
							<>
								<CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
								<span>Скопировано!</span>
							</>
						) : isGeneratingLink === card.id ? (
							<div className="w-3.5 h-3.5 border-2 border-[var(--teal,#0d9488)] border-t-transparent rounded-full animate-spin shrink-0" />
						) : (
							<>
								<Link2 className="w-3.5 h-3.5 text-[var(--teal,#0d9488)] shrink-0" />
								<span>Смета / Подпись</span>
							</>
						)}
					</button>

					{card.budgetToken && (
						<a
							href={`/public/budget/${card.budgetToken}`}
							target="_blank"
							rel="noopener noreferrer"
							className="min-h-[44px] sm:min-h-[36px] h-11 sm:h-9 px-3 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--line-subtle)] text-[var(--muted)] hover:text-[var(--text)] transition flex items-center justify-center shadow-sm touch-manipulation shrink-0"
							style={{ borderRadius: "10px" }}
							title="Открыть публичную смету в новой вкладке"
						>
							<ExternalLink className="w-3.5 h-3.5 shrink-0" />
						</a>
					)}
				</div>
			</div>
		</div>
	);
};
