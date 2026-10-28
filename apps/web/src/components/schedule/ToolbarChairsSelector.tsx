/**
 * DENTE Dental CRM — Schedule Toolbar Chairs & Doctors Selector (Island 2)
 *
 * Smooth wheel-scrollable filter chips:
 * [ Все записи | Каб. 1 (Иванов) | Каб. 2 (Петрова) | Моё кресло | Автодозвон | + Кресло ]
 * (Mandate 8b: <= 300 lines; Apple HIG & Linear compact ergonomics).
 */

import React, { type ReactElement } from "react";
import { Users, Armchair, PhoneCall } from "lucide-react";
import { formatChairSpecialtyLabel } from "./filterStrip/constants";
import type { ScheduleChair, ScheduleDoctorMember } from "./filterStrip/types";

export interface ToolbarChairsSelectorProps {
	isAllActive: boolean;
	resetScheduleFilters?: () => void;
	setDoctorFilterId: (id: string | null) => void;
	setChairFilterId: (id: string | null) => void;
	setStatusFilter: (status: any) => void;
	queueCounts?: { all?: number; arrived?: number; inTreatment?: number; awaitingPayment?: number };
	displayChairs: readonly ScheduleChair[];
	chairFilterId: string | null;
	hasMultipleDoctors: boolean;
	activeDoctors: ScheduleDoctorMember[];
	doctorFilterId: string | null;
	hasMultipleChairs: boolean;
	myChair: ScheduleChair | null;
	isMyChairActive: boolean;
	onSelectMyChair?: () => void;
	currentDoctorId?: string | null;
	staffMembers?: ScheduleDoctorMember[];
	onToggleConfirmations?: () => void;
	onOpenAddChair?: () => void;
	onOpenAddChairModal: () => void;
	activeFilterSummary?: React.ReactNode;
}

export function ToolbarChairsSelector(props: ToolbarChairsSelectorProps): ReactElement {
	const {
		isAllActive,
		resetScheduleFilters,
		setDoctorFilterId,
		setChairFilterId,
		setStatusFilter,
		queueCounts,
		displayChairs,
		chairFilterId,
		hasMultipleDoctors,
		activeDoctors,
		doctorFilterId,
		hasMultipleChairs,
		myChair,
		isMyChairActive,
		onSelectMyChair,
		currentDoctorId,
		staffMembers,
		onToggleConfirmations,
		onOpenAddChair,
		onOpenAddChairModal,
		activeFilterSummary,
	} = props;

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
				onClick={() => {
					resetScheduleFilters?.();
					setDoctorFilterId(null);
					setChairFilterId(null);
					setStatusFilter("all");
				}}
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
						onClick={() => setChairFilterId(isActive ? null : chair.id)}
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
							onClick={() => setDoctorFilterId(isActive ? null : doc.id)}
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
						key="my-chair-btn"
						type="button"
						className={`secondary-button quick-chip ${
							isMyChairActive
								? "active font-bold bg-[var(--paper)] text-[var(--ink)] shadow-2xs"
								: "bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)]"
						} dente-filter-chip schedule-my-chair-chip h-8 min-h-[44px] sm:min-h-[36px] sm:h-9 max-h-8 sm:max-h-9 rounded-full px-2.5 text-[12px] border border-[var(--line)] shrink-0 flex-shrink-0 cursor-pointer inline-flex items-center gap-1 select-none whitespace-nowrap transition-all`}
						style={{ minHeight: "44px" }}
						onClick={() => {
							if (onSelectMyChair) {
								onSelectMyChair();
							} else if (chairFilterId === myChair.id) {
								setChairFilterId(null);
							} else {
								setChairFilterId(myChair.id);
								const effectiveDoc =
									currentDoctorId ||
									doctorFilterId ||
									(staffMembers?.find((m) => m?.active && (m?.role === "doctor" || m?.role === "owner"))?.id ?? null);
								if (effectiveDoc) {
									setDoctorFilterId(effectiveDoc);
								}
							}
						}}
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
					onClick={() => (onOpenAddChair ? onOpenAddChair() : onOpenAddChairModal())}
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
