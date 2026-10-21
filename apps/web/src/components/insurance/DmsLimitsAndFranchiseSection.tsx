/**
 * DmsLimitsAndFranchiseSection.tsx — Секция лимитов покрытия, франшизы и статуса гарантийного письма ДМС.
 * (Мандат 8b: <= 120 строк)
 */

import { Calculator } from "lucide-react";
import React, { useId } from "react";
import type { DmsLetterLifecycleStatus } from "./dmsGuaranteeLetter/types.js";
import {
	DmsCoverageLimitsGrid,
	DmsFranchiseAndStatusGrid,
} from "./dmsLimitsAndFranchise/index.js";

export {
	DmsCoverageLimitsGrid,
	DmsFranchiseAndStatusGrid,
} from "./dmsLimitsAndFranchise/index.js";

export interface DmsLimitsAndFranchiseSectionProps {
	readonly maxCoverageRub: number;
	readonly usedAmountRub: number;
	readonly remainingLimitRub: number;
	readonly franchiseType: "percent" | "fixed_rub";
	readonly franchisePct: number;
	readonly franchiseFixedRub: number;
	readonly status: DmsLetterLifecycleStatus;
	readonly onMaxCoverageChange: (val: number) => void;
	readonly onUsedAmountChange: (val: number) => void;
	readonly onFranchiseTypeChange: (val: "percent" | "fixed_rub") => void;
	readonly onFranchisePctChange: (val: number) => void;
	readonly onFranchiseFixedRubChange: (val: number) => void;
	readonly onStatusChange: (val: DmsLetterLifecycleStatus) => void;
}

export function DmsLimitsAndFranchiseSection(props: DmsLimitsAndFranchiseSectionProps) {
	const maxCoverageInputId = useId();
	const usedAmountInputId = useId();
	const franchiseTypeSelectId = useId();
	const franchiseValueInputId = useId();
	const statusSelectId = useId();

	return (
		<div className="dms-card">
			<h3 className="dms-card-title">
				<Calculator size={18} className="text-emerald-600" />
				2. Лимиты страхового покрытия и франшиза (Copay)
			</h3>
			<DmsCoverageLimitsGrid
				maxCoverageRub={props.maxCoverageRub}
				usedAmountRub={props.usedAmountRub}
				remainingLimitRub={props.remainingLimitRub}
				onMaxCoverageChange={props.onMaxCoverageChange}
				onUsedAmountChange={props.onUsedAmountChange}
				maxCoverageInputId={maxCoverageInputId}
				usedAmountInputId={usedAmountInputId}
			/>
			<DmsFranchiseAndStatusGrid
				franchiseType={props.franchiseType}
				franchisePct={props.franchisePct}
				franchiseFixedRub={props.franchiseFixedRub}
				status={props.status}
				onFranchiseTypeChange={props.onFranchiseTypeChange}
				onFranchisePctChange={props.onFranchisePctChange}
				onFranchiseFixedRubChange={props.onFranchiseFixedRubChange}
				onStatusChange={props.onStatusChange}
				franchiseTypeSelectId={franchiseTypeSelectId}
				franchiseValueInputId={franchiseValueInputId}
				statusSelectId={statusSelectId}
			/>
		</div>
	);
}
