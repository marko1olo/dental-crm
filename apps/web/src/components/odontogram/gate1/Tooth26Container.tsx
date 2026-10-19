import type React from "react";
import {
	Tooth16Container,
	type Tooth16ContainerProps,
} from "./Tooth16Container";

export type Tooth26ContainerProps = Omit<Tooth16ContainerProps, "toothNumber">;

/**
 * DENTE Dental CRM — Monolithic Sculpture Container for Upper Left Molar 26
 * Bilateral horizontal mirror transform across midsagittal plane (x' = 100 - x, y' = y).
 * In Tooth 26 (Q2), mesial anatomy (Carabelli, ML/MB cusps) flips to the right (midline),
 * distal anatomy flips to the left, and Palatal root remains centered at x=50.
 * Mandate 8b <= 120 lines.
 */
export const Tooth26Container: React.FC<Tooth26ContainerProps> = (props) => {
	return <Tooth16Container toothNumber={26} {...props} />;
};
