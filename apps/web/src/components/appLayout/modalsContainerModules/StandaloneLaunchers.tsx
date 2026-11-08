/**
 * Standalone Launchers Hub — Канонический координатор и фасад автономных глубоких ссылок (<= 120 строк).
 * Мандаты 8b (Sweet Spot <= 120 строк), 8e (Автономия врача), 8aq (Монтирование в живой UI), 8wy (Изоляция демо/прод).
 *
 * SSOT Deep Link Маршруты и монтируемые лончеры:
 * - #loyalty, ?loyalty=1: DirectLoyaltyLauncher
 * - #telephony, ?telephony=1: DirectTelephonyLauncher
 * - #odontogram, ?odontogram=1: DirectOdontogramLauncher
 * - #orthodontics, #ortho-protocol: DirectOrthodonticsLauncher
 * - #lab, #dental-lab: DirectDentalLabLauncher (<DirectDentalLabLauncher />)
 * - #consents, ?consents=1: DirectConsentLauncher
 * - #booking, #online-booking: DirectPublicBookingLauncher
 * - #analytics", #dashboard": DirectAnalyticsLauncher
 * - #endo, ?endo=1, #root-canals: DirectEndodonticsLauncher
 */

import type React from "react";
import { isDemoShowcaseMode } from "../../../lib/demoMode";
import type { StandaloneLaunchersProps } from "./modalsContainerTypes";
import { renderClinicalLaunchers } from "./standalone/clinicalLaunchersRegistry";
import { renderAdministrativeLaunchers } from "./standalone/administrativeLaunchersRegistry";
import { DirectAnalyticsLauncher } from "../../analytics/DirectAnalyticsLauncher";

// Канонический ре-экспорт для модулей и SSOT-тестов
export { DirectLoyaltyLauncher } from "../../loyalty/DirectLoyaltyLauncher";
export { DirectDentalLabLauncher, DirectLabLauncher } from "../../lab/DirectDentalLabLauncher";
export { DirectConsentLauncher } from "../../consents/DirectConsentLauncher";
export { DirectUkepSigningLauncher } from "../../documents/ukep/DirectUkepSigningLauncher";
export { DirectPublicBookingLauncher } from "../../booking/DirectPublicBookingLauncher";
export { DirectOrthodonticsLauncher } from "../../orthodontics/DirectOrthodonticsLauncher";
export { DirectTelephonyLauncher } from "../../telephony/DirectTelephonyLauncher";
export { DirectOdontogramLauncher } from "../../odontogram/DirectOdontogramLauncher";
export { DirectEndodonticsLauncher } from "../../endo/DirectEndodonticsLauncher";
export { DirectLeadsLauncher } from "../../leads/DirectLeadsLauncher";
export { DirectSettingsLauncher } from "../../settings/DirectSettingsLauncher";
export { DirectAnalyticsLauncher };

export function renderStandaloneLaunchers(
	props: StandaloneLaunchersProps,
): React.ReactElement | null {
	// Мандат 8wy: Автономные стенды строго изолированы за демонстрационным контуром или DEV-окружением
	const isStandOrDemo =
		typeof window !== "undefined" &&
		(window.location.search.includes("stand=") ||
			window.location.search.includes("demo=true") ||
			window.location.hash.includes("capture") ||
			window.location.hash.includes("rvg"));

	if (!isStandOrDemo && !isDemoShowcaseMode() && !import.meta.env?.DEV) {
		return null;
	}

	// 0. Автономная модальная студия аналитики руководителя (#executive-studio)
	// Основные маршруты #analytics и #dashboard обрабатываются чисто через ManagementViewRouter
	if (
		typeof window !== "undefined" &&
		(window.location.hash === "#executive-studio" ||
			window.location.hash.startsWith("#executive-studio") ||
			window.location.search.includes("executive_studio=1") ||
			window.location.search.includes("analytics=studio"))
	) {
		return <DirectAnalyticsLauncher />;
	}

	// 1. Клинические лончеры (визиты, одонтограмма, визиограф, эндодонтия, ортопедия, хирургия, согласия)
	const clinicalLauncher = renderClinicalLaunchers(props);
	if (clinicalLauncher) {
		return clinicalLauncher;
	}

	// 2. Административные и финансовые лончеры (касса, склад, расписание, телефония, лаборатория, лояльность, бронирование, отчеты)
	const administrativeLauncher = renderAdministrativeLaunchers(props);
	if (administrativeLauncher) {
		return administrativeLauncher;
	}

	return null;
}
