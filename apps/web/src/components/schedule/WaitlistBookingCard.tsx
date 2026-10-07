import React from "react";
import {
	Check,
	Copy,
	MessageSquare,
	MoreVertical,
	Phone,
	Send,
	Trash2,
	UserCheck,
	X,
} from "lucide-react";
import type {
	MatchScoringResult,
	WaitlistPatientEntry,
} from "./WaitlistQuickFillModal";
import {
	DEFAULT_PRIORITY_CFG,
	PRIORITY_CONFIG,
	renderPriorityIcon,
} from "./WaitlistQuickFillModal";
import type { TargetSlotInfo } from "./waitlistCancellationEngine";

export interface WaitlistBookingCardProps {
	patient: WaitlistPatientEntry;
	index?: number;
	scoring?: MatchScoringResult;
	isContacted: boolean;
	isBooking: boolean;
	activeTargetSlot: TargetSlotInfo | null;
	activeMenuId: string | null;
	onToggleMenu: (id: string | null) => void;
	onBookPatient: (patient: WaitlistPatientEntry) => void;
	onSendWhatsApp: (patient: WaitlistPatientEntry) => void;
	onCopySms: (patient: WaitlistPatientEntry) => void;
	onSendTelegram: (patient: WaitlistPatientEntry) => void;
	onDelete: (id: string) => void;
	isMatchMode?: boolean;
}

