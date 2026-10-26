import React from "react";
import type {
	DentalHealthIndexResult,
	PatientCabinetSummary,
	PatientInvoiceItem,
	PatientPersonalCabinetData,
} from "../../patientCabinetEngine";
import type { PatientCabinetTab } from "../../modal/types.js";
import { OverviewStatusHero } from "./OverviewStatusHero";
import { OverviewQuickActions } from "./OverviewQuickActions";
import { OverviewNextAppointmentCard } from "./OverviewNextAppointmentCard";
import { OverviewAlertsAndHealth } from "./OverviewAlertsAndHealth";
import { OverviewSomaticCard } from "./OverviewSomaticCard";
import { OverviewSummaryGrid } from "./OverviewSummaryGrid";
import { getAppointmentCalendarDates } from "./overviewDates";

export { getAppointmentCalendarDates };

export interface OverviewTabProps {
	readonly data: PatientPersonalCabinetData;
	readonly summary: PatientCabinetSummary;
	readonly healthIndex: DentalHealthIndexResult;
	readonly nextApptCountdown: string | null;
	readonly onOpenTab: (tab: PatientCabinetTab) => void;
	readonly onOpenReceptionQr: () => void;
	readonly onOpenCareMemo: () => void;
	readonly onOpenSbpForInvoice: (inv: PatientInvoiceItem) => void;
	readonly onOpenSelfCheckin: () => void;
	readonly onOpenBooking?: () => void;
	readonly onOpenReschedule?: () => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
	data,
	summary,
	healthIndex,
	nextApptCountdown,
	onOpenTab,
	onOpenReceptionQr,
	onOpenCareMemo,
	onOpenSbpForInvoice,
	onOpenSelfCheckin,
	onOpenBooking,
	onOpenReschedule,
}) => {
	const firstUnpaid = data.invoices.find(
		(i) => i.status === "unpaid" || i.status === "partially_paid",
	);

	return (
		<div className="pc-tab-content-container" data-testid="pc-overview-tab">
			<OverviewStatusHero data={data} />
			<OverviewQuickActions
				summary={summary}
				firstUnpaid={firstUnpaid}
				onOpenBooking={onOpenBooking}
				onOpenSbpForInvoice={onOpenSbpForInvoice}
				onOpenTab={onOpenTab}
				onOpenCareMemo={onOpenCareMemo}
				onOpenReceptionQr={onOpenReceptionQr}
			/>
			{summary.nextAppointment && (
				<OverviewNextAppointmentCard
					appt={summary.nextAppointment}
					countdown={nextApptCountdown}
					onOpenSelfCheckin={onOpenSelfCheckin}
					onOpenReceptionQr={onOpenReceptionQr}
					onOpenReschedule={onOpenReschedule}
				/>
			)}
			<OverviewAlertsAndHealth
				summary={summary}
				healthIndex={healthIndex}
				firstUnpaid={firstUnpaid}
				onOpenReceptionQr={onOpenReceptionQr}
				onOpenTab={onOpenTab}
				onOpenSbpForInvoice={onOpenSbpForInvoice}
			/>
			<OverviewSomaticCard data={data} onOpenSelfCheckin={onOpenSelfCheckin} />
			<OverviewSummaryGrid summary={summary} />
		</div>
	);
};

export default OverviewTab;
