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
	User,
} from "lucide-react";
import type { PipelineCard, PipelineStage } from "./types";
import { formatRub } from "./types";

export interface PipelineCardItemProps {
	card: PipelineCard;
	stageKey: PipelineStage;
	copiedToken: string | null;
	isGeneratingLink: string | null;
	onCopyOrGenerateLink: (card: PipelineCard) => void;
}

export const PipelineCardItem: React.FC<PipelineCardItemProps> = ({
	card,
	stageKey,
	copiedToken,
	isGeneratingLink,
	onCopyOrGenerateLink,
}) => {
	const isApproved = card.budgetStatus === "accepted" || card.status === "Approved";

	return (
		<div className="p-3 sm:p-3.5 rounded-xl border border-[var(--line)] bg-[var(--bg)] hover:border-[var(--line-strong)] hover:shadow-md transition space-y-2.5 text-xs">
			{/* Card Header: Patient & Price */}
			<div className="flex items-start justify-between gap-2">
				<div className="min-w-0 flex-1">
					<div className="font-semibold text-xs sm:text-sm text-[var(--text)] flex items-start gap-1.5 leading-tight break-words">
						<User className="w-3.5 h-3.5 text-[var(--muted)] shrink-0 mt-0.5" />
						<span className="break-words">{card.patientName}</span>
					</div>
					{card.patientPhone && (
						<a
							href={`tel:${card.patientPhone}`}
							className="text-[11px] text-[var(--muted)] hover:text-[var(--teal,#0d9488)] transition flex items-center gap-1 mt-1 whitespace-nowrap shrink-0"
						>
							<Phone className="w-3 h-3 shrink-0" />
							<span className="whitespace-nowrap">{card.patientPhone}</span>
						</a>
					)}
				</div>
				<div className="text-right shrink-0">
					<span className="font-bold font-mono text-xs sm:text-sm text-[var(--teal,#0d9488)] block">
						{formatRub(card.netTotalRub)}
					</span>
					{Boolean(card.discountRub) && (
						<span className="text-[10px] text-emerald-500 block">
							-{formatRub(card.discountRub)}
						</span>
					)}
				</div>
			</div>

			{/* Title & Doctor (wrap naturally to never truncate) */}
			<div className="p-2 bg-[var(--paper)] rounded-lg border border-[var(--line-subtle)] space-y-1">
				<div className="font-medium text-xs text-[var(--text)] break-words leading-snug">
					{card.title || card.name}
				</div>
				<div className="text-[11px] text-[var(--muted)] flex items-start gap-1">
					<span className="shrink-0">Врач:</span>
					<span className="text-[var(--text)] break-words leading-tight">{card.doctorName}</span>
				</div>
			</div>

			{/* Activity & Status Pills */}
			<div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-[10px] sm:text-[11px]">
				{stageKey === "no_appointment" && (
					<span className="px-2 py-0.5 rounded-md bg-purple-500/10 border border-purple-500/20 text-purple-400 font-medium flex items-center gap-1">
						<AlertTriangle className="w-3 h-3 shrink-0" />
						<span>Без записи</span>
					</span>
				)}

				{isApproved && (
					<span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-medium flex items-center gap-1">
						<CheckCircle2 className="w-3 h-3 shrink-0" />
						<span>✓ Одобрено пациентом</span>
					</span>
				)}

				{card.budgetStatus === "viewed" && !isApproved && (
					<span className="px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-medium flex items-center gap-1">
						<Eye className="w-3 h-3 shrink-0" />
						<span>Открыта пациентом</span>
					</span>
				)}

				{stageKey === "in_progress_abandoned" && (
					<span className="px-2 py-0.5 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-400 font-medium flex items-center gap-1">
						<Clock className="w-3 h-3 shrink-0" />
						<span>Пауза {card.daysSinceLastActivity} дн.</span>
					</span>
				)}

				{card.hasFutureAppointment && card.nextAppointmentDate && (
					<span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-medium flex items-center gap-1">
						<Calendar className="w-3 h-3 shrink-0" />
						<span>Запись {new Date(card.nextAppointmentDate).toLocaleDateString("ru-RU")}</span>
					</span>
				)}
			</div>

			{/* Action Buttons (Natural Touch Zone >= 44px on mobile, compact on desktop) */}
			<div className="pt-2 border-t border-[var(--line-subtle)] flex items-center gap-1.5">
				<a
					href={`#/schedule?patientId=${card.patientId}`}
					className="flex-1 min-h-[38px] sm:min-h-[34px] px-2.5 py-1.5 rounded-xl bg-[var(--paper)] hover:bg-[var(--line-subtle)] border border-[var(--line)] text-center text-[11px] font-medium text-[var(--text)] transition flex items-center justify-center gap-1"
				>
					<CalendarPlus className="w-3.5 h-3.5 text-[var(--teal,#0d9488)] shrink-0" />
					<span>Записать</span>
				</a>

				<button
					type="button"
					onClick={() => onCopyOrGenerateLink(card)}
					disabled={isGeneratingLink === card.id}
					className={`min-h-[38px] sm:min-h-[34px] px-2.5 py-1.5 rounded-xl border text-[11px] font-medium transition flex items-center justify-center gap-1 ${
						copiedToken === card.id
							? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
							: "bg-[var(--paper)] hover:bg-[var(--line-subtle)] border-[var(--line)] text-[var(--text)]"
					}`}
					title="Скопировать ссылку для удаленного согласования сметы"
				>
					{copiedToken === card.id ? (
						<>
							<CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
							<span>Скопировано!</span>
						</>
					) : isGeneratingLink === card.id ? (
						<div className="w-3.5 h-3.5 border-2 border-[var(--teal,#0d9488)] border-t-transparent rounded-full animate-spin shrink-0" />
					) : (
						<>
							<Link2 className="w-3.5 h-3.5 text-[var(--cyan,#06b6d4)] shrink-0" />
							<span>Смета</span>
						</>
					)}
				</button>

				{card.budgetToken && (
					<a
						href={`/public/budget/${card.budgetToken}`}
						target="_blank"
						rel="noopener noreferrer"
						className="min-h-[38px] sm:min-h-[34px] min-w-[34px] px-2 py-1.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--line-subtle)] text-[var(--muted)] hover:text-[var(--text)] transition flex items-center justify-center"
						title="Открыть публичную смету в новой вкладке"
					>
						<ExternalLink className="w-3.5 h-3.5 shrink-0" />
					</a>
				)}
			</div>
		</div>
	);
};
