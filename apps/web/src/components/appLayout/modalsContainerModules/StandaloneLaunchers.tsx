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
 */

import type React from "react";
import { isDemoShowcaseMode } from "../../../lib/demoMode";
import type { StandaloneLaunchersProps } from "./modalsContainerTypes";
import { renderClinicalLaunchers } from "./standalone/clinicalLaunchersRegistry";
import { renderAdministrativeLaunchers } from "./standalone/administrativeLaunchersRegistry";
import { DirectAnalyticsLauncher } from "../../analytics/DirectAnalyticsLauncher";

// Канонический ре-экспорт для модулей и SSOT-тестов
export { DirectLoyaltyLauncher } from "../../loyalty/DirectLoyaltyLauncher";
export { DirectDentalLabLauncher, DirectLabLauncher } from "../../lab/DirectLabLauncher";
export { DirectConsentLauncher } from "../../consents/DirectConsentLauncher";
export { DirectPublicBookingLauncher } from "../../booking/DirectPublicBookingLauncher";
export { DirectOrthodonticsLauncher } from "../../orthodontics/DirectOrthodonticsLauncher";
export { DirectTelephonyLauncher } from "../../telephony/DirectTelephonyLauncher";
export { DirectOdontogramLauncher } from "../../odontogram/DirectOdontogramLauncher";
export { DirectAnalyticsLauncher };

export function renderStandaloneLaunchers(
	props: StandaloneLaunchersProps,
): React.ReactElement | null {
	// Мандат 8wy: Автономные стенды строго изолированы за демонстрационным контуром или DEV-окружением
	if (!isDemoShowcaseMode() && !import.meta.env?.DEV) {
		return null;
	}

	// 0. Прямой SSOT-роут аналитики (#analytics", #dashboard")
	if (
		typeof window !== "undefined" &&
		(window.location.hash === '#analytics"' ||
			window.location.hash === '#dashboard"')
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
