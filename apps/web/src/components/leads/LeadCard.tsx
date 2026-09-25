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

import type React from "react";
import { motion } from "framer-motion";
import { Calendar, Edit2, Globe, Phone, UserPlus } from "lucide-react";
import type { Lead } from "../../store/leadsStore";

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
}) => {
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
			{/* Заголовок карточки: имя и кнопка редактирования */}
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "flex-start",
					marginBottom: "8px",
				}}
			>
				<strong
					style={{
						fontSize: 15,
						color: "var(--ink)",
						display: "flex",
						alignItems: "center",
						gap: 6,
					}}
				>
					{lead.name}
				</strong>
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
						padding: 2,
					}}
					title="Редактировать лид"
					aria-label="Редактировать лид"
				>
					<Edit2 size={14} color="var(--muted)" style={{ opacity: 0.7 }} />
				</button>
			</div>

			{/* Телефонный номер (прямой клик для звонка) */}
			{lead.phone && (
				<div
					style={{
						display: "flex",
						alignItems: "center",
						gap: 6,
						fontSize: 13,
						color: "var(--muted)",
						marginBottom: 6,
					}}
				>
					<Phone size={12} />
					<a
						href={`tel:${lead.phone.replace(/[^\d+]/g, "")}`}
						onClick={(e) => e.stopPropagation()}
						style={{
							color: "inherit",
							textDecoration: "none",
						}}
						title="Позвонить контакту"
					>
						{lead.phone}
					</a>
				</div>
			)}

			{/* Источник и ожидаемая выручка */}
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					marginTop: "6px",
					marginBottom: "8px",
				}}
			>
				{lead.source ? (
					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: 4,
							fontSize: 11,
							color: "var(--teal)",
							background: "rgba(59, 130, 246, 0.1)",
							padding: "2px 6px",
							borderRadius: 4,
						}}
					>
						<Globe size={10} /> {lead.source}
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
						}}
					>
						{lead.expectedRevenue} ₽
					</div>
				) : null}
			</div>

			{/* Селектор статуса в 1 клик */}
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					gap: 6,
					marginTop: "8px",
					paddingTop: "8px",
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
					}}
					title="Сменить статус в 1 клик"
					aria-label="Выбрать статус обращения"
				>
					<option value="new">Новые</option>
					<option value="contacted">В работе</option>
					<option value="consult_booked">Записаны</option>
					<option value="showed_up">Дошел</option>
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
						className="w-full py-1.5 px-2.5 rounded-lg text-xs font-bold bg-[var(--teal-soft)] hover:bg-[var(--teal-soft)] text-[var(--teal-dark)] border border-[var(--teal)] flex items-center justify-center gap-1.5 transition-colors"
						data-testid={`schedule-lead-btn-${lead.id}`}
						title="Записать в сетку расписания"
					>
						<Calendar size={13} />
						<span>Записать в сетку расписания</span>
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
						transition: "background 0.2s",
					}}
					data-testid={`create-patient-btn-${lead.id}`}
					title="Создать карту пациента из обращения в 1 клик"
				>
					<UserPlus size={13} />
					<span>
						{creatingPatientLeadId === lead.id
							? "Создаём карту…"
							: "Создать пациента в 1 клик"}
					</span>
				</button>
			</div>
		</motion.div>
	);
};
