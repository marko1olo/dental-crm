/**
 * DENTE Dental CRM — Leads Kanban SSOT Form Modal (Create / Edit Lead)
 *
 * Mandate 8s (SSOT Componentization), Mandate 8e & 8n:
 * - Single SSOT modal for creating and updating leads
 * - 1-click patient card creation button (`data-testid="lead-create-patient-modal-btn"`)
 * - Permanent delete action (`data-testid="lead-delete-permanent"`)
 */

import type React from "react";
import { motion } from "framer-motion";
import { Edit2, Trash2, UserPlus, X } from "lucide-react";
import type { Lead } from "../../store/leadsStore";

export interface LeadFormModalProps {
	isOpen: boolean;
	onClose: () => void;
	editingLeadId: string | null;
	editForm: Partial<Lead>;
	setEditForm: React.Dispatch<React.SetStateAction<Partial<Lead>>>;
	onSubmit: (e: React.FormEvent) => void;
	isDeleting: boolean;
	onDelete: () => void;
	creatingPatientLeadId: string | null;
	onCreatePatient: (lead: Lead) => void;
	leads: Lead[];
	cardBg?: string;
	colBg?: string;
	borderColor?: string;
}

export const LeadFormModal: React.FC<LeadFormModalProps> = ({
	isOpen,
	onClose,
	editingLeadId,
	editForm,
	setEditForm,
	onSubmit,
	isDeleting,
	onDelete,
	creatingPatientLeadId,
	onCreatePatient,
	leads,
	cardBg = "var(--paper)",
	colBg = "var(--paper-soft)",
	borderColor = "var(--line)",
}) => {
	if (!isOpen) return null;

	const isNew = editingLeadId === "new";
	const currentLead = !isNew && editingLeadId
		? leads.find((l) => l.id === editingLeadId)
		: null;

	return (
		<div
			style={{
				position: "fixed",
				inset: 0,
				zIndex: 100,
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				background: "rgba(0,0,0,0.5)",
				backdropFilter: "blur(4px)",
			}}
		>
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				style={{
					background: cardBg,
					borderRadius: 16,
					padding: 24,
					width: 400,
					maxWidth: "90%",
					border: `1px solid ${borderColor}`,
					boxShadow: "0 24px 48px rgba(0,0,0,0.2)",
				}}
			>
				<div
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						marginBottom: 20,
					}}
				>
					<h3
						style={{
							margin: 0,
							fontSize: 18,
							fontWeight: 600,
							color: "var(--ink)",
							display: "flex",
							alignItems: "center",
							gap: 8,
						}}
					>
						<Edit2 size={20} color="var(--teal)" />
						{isNew ? "Добавить лида" : "Редактировать лида"}
					</h3>
					<button
						type="button"
						onClick={onClose}
						style={{
							background: "none",
							border: "none",
							color: "var(--muted)",
							cursor: "pointer",
						}}
						aria-label="Закрыть модальное окно"
					>
						<X size={20} />
					</button>
				</div>

				<form
					onSubmit={onSubmit}
					style={{ display: "flex", flexDirection: "column", gap: 16 }}
				>
					<div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
						<label
							htmlFor="edit-lead-name"
							style={{ fontSize: 13, color: "var(--muted)" }}
						>
							Имя пациента / лида
						</label>
						<input
							id="edit-lead-name"
							type="text"
							value={editForm.name || ""}
							onChange={(e) =>
								setEditForm({ ...editForm, name: e.target.value })
							}
							placeholder="Иван Иванов"
							style={{
								padding: 10,
								borderRadius: 8,
								border: `1px solid ${borderColor}`,
								background: colBg,
								color: "var(--ink)",
							}}
							required
						/>
					</div>

					<div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
						<label
							htmlFor="edit-lead-phone"
							style={{ fontSize: 13, color: "var(--muted)" }}
						>
							Телефон
						</label>
						<input
							id="edit-lead-phone"
							type="tel"
							value={editForm.phone || ""}
							onChange={(e) =>
								setEditForm({ ...editForm, phone: e.target.value })
							}
							placeholder="+7 (999) 123-45-67"
							style={{
								padding: 10,
								borderRadius: 8,
								border: `1px solid ${borderColor}`,
								background: colBg,
								color: "var(--ink)",
							}}
						/>
					</div>

					<div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
						<label
							htmlFor="edit-lead-source"
							style={{ fontSize: 13, color: "var(--muted)" }}
						>
							Источник (Откуда пришел)
						</label>
						<input
							id="edit-lead-source"
							type="text"
							value={editForm.source || ""}
							onChange={(e) =>
								setEditForm({ ...editForm, source: e.target.value })
							}
							placeholder="Instagram, Сайт, Рекомендация..."
							style={{
								padding: 10,
								borderRadius: 8,
								border: `1px solid ${borderColor}`,
								background: colBg,
								color: "var(--ink)",
							}}
						/>
					</div>

					<div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
						<label
							htmlFor="edit-lead-revenue"
							style={{ fontSize: 13, color: "var(--muted)" }}
						>
							Ожидаемая выручка (₽)
						</label>
						<input
							id="edit-lead-revenue"
							type="text"
							value={editForm.expectedRevenue || ""}
							onChange={(e) =>
								setEditForm({
									...editForm,
									expectedRevenue: e.target.value,
								})
							}
							placeholder="15000"
							style={{
								padding: 10,
								borderRadius: 8,
								border: `1px solid ${borderColor}`,
								background: colBg,
								color: "var(--ink)",
							}}
						/>
					</div>

					<div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
						<label
							htmlFor="edit-lead-notes"
							style={{ fontSize: 13, color: "var(--muted)" }}
						>
							Пожелания / Жалобы / Примечания
						</label>
						<textarea
							id="edit-lead-notes"
							rows={3}
							value={editForm.notes || ""}
							onChange={(e) =>
								setEditForm({
									...editForm,
									notes: e.target.value,
								})
							}
							placeholder="Например: острая боль, интересует имплантация, запись после 18:00..."
							style={{
								padding: 10,
								borderRadius: 8,
								border: `1px solid ${borderColor}`,
								background: colBg,
								color: "var(--ink)",
								resize: "vertical",
								fontSize: 13,
							}}
						/>
					</div>

					<div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
						<label
							htmlFor="edit-lead-status"
							style={{ fontSize: 13, color: "var(--muted)" }}
						>
							Статус в воронке
						</label>
						<select
							id="edit-lead-status"
							value={editForm.status || "new"}
							onChange={(e) =>
								setEditForm({
									...editForm,
									status: e.target.value as Lead["status"],
								})
							}
							style={{
								padding: 10,
								borderRadius: 8,
								border: `1px solid ${borderColor}`,
								background: colBg,
								color: "var(--ink)",
								cursor: "pointer",
							}}
						>
							<option value="new">1. Новые</option>
							<option value="contacted">2. Квалифицированные</option>
							<option value="consult_booked">3. Консультация</option>
							<option value="showed_up">4. Дошли</option>
							<option value="no_answer">Недозвон</option>
							<option value="trash">Отказ</option>
						</select>
					</div>

					<div
						style={{
							display: "flex",
							gap: 10,
							marginTop: 8,
							alignItems: "stretch",
						}}
					>
						<button
							type="submit"
							className="primary-button"
							disabled={isDeleting}
							style={{
								flex: 1,
								justifyContent: "center",
							}}
						>
							Сохранить
						</button>

						{/* 1-клик действие «Создать пациента из лида» в модалке */}
						{!isNew && currentLead ? (
							<button
								type="button"
								className="secondary-button"
								data-testid="lead-create-patient-modal-btn"
								disabled={isDeleting || creatingPatientLeadId === editingLeadId}
								onClick={() => {
									onCreatePatient(currentLead);
								}}
								title="Создать карту пациента из обращения в 1 клик"
								style={{
									justifyContent: "center",
									color: "var(--ok-fg)",
									borderColor: "var(--line)",
									minHeight: 44,
									display: "flex",
									alignItems: "center",
									gap: 6,
								}}
							>
								<UserPlus size={16} />
								{creatingPatientLeadId === editingLeadId
									? "Создаём…"
									: "Создать пациента"}
							</button>
						) : null}

						{/* Permanent DELETE action */}
						{!isNew && editingLeadId ? (
							<button
								type="button"
								className="secondary-button"
								data-testid="lead-delete-permanent"
								disabled={isDeleting}
								onClick={onDelete}
								title="Удалить обращение из базы навсегда"
								aria-label="Удалить обращение навсегда"
								style={{
									justifyContent: "center",
									color: "var(--rust)",
									borderColor: "var(--rust)",
									minWidth: 44,
									minHeight: 44,
								}}
							>
								<Trash2 size={16} />
								{isDeleting ? " Удаляем…" : " Удалить"}
							</button>
						) : null}
					</div>
				</form>
			</motion.div>
		</div>
	);
};
