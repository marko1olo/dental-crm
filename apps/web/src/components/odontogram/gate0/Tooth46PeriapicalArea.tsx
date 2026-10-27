import React from "react";
import { Tooth46CystOverlay } from "./Tooth46CystOverlay";
import { Tooth46ResorptionOverlay } from "./Tooth46ResorptionOverlay";
import type { PeriapicalCondition } from "./tooth46Types";

export interface Tooth46PeriapicalAreaProps {
	condition?: PeriapicalCondition | undefined;
	halo?: boolean | undefined;
	isDark?: boolean | undefined;
}

/**
 * Periapical cyst & apical root resorption overlay aggregator for Tooth 46
 * Mandate 8b <= 120 lines.
 */
export const Tooth46PeriapicalArea: React.FC<Tooth46PeriapicalAreaProps> = ({
	condition = "none",
	halo = false,
	isDark = false,
}) => (
	<>
		{condition === "resorption" && <Tooth46ResorptionOverlay isDark={isDark} />}
		{(halo || condition === "cyst") && (
			<Tooth46CystOverlay
				condition={condition === "cyst" ? "cyst" : "granuloma"}
				isDark={isDark}
			/>
		)}
	</>
);
