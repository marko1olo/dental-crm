/**
 * AppViewRouter — Главный фасад маршрутизации экранов CRM (Мандат 8b, <= 120 строк).
 * Декомпозирован в подмодули apps/web/src/components/appLayout/viewRouterModules/
 */

import React from "react";
import { usePerspectiveStore } from "../../store/perspectiveStore";
import { ViewRouterContainer } from "./viewRouterModules";
import type { AppViewRouterProps } from "./types";

export function AppViewRouter(props: AppViewRouterProps) {
	const storePerspective = usePerspectiveStore((s) => s.perspective);
	const activePerspective = props.perspective ?? storePerspective;

	return <ViewRouterContainer {...props} perspective={activePerspective} />;
}
