/**
 * DENTE Dental CRM — Leads Kanban SSOT Lead Card Component
 *
 * Mandate 8s (SSOT Componentization), Mandate 8n (Anti-Landfill & Solo Doctor Autonomy):
 * - Exactly <= 2 primary actions per card (Schedule in grid + Create patient card)
 * - Quick status selection
 * - Click-to-call direct phone link
 * - Compact clinical density (desktop-first)
 * - Zero emojis
 */

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
	ArrowRight,
	Calendar,
	Check,
	Clock,
	Edit2,
	Eye,
	FileText,
	Globe,
	MessageSquare,
	Phone,
	Tag,
	UserCheck,
	UserPlus,
} from "lucide-react";
import type { Lead } from "../../store/leadsStore";
import { useAppStore } from "../../store/appStore";
import { usePatientStore } from "../../store/patientStore";
import { formatWhatsAppUrl } from "../messaging/omnichannelEngine";
import {
	CHANNEL_BADGE_COLORS,
	CHANNEL_DISPLAY_NAMES,
} from "../telephony/telephonyAttribution";
import { normalizeMarketingChannel } from "./leadsFunnelTypes";
import { getLeadSlaStatus } from "./leadsKanbanTypes";
import { LeadAudioPlayerWidget } from "./LeadAudioPlayerWidget";
import { LeadInstantPreview } from "./LeadInstantPreview";

const NEXT_STAGE_MAP: Partial<
	Record<Lead["status"], { status: Lead["status"]; label: string }>
> = {
	new: { status: "contacted", label: "Квалифицировать →" },
	contacted: { status: "consult_booked", label: "На консультацию →" },
	consult_booked: { status: "showed_up", label: "Пациент дошёл →" },
	no_answer: { status: "new", label: "Повторить (в Новые) →" },
	trash: { status: "new", label: "Восстановить обращение →" },
};

