import React, { useMemo, useState } from "react";
import { DoctorShiftVisitItem } from "./visitsKpi/DoctorShiftVisitItem";
import { DoctorShiftVisitsHeader } from "./visitsKpi/DoctorShiftVisitsHeader";
import { DoctorShiftQueueFilterTabs, type QueueFilterId } from "./visitsKpi/DoctorShiftQueueFilterTabs";
import { DoctorShiftVisitsEmptyState } from "./visitsKpi/DoctorShiftVisitsEmptyState";
import type { DoctorShiftVisitsKpiSectionProps } from "./visitsKpi/visitsKpiTypes";

export type { DoctorShiftVisitsKpiSectionProps };

export const DoctorShiftVisitsKpiSection: React.FC<DoctorShiftVisitsKpiSectionProps> = ({
	todayAppointments,
	inChairAppointments,
	waitingAppointments,
	awaitingPaymentAppointments,
	patientsById,
	staffById,
	currentPatient,
	inChairAppointment,
	manyDoctors = false,
	onOpenAppointmentEmk,
	onOpenCashier,
	onOpenQueueBoardModal,
	onOpenSchedule,
	className = "",
}) => {
	const [queueFilter, setQueueFilter] = useState<QueueFilterId>("all");

	const displayedAppointments = useMemo(() => {
		if (queueFilter === "in_chair") return inChairAppointments;
		if (queueFilter === "waiting") return waitingAppointments;
		if (queueFilter === "payment") return awaitingPaymentAppointments;
		return todayAppointments;
	}, [queueFilter, todayAppointments, inChairAppointments, waitingAppointments, awaitingPaymentAppointments]);

	return (
		<div
			className={`today-schedule-box min-w-0 ${className}`.trim()}
			data-testid="doctor-shift-visits-kpi-section"
		>
			<DoctorShiftVisitsHeader
				count={todayAppointments.length}
				onOpenQueueBoardModal={onOpenQueueBoardModal}
				onOpenSchedule={onOpenSchedule}
			/>

			<DoctorShiftQueueFilterTabs
				queueFilter={queueFilter}
				onSelectFilter={setQueueFilter}
				allCount={todayAppointments.length}
				inChairCount={inChairAppointments.length}
				waitingCount={waitingAppointments.length}
				paymentCount={awaitingPaymentAppointments.length}
			/>

			{displayedAppointments.length > 0 ? (
				<div className="today-schedule-list">
					{displayedAppointments.map((app: any) => {
						const patient = patientsById.get(app.patientId);
						const isCurrent = Boolean(
							currentPatient &&
								(currentPatient.id === app.patientId ||
									(inChairAppointment && inChairAppointment.id === app.id)),
						);
						const doctor = staffById.get(app.doctorUserId);

						return (
							<DoctorShiftVisitItem
								key={app.id}
								app={app}
								patient={patient}
								doctor={doctor}
								isCurrent={isCurrent}
								manyDoctors={manyDoctors}
								onOpenAppointmentEmk={onOpenAppointmentEmk}
								onOpenCashier={onOpenCashier}
							/>
						);
					})}
				</div>
			) : (
				<DoctorShiftVisitsEmptyState
					hasAnyAppointments={todayAppointments.length > 0}
					totalCount={todayAppointments.length}
					onResetFilter={() => setQueueFilter("all")}
					onOpenSchedule={onOpenSchedule}
				/>
			)}
		</div>
	);
};
