import type React from "react";
import type { UpperIncisorContainerProps } from "../types/upperIncisorTypes";
import { Tooth12Container } from "./Tooth12Container";

export type Tooth22ContainerProps = Omit<UpperIncisorContainerProps, "toothNumber">;

/**
 * DENTE Dental CRM — Maxillary Left Lateral Incisor (FDI 22) Container
 * Bilateral horizontal mirror symmetry across midsagittal plane (x' = 100 - x, y' = y).
 * Rounded distoincisal angle and distal apical curve flip to the left in Q2.
 * Wheeler's Dental Anatomy Ch. 8, Mandate 8b <= 120 lines.
 */
export const Tooth22Container: React.FC<Tooth22ContainerProps> = (props) => {
	return <Tooth12Container toothNumber={22} {...props} />;
};
