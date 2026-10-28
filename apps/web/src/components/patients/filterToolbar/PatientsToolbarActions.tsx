import React from "react";
import { Filter, Plus, RotateCcw } from "lucide-react";

export interface PatientsToolbarActionsProps {
	readonly onOpenRecallsHub: () => void;
	readonly onOpenTactileSearch: () => void;
	readonly showLostPatientsOnly: boolean;
	readonly onToggleLostPatients: () => void;
	readonly isLoadingLost: boolean;
	readonly onOpenCreatePatient: () => void;
}

export const PatientsToolbarActions: React.FC<PatientsToolbarActionsProps> = ({
	onOpenRecallsHub,
	onOpenTactileSearch,
	showLostPatientsOnly,
	onToggleLostPatients,
	isLoadingLost,
	onOpenCreatePatient,
}) => {
	return (
		<div className="patients-header-actions shrink-0 flex items-center gap-1.5">
			<button
				type="button"
				className="secondary-button shrink-0 min-w-0 text-xs sm:text-[13px] h-9 min-h-[36px] px-2.5 rounded-xl font-medium inline-flex items-center justify-center gap-1.5 cursor-pointer transition-all select-none border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] shadow-xs"
				onClick={onOpenRecallsHub}
				title="Профосмотры и диспансерный учет (Recall, гигиена, импланты)"
				data-testid="btn-recalls-hub"
				data-legacy-testid="btn-patients-recalls-hub"
			>
				<RotateCcw size={14} aria-hidden="true" className="shrink-0 text-[var(--ink-muted)]" />
				<span className="whitespace-nowrap">Профосмотры</span>
			</button>

			<button
				type="button"
				className="secondary-button shrink-0 min-w-0 text-xs sm:text-[13px] h-9 min-h-[36px] px-2.5 rounded-xl font-medium inline-flex items-center justify-center gap-1.5 cursor-pointer transition-all select-none border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] shadow-xs"
				onClick={onOpenTactileSearch}
				title="Тактильная матрица поиска исследований по аппаратам и датам"
				data-testid="btn-patients-tactile-search"
			>
				<Filter size={14} aria-hidden="true" className="shrink-0 text-[var(--ink-muted)]" />
				<span className="whitespace-nowrap">Снимки</span>
			</button>

			<button
				type="button"
				className={`secondary-button ${
					showLostPatientsOnly
						? "active font-semibold border-[var(--teal)] text-[var(--teal)] bg-[var(--teal-surface)]"
						: "border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] font-medium"
				} shrink-0 min-w-0 text-xs sm:text-[13px] h-9 min-h-[36px] px-3 rounded-xl inline-flex items-center justify-center gap-1.5 cursor-pointer transition-all select-none shadow-xs`}
				onClick={onToggleLostPatients}
				title="Показать пациентов без будущих приемов, открытых задач и записей в листе ожидания"
			>
				<span className="whitespace-nowrap">
					{isLoadingLost
						? "Загрузка..."
						: showLostPatientsOnly
							? "Потерянные ✓"
							: "Потерянные"}
				</span>
			</button>

			{/* Ровно 1 Primary CTA teal var(--teal, #0d9488) на видимый контекст (Мандат 8am) */}
			<button
				type="button"
				className="primary-button patients-new-patient-btn shrink-0 min-w-0 text-xs sm:text-[13px] h-9 min-h-[36px] px-3.5 rounded-xl font-semibold inline-flex items-center justify-center gap-1.5 bg-[var(--teal-fill,var(--teal))] hover:bg-[var(--teal-dark,var(--teal))] text-white shadow-xs whitespace-nowrap cursor-pointer transition-all select-none"
				onClick={onOpenCreatePatient}
				title="Зарегистрировать нового пациента"
				data-testid="open-create-patient-modal-btn"
			>
				<Plus size={15} aria-hidden="true" className="shrink-0" />
				<span className="whitespace-nowrap">Новый пациент</span>
			</button>
		</div>
	);
};
