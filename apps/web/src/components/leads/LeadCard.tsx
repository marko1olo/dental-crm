/**
 * DENTE Dental CRM — Leads Kanban SSOT Lead Card Component
 * Mandate 8s (SSOT Componentization), Mandate 8e & 8n (Solo Doctor Autonomy & Deduplication)
 * Mandate 8b (Sweet Spot 200–300 lines)
 */

import { motion } from "framer-motion";
import {
	ArrowRight,
	Calendar,
	Check,
	Clock,
	Edit2,
	FileText,
	Globe,
	MessageSquare,
	Phone,
	PhoneCall,
	Tag,
	UserCheck,
	UserPlus,
	Zap,
} from "lucide-react";
import React from "react";
import { useAppStore } from "../../store/appStore";
import type { Lead } from "../../store/leadsStore";
import { usePatientStore } from "../../store/patientStore";
import { formatWhatsAppUrl } from "../messaging/omnichannelEngine";
import {
	CHANNEL_BADGE_COLORS,
	CHANNEL_DISPLAY_NAMES,
} from "../telephony/telephonyAttribution";
import { LeadAudioPlayerWidget } from "./LeadAudioPlayerWidget";
import type { LeadCardProps } from "./card/cardTypes";
import { formatLeadTimestamp } from "./card/leadCardFormatters";
import {
	computeLeadCardHover,
	computeLeadCardStyle,
} from "./card/leadCardStyles";
import { NEXT_STAGE_MAP } from "./leadsKanbanConstants";
import { getLeadSlaStatus } from "./leadsKanbanSla";
import { normalizeMarketingChannel } from "./leadsFunnelTypes";

export type { LeadCardProps };

