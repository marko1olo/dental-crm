import { FileText } from "lucide-react";
import React from "react";

export interface TreatmentPlanPresenterEmptyStateProps {
	readonly onClose: () => void;
}

export const TreatmentPlanPresenterEmptyState: React.FC<
	TreatmentPlanPresenterEmptyStateProps
> = ({ onClose }) => {
	return (
		<div
			className="treatment-presenter-backdrop"
			data-testid="treatment-plan-presenter-empty-state"
			role="dialog"
			aria-modal="true"
			aria-labelledby="empty-presenter-title"
		>
			<div className="treatment-presenter-modal max-w-lg p-6 bg-[var(--paper-strong)] border border-[var(--line)] rounded-2xl shadow-2xl flex flex-col items-center text-center">
				<div className="w-16 h-16 rounded-full bg-[var(--surface-subtle)] flex items-center justify-center mb-4 text-[var(--muted)]">
					<FileText size={32} />
				</div>
				<h3
					id="empty-presenter-title"
					className="text-xl font-bold text-[var(--ink)] mb-2"
				>
					Планы лечения не найдены
				</h3>
				<p className="text-sm text-[var(--muted)] mb-6 leading-relaxed">
					В текущей базе данных клиники отсутствуют составленные планы лечения
					для презентации у кресла. Выберите пациента в расписании или создайте
					новый план лечения в карте приёма.
				</p>
				<div className="flex gap-3 w-full">
					<button
						type="button"
						onClick={onClose}
						className="flex-1 min-h-[44px] h-11 py-2.5 px-4 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-medium hover:bg-[var(--surface-subtle)] transition-colors cursor-pointer"
						data-testid="empty-presenter-close-btn"
					>
						Закрыть
					</button>
					<button
						type="button"
						onClick={() => {
							onClose();
							window.location.href = "#/coordinator/pipeline";
						}}
						className="flex-1 min-h-[44px] h-11 py-2.5 px-4 rounded-xl bg-[var(--teal,#0d9488)] text-white font-medium hover:bg-[var(--teal-dark,#0f766e)] transition-colors cursor-pointer"
						data-testid="empty-presenter-pipeline-btn"
					>
						Воронка планов
					</button>
				</div>
			</div>
		</div>
	);
};

export default TreatmentPlanPresenterEmptyState;
