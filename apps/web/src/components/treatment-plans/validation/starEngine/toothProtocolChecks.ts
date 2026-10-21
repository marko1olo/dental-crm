import type { TreatmentPlanItem } from "../../types";
import { checkEndoToothProtocol } from "./endoProtocolChecks";
import { checkImplantAndPediatricProtocols } from "./implantAndPediatricChecks";
import type { StarProtocolRuleCheck } from "./types";

export function checkToothStarProtocols(
	toothNum: number,
	toothItems: readonly TreatmentPlanItem[],
	hasCTDiagnostics: boolean,
): StarProtocolRuleCheck[] {
	return [
		...checkEndoToothProtocol(toothNum, toothItems),
		...checkImplantAndPediatricProtocols(toothNum, toothItems, hasCTDiagnostics),
	];
}
