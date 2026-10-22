import React from "react";
import {
	DoctorShiftEarningsCard,
	type DoctorShiftEarningsCardProps,
} from "./cashSection/DoctorShiftEarningsCard";

export type DoctorShiftSummaryCardProps = DoctorShiftEarningsCardProps;

/**
 * DoctorShiftSummaryCard
 * Canonical standalone card for doctor clinical earnings, net payout, and shift summary.
 * Conforms to Mandates 8e, 8n (Zero-friction doctor autonomy).
 */
export const DoctorShiftSummaryCard: React.FC<DoctorShiftSummaryCardProps> = (props) => {
	return <DoctorShiftEarningsCard {...props} />;
};

export default DoctorShiftSummaryCard;
