import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ReactElement } from "react";

export interface ScheduleStaffMember {
	id: string;
	fullName?: string;
	active?: boolean;
	role?: string;
}

export interface ScheduleChair {
	id: string;
	name: string;
	active?: boolean;
}

export interface ScheduleFilterStripProps {
	scheduleDateFilter: string;
	setScheduleDateFilter: (date: string) => void;
	stepScheduleDay: (delta: number) => void;
	activeScheduleFilterCount: number;
	resetScheduleFilters: () => void;
	staffMembers?: ScheduleStaffMember[];
	chairs?: ScheduleChair[];
	isSoloDoctor?: boolean;
	scheduleDoctorFilterId: string | null;
	setScheduleDoctorFilterId: (id: string | null) => void;
	scheduleChairFilterId: string | null;
	setScheduleChairFilterId: (id: string | null) => void;
}

/**
 * ScheduleFilterStrip component for filtering schedule view by date, doctor, or chair.
 * Ensures strict vertical alignment and >=44px touch targets on mobile viewports.
 */
export function ScheduleFilterStrip({
	scheduleDateFilter,
	setScheduleDateFilter,
	stepScheduleDay,
	activeScheduleFilterCount,
	resetScheduleFilters,
	staffMembers = [],
	chairs = [],
	isSoloDoctor = false,
	scheduleDoctorFilterId,
	setScheduleDoctorFilterId,
	scheduleChairFilterId,
	setScheduleChairFilterId,
}: ScheduleFilterStripProps): ReactElement {
	return (
		<section
			className="schedule-filter-strip"
			aria-label="Сохраненные фильтры расписания"
			style={{
				display: "flex",
				gap: "8px",
				flexWrap: "wrap",
				alignItems: "center",
				padding: "12px 16px",
				borderBottom: "1px solid var(--line)",
			}}
		>
			{/* Date control group */}
			<div
				className="schedule-date-picker-group"
				style={{
					display: "flex",
					alignItems: "center",
					gap: "6px",
					borderRight: "1px solid var(--line)",
					paddingRight: "12px",
					marginRight: "4px",
				}}
			>
				<div
					className="schedule-date-stepper"
					style={{
						display: "inline-flex",
						alignItems: "center",
						gap: "4px",
					}}
				>
					<button
						type="button"
						className="secondary-button schedule-day-step-prev min-h-[44px] min-w-[44px]"
						onClick={() => stepScheduleDay(-1)}
						aria-label="Показать предыдущий день"
						title="День назад"
						style={{
							padding: "0 10px",
							lineHeight: "1",
							display: "inline-flex",
							alignItems: "center",
							justifyContent: "center",
							boxSizing: "border-box",
						}}
					>
						<ChevronLeft size={16} aria-hidden="true" />
					</button>
					<input
						type="date"
						aria-label="Фильтр расписания по дате"
						value={scheduleDateFilter}
						onChange={(event) => setScheduleDateFilter(event.target.value)}
						className="min-h-[44px]"
						style={{
							lineHeight: "1",
							boxSizing: "border-box",
							border: "1px solid var(--line)",
							borderRadius: "8px",
							background: "var(--paper-soft)",
							padding: "4px 8px",
							fontSize: "13px",
							fontWeight: 600,
							color: "var(--ink)",
							outline: "none",
							cursor: "pointer",
							display: "inline-flex",
							alignItems: "center",
						}}
					/>
					<button
						type="button"
						className="secondary-button schedule-day-step-next min-h-[44px] min-w-[44px]"
						onClick={() => stepScheduleDay(1)}
						aria-label="Показать следующий день"
						title="День вперёд"
						style={{
							padding: "0 10px",
							lineHeight: "1",
							display: "inline-flex",
							alignItems: "center",
							justifyContent: "center",
							boxSizing: "border-box",
						}}
					>
						<ChevronRight size={16} aria-hidden="true" />
					</button>
				</div>
			</div>

			{/* "Все записи" filter chip button */}
			<button
				type="button"
				className={`quick-chip min-h-[44px] ${activeScheduleFilterCount === 0 ? "active" : ""}`}
				onClick={resetScheduleFilters}
				style={{
					lineHeight: "1",
					padding: "0 14px",
					boxSizing: "border-box",
					display: "inline-flex",
					alignItems: "center",
					justifyContent: "center",
					margin: 0,
					alignSelf: "center",
				}}
			>
				Все записи
			</button>

			{/* Doctor filter chips */}
			{!isSoloDoctor &&
				staffMembers
					.filter(
						(member) =>
							member?.active &&
							(member?.role === "doctor" || member?.role === "owner"),
					)
					.map((member) => (
						<button
							key={member.id}
							type="button"
							className={`quick-chip min-h-[44px] ${scheduleDoctorFilterId === member.id ? "active" : ""}`}
							onClick={() =>
								setScheduleDoctorFilterId(
									scheduleDoctorFilterId === member.id ? null : member.id,
								)
							}
							style={{
								boxSizing: "border-box",
								display: "inline-flex",
								alignItems: "center",
								justifyContent: "center",
								margin: 0,
								alignSelf: "center",
							}}
						>
							{(member?.fullName ?? "").split(" ")[0]}
						</button>
					))}

			{/* Chair filter chips */}
			{chairs
				.filter((chair) => chair?.active)
				.map((chair) => (
					<button
						key={chair.id}
						type="button"
						className={`quick-chip min-h-[44px] ${scheduleChairFilterId === chair.id ? "active" : ""}`}
						onClick={() =>
							setScheduleChairFilterId(
								scheduleChairFilterId === chair.id ? null : chair.id,
							)
						}
						style={{
							boxSizing: "border-box",
							display: "inline-flex",
							alignItems: "center",
							justifyContent: "center",
							margin: 0,
							alignSelf: "center",
						}}
					>
						{chair.name}
					</button>
				))}
		</section>
	);
}
