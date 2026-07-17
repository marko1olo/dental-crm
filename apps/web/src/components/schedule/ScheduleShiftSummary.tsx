import type { Dashboard, Appointment, ResourceLoad, ScheduleWarning } from "@dental/shared";
import { useScheduleStore } from "../../store/scheduleStore";

export type ScheduleShiftSummaryProps = {
	dashboard: Dashboard;
	sortedAppointments: Appointment[];
	shiftWarnings: ScheduleWarning[];
	showShiftAnalytics: boolean;
	formatTime: (value: string) => string;
};

export function ScheduleShiftSummary({
	dashboard,
	sortedAppointments,
	shiftWarnings,
	showShiftAnalytics,
	formatTime,
}: ScheduleShiftSummaryProps) {
	const { scheduleDateFilter, scheduleStatusFilter } = useScheduleStore();

	const highestUtilizationLoad = (loads: ResourceLoad[]) =>
		loads.reduce<ResourceLoad | null>((highestLoad, load) => {
			if (
				!highestLoad ||
				load.utilizationPercent > highestLoad.utilizationPercent
			)
				return load;
			return highestLoad;
		}, null);

	const busiestDoctorLoad = highestUtilizationLoad(
		dashboard.shiftIntelligence.doctorLoads,
	);
	const busiestChairLoad = highestUtilizationLoad(
		dashboard.shiftIntelligence.chairLoads,
	);
	const activeScheduleFilterCount = [
		scheduleDateFilter.trim(),
		scheduleStatusFilter !== "all" ? scheduleStatusFilter : null,
	].filter((value): value is string => Boolean(value)).length;

	const scheduleLoadSummaryCards = [
		{
			id: "doctor",
			title: "Самый загруженный врач",
			value: busiestDoctorLoad
				? `${busiestDoctorLoad.utilizationPercent}%`
				: "нет загрузки",
			detail: busiestDoctorLoad
				? `${busiestDoctorLoad.title}: ${busiestDoctorLoad.appointmentCount} записей, ${busiestDoctorLoad.bookedMinutes} мин.`
				: "смена не заполнена",
		},
		{
			id: "chair",
			title: "Самое занятое кресло",
			value: busiestChairLoad
				? `${busiestChairLoad.utilizationPercent}%`
				: "нет загрузки",
			detail: busiestChairLoad
				? `${busiestChairLoad.title}: ${busiestChairLoad.appointmentCount} записей, ${busiestChairLoad.nextFreeAt ? `свободно с ${formatTime(busiestChairLoad.nextFreeAt)}` : "окон нет"}`
				: "кресла не загружены",
		},
		{
			id: "visible",
			title: "На экране",
			value: `${sortedAppointments.length}`,
			detail: activeScheduleFilterCount
				? `активных фильтров: ${activeScheduleFilterCount}`
				: "показана вся очередь",
		},
		{
			id: "control",
			title: "Контроль",
			value: shiftWarnings.length ? `${shiftWarnings.length}` : "0",
			detail: shiftWarnings[0]?.title ?? "нет срочных предупреждений",
		},
	];

	return (
		<>
			{showShiftAnalytics && (
				<div className="schedule-command-grid">
					<article>
						<span>Врачи</span>
						<strong>{dashboard.shiftIntelligence.doctorLoads.length}</strong>
						<p>
							{dashboard.shiftIntelligence.doctorLoads
								.map(
									(load: ResourceLoad) =>
										`${load.title.split(" ")[0]} ${load.utilizationPercent}%`,
								)
								.join(" · ")}
						</p>
					</article>
					<article>
						<span>Ассистенты</span>
						<strong>{dashboard.shiftIntelligence.assistantLoads.length}</strong>
						<p>
							{dashboard.shiftIntelligence.assistantLoads
								.map(
									(load: ResourceLoad) =>
										`${load.title.split(" ")[0]} ${load.utilizationPercent}%`,
								)
								.join(" · ") || "не назначены"}
						</p>
					</article>
					<article>
						<span>Кресла</span>
						<strong>{dashboard.shiftIntelligence.chairLoads.length}</strong>
						<p>
							{dashboard.shiftIntelligence.chairLoads
								.map(
									(load: ResourceLoad) =>
										`${load.title} ${load.utilizationPercent}%`,
								)
								.join(" · ")}
						</p>
					</article>
					<article>
						<span>Контроль</span>
						<strong>{shiftWarnings.length}</strong>
						<p>{shiftWarnings[0]?.title ?? "нет срочных предупреждений"}</p>
					</article>
				</div>
			)}
			<section
				className="schedule-shift-summary"
				data-testid="schedule-shift-summary"
				aria-label="Короткая сводка смены"
				aria-live="polite"
				style={{
					display: "flex",
					gap: "8px",
					flexWrap: "wrap",
					alignItems: "center",
				}}
			>
				{sortedAppointments.length > 0 ? (
					<span className="status-pill status-confirmed">
						Записей: {sortedAppointments.length}
					</span>
				) : (
					<span className="status-pill status-cancelled">Нет записей</span>
				)}
				{activeScheduleFilterCount > 0 ? (
					<span className="status-pill status-arrived">
						Фильтров: {activeScheduleFilterCount}
					</span>
				) : null}
				{shiftWarnings.length > 0 ? (
					<span className="status-pill status-overdue">
						Предупреждений: {shiftWarnings.length}
					</span>
				) : (
					<span className="status-pill status-completed">Ок</span>
				)}
				{showShiftAnalytics && (
					<div
						className="schedule-shift-summary-grid"
						style={{ width: "100%", marginTop: "12px" }}
					>
						{scheduleLoadSummaryCards.map((card) => (
							<article key={card.id}>
								<span>{card.title}</span>
								<strong>{card.value}</strong>
								<p>{card.detail}</p>
							</article>
						))}
					</div>
				)}
			</section>
		</>
	);
}
