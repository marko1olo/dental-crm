import React from "react";
import { Layers, Sparkles } from "lucide-react";

export interface TreatmentPlanStagesEmptyStateProps {
	readonly specialtyFilter: string;
	readonly onSetSpecialtyFilter: (filter: any) => void;
	readonly onApplyClinicalBundle: (bundleId: any, toothNumber?: number) => void;
	readonly onOpenCreateStageModal: () => void;
}

export const TreatmentPlanStagesEmptyState: React.FC<TreatmentPlanStagesEmptyStateProps> = ({
	specialtyFilter,
	onSetSpecialtyFilter,
	onApplyClinicalBundle,
	onOpenCreateStageModal,
}) => {
	const isFiltered = specialtyFilter !== "all";

	return (
		<div className="p-8 rounded-2xl border border-dashed border-[var(--line,var(--border,#cbd5e1))] bg-[var(--paper-soft,#f8fafc)] text-center text-xs text-[var(--muted,#64748b)] space-y-3">
			<Layers className="w-10 h-10 mx-auto text-[var(--muted,#64748b)] opacity-40" />
			<div className="font-bold text-sm text-[var(--ink,#0f172a)]">
				{isFiltered ? "В выбранной специализации пока нет этапов" : "В плане лечения пока нет сформированных этапов"}
			</div>
			<p className="max-w-md mx-auto m-0 text-xs text-[var(--muted,#64748b)]">
				{isFiltered
					? "Сбросьте фильтр или добавьте новый этап по этой специальности."
					: "Добавьте клинический пакет, услугу из каталога или создайте этап вручную."}
			</p>
			<div className="flex items-center justify-center gap-2 pt-1 flex-wrap">
				{isFiltered ? (
					<button
						type="button"
						onClick={() => onSetSpecialtyFilter("all")}
						className="secondary-button dente-btn dente-btn-secondary h-8 px-3 rounded-lg text-xs font-bold text-[var(--ink,#0f172a)] bg-[var(--paper-strong,#ffffff)] hover:bg-[var(--paper-soft)] border border-[var(--line,var(--border,#cbd5e1))] transition-colors inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
					>
						<span>Показать все этапы</span>
					</button>
				) : (
					<>
						<button
							type="button"
							onClick={() => onApplyClinicalBundle("caries_turnkey")}
							className="secondary-button dente-btn dente-btn-secondary h-8 px-3 rounded-lg text-xs font-bold text-[var(--teal-dark,var(--teal))] bg-[var(--teal-soft,var(--paper-soft))] hover:bg-[var(--teal-soft)] border border-[var(--teal)]/30 transition-colors inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
							data-testid="empty-template-therapy"
						>
							<Sparkles size={13} />
							<span>+ Терапия (Санация)</span>
						</button>
						<button
							type="button"
							onClick={() => onApplyClinicalBundle("crown_zirconia_turnkey")}
							className="secondary-button dente-btn dente-btn-secondary h-8 px-3 rounded-lg text-xs font-bold text-[var(--teal-dark,var(--teal))] bg-[var(--teal-soft,var(--paper-soft))] hover:bg-[var(--teal-soft)] border border-[var(--teal)]/30 transition-colors inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
							data-testid="empty-template-orthopedics"
						>
							<Sparkles size={13} />
							<span>+ Ортопедия (Коронка)</span>
						</button>
						<button
							type="button"
							onClick={() => onApplyClinicalBundle("implant_turnkey")}
							className="secondary-button dente-btn dente-btn-secondary h-8 px-3 rounded-lg text-xs font-bold text-[var(--teal-dark,var(--teal))] bg-[var(--teal-soft,var(--paper-soft))] hover:bg-[var(--teal-soft)] border border-[var(--teal)]/30 transition-colors inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
							data-testid="empty-template-implant"
						>
							<Sparkles size={13} />
							<span>+ All-on-4/6 (Имплантация)</span>
						</button>
						<button
							type="button"
							onClick={onOpenCreateStageModal}
							className="secondary-button dente-btn dente-btn-secondary h-8 px-3 rounded-lg text-xs font-bold text-[var(--ink,#0f172a)] bg-[var(--paper-strong,#ffffff)] hover:bg-[var(--paper-soft)] border border-[var(--line,var(--border,#cbd5e1))] transition-colors inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
						>
							<span>+ Создать этап</span>
						</button>
					</>
				)}
			</div>
		</div>
	);
};
