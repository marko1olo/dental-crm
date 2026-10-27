import React, { useMemo } from "react";
import type { DoctorKickoffWidgetProps } from "./kickoffTypes";
import { formatDoctorGreeting, formatDailyKickoffSummary } from "./kickoffFormatters";
import { useKickoffNetworkState } from "./useKickoffNetworkState";
import { DoctorKickoffHeader } from "./DoctorKickoffHeader";
import { DoctorKickoffActions } from "./DoctorKickoffActions";

if (typeof document !== "undefined") {
	void import("../DoctorKickoffWidget.css").catch(() => {});
}

export const DoctorKickoffWidget: React.FC<DoctorKickoffWidgetProps> = ({
	doctorName,
	appointmentsCount = 0,
	isShiftOpen = true,
	isCashReady = true,
	isOffline,
	onToggleShift,
	onOpenSchedule,
	onOpenCheckout,
	className = "",
}) => {
	const { offlineMode } = useKickoffNetworkState(isOffline);

	const greeting = useMemo(
		() => formatDoctorGreeting(doctorName),
		[doctorName],
	);

	const summary = useMemo(
		() =>
			formatDailyKickoffSummary({
				appointmentsCount,
				isShiftOpen,
				isCashReady,
			}),
		[appointmentsCount, isShiftOpen, isCashReady],
	);

	return (
		<section
			className={`doctor-kickoff-widget ${className}`.trim()}
			aria-label="Утренний старт и сводка дня врача"
		>
			<DoctorKickoffHeader
				greeting={greeting}
				summary={summary}
				offlineMode={offlineMode}
			/>

			<DoctorKickoffActions
				appointmentsCount={appointmentsCount}
				isShiftOpen={isShiftOpen}
				isCashReady={isCashReady}
				onToggleShift={onToggleShift}
				onOpenSchedule={onOpenSchedule}
				onOpenCheckout={onOpenCheckout}
			/>
		</section>
	);
};
