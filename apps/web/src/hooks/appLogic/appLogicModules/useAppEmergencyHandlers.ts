import type { Dashboard, Patient } from "@dental/shared";
import { useMemo } from "react";
import type { AppLogicEmergencyTriage } from "./appLogicStateTypes";

export interface UseAppEmergencyHandlersProps {
	dashboard: Dashboard | null | undefined;
	documentPatient?: Patient | null;
	setCurrentView?: any;
	setSelectedPatientId?: any;
}

export const CRITICAL_ALLERGEN_PATTERNS = [
	/пенициллин/i,
	/лидокаин/i,
	/новокаин/i,
	/латекс/i,
	/сульфаниламид/i,
	/анафилак/i,
	/отек квинке/i,
];

/**
 * Хук триажа экстренных состояний, аллергического статуса и CITO-приёма (Layer 3).
 * Строго соблюдает Мандаты 8e и 8z: аллергии и риски формируются как пассивные
 * информационные предупреждения (⚠️), не блокируя работу врача и сохранение данных.
 */
export function useAppEmergencyHandlers({
	dashboard,
	documentPatient,
}: UseAppEmergencyHandlersProps): AppLogicEmergencyTriage {
	return useMemo(() => {
		const rawAnamnesis =
			(documentPatient?.administrativeProfile as any)?.medicalNotes ??
			(documentPatient as any)?.notes ??
			"";

		const criticalAllergies: string[] = [];
		for (const pattern of CRITICAL_ALLERGEN_PATTERNS) {
			const match = rawAnamnesis.match(pattern);
			if (match) {
				criticalAllergies.push(match[0]);
			}
		}

		const hasCriticalAllergy = criticalAllergies.length > 0;

		const activeVisit = dashboard?.activeVisit;
		const visitNotes =
			activeVisit?.complaint ||
			activeVisit?.doctorSummary ||
			(activeVisit as any)?.notes ||
			"";
		const isCitoVisit = Boolean(
			visitNotes.toLowerCase().includes("cito") ||
				visitNotes.toLowerCase().includes("острая боль"),
		);

		const hasAcutePain = Boolean(
			rawAnamnesis.toLowerCase().includes("острая боль") || isCitoVisit,
		);

		const emergencyTriageSeverity: "critical" | "warning" | "normal" =
			hasCriticalAllergy
				? "critical"
				: isCitoVisit || hasAcutePain
					? "warning"
					: "normal";

		const emergencyBannerText = hasCriticalAllergy
			? `Критическая аллергия: ${criticalAllergies.join(", ")}`
			: isCitoVisit
				? "Экстренный приём (CITO): острая боль"
				: null;

		return {
			hasCriticalAllergy,
			criticalAllergies,
			isCitoVisit,
			hasAcutePain,
			emergencyTriageSeverity,
			emergencyBannerText,
		};
	}, [dashboard?.activeVisit, documentPatient]);
}