export const WaitlistBookingCard: React.FC<WaitlistBookingCardProps> = ({
	patient,
	index,
	scoring,
	isContacted,
	isBooking,
	activeTargetSlot,
	activeMenuId,
	onToggleMenu,
	onBookPatient,
	onSendWhatsApp,
	onCopySms,
	onSendTelegram,
	onDelete,
	isMatchMode = false,
}) => {
	const priorityCfg =
		PRIORITY_CONFIG[patient.priorityLevel] ??
		PRIORITY_CONFIG.routine ??
		DEFAULT_PRIORITY_CFG;

	const isMenuOpen = activeMenuId === patient.id;

	const waitingDays = Math.max(
		0,
		Math.floor(
			(Date.now() - new Date(patient.createdAt).getTime()) / (86400 * 1000),
		),
	);

	return (
		<div
			className="p-3.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] hover:border-[var(--teal)]/40 transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 min-w-0"
			data-testid={isMatchMode ? `match-card-${patient.id}` : `waitlist-item-${patient.id}`}
		>
			<div className="space-y-1.5 flex-1 min-w-0">
				<div className="flex flex-wrap items-center gap-2">
					{index !== undefined && (
						<span className="text-xs font-bold text-[var(--muted)] shrink-0">
							#{index + 1}
						</span>
					)}
					<h4
						className="font-bold text-sm text-[var(--ink)] truncate max-w-[260px]"
						title={patient.patientName || "Пациент без имени"}
					>
						{patient.patientName || "Пациент без имени"}
					</h4>
					<span
						className={`inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border shrink-0 ${priorityCfg.badgeClass}`}
					>
						{renderPriorityIcon(patient.priorityLevel)}
						<span>{priorityCfg.label}</span>
					</span>

					{scoring && (
						<span
							className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full shrink-0 ${
								scoring.score >= 80
									? "bg-[var(--ok-bg)] text-[var(--ok-fg)]"
									: scoring.score >= 60
										? "bg-[var(--warn-bg)] text-[var(--warn-fg)]"
										: "bg-[var(--paper-strong)] text-[var(--muted)]"
							}`}
						>
							{scoring.score}% совпадение
						</span>
					)}

					{!isMatchMode && patient.status === "fulfilled" && (
						<span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-green-500/15 text-green-600 inline-flex items-center gap-1 shrink-0">
							<span>Принят</span>
							<Check className="w-3 h-3 text-green-600 shrink-0" />
						</span>
					)}
				</div>

				<div className="text-xs text-[var(--muted)] flex flex-wrap items-center gap-x-3 gap-y-1">
					{patient.patientPhone && (
						<span className="flex items-center gap-1 font-medium text-[var(--ink-2)] shrink-0">
							<Phone className="w-3 h-3 text-[var(--teal)]" />
							{patient.patientPhone}
						</span>
					)}
					{patient.preferredDoctorName && (
						<span className="truncate max-w-[200px]">
							Врач: {patient.preferredDoctorName}
						</span>
					)}
					{patient.treatmentCategory && (
						<span className="truncate max-w-[200px]">
							Категория: {patient.treatmentCategory}
						</span>
					)}
					{patient.expiryDate && !isMatchMode && (
						<span className="shrink-0">
							Действует до: {new Date(patient.expiryDate).toLocaleDateString("ru-RU")}
						</span>
					)}
					<span className="shrink-0">Ждёт {waitingDays} дн.</span>
				</div>

				{/* Match reasons tags */}
				{scoring && (
					<div className="flex flex-wrap items-center gap-1.5 pt-0.5">
						{scoring.matchReasons.map((r) => (
							<span
								key={r}
								className="text-[11px] px-2 py-0.5 rounded-md bg-[var(--teal)]/10 text-[var(--teal-dark)] font-medium inline-flex items-center gap-1 shrink-0"
							>
								<Check className="w-3 h-3 text-[var(--teal-dark)] shrink-0" />
								<span>{r}</span>
							</span>
						))}
						{scoring.mismatchReasons.map((m) => (
							<span
								key={m}
								className="text-[11px] px-2 py-0.5 rounded-md bg-[var(--bad-bg)]/50 text-[var(--bad-fg)] font-medium inline-flex items-center gap-1 shrink-0"
							>
								<X className="w-3 h-3 text-[var(--bad-fg)] shrink-0" />
								<span>{m}</span>
							</span>
						))}
					</div>
				)}

				{patient.notes && (
					<p className="text-xs italic text-[var(--muted)] bg-[var(--paper)] p-2 rounded-lg border border-[var(--line)] break-words">
						"{patient.notes}"
					</p>
				)}
			</div>

			{/* Action Buttons: strictly <= 2 direct buttons + MoreVertical */}
			<div
				className="flex items-center gap-1.5 shrink-0 justify-end relative"
				data-menu-container={patient.id}
			>
				{/* Button 1: Booking button */}
				{(isMatchMode || (activeTargetSlot && patient.status !== "fulfilled")) && (
					<button
						type="button"
						onClick={() => onBookPatient(patient)}
						disabled={isBooking}
						className="h-8 px-3 bg-[var(--teal-dark)] hover:brightness-110 active:brightness-95 text-[var(--on-teal)] font-bold rounded-lg text-xs transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 pointer-coarse:min-h-[44px]"
						data-testid={isMatchMode ? `btn-book-${patient.id}` : `btn-book-list-${patient.id}`}
						title="Записать пациента из листа ожидания"
					>
						<UserCheck className="w-3.5 h-3.5 shrink-0" />
						<span>
							{isBooking
								? "Записываем..."
								: isMatchMode
									? "Занять окно"
									: "В окно"}
						</span>
					</button>
				)}

				{/* Button 2: WhatsApp notification */}
				{patient.patientPhone && (
					<button
						type="button"
						onClick={() => onSendWhatsApp(patient)}
						className={`h-8 px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer pointer-coarse:min-h-[44px] border ${
							isContacted
								? "bg-green-500/15 text-green-700 dark:text-green-300 border-green-500/30"
								: "bg-[var(--paper)] hover:bg-[var(--paper-strong)] text-[var(--ink)] border-[var(--line)]"
						}`}
						title="Предложить окно через WhatsApp"
						data-testid={isMatchMode ? `btn-whatsapp-${patient.id}` : `btn-whatsapp-list-${patient.id}`}
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

				{/* Button 3: Secondary Actions Dropdown */}
				<div className="relative">
					<button
						type="button"
						onClick={() => onToggleMenu(isMenuOpen ? null : patient.id)}
						className="h-8 w-8 inline-flex items-center justify-center rounded-lg bg-[var(--paper)] border border-[var(--line)] hover:bg-[var(--paper-strong)] text-[var(--muted)] hover:text-[var(--ink)] transition-all cursor-pointer shadow-xs pointer-coarse:min-h-[44px] pointer-coarse:min-w-[44px]"
						title="Другие действия"
						aria-label="Другие действия"
						aria-haspopup="true"
						aria-expanded={isMenuOpen}
						data-testid={isMatchMode ? `btn-more-${patient.id}` : `btn-more-list-${patient.id}`}
					>
						<MoreVertical className="w-3.5 h-3.5 shrink-0" />
					</button>

					{isMenuOpen && (
						<div className="absolute right-0 top-full mt-1.5 min-w-[210px] p-1.5 rounded-xl bg-[var(--paper-strong)] border border-[var(--line)] shadow-xl z-30 flex flex-col gap-1">
							<button
								type="button"
								onClick={() => {
									onCopySms(patient);
									onToggleMenu(null);
								}}
								className="w-full px-2.5 py-1.5 min-h-[32px] rounded-lg text-xs font-semibold flex items-center gap-2 hover:bg-[var(--paper-soft)] text-[var(--ink)] transition-all text-left cursor-pointer pointer-coarse:min-h-[44px]"
								title="Скопировать текст сообщения"
								aria-label="Скопировать текст сообщения"
							>
								<Copy className="w-3.5 h-3.5 text-[var(--muted)] shrink-0" />
								<span>Скопировать SMS</span>
							</button>

							<button
								type="button"
								onClick={() => {
									onSendTelegram(patient);
									onToggleMenu(null);
								}}
								className="w-full px-2.5 py-1.5 min-h-[32px] rounded-lg text-xs font-semibold flex items-center gap-2 hover:bg-[var(--paper-soft)] text-sky-600 dark:text-sky-400 transition-all text-left cursor-pointer pointer-coarse:min-h-[44px]"
								title="Отправить предложение в Telegram"
								aria-label="Отправить в Telegram"
								data-testid={isMatchMode ? `btn-telegram-${patient.id}` : `btn-telegram-list-${patient.id}`}
							>
								<Send className="w-3.5 h-3.5 shrink-0" />
								<span>Telegram</span>
							</button>

							{patient.patientPhone && (
								<a
									href={`tel:${patient.patientPhone.replace(/[^\d+]/g, "")}`}
									onClick={() => onToggleMenu(null)}
									className="w-full px-2.5 py-1.5 min-h-[32px] rounded-lg text-xs font-semibold flex items-center gap-2 hover:bg-[var(--paper-soft)] text-[var(--teal)] transition-all text-left cursor-pointer pointer-coarse:min-h-[44px]"
									title="Позвонить пациенту"
									aria-label="Позвонить пациенту"
								>
									<Phone className="w-3.5 h-3.5 text-[var(--teal)] shrink-0" />
									<span>Позвонить</span>
								</a>
							)}

							<div className="my-0.5 border-t border-[var(--line)]" />

							<button
								type="button"
								onClick={() => {
									onDelete(patient.id);
									onToggleMenu(null);
								}}
								className="w-full px-2.5 py-1.5 min-h-[32px] rounded-lg text-xs font-semibold flex items-center gap-2 hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 transition-all text-left cursor-pointer pointer-coarse:min-h-[44px]"
								title="Удалить из листа ожидания"
								aria-label="Удалить из листа ожидания"
							>
								<Trash2 className="w-3.5 h-3.5 shrink-0" />
								<span>Удалить из листа</span>
							</button>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};
