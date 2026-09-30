/**
 * TreatmentPlanCreateStageModal.tsx — модальное окно создания нового этапа плана лечения
 * с выбором клинической специализации (терапия, хирургия, ортопедия, ортодонтия, пародонтология, индивидуальный).
 */

import React, { useState } from "react";
import { Layers, Plus, X } from "lucide-react";

export interface TreatmentPlanCreateStageModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly onCreateStage: (preset: "therapy" | "surgery" | "orthopedics" | "orthodontics" | "periodontics" | "custom", customTitle?: string) => void;
}

export const TreatmentPlanCreateStageModal: React.FC<TreatmentPlanCreateStageModalProps> = ({
	isOpen,
	onClose,
	onCreateStage,
}) => {
	const [newStagePreset, setNewStagePreset] = useState<
		"therapy" | "surgery" | "orthopedics" | "orthodontics" | "periodontics" | "custom"
	>("therapy");
	const [newStageCustomTitle, setNewStageCustomTitle] = useState("");

	const handleConfirmCreateStage = () => {
		onCreateStage(newStagePreset, newStageCustomTitle.trim() || undefined);
		onClose();
		setNewStageCustomTitle("");
	};

	if (!isOpen) return null;

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
			role="dialog"
			aria-modal="true"
			aria-labelledby="create-stage-modal-title"
			data-testid="create-stage-modal"
		>
			<div
				className="w-full max-w-lg bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)] rounded-3xl border border-[var(--line,var(--border,#cbd5e1))] shadow-2xl flex flex-col overflow-hidden"
				onClick={(e) => e.stopPropagation()}
			>
				{/* Header */}
				<div className="flex items-center justify-between p-4 border-b border-[var(--line,var(--border,#cbd5e1))]">
					<div className="flex items-center gap-2.5">
						<div className="p-2 rounded-xl bg-[var(--teal-soft,var(--paper-soft))] text-[var(--teal,var(--brand-primary))] border border-[var(--teal)]/20">
							<Layers size={18} />
						</div>
						<div>
							<h3 id="create-stage-modal-title" className="text-sm font-black text-[var(--ink,#0f172a)]">
								Новый этап плана лечения
							</h3>
							<p className="text-[11px] text-[var(--muted,#64748b)]">
								Выберите профиль или создайте индивидуальный этап
							</p>
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="p-1.5 rounded-xl text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)] cursor-pointer transition-colors"
						aria-label="Закрыть окно"
					>
						<X size={18} />
					</button>
				</div>

				{/* Body */}
				<div className="p-4 space-y-4 text-xs">
					{/* Presets Grid */}
					<div className="space-y-1.5">
						<label className="text-[11px] font-bold text-[var(--muted)]">
							Клиническая специализация этапа:
						</label>
						<div className="grid grid-cols-2 gap-2">
							{[
								{ id: "therapy", label: "Терапия и санация", desc: "Кариес, эндодонтия, гигиена" },
								{ id: "surgery", label: "Хирургия и имплантация", desc: "Удаление, пластика, импланты" },
								{ id: "orthopedics", label: "Ортопедическая реабилитация", desc: "Коронки, мосты, виниры" },
								{ id: "orthodontics", label: "Ортодонтическое лечение", desc: "Брекеты, элайнеры, прикус" },
								{ id: "periodontics", label: "Пародонтология", desc: "SRP, Вектор, кюретаж" },
								{ id: "custom", label: "Индивидуальный этап", desc: "Специализированный протокол" },
							].map((preset) => {
								const isSelected = newStagePreset === preset.id;
								return (
									<button
										key={preset.id}
										type="button"
										onClick={() => setNewStagePreset(preset.id as any)}
										className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
											isSelected
												? "bg-[var(--teal-soft,var(--paper-soft))] border-[var(--teal,var(--brand-primary))] shadow-xs"
												: "bg-[var(--paper-soft,#f8fafc)] border-[var(--line,#e2e8f0)] hover:bg-[var(--paper-strong,#ffffff)]"
										}`}
									>
										<div className="font-bold text-xs text-[var(--ink,#0f172a)]">
											{preset.label}
										</div>
										<div className="text-[10px] text-[var(--muted,#64748b)] mt-0.5 line-clamp-1">
											{preset.desc}
										</div>
									</button>
								);
							})}
						</div>
					</div>

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
							className="w-full h-9 px-3 text-xs rounded-xl border border-[var(--line,var(--border,#cbd5e1))] bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] focus:outline-none focus:ring-2 focus:ring-[var(--teal)]"
							data-testid="create-stage-title-input"
						/>
					</div>
				</div>

				{/* Footer */}
				<div className="p-4 border-t border-[var(--line,var(--border,#cbd5e1))] flex items-center justify-between gap-3 bg-[var(--paper-soft,#f8fafc)]">
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
