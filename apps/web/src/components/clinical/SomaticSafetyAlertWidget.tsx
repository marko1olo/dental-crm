// Особенности анамнеза: спокойный amber бейдж факторов риска (Мандаты 8e, 8y)
import React from "react";
import { SomaticSafetyAlertWidgetView } from "./somaticAlert/SomaticSafetyAlertWidgetView";
import type { SomaticSafetyAlertWidgetProps } from "./somaticAlert/types";

export type { SomaticSafetyAlertWidgetProps };
export const SomaticSafetyAlertWidget: React.FC<SomaticSafetyAlertWidgetProps> = React.memo((props) => (
	<SomaticSafetyAlertWidgetView {...props} />
));
SomaticSafetyAlertWidget.displayName = "SomaticSafetyAlertWidget";
export default SomaticSafetyAlertWidget;
