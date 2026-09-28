import React from "react";
import {
	Check,
	CheckCircle2,
	Copy,
	MessageSquare,
	MoreVertical,
	Phone,
	Trash2,
	Zap,
} from "lucide-react";
import type { DoctorFreeSlot } from "./doctorFreeSlotsEngine";
import {
	type TargetSlotInfo,
	type WaitlistCandidateItem,
	type WaitlistUrgency,
	URGENCY_CONFIG,
} from "./waitlistCancellationEngine";

export interface WaitlistCandidateCardProps {
	readonly item: WaitlistCandidateItem;
	readonly scoring: {
		readonly urgency: WaitlistUrgency;
		readonly score: number;
		readonly matchReasons: readonly string[];
	};
	readonly idx: number;
	readonly targetSlot: TargetSlotInfo | null | undefined;
	readonly fallbackSlot:
		| (DoctorFreeSlot & { dateFormatted: string; doctorName?: string })
		| null
		| undefined;
	readonly isContacted: boolean;
	readonly isBooked: boolean;
	readonly loadingId: string | null;
	readonly openMenuId: string | null;
	readonly onToggleMenu: (id: string | null) => void;
	readonly onOneClickBookSlot: (item: WaitlistCandidateItem) => void;
	readonly onSendWhatsApp: (item: WaitlistCandidateItem) => void;
	readonly onCopySms: (item: WaitlistCandidateItem) => void;
	readonly onFulfill: (item: WaitlistCandidateItem) => void;
	readonly onDelete: (id: string) => void;
	readonly onSelectForDraft: (item: WaitlistCandidateItem) => void;
}

