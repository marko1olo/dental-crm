/**
 * LeadMobileBottomSheet.tsx — Sovereign Native Apple HIG Bottom Sheet for Lead Details.
 *
 * Governed by Apple HIG & DENTE Touch Ergonomics:
 * - Natural Thumb Zone First (80% actions in bottom third)
 * - Tactile drag handle 36x5px, rounded-t-[24px]
 * - Direct click-to-call & WhatsApp >= 44x44px touch targets
 * - 1-tap stage switching in Natural Thumb Zone
 * - Sticky bottom CTA with safe-area padding
 */

import React, { useEffect, useState } from "react";
import {
	AlertTriangle,
	Calendar,
	Check,
	Clock,
	DollarSign,
	Edit3,
	FileText,
	MessageSquare,
	Phone,
	UserCheck,
	UserPlus,
	X,
} from "lucide-react";
import type { Lead, LeadStatus } from "../../store/leadsStore";
import { formatWhatsAppUrl } from "../messaging/omnichannelEngine";
import {
	CHANNEL_BADGE_COLORS,
	CHANNEL_DISPLAY_NAMES,
} from "../telephony/telephonyAttribution";
import { LeadAudioPlayerWidget } from "./LeadAudioPlayerWidget";
import { normalizeMarketingChannel } from "./leadsFunnelTypes";
import {
	COLUMNS,
	getLeadSlaStatus,
	STAGE_DISPLAY_LABELS,
} from "./leadsKanbanTypes";

export interface LeadMobileBottomSheetProps {
	lead: Lead | null;
	isOpen: boolean;
	onClose: () => void;
	onStatusChange: (
		e: React.MouseEvent,
		leadId: string,
		nextStatus: LeadStatus,
		options?: { reason?: string; dropReason?: string },
	) => void;
	onSchedule?: ((leadId: string) => void) | undefined;
	onQuickSchedule?: ((leadId: string) => Promise<void> | void) | undefined;
	onCreatePatient?: ((lead: Lead) => Promise<void> | void) | undefined;
	onUpdateNotes?: ((leadId: string, notes: string) => Promise<void> | void) | undefined;
	onOpenPatientCard?: ((patientId: string) => void) | undefined;
	creatingPatientLeadId?: string | null | undefined;
}

