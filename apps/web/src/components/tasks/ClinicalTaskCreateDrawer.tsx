import React, { useState } from "react";
import { User } from "lucide-react";

export type DueOption = "today" | "tomorrow" | "3days" | "week";

export interface ClinicalTaskCreateDrawerProps {
	readonly patientId?: string | null | undefined;
	readonly patientName?: string | null | undefined;
	readonly onAddTask?:
		| ((task: {
				title: string;
				description?: string | undefined;
				dueAt?: string | undefined;
				taskType?: string | undefined;
		  }) => void | Promise<void>)
		| undefined;
	readonly onClose: () => void;
}

function computeDueAtIso(opt: DueOption): string {
	const now = new Date();
	const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	if (opt === "today") d.setHours(19, 0, 0);
	else if (opt === "tomorrow") { d.setDate(d.getDate() + 1); d.setHours(12, 0, 0); }
	else if (opt === "3days") { d.setDate(d.getDate() + 3); d.setHours(12, 0, 0); }
	else { d.setDate(d.getDate() + 7); d.setHours(12, 0, 0); }
	return d.toISOString();
}

export const ClinicalTaskCreateDrawer: React.FC<ClinicalTaskCreateDrawerProps> = ({
	patientId,
	patientName,
	onAddTask,
	onClose,
}) => {
	const [newTitle, setNewTitle] = useState("");
	const [newDescription, setNewDescription] = useState("");
	const [selectedDueOption, setSelectedDueOption] = useState<DueOption>("today");

	const handleCreateTask = async (e?: React.FormEvent) => {
		if (e) e.preventDefault();
		const trimmedTitle = newTitle.trim();
		if (!trimmedTitle) return;

		if (onAddTask) {
			await onAddTask({
				title: trimmedTitle,
				description: newDescription.trim() || undefined,
				dueAt: computeDueAtIso(selectedDueOption),
				taskType: "custom_reminder",
			});
		}
		setNewTitle("");
		setNewDescription("");
		onClose();
	};

	return (
		<form onSubmit={handleCreateTask} className="quick-task-form" data-testid="quick-task-form">
			<div className="quick-task-form-header">
				<span>Быстрое напоминание у кресла</span>
				{patientName || patientId ? (
					<span className="quick-task-patient-badge">
						<User size={12} />
						<span>Пациент: {patientName || "Выбран"}</span>
					</span>
				) : null}
			</div>

			<input
				type="text"
				className="ops-input quick-task-title-input"
				data-testid="input-quick-task-title"
				placeholder="Что сделать? (например: Забрать коронку из лаборатории к пятнице)"
				value={newTitle}
				onChange={(e) => setNewTitle(e.target.value)}
				autoFocus
			/>

			<div className="quick-task-footer">
				<div className="quick-task-due-options">
					<span style={{ color: "var(--muted)" }}>Срок:</span>
					{(
						[
							["today", "Сегодня к вечеру"],
							["tomorrow", "Завтра к 12:00"],
							["3days", "Через 3 дня"],
							["week", "Через неделю"],
						] as const
					).map(([key, label]) => (
						<button
							key={key}
							type="button"
							className={`quick-task-due-btn ${selectedDueOption === key ? "quick-task-due-btn--active" : ""}`}
							onClick={() => setSelectedDueOption(key)}
						>
							{label}
						</button>
					))}
				</div>

				<div className="quick-task-actions">
					<button type="button" className="secondary-button" onClick={onClose}>
						Отмена
					</button>
					<button type="submit" className="primary-button" data-testid="btn-submit-quick-task">
						Сохранить
					</button>
				</div>
			</div>
		</form>
	);
};
