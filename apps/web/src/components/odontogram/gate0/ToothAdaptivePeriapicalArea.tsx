import type React from "react";
import { ToothPeriapicalCyst } from "./ToothPeriapicalCyst";
import { ToothPeriapicalGranuloma } from "./ToothPeriapicalGranuloma";
import type { PeriapicalCondition } from "./tooth46Types";

export interface ApexPoint {
	x: number;
	y: number;
	r?: number | undefined;
}

export interface ToothAdaptivePeriapicalAreaProps {
	apices: readonly ApexPoint[];
	condition?: PeriapicalCondition | undefined;
	halo?: boolean | undefined;
	isDark?: boolean | undefined;
	toothId?: string | undefined;
	className?: string | undefined;
}

/**
 * Universal adaptive periapical pathology component for teeth 44..48.
 * Renders granuloma halos, radicular cysts, or apical root resorption
 * strictly aligned to each root's true anatomical apex.
 * Mandate 8b: <= 120 lines.
 */
export const ToothAdaptivePeriapicalArea: React.FC<
	ToothAdaptivePeriapicalAreaProps
> = ({
	apices,
	condition = "none",
	halo = false,
	isDark = false,
	toothId,
	className,
}) => {
	if (condition === "none" && !halo) return null;

	if (condition === "resorption" || condition === "cyst") {
		return (
			<ToothPeriapicalCyst
				apices={apices}
				condition={condition}
				isDark={isDark}
				toothId={toothId}
				className={className}
			/>
		);
	}

	return (
		<ToothPeriapicalGranuloma
			apices={apices}
			toothId={toothId}
			className={className}
		/>
	);
};
