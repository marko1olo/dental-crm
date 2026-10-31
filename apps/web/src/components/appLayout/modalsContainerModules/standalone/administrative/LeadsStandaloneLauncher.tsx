/**
 * apps/web/src/components/appLayout/modalsContainerModules/standalone/administrative/LeadsStandaloneLauncher.tsx
 *
 * Standalone лончер воронки первичных обращений и лидов CRM (?leads=1, #leads, #crm-leads, #kanban).
 * Мандат 8aq: Монтирование в живой UI. Мандат 8b: строго <= 50 строк.
 */

import React from "react";
import { DirectLeadsLauncher, evaluateLeadsDeepLink } from "../../../../leads/DirectLeadsLauncher";

export function renderLeadsStandaloneLauncher(): React.ReactElement | null {
	if (!evaluateLeadsDeepLink()) return null;
	return <DirectLeadsLauncher />;
}

export const DirectLeadsStandaloneLauncher: React.FC = () => {
	return renderLeadsStandaloneLauncher();
};

export default DirectLeadsStandaloneLauncher;
