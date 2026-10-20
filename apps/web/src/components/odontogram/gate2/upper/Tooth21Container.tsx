import type React from "react";
import type { UpperIncisorContainerProps } from "../types/upperIncisorTypes";
import { Tooth11Container } from "./Tooth11Container";

export type Tooth21ContainerProps = Omit<UpperIncisorContainerProps, "toothNumber">;

/**
 * DENTE Dental CRM — Maxillary Left Central Incisor (FDI 21) Container
 * Bilateral horizontal mirror symmetry across midsagittal plane (x' = 100 - x, y' = y).
 * Sharp mesioincisal angle flips to the right (towards midline x=100 in Q2),
 * rounded distoincisal angle flips to the left.
 * Wheeler's Dental Anatomy Ch. 8, Mandate 8b <= 120 lines.
 */
export const Tooth21Container: React.FC<Tooth21ContainerProps> = (props) => {
	return <Tooth11Container toothNumber={21} {...props} />;
};
