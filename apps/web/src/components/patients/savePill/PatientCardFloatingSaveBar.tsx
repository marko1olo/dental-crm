import React, { useState, useEffect } from "react";
import { Loader2, AlertCircle, CheckCircle2, Save } from "lucide-react";
import type { PatientSectionSaveState } from "./patientCardSavePillDescriptor";

export interface PatientCardFloatingSaveBarProps {
	readonly isDirty: boolean;
	readonly saveState: PatientSectionSaveState;
	readonly onSave: () => void | Promise<void>;
	readonly errorMessage?: string | null | undefined;
	readonly className?: string | undefined;
}

/**
 * Floating Bottom Bar сохранения карточки пациента (Apple macOS / Linear Desktop HIG).
 * Автоматически всплывает при наличии несохраненных правок,
 * показывает debounced индикацию «Все изменения сохранены» и единую Primary CTA кнопку.
 */
export const PatientCardFloatingSaveBar: React.FC<PatientCardFloatingSaveBarProps> = ({
	isDirty,
	saveState,
	onSave,
	errorMessage,
	className = "",
}) => {
	const [showSavedFeedback, setShowSavedFeedback] = useState(false);

	useEffect(() => {
		if (saveState === "saved") {
			setShowSavedFeedback(true);
			const timer = setTimeout(() => {
				setShowSavedFeedback(false);
			}, 3500);
			return () => clearTimeout(timer);
		}
	}, [saveState]);

	const isVisible = isDirty || saveState === "saving" || saveState === "error" || showSavedFeedback;
	if (!isVisible) return null;

	const handleSaveClick = () => {
		if (saveState === "saving") return;
		void onSave();
	};

	return (
		<div
			className={`patient-floating-save-bar fixed bottom-4 left-1/2 -translate-x-1/2 z-50 max-w-xl w-[calc(100%-32px)] sm:w-auto min-w-[320px] px-4 py-2.5 rounded-2xl bg-[var(--paper-strong)]/95 backdrop-blur-md border border-[var(--line-strong)] shadow-2xl flex items-center justify-between gap-4 select-none animate-in fade-in slide-in-from-bottom-2 duration-150 ${className}`}
			data-testid="patient-card-floating-save-bar"
			role="status"
			aria-live="polite"
		>
			<div className="flex items-center gap-2 text-xs min-w-0">
				{saveState === "saving" ? (
					<>
						<Loader2 className="w-4 h-4 animate-spin text-[var(--teal)] shrink-0" />
						<span className="text-[var(--ink)] font-medium truncate">Сохранение изменений...</span>
					</>
				) : saveState === "error" ? (
					<>
						<AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
						<span className="text-rose-600 dark:text-rose-400 font-semibold truncate">
							{errorMessage || "Ошибка сохранения"}
						</span>
					</>
				) : isDirty ? (
					<>
						<span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
						<span className="text-[var(--ink)] font-semibold truncate">Есть несохранённые изменения</span>
					</>
				) : (
					<>
						<CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
						<span className="text-emerald-700 dark:text-emerald-400 font-semibold truncate">Все изменения сохранены</span>
					</>
				)}
			</div>

			<div className="flex items-center gap-2 shrink-0">
				<button
					type="button"
					onClick={handleSaveClick}
					className="primary-button min-h-[44px] sm:min-h-[36px] h-9 px-4 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition-all bg-[var(--teal,#0d9488)] text-white hover:opacity-95 active:scale-95 cursor-pointer"
					data-testid="patient-card-save-floating-btn"
				>
					<Save size={14} className="shrink-0" />
					<span>Сохранить изменения</span>
				</button>
			</div>
		</div>
	);
};

export const PatientFloatingSaveBar = PatientCardFloatingSaveBar;
