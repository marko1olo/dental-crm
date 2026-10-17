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

		const now = new Date();
		let dueAtIso: string;
		if (selectedDueOption === "today") {
			const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 19, 0, 0);
			dueAtIso = d.toISOString();
		} else if (selectedDueOption === "tomorrow") {
			const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 12, 0, 0);
			dueAtIso = d.toISOString();
		} else if (selectedDueOption === "3days") {
			const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3, 12, 0, 0);
			dueAtIso = d.toISOString();
		} else {
			const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7, 12, 0, 0);
			dueAtIso = d.toISOString();
		}

		if (onAddTask) {
			await onAddTask({
				title: trimmedTitle,
				description: newDescription.trim() || undefined,
				dueAt: dueAtIso,
				taskType: "custom_reminder",
			});
		}

		setNewTitle("");
		setNewDescription("");
		onClose();
	};

	return (
		<form
			onSubmit={handleCreateTask}
			className="quick-task-form"
			data-testid="quick-task-form"
		>
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
					<button
						type="button"
						className={`quick-task-due-btn ${selectedDueOption === "today" ? "quick-task-due-btn--active" : ""}`}
						onClick={() => setSelectedDueOption("today")}
					>
						Сегодня к вечеру
					</button>
					<button
						type="button"
						className={`quick-task-due-btn ${selectedDueOption === "tomorrow" ? "quick-task-due-btn--active" : ""}`}
						onClick={() => setSelectedDueOption("tomorrow")}
					>
						Завтра к 12:00
					</button>
					<button
						type="button"
						className={`quick-task-due-btn ${selectedDueOption === "3days" ? "quick-task-due-btn--active" : ""}`}
						onClick={() => setSelectedDueOption("3days")}
					>
						Через 3 дня
					</button>
					<button
						type="button"
						className={`quick-task-due-btn ${selectedDueOption === "week" ? "quick-task-due-btn--active" : ""}`}
						onClick={() => setSelectedDueOption("week")}
					>
						Через неделю
					</button>
				</div>

				<div className="quick-task-actions">
					<button
						type="button"
						className="secondary-button"
						onClick={onClose}
					>
						Отмена
					</button>
					<button
						type="submit"
						className="primary-button"
						data-testid="btn-submit-quick-task"
					>
						Сохранить
					</button>
				</div>
			</div>
		</form>
	);
};
