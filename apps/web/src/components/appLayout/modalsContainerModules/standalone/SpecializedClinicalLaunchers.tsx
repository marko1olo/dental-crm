/**
 * SpecializedClinicalLaunchers — Фасад специализированных клинических лаунчеров (Мандат 8b, <= 120 строк).
 * Декомпозирован по направлениям: терапия, ортопедия, имплантация, ортодонтия, хирургия.
 */

import type React from "react";
import { isDemoShowcaseMode } from "../../../../lib/demoMode";
import type { StandaloneLaunchersProps } from "../modalsContainerTypes";
import { renderTherapyLaunchers } from "./clinical/TherapyLaunchers";
import { renderImplantologyLaunchers } from "./clinical/ImplantologyLaunchers";
import { renderOrthodonticsLaunchers } from "./clinical/OrthodonticsLaunchers";
import { renderSurgeryLaunchers } from "./clinical/SurgeryLaunchers";
import { renderOrthopedicsLaunchers } from "./clinical/OrthopedicsLaunchers";

export function renderSpecializedClinicalLaunchers(
	props: StandaloneLaunchersProps,
): React.ReactElement | null {
	if (!isDemoShowcaseMode() && !import.meta.env?.DEV) {
		return null;
	}

	// 1. Хирургия и неотложная помощь (ИДС, SOS, фотопротокол)
	const surgery = renderSurgeryLaunchers(props);
	if (surgery) return surgery;

	// 2. Имплантология и КЛКТ (паспорт, 3D MPR, тюнер, КТ-селектор)
	const implantology = renderImplantologyLaunchers(props);
	if (implantology) return implantology;

	// 3. Ортодонтия (ТРГ цефалометрия, ОПТГ AI, орто-фото)
	const orthodontics = renderOrthodonticsLaunchers(props);
	if (orthodontics) return orthodontics;

	// 4. Терапия (гигиена, пародонтограмма, анамнез, реколлы)
	const therapy = renderTherapyLaunchers();
	if (therapy) return therapy;

	// 5. Ортопедия (презентация плана лечения)
	const orthopedics = renderOrthopedicsLaunchers();
	if (orthopedics) return orthopedics;

	return null;
}
