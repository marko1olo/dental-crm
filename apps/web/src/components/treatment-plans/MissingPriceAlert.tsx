/**
 * MissingPriceAlert.tsx — Фасад предупреждения и оценки услуг с отсутствующей ценой.
 * Делегирует исполнение консолидированному хабу MissingPriceAlertHub.tsx.
 */

import React from "react";
import {
	MissingPriceAlertHub,
	type MissingPriceAlertProps,
} from "./MissingPriceAlertHub";

export * from "./MissingPriceAlertHub";

export const MissingPriceAlert: React.FC<MissingPriceAlertProps> = (props) => {
	return <MissingPriceAlertHub {...props} />;
};

export default MissingPriceAlert;
