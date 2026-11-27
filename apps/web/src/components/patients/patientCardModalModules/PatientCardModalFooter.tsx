/**
 * apps/web/src/components/patients/patientCardModalModules/PatientCardModalFooter.tsx
 * Footer action controls for PatientCardModal (Mandate 8d, 8am).
 * Single Primary CTA, Cancel/Close button strictly to the left of Primary.
 * Mandate 8b: decomposed modular component <= 150 lines.
 */

import React from "react";
import { Calendar, Plus, Stethoscope } from "lucide-react";
import type { PatientSectionSaveState } from "../patientCardSavePill";
import type { UsePatientCreationFormResult } from "../patientCreation/usePatientCreationTypes";

export interface PatientCardModalFooterProps {
	readonly isCreateMode: boolean;
	readonly creationForm: UsePatientCreationFormResult;
	readonly isDirty?: boolean | undefined;
	readonly saveState?: PatientSectionSaveState | undefined;
	readonly onClose: () => void;
	readonly onSave: () => void;
}

export const PatientCardModalFooter: React.FC<PatientCardModalFooterProps> = React.memo(
	function PatientCardModalFooter({
		isCreateMode,
		creationForm,
		isDirty = false,
		saveState = "idle",
		onClose,
		onSave,
	}) {
		const statusHint = isCreateMode
			? "Карта пациента • Быстрое оформление без лишних полей"
			: saveState === "saving"
				? "Сохранение изменений..."
				: saveState === "error"
					? "Ошибка сохранения — повторите попытку"
					: saveState === "saved"
						? "Все изменения сохранены"
						: isDirty
							? "Есть несохранённые изменения"
							: "Медицинская карта пациента • Защита персональных данных";

		return (
			<div
				data-testid="patient-card-modal-footer"
				className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 max-sm:sticky max-sm:bottom-0 max-sm:z-20 max-sm:pb-[max(12px,env(safe-area-inset-bottom))] border-t border-[var(--glass-border)] bg-[var(--paper-strong)] gap-2 print:hidden shrink-0"
			>
				<span
					data-testid="patient-card-save-status"
					className={`hidden sm:inline text-xs whitespace-normal ${
						saveState === "error"
							? "text-[var(--danger)] font-medium"
							: saveState === "saved"
								? "text-[var(--success-ink)] font-medium"
								: isDirty
									? "text-[var(--primary)] font-medium"
									: "text-[var(--muted)]"
					}`}
				>
					{statusHint}
				</span>

				{isCreateMode ? (
					<div className="flex items-center gap-2 w-full sm:w-auto flex-wrap sm:flex-nowrap justify-end">
						<button
							type="button"
							className="border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-medium rounded-xl sm:rounded-lg px-4 min-h-[44px] h-11 sm:min-h-[36px] sm:h-9 text-xs sm:text-sm cursor-pointer select-none transition-all hover:bg-[var(--paper-soft)]"
							onClick={onClose}
						>
							Отмена
						</button>
						<button
							type="button"
							className="border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-medium rounded-xl sm:rounded-lg px-4 min-h-[44px] h-11 sm:min-h-[36px] sm:h-9 text-xs sm:text-sm cursor-pointer select-none transition-all hover:bg-[var(--paper-soft)] hover:border-[var(--line-strong)] inline-flex items-center gap-1.5"
							onClick={() => void creationForm.handleCreateAndBook()}
							disabled={false}
							data-testid="patient-creation-submit-and-book-btn"
							title="Создать карту и сразу открыть расписание"
						>
							<Calendar size={15} aria-hidden="true" />
							<span>Создать и записать</span>
						</button>
						<button
							type="button"
							className="border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-medium rounded-xl sm:rounded-lg px-4 min-h-[44px] h-11 sm:min-h-[36px] sm:h-9 text-xs sm:text-sm cursor-pointer select-none transition-all hover:bg-[var(--paper-soft)] hover:border-[var(--line-strong)] inline-flex items-center gap-1.5"
							onClick={() => void creationForm.handleCreateAndOpenVisit()}
							disabled={false}
							data-testid="patient-creation-submit-and-visit-btn"
							title="Создать карту и сразу открыть приём"
						>
							<Stethoscope size={15} aria-hidden="true" />
							<span>Создать и начать приём</span>
						</button>
						{/* Ровно ОДНА Primary CTA кнопка var(--primary) */}
						<button
							type="button"
							className="border-0 bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] min-h-[44px] h-11 sm:min-h-[36px] sm:h-9 px-5 text-sm font-medium rounded-xl sm:rounded-lg shadow-sm cursor-pointer select-none transition-all active:scale-95 inline-flex items-center gap-1.5 whitespace-nowrap"
							onClick={() => void creationForm.handleCreate()}
							disabled={false}
							data-testid="patient-creation-submit-btn"
							title="Создать медицинскую карту пациента"
						>
							<Plus size={16} aria-hidden="true" />
							<span data-testid="patient-studio-primary-cta">
								{creationForm.isPatientCreating ? "Создание..." : "Создать пациента"}
							</span>
						</button>
					</div>
				) : (
					<div className="flex items-center gap-2.5 w-full sm:w-auto">
						<button
							type="button"
							onClick={onClose}
							className="flex-1 sm:flex-none border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-medium rounded-xl sm:rounded-lg px-5 shadow-xs hover:bg-[var(--paper-soft)] hover:border-[var(--line-strong)] min-h-[44px] h-11 sm:min-h-[36px] sm:h-9 text-xs sm:text-sm cursor-pointer select-none transition-all active:scale-95 whitespace-nowrap min-w-[100px]"
						>
							{isDirty ? "Отмена" : "Закрыть"}
						</button>
						{/* Ровно ОДНА Primary CTA кнопка var(--primary) (Мандат 8e, Мандат 8am) */}
						<button
							type="button"
							data-testid="btn-save-patient-card"
							onClick={onSave}
							disabled={false}
							className="flex-1 sm:flex-none border-0 bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] min-h-[44px] h-11 sm:min-h-[36px] sm:h-9 px-6 text-xs sm:text-sm font-medium rounded-xl sm:rounded-lg shadow-sm cursor-pointer select-none transition-all active:scale-95 whitespace-nowrap min-w-[130px]"
						>
							<span data-testid="patient-studio-primary-cta">
								{saveState === "saving" ? "Сохранение..." : "Сохранить"}
							</span>
						</button>
					</div>
				)}
			</div>
		);
	},
);
