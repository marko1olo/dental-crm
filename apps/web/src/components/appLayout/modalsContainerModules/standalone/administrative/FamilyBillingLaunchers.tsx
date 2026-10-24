/**
 * FamilyBillingLaunchers — Семейный кошелек и сводный биллинг (Мандат 8b, <= 120 строк).
 *
 * Тонкий URL-роутер: семейная группа и баланс приходят из базы по ?patientId=
 * через StandaloneFamilyBillingLauncherHost. Никаких вбитых семей и сумм.
 */

import type React from "react";
import { StandaloneFamilyBillingLauncherHost } from "./StandaloneFamilyBillingLauncherHost";
import { clearUrlTokens, hasUrlToken } from "../deepLinkUrl";

export function renderFamilyBillingLaunchers(): React.ReactElement | null {
	if (!hasUrlToken(["family_billing", "family-billing"])) return null;

	return (
		<StandaloneFamilyBillingLauncherHost
			onClose={() => clearUrlTokens(["family_billing"], ["family-billing"])}
		/>
	);
}
