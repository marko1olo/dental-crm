/**
 * TreatmentPlanCreateStageModal.tsx — модальное окно создания нового этапа плана лечения
 * с выбором клинической специализации (терапия, хирургия, ортопедия, ортодонтия, пародонтология, индивидуальный).
 */

import React, { useState } from "react";
import { Plus } from "lucide-react";
import { type StagePresetId } from "./createStageModal/stagePresetTypes";
import { StagePresetSelector } from "./createStageModal/StagePresetSelector";
import { CreateStageModalHeader } from "./createStageModal/CreateStageModalHeader";

export type { StagePresetId };

export interface TreatmentPlanCreateStageModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly onCreateStage: (preset: StagePresetId, customTitle?: string) => void;
}

export const TreatmentPlanCreateStageModal: React.FC<TreatmentPlanCreateStageModalProps> = ({
	isOpen,
	onClose,
	onCreateStage,
}) => {
	const [newStagePreset, setNewStagePreset] = useState<StagePresetId>("therapy");
	const [newStageCustomTitle, setNewStageCustomTitle] = useState("");

	const handleConfirmCreateStage = () => {
		onCreateStage(newStagePreset, newStageCustomTitle.trim() || undefined);
		onClose();
		setNewStageCustomTitle("");
	};

	if (!isOpen) return null;

	return (
		<div
			className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
			role="dialog"
			aria-modal="true"
			aria-labelledby="create-stage-modal-title"
			data-testid="create-stage-modal"
		>
			<div
				className="w-full sm:max-w-lg bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)] rounded-t-[24px] sm:rounded-3xl border-t sm:border border-[var(--line,var(--border,#cbd5e1))] shadow-2xl flex flex-col max-h-[88dvh] overflow-hidden"
				onClick={(e) => e.stopPropagation()}
			>
				{/* Tactile drag handle for mobile bottom sheet (Apple HIG) */}
				<div className="sm:hidden flex justify-center pt-2.5 pb-1 cursor-grab">
					<div className="w-9 h-1.5 rounded-full bg-[var(--line-strong,rgba(150,150,150,0.4))]" />
				</div>

				<CreateStageModalHeader onClose={onClose} />

				{/* Body */}
				<div className="p-4 space-y-4 text-xs overflow-y-auto overscroll-contain">
					<StagePresetSelector
						selectedPreset={newStagePreset}
						onSelectPreset={setNewStagePreset}
					/>

					{/* Custom Stage Title input */}
					<div className="space-y-1.5">
						<label className="text-[11px] font-bold text-[var(--muted)]">
							Пользовательское название этапа (необязательно):
						</label>
						<input
							type="text"
							value={newStageCustomTitle}
							onChange={(e) => setNewStageCustomTitle(e.target.value)}
							placeholder="Например: Протезирование на мультиюнитах All-on-4"
							className="w-full h-10 sm:h-9 px-3 text-xs rounded-xl border border-[var(--line,var(--border,#cbd5e1))] bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] focus:outline-none focus:ring-2 focus:ring-[var(--teal)]"
							data-testid="create-stage-title-input"
						/>
					</div>
				</div>

				{/* Footer with Safe Area Protection */}
				<div className="p-4 border-t border-[var(--line,var(--border,#cbd5e1))] flex items-center justify-between gap-3 bg-[var(--paper-soft,#f8fafc)] pb-[max(1rem,env(safe-area-inset-bottom))]">
					<button
						type="button"
						onClick={onClose}
						className="min-h-[44px] sm:min-h-[36px] px-4 py-2 rounded-xl text-xs font-bold text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] border border-[var(--line,#e2e8f0)] bg-[var(--paper-strong,#ffffff)] cursor-pointer transition-colors"
					>
						Отмена
					</button>

					<button
						type="button"
						onClick={handleConfirmCreateStage}
						data-testid="confirm-create-stage-btn"
						className="min-h-[44px] sm:min-h-[36px] px-5 py-2 rounded-xl text-xs font-black text-white bg-[var(--teal,var(--brand-primary))] hover:bg-[var(--teal-dark,#0f766e)] cursor-pointer transition-all shadow-md flex items-center gap-1.5"
					>
						<Plus size={15} />
						<span>Создать этап</span>
					</button>
				</div>
			</div>
		</div>
	);
};
