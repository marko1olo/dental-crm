import React from "react";
import { DoctorPieceRateCalculatorSection } from "../owner/DoctorPieceRateCalculatorSection";

export interface DoctorMotivationCalculatorProps {
	readonly defaultTherapyRate?: number;
	readonly defaultOrthoRate?: number;
	readonly defaultSurgeryRate?: number;
	readonly defaultHygieneRate?: number;
}

/**
 * DoctorMotivationCalculator: Canonical piece-rate motivation and payout calculator.
 * SSOT delegates directly to DoctorPieceRateCalculatorSection per Mandate 8s (Anti-bloat, Best of Breed SSOT).
 * Strictly complies with Mandates 8b (<=800 lines), 8d (zero emojis).
 */
export const DoctorMotivationCalculator: React.FC<
	DoctorMotivationCalculatorProps
> = () => {
	return <DoctorPieceRateCalculatorSection />;
};
