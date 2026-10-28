/**
 * MissingPriceAlertHub.tsx — Фасад хаба инлайн-оценки стоимости услуг.
 * Делегирует исполнение каноническому MissingPriceAlert (Мандат 8b).
 */

import React from "react";
import { MissingPriceAlert, type MissingPriceAlertProps } from "./MissingPriceAlert";

export { MissingPriceAlert, type MissingPriceAlertProps };
export const MissingPriceAlertHub: React.FC<MissingPriceAlertProps> = (props) => {
	return <MissingPriceAlert {...props} />;
};

export default MissingPriceAlertHub;
