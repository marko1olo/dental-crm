import React from "react";
import { Users, Armchair, PhoneCall } from "lucide-react";
import { formatChairSpecialtyLabel } from "../filterStrip/constants";
import type { ScheduleChair } from "../filterStrip/types";

export interface ScheduleFilterChipsProps {
	isAllActive: boolean;
	onResetAll: () => void;
	queueCounts?: {
		all?: number;
		arrived?: number;
		inTreatment?: number;
		awaitingPayment?: number;
	};
	displayChairs: readonly ScheduleChair[];
	chairFilterId: string | null;
	onSelectChair: (chairId: string | null) => void;
	hasMultipleDoctors: boolean;
	activeDoctors: Array<{ id: string; fullName: string }>;
	doctorFilterId: string | null;
	onSelectDoctor: (doctorId: string | null) => void;
	hasMultipleChairs: boolean;
	myChair: ScheduleChair | null;
	isMyChairActive: boolean;
	onSelectMyChair: () => void;
	onToggleConfirmations?: () => void;
	onOpenAddChair: () => void;
	activeFilterSummary?: React.ReactNode;
}

export function ScheduleFilterChips({
	isAllActive,
	onResetAll,
	queueCounts,
	displayChairs,
	chairFilterId,
	onSelectChair,
	hasMultipleDoctors,
	activeDoctors,
	doctorFilterId,
	onSelectDoctor,
	hasMultipleChairs,
	myChair,
	isMyChairActive,
	onSelectMyChair,
	onToggleConfirmations,
	onOpenAddChair,
	activeFilterSummary,
}: ScheduleFilterChipsProps) {
	return (
		<div
			className="schedule-filter-chips dente-filter-chips hidden sm:flex flex-1 items-center gap-1.5 overflow-x-auto whitespace-nowrap flex-nowrap scrollbar-none py-0.5 min-w-0 px-2"
			onWheel={(e) => {
				if (e.deltaY !== 0) {
					e.currentTarget.scrollLeft += e.deltaY;
				}
			}}
		>
			{/* Чип «Все записи» (сброс фильтров) */}
			<button
				type="button"
				data-testid="schedule-status-filter-all"
				className={`secondary-button quick-chip ${
					isAllActive
						? "active font-bold bg-[var(--paper)] text-[var(--ink)] shadow-2xs"
						: "bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)]"
				} dente-filter-chip h-8 min-h-[32px] sm:min-h-[36px] sm:h-9 max-h-8 sm:max-h-9 rounded-full px-3 text-[12px] border border-[var(--line)] shrink-0 flex-shrink-0 cursor-pointer inline-flex items-center gap-1.5 select-none whitespace-nowrap transition-all`}
				onClick={onResetAll}
				title="Все записи смены"
				aria-label="Фильтр: Все записи"
				aria-pressed={isAllActive}
			>
				<Users size={12} className="shrink-0 opacity-70" />
				<span className="font-semibold">Все записи</span>
				{queueCounts?.all !== undefined && (
					<span
						data-testid="schedule-queue-count-all"
						className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[var(--line)]/60 text-[var(--muted)]"
					>
						{queueCounts.all}
					</span>
				)}
			</button>

			{/* Чипы кабинетов / кресел */}
			{displayChairs.map((chair) => {
				const specName = formatChairSpecialtyLabel(chair?.specialization);
				const chairLabel = specName && !chair.name.includes("(") ? `${chair.name} (${specName})` : chair?.name || "Кресло";
				const isActive = chairFilterId === chair.id;

				return (
					<button
						key={chair.id}
						type="button"
						data-testid={`chair-view-badge-${chair.id}`}
						className={`secondary-button quick-chip ${
							isActive
								? "active font-bold bg-[var(--paper)] text-[var(--ink)] shadow-2xs"
								: "bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)]"
						} dente-filter-chip schedule-overflow-chip-2xl h-8 min-h-[32px] sm:min-h-[36px] sm:h-9 max-h-8 sm:max-h-9 rounded-full px-3 text-[12px] border border-[var(--line)] shrink-0 flex-shrink-0 cursor-pointer inline-flex items-center gap-1.5 select-none whitespace-nowrap transition-all`}
						onClick={() => onSelectChair(isActive ? null : chair.id)}
						title={`Фильтр по кабинету / креслу: ${chairLabel}${chair.room ? ` (${chair.room})` : ""}`}
						aria-label={`Фильтр по кабинету / креслу: ${chairLabel}`}
					>
						<Armchair size={12} className="shrink-0 opacity-70" />
						<span className="font-medium whitespace-nowrap">{chairLabel}</span>
					</button>
				);
			})}

			{/* Чипы врачей */}
			{hasMultipleDoctors &&
				activeDoctors.map((doc) => {
					const nameParts = (doc.fullName || "Врач").split(" ");
					const shortDocName = nameParts.length >= 2 ? `${nameParts[0]} ${nameParts[1]?.[0] || ""}.` : doc.fullName || "Врач";
					const isActive = doctorFilterId === doc.id;

					return (
						<button
							key={doc.id}
							type="button"
							className={`secondary-button quick-chip ${
								isActive
									? "active font-bold bg-[var(--paper)] text-[var(--ink)] shadow-2xs"
									: "bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)]"
							} dente-filter-chip schedule-doctor-chip h-8 min-h-[32px] sm:min-h-[36px] sm:h-9 max-h-8 sm:max-h-9 rounded-full px-3 text-[12px] border border-[var(--line)] shrink-0 flex-shrink-0 cursor-pointer inline-flex items-center gap-1 select-none whitespace-nowrap transition-all`}
							onClick={() => onSelectDoctor(isActive ? null : doc.id)}
							title={`Фильтр по врачу: ${doc.fullName}`}
						>
							<span className="font-medium whitespace-nowrap">{shortDocName}</span>
						</button>
					);
				})}

			{/* Моё кресло */}
			{hasMultipleChairs && myChair && (() => {
				const cleanChairName = myChair.name.replace(/\s*\(.*\)/, "").trim();
				return (
					<button
						type="button"
						className={`secondary-button quick-chip ${
							isMyChairActive
								? "active font-bold bg-[var(--paper)] text-[var(--ink)] shadow-2xs"
								: "bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)]"
						} dente-filter-chip schedule-my-chair-chip h-8 min-h-[44px] sm:min-h-[36px] sm:h-9 max-h-8 sm:max-h-9 rounded-full px-2.5 text-[12px] border border-[var(--line)] shrink-0 flex-shrink-0 cursor-pointer inline-flex items-center gap-1 select-none whitespace-nowrap transition-all`}
						style={{ minHeight: "44px" }}
						onClick={onSelectMyChair}
						title={`Моё дежурное кресло: ${cleanChairName}`}
						aria-label={`Моё дежурное кресло: ${cleanChairName}`}
						data-testid="schedule-my-chair-btn"
					>
						<Armchair size={12} className="shrink-0 text-current" />
						<span>Моё кресло ({cleanChairName})</span>
					</button>
				);
			})()}

			{/* Автодозвон (тихий инструмент) */}
			<button
				type="button"
				className="secondary-button quick-chip dente-filter-chip h-8 min-h-[32px] sm:min-h-[36px] sm:h-9 max-h-8 sm:max-h-9 rounded-full px-2.5 text-[12px] border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)] shrink-0 flex-shrink-0 cursor-pointer inline-flex items-center gap-1 select-none whitespace-nowrap transition-all"
				title="Автодозвон до пациентов с подтверждением"
				aria-label="Автодозвон"
				onClick={() => onToggleConfirmations?.()}
			>
				<PhoneCall size={12} className="shrink-0 opacity-70" />
				<span>Автодозвон</span>
			</button>

			{/* Кнопка быстрого добавления кресла «+ Кресло» */}
			{hasMultipleChairs && (
				<button
					type="button"
					onClick={onOpenAddChair}
					className="secondary-button schedule-add-chair-chip-btn dente-filter-chip h-8 min-h-[44px] sm:min-h-[36px] sm:h-9 max-h-8 sm:max-h-9 min-w-[44px] rounded-full px-2.5 border border-dashed border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)] text-[12px] font-medium inline-flex items-center justify-center gap-1 cursor-pointer transition-all shrink-0 whitespace-nowrap"
					style={{ minHeight: "44px", minWidth: "44px" }}
					title="Добавить кресло в расписание"
					aria-label="Добавить кресло в расписание"
					data-testid="schedule-add-chair-btn"
				>
					<span>+ Кресло</span>
				</button>
			)}

			{activeFilterSummary}
		</div>
	);
}
