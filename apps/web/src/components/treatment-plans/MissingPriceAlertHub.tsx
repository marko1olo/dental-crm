/**
 * MissingPriceAlertHub.tsx — фасад хаба предупреждений и оценки услуг без цены.
 * Декомпозирован по Мандату 8b (все файлы <= 120 строк).
 */

import React from "react";
import { MissingPriceAlertHubView } from "./missingPriceHub/MissingPriceAlertHubView";
import type { MissingPriceAlertProps } from "./missingPriceHub/types";

export * from "./missingPriceHub";

export const MissingPriceAlertHub: React.FC<MissingPriceAlertProps> = (props) => {
	return <MissingPriceAlertHubView {...props} />;
};

export default MissingPriceAlertHub;
