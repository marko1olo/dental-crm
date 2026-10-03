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
import { Edit2, Trash2, UserCheck, UserPlus, X } from "lucide-react";
import type { Lead } from "../../store/leadsStore";
import { useAppStore } from "../../store/appStore";
import { usePatientStore } from "../../store/patientStore";
import { LeadAudioPlayerWidget } from "./LeadAudioPlayerWidget";

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

	const handleOpenPatient = (patientId: string) => {
		try {
			usePatientStore.getState().setSelectedPatientId(patientId);
			useAppStore.getState().setCurrentView("patients");
			if (typeof window !== "undefined") {
				window.location.hash = "patients";
			}
			onClose();
		} catch {
			// store fallback
		}
	};

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

				{currentLead?.existingPatient && (
					<div
						style={{
							display: "inline-flex",
							alignItems: "center",
							gap: 6,
							background: "var(--teal-soft)",
							color: "var(--teal-dark, var(--teal))",
							border: "1px solid var(--teal)",
							borderRadius: 6,
							padding: "4px 8px",
							fontSize: 12,
							fontWeight: 600,
							marginBottom: 14,
							cursor: "pointer",
						}}
						onClick={() => handleOpenPatient(currentLead.existingPatient!.id)}
						title={`Открыть карту постоянного пациента: ${currentLead.existingPatient.fullName}`}
						data-testid="modal-existing-patient-badge"
					>
						<UserCheck size={13} className="shrink-0" />
						<span>Постоянный пациент клиники: {currentLead.existingPatient.fullName}</span>
					</div>
				)}

				{/* Встроенный аудиоплеер звонка телефонии (Мандат 8n & 8l) */}
				{currentLead?.audioRecordUrl && (
					<div
						style={{
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between",
							background: "var(--paper-soft)",
							border: `1px solid ${borderColor}`,
							borderRadius: 8,
							padding: "8px 12px",
							marginBottom: 14,
							gap: 10,
						}}
						data-testid="modal-audio-player-section"
					>
						<div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
							<span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--ink)" }}>
								Запись входящего звонка АТС
							</span>
							{currentLead.transcriptionSnippet && (
								<span
									style={{
										fontSize: 10.5,
										color: "var(--muted)",
										fontStyle: "italic",
										overflow: "hidden",
										textOverflow: "ellipsis",
										whiteSpace: "nowrap",
									}}
									title={currentLead.transcriptionSnippet}
								>
									«{currentLead.transcriptionSnippet}»
								</span>
							)}
						</div>
						<LeadAudioPlayerWidget
							audioUrl={currentLead.audioRecordUrl}
							transcriptionSnippet={currentLead.transcriptionSnippet}
							durationSeconds={currentLead.audioDurationSeconds}
						/>
					</div>
				)}

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

					{editForm.status === "trash" && (
						<div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
							<label
								htmlFor="edit-lead-drop-reason"
								style={{ fontSize: 13, color: "var(--muted)" }}
							>
								Причина срыва / отказа
							</label>
							<select
								id="edit-lead-drop-reason"
								value={editForm.dropReason || "Дорого"}
								onChange={(e) =>
									setEditForm({
										...editForm,
										dropReason: e.target.value,
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
								<option value="Дорого">Дорого</option>
								<option value="Далеко / Неудобная локация">Далеко</option>
								<option value="Передумал / Неактуально">Передумал</option>
								<option value="Дубль обращения">Дубль обращения</option>
								<option value="Другое">Другое</option>
							</select>
						</div>
					)}

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

						{/* 1-клик действие «Карточка пациента» или «Создать пациента из лида» в модалке */}
						{!isNew && currentLead ? (
							currentLead.existingPatient ? (
								<button
									type="button"
									className="secondary-button"
									data-testid="open-patient-modal-btn"
									disabled={isDeleting}
									onClick={() => {
										handleOpenPatient(currentLead.existingPatient!.id);
									}}
									title={`Открыть карту постоянного пациента ${currentLead.existingPatient.fullName}`}
									style={{
										justifyContent: "center",
										color: "var(--accent)",
										borderColor: "var(--accent)",
										minHeight: 44,
										display: "flex",
										alignItems: "center",
										gap: 6,
										fontWeight: 600,
									}}
								>
									<UserCheck size={16} />
									Карточка пациента
								</button>
							) : (
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
							)
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
