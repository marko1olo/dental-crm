import type { Appointment } from "@dental/shared";
import type React from "react";
import { formatPatientDisplayFio } from "../appointmentCardHelpers";
import { ScheduleMobileCardActions } from "./ScheduleMobileCardActions";
import {
	ScheduleMobileCardHeader,
	type ScheduleMobileTimelineRowProps,
} from "./ScheduleMobileCardHeader";
import { ScheduleMobileGapRow } from "./ScheduleMobileGapRow";
import { ScheduleMobileMetaChips } from "./ScheduleMobileMetaChips";
import { ScheduleMobileTimeCol } from "./ScheduleMobileTimeCol";
import {
	extractToothBadge,
	getStatusTheme,
	resolveMobileAllergyBadge,
} from "./scheduleMobileAgendaTypes";

export { type ScheduleMobileTimelineRowProps };

export const ScheduleMobileTimelineRow: React.FC<ScheduleMobileTimelineRowProps> = ({
	item,
	effectiveDateKey,
	selectedDoctorId,
	selectedChairId,
	dashboard,
	patientName,
	appointmentLabels,
	onSlotClick,
	onSelectMobileAppt,
	onQuickStatusChange,
	onOpenVisit,
}) => {
	if (item.type === "gap") {
		return (
			<ScheduleMobileGapRow
				item={item}
				effectiveDateKey={effectiveDateKey}
				selectedDoctorId={selectedDoctorId}
				selectedChairId={selectedChairId}
				onSlotClick={onSlotClick}
			/>
		);
	}

	const appt = item.appointment;
	const pat = dashboard?.patients?.find((p: any) => p.id === appt.patientId);
	const fullPatientName = patientName(dashboard?.patients ?? [], appt.patientId);
	const pName = formatPatientDisplayFio(fullPatientName);
	const doc = dashboard?.clinicSettings?.staff?.find((s: any) => s.id === appt.doctorUserId);
	const chair = dashboard?.clinicSettings?.chairs?.find((c: any) => c.id === appt.chairId);
	const statusTheme = getStatusTheme(appt.status, appointmentLabels);
	const toothBadge = extractToothBadge(appt);
	const allergyText = resolveMobileAllergyBadge(appt, pat);
	const rawBal = pat?.balanceRub ?? (pat as any)?.balance;
	const balance = rawBal !== undefined && rawBal !== null && rawBal !== "" && Number.isFinite(Number(rawBal)) ? Number(rawBal) : null;

	return (
		<div className="schedule-mobile-appt-row">
			<ScheduleMobileTimeCol item={item} />
			<div
				className="schedule-mobile-card"
				data-testid="schedule-mobile-appt-card"
				onClick={() => onSelectMobileAppt(appt)}
				role="button"
				tabIndex={0}
				aria-label={`Приём: ${fullPatientName}, ${item.startsAtLocal}, статус: ${statusTheme.label}`}
			>
				<div className={`schedule-mobile-status-stripe ${statusTheme.stripe}`} />
				<div className="schedule-mobile-card-content" data-testid={`appointment-card-clickable-${appt.id}`}>
					<ScheduleMobileCardHeader
						pName={pName}
						fullPatientName={fullPatientName}
						toothBadge={toothBadge}
						statusTheme={statusTheme}
					/>
					<div className="schedule-mobile-procedure-row">
						<span className="schedule-mobile-procedure-text">
							{appt.reason || "Первичный осмотр / консультация"}
						</span>
					</div>
					<div className="schedule-mobile-card-footer">
						<ScheduleMobileMetaChips
							chair={chair}
							doc={doc}
							balance={balance}
							allergyText={allergyText}
						/>
						<ScheduleMobileCardActions
							appt={appt}
							pat={pat}
							pName={pName}
							onQuickStatusChange={onQuickStatusChange}
							onOpenVisit={onOpenVisit}
						/>
					</div>
				</div>
			</div>
		</div>
	);
};
