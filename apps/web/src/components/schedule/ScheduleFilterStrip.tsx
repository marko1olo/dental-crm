import type { Appointment, Dashboard } from "@dental/shared";
import type { ChangeEvent } from "react";
import { useScheduleStore } from "../../store/scheduleStore";

type TextFieldChangeEvent = ChangeEvent<HTMLInputElement | HTMLTextAreaElement>;

export type ScheduleFilterStripProps = {
	dashboard: Dashboard;
	sortedAppointments: Appointment[];
	showFreeDoctorsOnly: boolean;
	setShowFreeDoctorsOnly: (value: boolean) => void;
	resetScheduleFilters: () => void;
};

export function ScheduleFilterStrip({
	dashboard,
	sortedAppointments,
	showFreeDoctorsOnly,
	setShowFreeDoctorsOnly,
	resetScheduleFilters,
}: ScheduleFilterStripProps) {
	const {
		scheduleDateFilter,
		setScheduleDateFilter,
		scheduleDoctorFilterId,
		setScheduleDoctorFilterId,
		scheduleChairFilterId,
		setScheduleChairFilterId,
	} = useScheduleStore();

	const now = new Date();
	const freeDoctorIds = dashboard.clinicSettings.staff
		.filter((m) => m.role === "doctor" || m.role === "owner")
		.filter((m) => {
			const hasActiveAppointment = sortedAppointments.some(
				(a) =>
					a.doctorUserId === m.id &&
					["scheduled", "arrived", "in_chair"].includes(a.status) &&
					new Date(a.startsAt) <= now &&
					new Date(a.endsAt) >= now,
			);
			return !hasActiveAppointment;
		})
		.map((m) => m.id);

	const doctorsToRender = showFreeDoctorsOnly
		? dashboard.clinicSettings.staff.filter((m) => freeDoctorIds.includes(m.id))
		: dashboard.clinicSettings.staff.filter(
				(member) =>
					member.active &&
					(member.role === "doctor" || member.role === "owner"),
			);

	return (
		<div
			className="schedule-filter-strip"
			aria-label="Фильтры расписания"
			style={{
				display: "flex",
				gap: "8px",
				flexWrap: "wrap",
				alignItems: "center",
				padding: "12px 16px",
				borderBottom: "1px solid var(--slate-100)",
			}}
		>
			<div
				style={{
					display: "flex",
					alignItems: "center",
					gap: "8px",
					borderRight: "1px solid var(--slate-200)",
					paddingRight: "12px",
					marginRight: "4px",
				}}
			>
				<input
					type="date"
					value={scheduleDateFilter}
					onChange={(event: TextFieldChangeEvent) =>
						setScheduleDateFilter(event.target.value)
					}
					style={{
						border: "none",
						background: "transparent",
						fontSize: "14px",
						fontWeight: 600,
						color: "var(--slate-800)",
						outline: "none",
						cursor: "pointer",
					}}
				/>
			</div>

			<button
				type="button"
				className={`quick-chip ${!scheduleDoctorFilterId && !scheduleChairFilterId ? "active" : ""}`}
				onClick={resetScheduleFilters}
			>
				Все
			</button>

			<button
				type="button"
				className={`quick-chip ${showFreeDoctorsOnly ? "active" : ""}`}
				onClick={() => setShowFreeDoctorsOnly(!showFreeDoctorsOnly)}
				style={
					showFreeDoctorsOnly
						? {
								backgroundColor: "var(--emerald-50)",
								color: "var(--emerald-700)",
								border: "1px solid var(--emerald-200)",
							}
						: {}
				}
			>
				🔍 Свободные врачи
			</button>

			{dashboard.clinicSettings.profile.mode !== "solo_doctor" &&
				doctorsToRender.map((member) => (
					<button
						key={member.id}
						type="button"
						className={`quick-chip ${scheduleDoctorFilterId === member.id ? "active" : ""}`}
						onClick={() =>
							setScheduleDoctorFilterId(
								scheduleDoctorFilterId === member.id ? null : member.id,
							)
						}
					>
						{member.fullName.split(" ")[0]}
						{freeDoctorIds.includes(member.id) && (
							<span
								style={{
									display: "inline-block",
									width: "6px",
									height: "6px",
									borderRadius: "50%",
									background: "#10b981",
									marginLeft: "6px",
									verticalAlign: "middle",
								}}
								title="Свободен"
							/>
						)}
					</button>
				))}

			{dashboard.clinicSettings.chairs
				.filter((chair) => chair.active)
				.map((chair) => (
					<button
						key={chair.id}
						type="button"
						className={`quick-chip ${scheduleChairFilterId === chair.id ? "active" : ""}`}
						onClick={() =>
							setScheduleChairFilterId(
								scheduleChairFilterId === chair.id ? null : chair.id,
							)
						}
					>
						{chair.name}
					</button>
				))}
		</div>
	);
}
