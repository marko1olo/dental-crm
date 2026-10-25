import type { CephalometricAnalysisResult } from "../cephalometricMath";
import type { TorqueRecommendation } from "./cephStudioTypes";

export function getTorqueRecommendation(analysis: CephalometricAnalysisResult): TorqueRecommendation | null {
	const u1SnVal = analysis.measurements.find((m) => m.id === "U1-SN")?.value;
	if (u1SnVal === null || u1SnVal === undefined) return null;
	if (u1SnVal > 106) {
		return { type: "Low Torque (Низкий торк)", reason: "Проклинация резцов (>106°): предотвращение веерообразного наклона" };
	}
	if (u1SnVal < 102) {
		return { type: "High Torque (Высокий торк)", reason: "Ретроклинация резцов (<102°): активное корпусное движение корней" };
	}
	return { type: "Standard Torque (Стандартный торк)", reason: "Наклон резцов в пределах анатомической нормы (102°..106°)" };
}
