import type React from "react";
import {
	Tooth32Container,
} from "./Tooth32Container";
import type { ToothLowerContainerProps } from "./toothLowerTypes";

export type Tooth42ContainerProps = Omit<ToothLowerContainerProps, "toothNumber">;

/**
 * Tooth 42 Container — Lower Right Lateral Incisor
 * Bilateral horizontal mirror transform across midsagittal plane (x' = 100 - x).
 * Wheeler's Dental Anatomy Ch. 9. Mandate 8b <= 120 lines.
 */
export const Tooth42Container: React.FC<Tooth42ContainerProps> = (props) => {
	return <Tooth32Container toothNumber={42} {...props} />;
};