export interface LeadCardProps {
	lead: Lead;
	isDragged: boolean;
	creatingPatientLeadId: string | null;
	borderColor: string;
	cardBg: string;
	onDragStart: (e: React.DragEvent, id: string) => void;
	onEdit: (lead: Lead) => void;
	onStatusChange: (
		e: React.MouseEvent | React.ChangeEvent<HTMLSelectElement>,
		leadId: string,
		nextStatus: Lead["status"],
		options?: { reason?: string; dropReason?: string },
	) => void;
	onCreatePatient: (lead: Lead) => Promise<void> | void;
	onSchedule: (leadId: string) => void;
	onQuickSchedule?: (leadId: string) => Promise<void> | void;
	onOpenPatientCard?: (patientId: string) => void;
}

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
	const [isPreviewOpen, setIsPreviewOpen] = useState(false);
	const sla = getLeadSlaStatus(lead);
	const dropReasonMatch =
		lead.dropReason ||
		(lead.notes ? lead.notes.match(/\[Причина срыва\]:\s*([^\n\r]+)/)?.[1] : null);

	const handleOpenPatient = (e: React.MouseEvent, patientId: string) => {
		e.stopPropagation();
		if (onOpenPatientCard) {
			onOpenPatientCard(patientId);
			return;
		}
		try {
			usePatientStore.getState().setSelectedPatientId(patientId);
			useAppStore.getState().setCurrentView("patients");
			if (typeof window !== "undefined") {
				window.location.hash = "patients";
			}
		} catch {
			// store fallback
		}
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
	return (
		<motion.div
			layout
			initial={{ opacity: 0, y: 10 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, scale: 0.95 }}
			draggable
			// biome-ignore lint/suspicious/noExplicitAny: automated suppression
			onDragStart={(e: any) => onDragStart(e, lead.id)}
			onClick={() => onEdit(lead)}
			style={{
				background: cardBg,
				padding: "12px 14px",
				borderRadius: "10px",
				cursor: "grab",
				border: sla.isBreached
					? "1px solid var(--rust-soft, rgba(239, 68, 68, 0.4))"
					: `1px solid ${borderColor}`,
				borderLeft: sla.isBreached
					? "4px solid var(--rust, #ef4444)"
					: `1px solid ${borderColor}`,
				boxShadow: sla.isBreached
					? "0 2px 12px rgba(239, 68, 68, 0.12)"
					: "0 2px 8px rgba(0,0,0,0.05)",
				opacity: isDragged ? 0.5 : 1,
				transform: isDragged ? "scale(0.98)" : "scale(1)",
				transition: "box-shadow 0.2s, border 0.2s",
			}}
			whileHover={{
				y: -2,
				boxShadow: sla.isBreached
					? "0 8px 18px rgba(239, 68, 68, 0.18)"
					: "0 8px 16px rgba(0,0,0,0.08)",
			}}
		>
			{/* Заголовок карточки: имя, быстрый просмотр и кнопка редактирования */}
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "flex-start",
					marginBottom: "4px",
					gap: 6,
				}}
			>
				<strong
					style={{
						fontSize: 15,
						color: "var(--ink)",
						display: "flex",
						alignItems: "center",
						gap: 6,
						minWidth: 0,
						wordBreak: "break-word",
						overflowWrap: "anywhere",
						flex: 1,
					}}
				>
					{lead.name}
				</strong>
				<div style={{ display: "flex", alignItems: "center", gap: 3, flexShrink: 0 }}>
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							setIsPreviewOpen((prev) => !prev);
						}}
						style={{
							background: isPreviewOpen ? "var(--teal-soft)" : "none",
							border: "none",
							cursor: "pointer",
							padding: 3,
							borderRadius: 4,
							color: isPreviewOpen ? "var(--teal-dark, var(--teal))" : "var(--muted)",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
						}}
						title={isPreviewOpen ? "Скрыть быстрый просмотр" : "Быстрый просмотр обращения"}
						aria-label="Быстрый просмотр обращения"
						data-testid={`preview-lead-btn-${lead.id}`}
					>
						<Eye size={14} />
					</button>
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							onEdit(lead);
						}}
						style={{
							background: "none",
							border: "none",
							cursor: "pointer",
							padding: 3,
							borderRadius: 4,
							color: "var(--muted)",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
						}}
						title="Редактировать лид"
						aria-label="Редактировать лид"
					>
						<Edit2 size={14} style={{ opacity: 0.7 }} />
					</button>
				</div>
			</div>

			{/* Speed-to-Lead SLA Urgency Indicator */}
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
					marginBottom: 6,
					width: "fit-content",
				}}
				title={`Speed-to-Lead SLA: ${sla.formattedDuration}`}
				data-testid={`lead-sla-badge-${lead.id}`}
			>
				<Clock size={10} className="shrink-0" />
				<span>{sla.label}</span>
			</div>

			{/* Бейдж постоянного пациента клиники (Mandates 8l, 8n) */}
			{lead.existingPatient && (
				<div
					style={{
						background: "var(--teal-soft)",
						color: "var(--teal-dark, var(--teal))",
						border: "1px solid var(--teal)",
						fontSize: 10.5,
						fontWeight: 600,
						padding: "1px 6px",
						borderRadius: 5,
						display: "inline-flex",
						alignItems: "center",
						gap: 3.5,
						marginBottom: 6,
						marginLeft: 4,
						width: "fit-content",
						cursor: "pointer",
					}}
					onClick={(e) => handleOpenPatient(e, lead.existingPatient!.id)}
					title={`Номер совпадает с существующей картой: ${lead.existingPatient.fullName}. Нажмите для перехода в карту.`}
					data-testid={`lead-existing-patient-badge-${lead.id}`}
				>
					<UserCheck size={10} className="shrink-0" />
					<span>Постоянный пациент: {lead.existingPatient.fullName}</span>
				</div>
			)}

			{/* Причина срыва / отказа обращения */}
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
						marginLeft: 4,
					}}
					title={`Причина срыва: ${dropReasonMatch}`}
					data-testid={`lead-drop-reason-badge-${lead.id}`}
				>
					<span>Срыв: {dropReasonMatch}</span>
				</div>
			)}

			{/* Телефонный номер (прямой клик для звонка) и компактный аудиоплеер */}
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					marginBottom: 6,
					gap: 6,
					minWidth: 0,
				}}
			>
				{lead.phone ? (
					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: 6,
							fontSize: 13,
							color: "var(--muted)",
							minWidth: 0,
						}}
					>
						<Phone size={12} className="shrink-0" />
						<a
							href={`tel:${lead.phone.replace(/[^\d+]/g, "")}`}
							onClick={(e) => e.stopPropagation()}
							style={{
								color: "inherit",
								textDecoration: "none",
								overflow: "hidden",
								textOverflow: "ellipsis",
								whiteSpace: "nowrap",
								minWidth: 0,
							}}
							title="Позвонить контакту"
						>
							{lead.phone}
						</a>
						<a
							href={formatWhatsAppUrl(
								lead.phone,
								`Здравствуйте, ${lead.name}! Вас беспокоит стоматологическая клиника DENTE.`,
							)}
							target="_blank"
							rel="noopener noreferrer"
							onClick={(e) => e.stopPropagation()}
							style={{
								display: "inline-flex",
								alignItems: "center",
								justifyContent: "center",
								color: "var(--teal-dark, var(--teal))",
								background: "var(--teal-soft)",
								border: "1px solid var(--teal)",
								borderRadius: 4,
								padding: "1px 4px",
								textDecoration: "none",
								fontSize: 10,
								flexShrink: 0,
								marginLeft: 2,
							}}
							title="Написать пациенту в WhatsApp"
							aria-label="Написать пациенту в WhatsApp"
							data-testid={`lead-whatsapp-btn-${lead.id}`}
						>
							<MessageSquare size={10} />
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

			{/* Клинические теги высокого чека */}
			{Array.isArray(lead.clinicalTags) && lead.clinicalTags.length > 0 && (
				<div
					style={{
						display: "flex",
						flexWrap: "wrap",
						gap: 4,
						marginBottom: 6,
					}}
				>
					{lead.clinicalTags.map((tag) => (
						<span
							key={tag}
							style={{
								fontSize: 10,
								fontWeight: 600,
								background: "var(--teal-soft)",
								color: "var(--teal-dark, var(--teal))",
								border: "1px solid var(--teal)",
								padding: "1px 5px",
								borderRadius: 4,
								display: "inline-flex",
								alignItems: "center",
								gap: 3,
							}}
						>
							<Tag size={9} />
							<span>{tag}</span>
						</span>
					))}
				</div>
			)}

			{/* Компактный чип примечаний/жалоб лида */}
			{lead.notes && (
				<div
					style={{
						display: "flex",
						alignItems: "center",
						gap: 5,
						fontSize: 11.5,
						color: "var(--muted)",
						background: "var(--paper-soft)",
						padding: "3px 7px",
						borderRadius: 6,
						marginBottom: 6,
						minWidth: 0,
					}}
					title={`Примечание: ${lead.notes}`}
				>
					<FileText size={11} className="shrink-0" style={{ color: "var(--teal)" }} />
					<span
						style={{
							overflow: "hidden",
							textOverflow: "ellipsis",
							whiteSpace: "nowrap",
							minWidth: 0,
						}}
					>
						{lead.notes}
					</span>
				</div>
			)}

			{/* Интерактивный быстрый просмотр (Instant Preview Panel: instant-preview-patient-link-) */}
			{isPreviewOpen && (
				<LeadInstantPreview
					lead={lead}
					borderColor={borderColor}
					channelBadge={channelBadge}
					channelLabel={channelLabel}
					onOpenPatient={handleOpenPatient}
					onQuickSchedule={onQuickSchedule}
				/>
			)}

			{/* Источник и ожидаемая выручка */}
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					marginTop: "4px",
					marginBottom: "8px",
					gap: 6,
				}}
			>
				<div
					style={{
						display: "flex",
						alignItems: "center",
						gap: 4,
						fontSize: 11,
						color: channelBadge.color,
						background: channelBadge.bg,
						border: `1px solid ${channelBadge.border}`,
						padding: "2px 6px",
						borderRadius: 4,
						maxWidth: 150,
						overflow: "hidden",
						textOverflow: "ellipsis",
						whiteSpace: "nowrap",
					}}
					title={`Источник: ${channelLabel || "Прямое обращение"}`}
					data-testid={`lead-channel-badge-${lead.id}`}
				>
					<Globe size={10} className="shrink-0" />
					<span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
						{channelLabel || "Прямой звонок"}
					</span>
				</div>
				{lead.expectedRevenue ? (
					<div
						style={{
							fontSize: 12,
							fontWeight: 600,
							color: "var(--ink)",
							background: "var(--paper-soft)",
							padding: "2px 6px",
							borderRadius: 4,
							whiteSpace: "nowrap",
							flexShrink: 0,
						}}
					>
						{Number(lead.expectedRevenue).toLocaleString("ru-RU")} ₽
					</div>
				) : null}
			</div>

			{/* Селектор статуса и быстрый переход */}
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					gap: 6,
					marginTop: "4px",
					paddingTop: "6px",
					borderTop: `1px solid ${borderColor}`,
				}}
				onClick={(e) => e.stopPropagation()}
			>
				<select
					value={lead.status}
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
					className="h-7 text-[11.5px] font-medium px-2 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] cursor-pointer outline-none flex-1 min-w-0 hover:border-[var(--line-strong,var(--line))]"
					title="Сменить статус обращения"
					aria-label="Выбрать статус обращения"
				>
					<option value="new">1. Новые</option>
					<option value="contacted">2. Квалифицированные</option>
					<option value="consult_booked">3. Консультация</option>
					<option value="showed_up">4. Дошли</option>
					<option value="no_answer">Недозвон</option>
					<option value="trash">Отказ</option>
				</select>
				{NEXT_STAGE_MAP[lead.status] ? (
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							onStatusChange(e, lead.id, NEXT_STAGE_MAP[lead.status]!.status);
						}}
						className="h-7 px-2 rounded-lg text-[11px] font-semibold bg-[var(--paper-soft)] text-[var(--teal)] border border-[var(--line)] inline-flex items-center justify-center gap-1 cursor-pointer transition-all hover:border-[var(--teal)] shrink-0"
						title={`Перевести на этап ${NEXT_STAGE_MAP[lead.status]!.label}`}
						data-testid={`advance-stage-btn-${lead.id}`}
					>
						<span>Далее</span>
						<ArrowRight size={11} className="shrink-0" />
					</button>
				) : lead.status === "showed_up" ? (
					<span
						className="h-7 px-2 rounded-lg text-[11px] font-semibold bg-[var(--teal-soft)] text-[var(--teal)] border border-[var(--line)] inline-flex items-center justify-center gap-1 shrink-0"
						title="Пациент пришёл в клинику"
					>
						<Check size={11} className="shrink-0" />
						<span>В клинике</span>
					</span>
				) : null}
			</div>

			{/* Ровно 2 первичных действия карточки согласно Мандату 8n (Anti-Landfill) */}
			<div
				className="flex flex-col gap-1.5 mt-2"
				onClick={(e) => e.stopPropagation()}
			>
				{/* Действие 1: Записать в сетку расписания (Primary CTA) */}
				{lead.status !== "trash" && (
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							onSchedule(lead.id);
						}}
						className="primary-button w-full h-8 min-h-[32px] text-[12.5px] font-semibold px-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring,rgba(20,184,166,0.5))] transition-all active:scale-[0.98] inline-flex items-center justify-center gap-1.5"
						data-testid={`schedule-lead-btn-${lead.id}`}
						title="Записать в сетку расписания"
					>
						<Calendar size={13} className="shrink-0" />
						<span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
							Записать на приём
						</span>
					</button>
				)}

				{/* Действие 2: Создать амбулаторную карту пациента или открыть существующую (Secondary CTA) */}
				{lead.existingPatient ? (
					<button
						type="button"
						onClick={(e) => handleOpenPatient(e, lead.existingPatient!.id)}
						className="secondary-button w-full h-8 min-h-[32px] text-[12.5px] font-medium px-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] inline-flex items-center justify-center gap-1.5 transition-all"
						data-testid={`open-patient-btn-${lead.id}`}
						title={`Открыть амбулаторную карту пациента ${lead.existingPatient.fullName}`}
					>
						<UserCheck size={13} className="shrink-0 text-[var(--teal)]" />
						<span className="truncate">
							Карточка пациента
						</span>
					</button>
				) : (
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							void onCreatePatient(lead);
						}}
						disabled={creatingPatientLeadId === lead.id}
						className="secondary-button w-full h-8 min-h-[32px] text-[12.5px] font-medium px-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] inline-flex items-center justify-center gap-1.5 transition-all disabled:opacity-60 disabled:cursor-wait"
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