export const LeadMobileBottomSheet = ({
	lead,
	isOpen,
	onClose,
	onStatusChange,
	onSchedule,
	onQuickSchedule,
	onCreatePatient,
	onUpdateNotes,
	onOpenPatientCard,
	creatingPatientLeadId,
}: LeadMobileBottomSheetProps) => {
	const [notesText, setNotesText] = useState("");
	const [isSavingNotes, setIsSavingNotes] = useState(false);

	useEffect(() => {
		if (lead) {
			setNotesText(lead.notes || "");
		}
	}, [lead]);

	useEffect(() => {
		if (isOpen) {
			document.body.style.overflow = "hidden";
		} else {
			document.body.style.overflow = "";
		}
		return () => {
			document.body.style.overflow = "";
		};
	}, [isOpen]);

	if (!isOpen || !lead) return null;

	const sla = getLeadSlaStatus(lead);
	const channelKey = lead.source ? normalizeMarketingChannel(lead.source) : null;
	const channelBadge =
		channelKey && CHANNEL_BADGE_COLORS[channelKey]
			? CHANNEL_BADGE_COLORS[channelKey]
			: {
					bg: "var(--teal-soft)",
					color: "var(--teal-dark, var(--teal))",
					border: "var(--teal)",
				};
	const channelLabel =
		channelKey && CHANNEL_DISPLAY_NAMES[channelKey]
			? CHANNEL_DISPLAY_NAMES[channelKey]
			: (lead.source || "Прямое обращение");

	const rawPhone = lead.phone ? lead.phone.replace(/[^\d+]/g, "") : "";
	const currentColumn = COLUMNS.find((c) => c.id === lead.status);

	const handleSaveNotes = async () => {
		if (!onUpdateNotes || notesText === (lead.notes || "")) return;
		setIsSavingNotes(true);
		try {
			await onUpdateNotes(lead.id, notesText);
		} finally {
			setIsSavingNotes(false);
		}
	};

	const handleStageClick = (e: React.MouseEvent, targetStatus: LeadStatus) => {
		if (targetStatus === lead.status) return;
		if (targetStatus === "trash") {
			const reason = window.prompt(
				"Причина отказа:\n1 - Дорого\n2 - Далеко\n3 - Передумал\n4 - Дубль\nИли свой вариант:",
				"Дорого",
			);
			const mappedReason =
				reason === "1"
					? "Дорого"
					: reason === "2"
						? "Далеко / Неудобная локация"
						: reason === "3"
							? "Передумал / Неактуально"
							: reason === "4"
								? "Дубль обращения"
								: (reason || "Дорого");
			onStatusChange(e, lead.id, targetStatus, { dropReason: mappedReason });
		} else {
			onStatusChange(e, lead.id, targetStatus);
		}
	};

	return (
		<div
			className="fixed inset-0 z-[10050] flex flex-col justify-end"
			role="dialog"
			aria-modal="true"
			aria-labelledby="lead-bottom-sheet-title"
			data-testid="lead-mobile-bottom-sheet"
		>
			{/* Backdrop */}
			<div
				className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-200"
				onClick={onClose}
				aria-hidden="true"
				data-testid="lead-bottom-sheet-backdrop"
			/>

			{/* Bottom Sheet Drawer Surface */}
			<div className="relative z-10 w-full max-h-[90dvh] flex flex-col rounded-t-[24px] bg-[var(--paper)] border-t border-[var(--line)] shadow-2xl text-[var(--ink)] overflow-hidden">
				{/* Tactile Drag Handle (Apple iOS HIG) */}
				<div className="flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing">
					<div className="w-9 h-1.5 rounded-full bg-[var(--line-strong,rgba(150,150,150,0.4))]" />
				</div>

				{/* Header */}
				<div className="flex items-center justify-between px-4 py-2 border-b border-[var(--line-subtle)] shrink-0">
					<div className="flex items-center gap-2 min-w-0 pr-2">
						<span
							className="w-3 h-3 rounded-full shrink-0"
							style={{ background: currentColumn?.color || "var(--teal)" }}
						/>
						<h3
							id="lead-bottom-sheet-title"
							className="text-[17px] font-semibold text-[var(--ink)] truncate"
							title={lead.name}
						>
							{lead.name}
						</h3>
					</div>

					<button
						type="button"
						onClick={onClose}
						className="min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] active:scale-95 transition-transform"
						aria-label="Закрыть детали обращения"
						data-testid="btn-close-lead-bottom-sheet"
					>
						<X size={20} />
					</button>
				</div>

				{/* Scrollable Body Content */}
				<div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 overscroll-contain">
					{/* 1. Contact Info & 1-Tap Calling Bar */}
					<div className="rounded-[16px] bg-[var(--paper-soft)] border border-[var(--line)] p-3.5 space-y-3">
						<div className="flex items-center justify-between gap-2">
							<div className="min-w-0">
								<div className="text-[13px] text-[var(--muted)] font-medium">Контактный телефон</div>
								<div className="text-[16px] font-semibold text-[var(--ink)] tracking-tight">
									{lead.phone || "Номер не указан"}
								</div>
							</div>
							{lead.expectedRevenue && (
								<div className="text-right shrink-0">
									<div className="text-[12px] text-[var(--muted)] font-medium">Ожидаемый чек</div>
									<div className="text-[15px] font-bold text-[var(--teal-dark,var(--teal))]">
										{Number(lead.expectedRevenue).toLocaleString("ru-RU")} ₽
									</div>
								</div>
							)}
						</div>

						{/* 1-Tap Primary Communication Buttons (>=44px touch targets) */}
						{lead.phone && (
							<div className="grid grid-cols-2 gap-2 pt-1">
								<a
									href={`tel:${rawPhone}`}
									className="min-h-[44px] px-3 rounded-[12px] bg-[var(--teal)] text-white font-semibold text-[14px] flex items-center justify-center gap-2 shadow-xs active:scale-[0.98] transition-transform no-underline"
									data-testid="bottom-sheet-call-btn"
								>
									<Phone size={16} />
									<span>Позвонить</span>
								</a>

								<a
									href={formatWhatsAppUrl(
										lead.phone,
										`Здравствуйте, ${lead.name}! Вас беспокоит клиника DENTE по поводу вашей заявки.`,
									)}
									target="_blank"
									rel="noopener noreferrer"
									className="min-h-[44px] px-3 rounded-[12px] bg-[#25D366] text-white font-semibold text-[14px] flex items-center justify-center gap-2 shadow-xs active:scale-[0.98] transition-transform no-underline"
									data-testid="bottom-sheet-whatsapp-btn"
								>
									<MessageSquare size={16} />
									<span>WhatsApp</span>
								</a>
							</div>
						)}
					</div>

					{/* 2. Speed-to-Lead SLA & Channel Source Card */}
					<div className="rounded-[16px] bg-[var(--paper-soft)] border border-[var(--line)] p-3.5 space-y-2.5">
						<div className="text-[12px] font-semibold uppercase tracking-wider text-[var(--muted)]">
							Источник и регламент ответа (SLA)
						</div>

						<div className="flex flex-wrap items-center gap-2">
							{/* Channel Badge */}
							<span
								className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] text-[12px] font-semibold"
								style={{
									background: channelBadge.bg,
									color: channelBadge.color,
									border: `1px solid ${channelBadge.border}`,
								}}
							>
								<span>{channelLabel}</span>
							</span>

							{/* SLA Urgency Badge */}
							<span
								className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] text-[12px] font-semibold ${
									sla.isBreached ? "lead-sla-breached-pulse" : ""
								}`}
								style={{
									background: sla.badgeBg,
									color: sla.badgeColor,
									border: `1px solid ${sla.badgeBorder}`,
								}}
							>
								{sla.isBreached ? <AlertTriangle size={13} /> : <Clock size={13} />}
								<span>{sla.label}</span>
							</span>
						</div>

						{/* Existing Patient Match Notice */}
						{lead.existingPatient && (
							<div
								onClick={() => onOpenPatientCard?.(lead.existingPatient!.id)}
								className="flex items-center justify-between p-2.5 rounded-[10px] bg-[var(--teal-soft)] border border-[var(--teal)] text-[var(--teal-dark,var(--teal))] cursor-pointer active:opacity-80 transition-opacity"
							>
								<div className="flex items-center gap-2 min-w-0">
									<UserCheck size={16} className="shrink-0" />
									<span className="text-[13px] font-semibold truncate">
										Постоянный пациент: {lead.existingPatient.fullName}
									</span>
								</div>
								<span className="text-[12px] underline shrink-0">В карту →</span>
							</div>
						)}
					</div>

					{/* 3. Clinical Reason & Tags */}
					<div className="rounded-[16px] bg-[var(--paper-soft)] border border-[var(--line)] p-3.5 space-y-2.5">
						<div className="text-[12px] font-semibold uppercase tracking-wider text-[var(--muted)]">
							Повод обращения и клинические теги
						</div>

						{Array.isArray(lead.clinicalTags) && lead.clinicalTags.length > 0 ? (
							<div className="flex flex-wrap gap-1.5">
								{lead.clinicalTags.map((tag) => (
									<span
										key={tag}
										className="inline-flex items-center px-2.5 py-1 rounded-[8px] text-[12px] font-semibold bg-[var(--teal-soft)] text-[var(--teal-dark,var(--teal))] border border-[var(--teal)]"
									>
										{tag}
									</span>
								))}
							</div>
						) : (
							<p className="text-[13px] text-[var(--muted)] italic m-0">Теги не указаны</p>
						)}

						{/* Audio Recording & Call Transcript Snippet */}
						{(lead.audioRecordUrl || lead.transcriptionSnippet) && (
							<div className="pt-2 border-t border-[var(--line-subtle)] space-y-2">
								<div className="flex items-center justify-between">
									<span className="text-[12px] font-medium text-[var(--muted)]">Аудиозапись звонка:</span>
									<LeadAudioPlayerWidget
										audioUrl={lead.audioRecordUrl}
										durationSeconds={lead.audioDurationSeconds}
									/>
								</div>
								{lead.transcriptionSnippet && (
									<div className="p-2.5 rounded-[10px] bg-[var(--paper)] border border-[var(--line)] text-[12.5px] leading-relaxed text-[var(--ink)] italic">
										{lead.transcriptionSnippet}
									</div>
								)}
							</div>
						)}
					</div>

					{/* 4. Curator Notes */}
					<div className="rounded-[16px] bg-[var(--paper-soft)] border border-[var(--line)] p-3.5 space-y-2">
						<div className="flex items-center justify-between">
							<span className="text-[12px] font-semibold uppercase tracking-wider text-[var(--muted)]">
								Заметки куратора
							</span>
							<button
								type="button"
								onClick={handleSaveNotes}
								disabled={isSavingNotes || notesText === (lead.notes || "")}
								className="min-h-[32px] px-2.5 rounded-[6px] text-[12px] font-semibold bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] hover:border-[var(--teal)] disabled:opacity-40 transition-all cursor-pointer"
							>
								{isSavingNotes ? "Сохранение..." : "Сохранить"}
							</button>
						</div>
						<textarea
							rows={3}
							value={notesText}
							onChange={(e) => setNotesText(e.target.value)}
							placeholder="Заметки по пациенту, жалобы, удобное время визита..."
							className="w-full p-2.5 rounded-[10px] bg-[var(--paper)] border border-[var(--line)] text-[13px] text-[var(--ink)] focus:outline-none focus:border-[var(--teal)] resize-y"
						/>
					</div>

					{/* 5. Stage Transition Chips (Natural Thumb Zone) */}
					<div className="rounded-[16px] bg-[var(--paper-soft)] border border-[var(--line)] p-3.5 space-y-2.5">
						<div className="text-[12px] font-semibold uppercase tracking-wider text-[var(--muted)]">
							Перевести на этап воронки (1 тап)
						</div>

						<div className="grid grid-cols-2 gap-2">
							{COLUMNS.map((col) => {
								const isCurrent = col.id === lead.status;
								return (
									<button
										key={col.id}
										type="button"
										onClick={(e) => handleStageClick(e, col.id)}
										className={`min-h-[44px] px-3 rounded-[12px] text-[13px] font-medium border flex items-center justify-between gap-2 transition-all ${
											isCurrent
												? "bg-[var(--paper)] border-[var(--teal)] text-[var(--teal-dark,var(--teal))] font-bold shadow-xs"
												: "bg-[var(--paper)] border-[var(--line)] text-[var(--ink)] active:bg-[var(--paper-soft)]"
										}`}
										data-testid={`stage-switch-btn-${col.id}`}
									>
										<div className="flex items-center gap-2 truncate">
											<span
												className="w-2.5 h-2.5 rounded-full shrink-0"
												style={{ background: col.color }}
											/>
											<span className="truncate">{col.label}</span>
										</div>
										{isCurrent && <Check size={15} className="shrink-0 text-[var(--teal)]" />}
									</button>
								);
							})}
						</div>
					</div>
				</div>

				{/* Sticky Bottom Bar with Primary Action (Natural Thumb Zone) */}
				<div className="p-4 border-t border-[var(--line)] bg-[var(--paper)] space-y-2 pb-[max(16px,env(safe-area-inset-bottom))] shrink-0">
					<button
						type="button"
						onClick={() => {
							onClose();
							if (onQuickSchedule) {
								onQuickSchedule(lead.id);
							} else if (onSchedule) {
								(onSchedule as (id: string) => void)(lead.id);
							}
						}}
						className="w-full min-h-[50px] rounded-[14px] font-bold text-[15px] flex items-center justify-center gap-2 shadow-md active:scale-[0.98] transition-all cursor-pointer"
						style={{
							background: "linear-gradient(135deg, var(--teal-fill, #0d9488), var(--teal-dark, #0f766e))",
							color: "#ffffff",
						}}
						data-testid="bottom-sheet-schedule-cta"
					>
						<Calendar size={18} />
						<span>Записать на приём в расписание</span>
					</button>

					{!lead.existingPatient && onCreatePatient && (
						<button
							type="button"
							onClick={() => onCreatePatient(lead)}
							disabled={creatingPatientLeadId === lead.id}
							className="w-full min-h-[44px] rounded-[12px] bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] font-semibold text-[13.5px] flex items-center justify-center gap-2 active:bg-[var(--paper)] transition-all cursor-pointer disabled:opacity-50"
							data-testid="bottom-sheet-create-patient-btn"
						>
							<UserPlus size={16} />
							<span>
								{creatingPatientLeadId === lead.id
									? "Создание карты..."
									: "Создать карту пациента (без записи)"}
							</span>
						</button>
					)}
				</div>
			</div>
		</div>
	);
};