export const LeadCard: React.FC<LeadCardProps> = ({
	lead,
	isDragged,
	creatingPatientLeadId,
	borderColor,
	cardBg,
	onDragStart,
	onEdit,
	onStatusChange,
	onCreatePatient,
	onSchedule,
	onQuickSchedule,
	onOpenPatientCard,
}) => {
	const sla = getLeadSlaStatus(lead);
	const dropReasonMatch = lead.dropReason || null;
	const targetPatientId =
		lead.patientId ||
		(lead as unknown as { patientId?: string | null }).patientId ||
		lead.existingPatient?.id;

	const handleOpenPatient = (e: React.MouseEvent, patientId: string) => {
		e.stopPropagation();
		if (onOpenPatientCard) {
			onOpenPatientCard(patientId);
			return;
		}
		try {
			usePatientStore.getState().setSelectedPatientId(patientId);
			useAppStore.getState().setCurrentView("patients");
			if (typeof window !== "undefined") window.location.hash = "patients";
		} catch {
			// fallback
		}
	};

	const handleCardClick = (e: React.MouseEvent) => {
		if (targetPatientId) handleOpenPatient(e, targetPatientId);
		else onEdit(lead);
	};

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
			: lead.source;

	const currentSelectValue =
		lead.status === "new"
			? "new"
			: lead.status === "contacted"
				? "contacted"
				: lead.status === "consult_booked"
					? "consult_booked"
					: lead.status === "showed_up" || lead.status === "converted"
						? "showed_up"
						: "trash";

	return (
		<motion.div
			className="lead-kanban-card"
			data-testid={`lead-card-${lead.id}`}
			layout
			initial={{ opacity: 0, y: 10 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, scale: 0.95 }}
			draggable
			// biome-ignore lint/suspicious/noExplicitAny: automated suppression
			onDragStart={(e: any) => onDragStart(e, lead.id)}
			onClick={handleCardClick}
			title={targetPatientId ? "Открыть карту пациента в 1 клик" : "Открыть детали обращения"}
			style={computeLeadCardStyle({ cardBg, borderColor, sla, isDragged })}
			whileHover={computeLeadCardHover(sla)}
		>
			{/* Заголовок карточки: имя и кнопка редактирования */}
			<div className="flex justify-between items-start mb-1 gap-1.5">
				<strong className="text-[15px] text-[var(--ink)] flex items-center gap-1.5 min-w-0 break-words flex-1">
					{lead.name}
				</strong>
				<div className="flex items-center gap-1 shrink-0">
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							onEdit(lead);
						}}
						className="p-1 rounded text-[var(--muted)] hover:text-[var(--ink)] transition-colors cursor-pointer bg-transparent border-0"
						title="Редактировать обращение"
						aria-label="Редактировать обращение"
					>
						<Edit2 size={14} className="opacity-70" />
					</button>
				</div>
			</div>

			{/* SLA и таймстамп */}
			<div className="flex items-center gap-1.5 flex-wrap mb-1.5">
				<div
					className={`lead-card-sla-badge ${sla.isBreached ? "lead-sla-breached-pulse" : ""}`}
					style={{
						background: sla.badgeBg,
						color: sla.badgeColor,
						border: `1px solid ${sla.badgeBorder}`,
						fontSize: 10.5,
						fontWeight: 600,
						padding: "1px 6px",
						borderRadius: 5,
						display: "inline-flex",
						alignItems: "center",
						gap: 3.5,
						width: "fit-content",
					}}
					title={`SLA: ${sla.formattedDuration}`}
					data-testid={`lead-sla-badge-${lead.id}`}
				>
					<Clock size={10} className="shrink-0" />
					<span>{sla.label}</span>
				</div>
				{lead.createdAt && (
					<span
						className="text-[10.5px] text-[var(--muted)] font-mono flex items-center gap-1 shrink-0"
						data-testid={`lead-timestamp-${lead.id}`}
					>
						<span>{formatLeadTimestamp(lead.createdAt)}</span>
					</span>
				)}
			</div>

			{/* Постоянный пациент — бэдж с мгновенным 1-клик переходом */}
			{lead.existingPatient && (
				<div
					style={{
						background: "var(--amber-soft, rgba(245, 158, 11, 0.15))",
						color: "var(--amber-dark, var(--ink))",
						border: "1px solid var(--amber, #f59e0b)",
						fontSize: 10.5,
						fontWeight: 700,
						padding: "2px 7px",
						borderRadius: 6,
						display: "inline-flex",
						alignItems: "center",
						gap: 4,
						marginBottom: 6,
						width: "fit-content",
						cursor: "pointer",
					}}
					onClick={(e) => handleOpenPatient(e, lead.existingPatient!.id)}
					title={`Номер телефона совпадает с базой пациентов: ${lead.existingPatient.fullName}. Нажмите, чтобы открыть карту пациента в 1 клик.`}
					data-testid={`lead-existing-patient-badge-${lead.id}`}
				>
					<UserCheck size={11} className="shrink-0 text-[var(--amber)]" />
					<span>Постоянный пациент: {lead.existingPatient.fullName}</span>
				</div>
			)}

			{/* Причина срыва при архиве */}
			{lead.status === "trash" && dropReasonMatch && (
				<div
					style={{
						display: "inline-flex",
						alignItems: "center",
						gap: 4,
						background: "var(--rust-soft, rgba(239, 68, 68, 0.12))",
						color: "var(--rust, #ef4444)",
						border: "1px solid var(--rust-soft, rgba(239, 68, 68, 0.35))",
						borderRadius: 5,
						padding: "1px 6px",
						fontSize: 10.5,
						fontWeight: 600,
						marginBottom: 6,
					}}
					title={`Причина срыва: ${dropReasonMatch}`}
					data-testid={`lead-drop-reason-badge-${lead.id}`}
				>
					<span>Срыв: {dropReasonMatch}</span>
				</div>
			)}

			{/* Клинические теги */}
			{Array.isArray(lead.clinicalTags) && lead.clinicalTags.length > 0 && (
				<div className="flex flex-wrap gap-1 mb-1.5">
					{lead.clinicalTags.map((tag) => (
						<span
							key={tag}
							className="text-[10.5px] font-semibold bg-[var(--teal-soft)] text-[var(--teal-dark,var(--teal))] border border-[var(--teal)] px-1.5 py-0.5 rounded inline-flex items-center gap-1"
							title={`Интерес / направление: ${tag}`}
						>
							<Tag size={9} />
							<span>{tag}</span>
						</span>
					))}
				</div>
			)}

			{/* Заметки обращения */}
			{lead.notes && (
				<div
					className="flex items-center gap-1.5 text-[11.5px] text-[var(--muted)] bg-[var(--paper-soft)] px-2 py-1 rounded-md mb-1.5 min-w-0"
					title={`Примечание: ${lead.notes}`}
				>
					<FileText size={11} className="shrink-0 text-[var(--teal)]" />
					<span className="truncate">{lead.notes}</span>
				</div>
			)}

			{/* Источник и ожидаемый чек */}
			<div className="flex items-center justify-between mt-1 mb-1.5 gap-1.5">
				<div
					className="flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded max-w-[150px] truncate"
					style={{
						color: channelBadge.color,
						background: channelBadge.bg,
						border: `1px solid ${channelBadge.border}`,
					}}
					title={`Источник: ${channelLabel || "Прямое обращение"}`}
					data-testid={`lead-channel-badge-${lead.id}`}
				>
					<Globe size={10} className="shrink-0" />
					<span className="truncate">{channelLabel || "Прямой звонок"}</span>
				</div>
				{lead.expectedRevenue ? (
					<div className="text-[12px] font-semibold text-[var(--ink)] bg-[var(--paper-soft)] px-1.5 py-0.5 rounded shrink-0 font-mono">
						{Number(lead.expectedRevenue).toLocaleString("ru-RU")} ₽
					</div>
				) : null}
			</div>

			{/* Телефон, звонок в 1 клик, WhatsApp и аудиозапись */}
			<div className="flex items-center justify-between mb-1.5 gap-1.5 min-w-0">
				{lead.phone ? (
					<div className="flex items-center gap-1.5 text-xs text-[var(--muted)] min-w-0">
						<Phone size={12} className="shrink-0" />
						<a
							href={`tel:${lead.phone.replace(/[^\d+]/g, "")}`}
							onClick={(e) => e.stopPropagation()}
							className="truncate text-inherit no-underline hover:text-[var(--teal)] transition-colors"
							title="Позвонить контакту"
						>
							{lead.phone}
						</a>
						<a
							href={`tel:${lead.phone.replace(/[^\d+]/g, "")}`}
							onClick={(e) => e.stopPropagation()}
							className="icon-button h-8 w-8 min-h-[32px] min-w-[32px] rounded-lg text-[var(--teal)] hover:bg-[var(--teal-soft)] transition-colors inline-flex items-center justify-center shrink-0"
							title="1-клик перезвон"
							aria-label="1-клик перезвон"
							data-testid={`lead-callback-btn-${lead.id}`}
						>
							<PhoneCall size={14} />
						</a>
						<a
							href={formatWhatsAppUrl(
								lead.phone,
								`Здравствуйте, ${lead.name}! Вас беспокоит стоматологическая клиника DENTE.`,
							)}
							target="_blank"
							rel="noopener noreferrer"
							onClick={(e) => e.stopPropagation()}
							className="icon-button h-8 w-8 min-h-[32px] min-w-[32px] rounded-lg text-[var(--teal-dark,var(--teal))] bg-[var(--teal-soft)] border border-[var(--teal)] text-[12px] inline-flex items-center justify-center shrink-0 ml-0.5"
							title="Написать пациенту в WhatsApp"
							aria-label="Написать пациенту в WhatsApp"
							data-testid={`lead-whatsapp-btn-${lead.id}`}
						>
							<MessageSquare size={13} />
						</a>
					</div>
				) : (
					<div />
				)}

				<LeadAudioPlayerWidget
					audioUrl={lead.audioRecordUrl}
					transcriptionSnippet={lead.transcriptionSnippet}
					durationSeconds={lead.audioDurationSeconds}
					compact
				/>
			</div>

			{/* Селектор стадии обращения и кнопка перехода */}
			<div
				className="flex items-center justify-between gap-1.5 mt-1 pt-1.5 border-t border-[var(--line)]"
				onClick={(e) => e.stopPropagation()}
			>
				<select
					value={currentSelectValue}
					onClick={(e) => e.stopPropagation()}
					onChange={(e) => {
						const nextVal = e.target.value as Lead["status"];
						if (nextVal === "trash") {
							onStatusChange(e, lead.id, nextVal, {
								dropReason: lead.dropReason || "Отказ / Неактуально",
							});
						} else {
							onStatusChange(e, lead.id, nextVal);
						}
					}}
					className="h-8 min-h-[32px] text-[12px] font-medium px-2 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] cursor-pointer outline-none flex-1 min-w-0 hover:border-[var(--line-strong,var(--line))]"
					title="Сменить статус обращения"
					aria-label="Выбрать статус обращения"
				>
					<option value="new">Новые обращения</option>
					<option value="contacted">Квалифицированы</option>
					<option value="consult_booked">Записаны на приём</option>
					<option value="showed_up">Дошли до клиники</option>
					<option value="trash">Архив / Спам</option>
				</select>

				{NEXT_STAGE_MAP[lead.status] ? (
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							const nextStatus = NEXT_STAGE_MAP[lead.status]?.status;
							if (nextStatus) {
								onStatusChange(e, lead.id, nextStatus);
							}
						}}
						className="secondary-button h-8 min-h-[32px] w-8 min-w-[32px] px-0 rounded-lg text-[11px] font-semibold bg-[var(--paper-soft)] text-[var(--teal-dark, var(--teal))] border border-[var(--line)] inline-flex items-center justify-center cursor-pointer transition-all hover:border-[var(--teal)] hover:bg-[var(--teal-soft)] active:scale-[0.95] shrink-0"
						title={`Перевести на этап: ${NEXT_STAGE_MAP[lead.status]?.label}`}
						data-testid={`advance-stage-btn-${lead.id}`}
						aria-label={`Перевести на этап ${NEXT_STAGE_MAP[lead.status]?.label}`}
					>
						<ArrowRight size={13} className="shrink-0" />
					</button>
				) : lead.status === "showed_up" || lead.status === "converted" ? (
					<span
						className="h-8 min-h-[32px] w-8 min-w-[32px] rounded-lg text-[11px] font-semibold bg-[var(--teal-soft)] text-[var(--teal-dark, var(--teal))] border border-[var(--teal)] inline-flex items-center justify-center shrink-0"
						title="Пациент в клинике"
						aria-label="Пациент в клинике"
					>
						<Check size={13} className="shrink-0 stroke-[2.5]" />
					</span>
				) : null}
			</div>

			{/* Ровно 2 транзакционных действия согласно Мандату 8n и 8am */}
			<div
				className="flex flex-col gap-1.5 mt-2"
				onClick={(e) => e.stopPropagation()}
			>
				{/* Действие 1: Записать в сетку расписания */}
				{lead.status !== "trash" && (
					<div className="flex items-center gap-1.5 w-full">
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								onSchedule(lead.id);
							}}
							className="secondary-button flex-1 h-8 min-h-[32px] text-[12.5px] font-bold px-2.5 rounded-lg border border-[var(--teal)] bg-[var(--teal-soft)] text-[var(--teal-dark, var(--teal))] hover:bg-[var(--teal)] hover:text-white active:scale-[0.98] transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
							data-testid={`schedule-lead-btn-${lead.id}`}
							title="Выбрать слот в расписании и записать пациента"
						>
							<Calendar size={13} className="shrink-0" />
							<span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
								Записать на приём
							</span>
						</button>
						{onQuickSchedule && (
							<button
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									void onQuickSchedule(lead.id);
								}}
								className="secondary-button h-8 min-h-[32px] w-8 min-w-[32px] px-0 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--teal-dark, var(--teal))] hover:border-[var(--teal)] hover:bg-[var(--teal-soft)] active:scale-[0.95] inline-flex items-center justify-center transition-all cursor-pointer shrink-0"
								data-testid={`quick-schedule-lead-btn-${lead.id}`}
								title="Мгновенная запись на завтра в 10:00 (1 клик)"
								aria-label="Записать в 1 клик на завтра"
							>
								<Zap size={13} className="shrink-0 fill-current" />
							</button>
						)}
					</div>
				)}

				{/* Действие 2: Создать амбулаторную карту пациента или открыть существующую */}
				{lead.existingPatient ? (
					<button
						type="button"
						onClick={(e) => handleOpenPatient(e, lead.existingPatient!.id)}
						className="secondary-button w-full h-8 min-h-[32px] text-[12.5px] font-bold px-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] shadow-2xs hover:border-[var(--teal)] inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
						data-testid={`open-patient-btn-${lead.id}`}
						title={`Открыть карту постоянного пациента ${lead.existingPatient.fullName}`}
					>
						<UserCheck size={13} className="shrink-0 text-[var(--teal)]" />
						<span className="truncate">Карточка пациента</span>
					</button>
				) : (
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							void onCreatePatient(lead);
						}}
						disabled={creatingPatientLeadId === lead.id}
						className="secondary-button w-full h-8 min-h-[32px] text-[12.5px] font-bold px-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] shadow-2xs hover:border-[var(--teal)] inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-wait"
						data-testid={`create-patient-btn-${lead.id}`}
						title="Создать карту пациента из обращения"
					>
						<UserPlus size={13} className="shrink-0 text-[var(--teal)]" />
						<span className="truncate">
							{creatingPatientLeadId === lead.id
								? "Создаём карту…"
								: "Создать карту пациента"}
						</span>
					</button>
				)}
			</div>
		</motion.div>
	);
};
