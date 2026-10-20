import type React from "react";
import {
	Tooth31Container,
} from "./Tooth31Container";
import type { ToothLowerContainerProps } from "./toothLowerTypes";

export type Tooth41ContainerProps = Omit<ToothLowerContainerProps, "toothNumber">;

/**
 * Tooth 41 Container — Lower Right Central Incisor
 * Bilateral horizontal mirror transform across midsagittal plane (x' = 100 - x).
 * Wheeler's Dental Anatomy Ch. 9. Mandate 8b <= 120 lines.
 */
export const Tooth41Container: React.FC<Tooth41ContainerProps> = (props) => {
	return <Tooth31Container toothNumber={41} {...props} />;
};
