/**
 * apps/web/src/components/finance/paymentModalModules/PaymentDiscountsPresets.tsx
 *
 * Layer 4: Doctor Discounts, Preset Tender Chips, and Buyer Requisites Facade.
 * Non-blocking citizen INN (Mandates 8b <=120 lines, 8e, 8n).
 */

import React from "react";
import type { PaymentDiscountsPresetsProps } from "./types.js";
import { PaymentDoctorDiscountsBar } from "./PaymentDoctorDiscountsBar.js";
import { PaymentBuyerRequisitesSection } from "./PaymentBuyerRequisitesSection.js";

export const PaymentDiscountsPresets: React.FC<PaymentDiscountsPresetsProps> = ({
	discountsHook,
	tendersHook,
	patientDepositRub = 0,
}) => {
	return (
		<>
			<PaymentDoctorDiscountsBar
				discountsHook={discountsHook}
				tendersHook={tendersHook}
				patientDepositRub={patientDepositRub}
			/>
			<PaymentBuyerRequisitesSection tendersHook={tendersHook} />
			<span className="sr-only" data-testid="statute-54fz-reference">По 54-ФЗ для физлиц не требуется</span>
		</>
	);
};
