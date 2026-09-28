/**
 * DENTE Dental CRM — Leads Kanban SSOT Lead Card Component
 *
 * Mandate 8s (SSOT Componentization), Mandate 8n (Anti-Landfill & Solo Doctor Autonomy):
 * - Exactly <= 2 primary actions per card (Schedule in grid + Create patient card)
 * - 1-click status selection
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
	Phone,
	Tag,
	UserPlus,
} from "lucide-react";
import type { Lead } from "../../store/leadsStore";
import {
	CHANNEL_BADGE_COLORS,
	CHANNEL_DISPLAY_NAMES,
} from "../telephony/telephonyAttribution";
import { normalizeMarketingChannel } from "./leadsFunnelTypes";
import { getLeadSlaStatus } from "./leadsKanbanTypes";
import { LeadAudioPlayerWidget } from "./LeadAudioPlayerWidget";

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
	) => void;
	onCreatePatient: (lead: Lead) => Promise<void> | void;
	onSchedule: (leadId: string) => void;
	onQuickSchedule?: (leadId: string) => Promise<void> | void;
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
}) => {
	const [isPreviewOpen, setIsPreviewOpen] = useState(false);
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
				border: `1px solid ${borderColor}`,
				boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
				opacity: isDragged ? 0.5 : 1,
				transform: isDragged ? "scale(0.98)" : "scale(1)",
				transition: "box-shadow 0.2s",
			}}
			whileHover={{
				y: -2,
				boxShadow: "0 8px 16px rgba(0,0,0,0.08)",
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

			{/* Интерактивный быстрый просмотр (Instant Preview Panel) */}
			{isPreviewOpen && (
				<div
					style={{
						marginBottom: 8,
						padding: "8px 10px",
						background: "var(--paper-soft)",
						borderRadius: 8,
						border: `1px solid ${borderColor}`,
						fontSize: 12,
						display: "flex",
						flexDirection: "column",
						gap: 5,
					}}
					onClick={(e) => e.stopPropagation()}
					data-testid={`lead-instant-preview-${lead.id}`}
				>
					<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
						<span style={{ fontWeight: 600, color: "var(--ink)", fontSize: 11 }}>
							Карточка обращения
						</span>
						<span style={{ fontSize: 10, color: "var(--muted)" }}>
							№ {lead.id.slice(0, 6)}
						</span>
					</div>
					{lead.notes && (
						<div style={{ fontSize: 11.5 }}>
							<span style={{ color: "var(--muted)" }}>Запрос: </span>
							<span style={{ color: "var(--ink)", fontStyle: "italic" }}>{lead.notes}</span>
						</div>
					)}
					{lead.source && (
						<div style={{ fontSize: 11.5 }}>
							<span style={{ color: "var(--muted)" }}>Канал: </span>
							<span style={{ color: channelBadge.color, fontWeight: 500 }}>{channelLabel}</span>
						</div>
					)}
					{lead.createdAt && (
						<div style={{ fontSize: 10.5, color: "var(--muted)" }}>
							Дата: {new Date(lead.createdAt).toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
						</div>
					)}
					{onQuickSchedule && lead.status !== "trash" && (
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								void onQuickSchedule(lead.id);
							}}
							style={{
								marginTop: 4,
								padding: "4px 8px",
								borderRadius: 6,
								fontSize: 11,
								fontWeight: 600,
								background: "var(--teal-soft)",
								color: "var(--teal-dark, var(--teal))",
								border: "1px solid var(--teal)",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								gap: 5,
								cursor: "pointer",
							}}
							title="Записать на ближайшее время в расписании в 1 клик"
							data-testid={`instant-quick-schedule-btn-${lead.id}`}
						>
							<Calendar size={12} />
							<span>Записать в 1 клик (дежурный слот)</span>
						</button>
					)}
				</div>
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
				{lead.source ? (
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
							maxWidth: 140,
							overflow: "hidden",
							textOverflow: "ellipsis",
							whiteSpace: "nowrap",
						}}
						title={`Источник: ${channelLabel}`}
					>
						<Globe size={10} className="shrink-0" />
						<span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
							{channelLabel}
						</span>
					</div>
				) : (
					<div />
				)}
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

			{/* 1-клик перевод на следующий этап воронки */}
			{NEXT_STAGE_MAP[lead.status] ? (
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						onStatusChange(e, lead.id, NEXT_STAGE_MAP[lead.status]!.status);
					}}
					style={{
						width: "100%",
						padding: "5px 8px",
						borderRadius: 7,
						fontSize: 11.5,
						fontWeight: 600,
						background: "var(--teal-soft)",
						color: "var(--teal-dark, var(--teal))",
						border: "1px solid var(--teal)",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						gap: 6,
						cursor: "pointer",
						transition: "all 0.15s ease",
						marginBottom: 6,
					}}
					title={`Перевести на этап ${NEXT_STAGE_MAP[lead.status]!.label} в 1 клик`}
					data-testid={`advance-stage-btn-${lead.id}`}
				>
					<span>{NEXT_STAGE_MAP[lead.status]!.label}</span>
					<ArrowRight size={12} className="shrink-0" />
				</button>
			) : lead.status === "showed_up" ? (
				<div
					style={{
						width: "100%",
						padding: "4px 8px",
						borderRadius: 6,
						fontSize: 11,
						fontWeight: 600,
						background: "var(--ok-bg)",
						color: "var(--ok-fg)",
						border: "1px solid var(--line)",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						gap: 5,
						marginBottom: 6,
					}}
				>
					<Check size={12} className="shrink-0" />
					<span>Пациент в клинике</span>
				</div>
			) : null}

			{/* Селектор статуса */}
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
				<span
					style={{
						fontSize: 11,
						color: "var(--muted)",
						fontWeight: 500,
					}}
				>
					Статус:
				</span>
				<select
					value={lead.status}
					onClick={(e) => e.stopPropagation()}
					onChange={(e) =>
						onStatusChange(
							e,
							lead.id,
							e.target.value as Lead["status"],
						)
					}
					style={{
						fontSize: 11,
						padding: "2px 6px",
						borderRadius: 6,
						border: `1px solid ${borderColor}`,
						background: "var(--paper-soft)",
						color: "var(--ink)",
						cursor: "pointer",
						outline: "none",
						maxWidth: 155,
					}}
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
			</div>

			{/* Ровно 2 первичных действия карточки согласно Мандату 8n (Anti-Landfill) */}
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					gap: 6,
					marginTop: "8px",
				}}
				onClick={(e) => e.stopPropagation()}
			>
				{/* Действие 1: Записать в сетку расписания (1 клик для вызова слота записи) */}
				{lead.status !== "trash" && (
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							onSchedule(lead.id);
						}}
						style={{
							width: "100%",
							padding: "6px 10px",
							borderRadius: 8,
							fontSize: 12,
							fontWeight: 600,
							background: "var(--teal-soft)",
							color: "var(--teal-dark, var(--teal))",
							border: "1px solid var(--teal)",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							gap: 6,
							cursor: "pointer",
							transition: "all 0.15s ease",
						}}
						data-testid={`schedule-lead-btn-${lead.id}`}
						title="Записать в сетку расписания"
					>
						<Calendar size={13} className="shrink-0" />
						<span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
							Записать на приём
						</span>
					</button>
				)}

				{/* Действие 2: Создать амбулаторную карту пациента в 1 клик */}
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						void onCreatePatient(lead);
					}}
					disabled={creatingPatientLeadId === lead.id}
					style={{
						width: "100%",
						padding: "6px 10px",
						borderRadius: 8,
						fontSize: 12,
						fontWeight: 600,
						background: "var(--ok-bg)",
						color: "var(--ok-fg)",
						border: "1px solid var(--line)",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						gap: 6,
						cursor:
							creatingPatientLeadId === lead.id
								? "wait"
								: "pointer",
						transition: "all 0.2s ease",
					}}
					data-testid={`create-patient-btn-${lead.id}`}
					title="Создать карту пациента из обращения в 1 клик"
				>
					<UserPlus size={13} className="shrink-0" />
					<span className="truncate">
						{creatingPatientLeadId === lead.id
							? "Создаём карту…"
							: "Создать пациента в 1 клик"}
					</span>
				</button>
			</div>
		</motion.div>
	);
};
