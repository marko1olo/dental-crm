import React from "react";
import "../../../styles/modules/mobile-shift.css";
import { useMobileShiftCockpit } from "./useMobileShiftCockpit";
import { ShiftMetricsHeader } from "./ShiftMetricsHeader";
import { MobileShiftCockpitUI } from "./MobileShiftCockpitUI";
import { ShiftActionsToolbar } from "./ShiftActionsToolbar";
import type { MobileShiftCockpitProps } from "./types";

export const MobileShiftCockpit: React.FC<MobileShiftCockpitProps> = (props) => {
	const state = useMobileShiftCockpit(props);

	return (
		<main
			className="mobile-shift-cockpit min-w-0"
			data-testid="mobile-shift-cockpit"
			aria-label="Мобильная смена врача и кассовый узел"
		>
			<ShiftMetricsHeader {...props} {...state} topbarOnly />

			<div className="mobile-shift-body">
				<ShiftMetricsHeader {...props} {...state} heroOnly />
				<MobileShiftCockpitUI {...props} {...state} />
			</div>

			<ShiftActionsToolbar {...props} {...state} />
		</main>
	);
};
