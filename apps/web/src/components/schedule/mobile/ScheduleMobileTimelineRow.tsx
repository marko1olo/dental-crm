import type { Appointment, Dashboard } from "@dental/shared";
import { ChevronRight as ChevronRightIcon } from "lucide-react";
import type React from "react";
import { formatPatientDisplayFio } from "../appointmentCardHelpers";
import type { QuickBookingSlotInfo } from "../QuickBookingDrawer";
import { ScheduleMobileCardActions } from "./ScheduleMobileCardActions";
import { ScheduleMobileGapRow } from "./ScheduleMobileGapRow";
import { ScheduleMobileMetaChips } from "./ScheduleMobileMetaChips";
import {
	extractToothBadge,
	getStatusTheme,
	resolveMobileAllergyBadge,
	type TimelineItem,
} from "./scheduleMobileAgendaTypes";

export interface ScheduleMobileTimelineRowProps {
	item: TimelineItem;
	effectiveDateKey: string;
	selectedDoctorId: string | null;
	selectedChairId: string | null;
	dashboard: Dashboard;
	patientName: (patients: any[], id: string | null) => string;
	appointmentLabels: Record<Appointment["status"], string>;
	onSlotClick?: ((slot: QuickBookingSlotInfo) => void) | undefined;
	onSelectMobileAppt: (appt: Appointment) => void;
	onQuickStatusChange?:
		| ((appointmentId: string, status: Appointment["status"]) => void)
		| undefined;
	onOpenVisit?: ((appointment?: Appointment) => void) | undefined;
}

export const ScheduleMobileTimelineRow: React.FC<
	ScheduleMobileTimelineRowProps
> = ({
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
	const fullPatientName = patientName(
		dashboard?.patients ?? [],
		appt.patientId,
	);
	const pName = formatPatientDisplayFio(fullPatientName);
	const doc = dashboard?.clinicSettings?.staff?.find(
		(s: any) => s.id === appt.doctorUserId,
	);
	const chair = dashboard?.clinicSettings?.chairs?.find(
		(c: any) => c.id === appt.chairId,
	);
	const statusTheme = getStatusTheme(appt.status, appointmentLabels);
	const toothBadge = extractToothBadge(appt);
	const allergyText = resolveMobileAllergyBadge(appt, pat);
	const rawBal = pat?.balanceRub ?? (pat as any)?.balance;
	const balance =
		rawBal !== undefined &&
		rawBal !== null &&
		rawBal !== "" &&
		Number.isFinite(Number(rawBal))
			? Number(rawBal)
			: null;

	return (
		<div className="schedule-mobile-appt-row">
			<div className="schedule-mobile-time-col">
				<span className="schedule-mobile-time-start">{item.startsAtLocal}</span>
				<span className="schedule-mobile-time-end">– {item.endsAtLocal}</span>
				<span className="schedule-mobile-time-duration">
					{item.durationMinutes} мин
				</span>
			</div>

			<div
				className="schedule-mobile-card"
				data-testid="schedule-mobile-appt-card"
				onClick={() => onSelectMobileAppt(appt)}
				role="button"
				tabIndex={0}
				aria-label={`Приём: ${fullPatientName}, ${item.startsAtLocal}, статус: ${statusTheme.label}`}
			>
				<div
					className={`schedule-mobile-status-stripe ${statusTheme.stripe}`}
				/>

				<div
					className="schedule-mobile-card-content"
					data-testid={`appointment-card-clickable-${appt.id}`}
				>
					<div className="schedule-mobile-card-header">
						<div className="schedule-mobile-patient-group">
							<span
								className="schedule-mobile-patient-name"
								title={fullPatientName}
							>
								{pName}
							</span>
							{toothBadge && (
								<span className="schedule-mobile-tooth-badge">
									{toothBadge}
								</span>
							)}
						</div>
						<div className="schedule-mobile-header-end">
							<span
								className={`schedule-mobile-status-badge ${statusTheme.badgeBg}`}
							>
								{statusTheme.label}
							</span>
							<ChevronRightIcon
								size={18}
								className="text-[var(--muted,#64748b)] shrink-0"
							/>
						</div>
					</div>

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
