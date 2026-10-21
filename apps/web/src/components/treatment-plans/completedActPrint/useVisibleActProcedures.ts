/**
 * apps/web/src/components/treatment-plans/completedActPrint/useVisibleActProcedures.ts
 *
 * Разделение процедур акта на основные манипуляции и микро-расходники.
 */

import React from "react";
import { isMicroConsumable } from "../TreatmentPlanPresenterModal";
import type { TreatmentPlanItem } from "../types";

export function useVisibleActProcedures(
	completedProcedures: readonly TreatmentPlanItem[],
	showMicroConsumables: boolean,
) {
	return React.useMemo(() => {
		const regular = completedProcedures.filter((it) => !isMicroConsumable(it));
		const micro = completedProcedures.filter((it) => isMicroConsumable(it));
		return {
			visibleProcedures: showMicroConsumables ? completedProcedures : regular,
			microConsumables: micro,
		};
	}, [completedProcedures, showMicroConsumables]);
}