export const WaitlistCandidateCard: React.FC<WaitlistCandidateCardProps> = ({
	item,
	scoring,
	idx,
	targetSlot,
	fallbackSlot,
	isContacted,
	isBooked,
	loadingId,
	openMenuId,
	onToggleMenu,
	onOneClickBookSlot,
	onSendWhatsApp,
	onCopySms,
	onFulfill,
	onDelete,
	onSelectForDraft,
}) => {
	const urgencyCfg = URGENCY_CONFIG[scoring.urgency];
	const targetMatchSlot = targetSlot;

	return (
		<li
			draggable
			onDragStart={(e) => {
				e.dataTransfer.setData(
					"application/json",
					JSON.stringify({ type: "waitlist_item", item }),
				);
				e.dataTransfer.effectAllowed = "copy";
			}}
			className="bg-[var(--paper-soft)] border border-[var(--line)] rounded-xl p-3 flex flex-col gap-2 hover:border-[var(--teal)]/40 transition-all cursor-grab active:cursor-grabbing"
			data-testid={`waitlist-candidate-${item.id}`}
		>
			{/* Top Row: Index, Name, Urgency badge */}
			<div className="flex items-center justify-between gap-2 min-w-0">
				<div className="flex items-center gap-2 min-w-0">
					<span className="text-xs font-bold text-[var(--muted)] shrink-0">
						#{idx + 1}
					</span>
					<h5
						className="font-bold text-sm text-[var(--ink)] truncate max-w-[240px] m-0"
						title={item.patientName || "Пациент"}
					>
						{item.patientName || "Неизвестный пациент"}
					</h5>
				</div>
				<div className="flex items-center gap-1.5 shrink-0">
					{targetSlot && (
						<span
							className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full ${
								scoring.score >= 80
									? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
									: scoring.score >= 50
										? "bg-sky-500/20 text-sky-700 dark:text-sky-300"
										: "bg-slate-500/20 text-slate-700 dark:text-slate-300"
							}`}
						>
							{scoring.score}%
						</span>
					)}
					<span
						className={`text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${urgencyCfg.badgeClass}`}
					>
						{urgencyCfg.shortLabel}
					</span>
				</div>
			</div>

			{/* Details: Phone, Doctor, Reasons */}
			<div className="text-xs text-[var(--muted)] flex flex-wrap items-center gap-x-2.5 gap-y-1">
				{item.patientPhone ? (
					<span className="font-semibold text-[var(--ink-2)] shrink-0 flex items-center gap-1">
						<Phone className="w-3 h-3 text-[var(--teal)]" />
						{item.patientPhone}
					</span>
				) : (
					<span className="shrink-0 italic">телефон не указан</span>
				)}

				{item.preferredDoctorName && (
					<span className="truncate max-w-[180px]">
						· Врач: {item.preferredDoctorName}
					</span>
				)}

				{scoring.matchReasons.map((r) => (
					<span
						key={r}
						className="text-[10px] px-1.5 py-0.2 rounded bg-[var(--teal)]/10 text-[var(--teal-dark,var(--teal))] font-medium shrink-0"
					>
						{r}
					</span>
				))}
			</div>

			{item.notes && (
				<p className="text-xs italic text-[var(--muted)] m-0 line-clamp-2">
					"{item.notes}"
				</p>
			)}

			{/* Action buttons: Law of Miller (strictly <= 2 direct buttons) + MoreVertical */}
			<div className="flex items-center gap-1.5 mt-1 pt-1.5 border-t border-[var(--line)]/50 justify-between">
				<div className="flex items-center gap-1.5 flex-1 min-w-0">
					{/* Button 1 (Main): 1-Click Booking */}
					{targetMatchSlot ? (
						<button
							type="button"
							disabled={loadingId === item.id}
							onClick={() => onOneClickBookSlot(item)}
							className={`h-8 px-3 rounded-lg text-xs font-bold transition-all shadow-xs inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0 ${
								isBooked
									? "bg-emerald-600 text-white"
									: "bg-[var(--teal-dark)] hover:brightness-110 active:brightness-95 text-[var(--on-teal)]"
							}`}
							title="Записать пациента в освободившийся слот в 1 клик с генерацией шаблона сообщения"
							data-testid={`waitlist-book-slot-btn-${item.id}`}
						>
							<Zap
								size={13}
								className="shrink-0 text-amber-300 fill-current"
							/>
							<span>
								{loadingId === item.id
									? "Записываем..."
									: isBooked
										? "Записан в слот"
										: "В окно в 1 клик"}
							</span>
						</button>
					) : fallbackSlot ? (
						<button
							type="button"
							disabled={loadingId === item.id}
							onClick={() =>
								onOneClickBookSlot({
									...item,
									notes: `Посадка на ${fallbackSlot.dateFormatted} ${fallbackSlot.startTime}`,
								})
							}
							className="h-8 px-2.5 rounded-lg bg-[var(--teal-dark)] hover:brightness-110 active:brightness-95 text-[var(--on-teal)] text-xs font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer shrink-0"
							title={`Записать на ${fallbackSlot.dateFormatted} в ${fallbackSlot.startTime}`}
						>
							<Zap size={13} className="shrink-0 text-amber-300" />
							<span>
								{fallbackSlot.dateFormatted} {fallbackSlot.startTime}
							</span>
						</button>
					) : (
						<button
							type="button"
							onClick={() => onSelectForDraft(item)}
							className="h-8 px-3 rounded-lg bg-[var(--teal-surface)] hover:bg-[var(--teal-soft)] text-[var(--teal-dark)] font-semibold text-xs transition-colors cursor-pointer"
						>
							Записать на прием
						</button>
					)}

					{/* Button 2: WhatsApp direct */}
					{item.patientPhone && (
						<button
							type="button"
							onClick={() => onSendWhatsApp(item)}
							className={`h-8 px-2.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer border shrink-0 ${
								isContacted
									? "bg-green-500/15 text-green-700 dark:text-green-300 border-green-500/30"
									: "bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] border-[var(--line)]"
							}`}
							title="Предложить окно через WhatsApp (стандартное уведомление)"
							data-testid={`waitlist-whatsapp-btn-${item.id}`}
						>
							{isContacted ? (
								<>
									<Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
									<span>Предложено</span>
								</>
							) : (
								<>
									<MessageSquare className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
									<span>WhatsApp</span>
								</>
							)}
						</button>
					)}
				</div>

				{/* Secondary Actions Context Menu (...) */}
				<div className="relative shrink-0 waitlist-item-menu-container">
					<button
						type="button"
						disabled={loadingId === item.id}
						onClick={() =>
							onToggleMenu(openMenuId === item.id ? null : item.id)
						}
						className="h-8 w-8 inline-flex items-center justify-center rounded-lg bg-[var(--paper)] border border-[var(--line)] hover:bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] transition-colors cursor-pointer"
						title="Дополнительные действия"
						aria-label="Опции"
						data-testid={`waitlist-more-btn-${item.id}`}
					>
						<MoreVertical className="w-3.5 h-3.5" />
					</button>

					{openMenuId === item.id && (
						<div
							className="absolute right-0 bottom-full mb-1 z-50 flex flex-col gap-0.5 p-1 bg-[var(--paper)] border border-[var(--line)] rounded-xl shadow-xl min-w-[210px] text-xs animate-in fade-in zoom-in-95 duration-100"
							role="menu"
						>
							<button
								type="button"
								onClick={() => {
									onToggleMenu(null);
									onCopySms(item);
								}}
								className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors flex items-center gap-2 cursor-pointer"
								role="menuitem"
								data-testid={`waitlist-copy-sms-${item.id}`}
							>
								<Copy className="w-3.5 h-3.5 text-[var(--muted)] shrink-0" />
								<span>Скопировать SMS</span>
							</button>

							{item.patientPhone && (
								<a
									href={`tel:${item.patientPhone.replace(/[^\d+]/g, "")}`}
									onClick={() => onToggleMenu(null)}
									className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-[var(--teal)] hover:bg-[var(--paper-soft)] transition-colors flex items-center gap-2 cursor-pointer"
									role="menuitem"
								>
									<Phone className="w-3.5 h-3.5 text-[var(--teal)] shrink-0" />
									<span>Позвонить</span>
								</a>
							)}

							<button
								type="button"
								onClick={() => {
									onToggleMenu(null);
									onFulfill(item);
								}}
								className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10 transition-colors flex items-center gap-2 cursor-pointer"
								role="menuitem"
							>
								<CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
								<span>Отметить: принят</span>
							</button>

							<div className="my-0.5 border-t border-[var(--line)]" />

							<button
								type="button"
								onClick={() => {
									onToggleMenu(null);
									onDelete(item.id);
								}}
								className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors flex items-center gap-2 cursor-pointer"
								role="menuitem"
							>
								<Trash2 className="w-3.5 h-3.5 text-rose-500 shrink-0" />
								<span>Удалить из листа</span>
							</button>
						</div>
					)}
				</div>
			</div>
		</li>
	);
};
