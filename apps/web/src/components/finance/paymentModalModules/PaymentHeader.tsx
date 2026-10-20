/**
 * apps/web/src/components/finance/paymentModalModules/PaymentHeader.tsx
 *
 * Layer 4: Payment Header & Mobile Hero Cockpit Facade.
 * Governed by Mandate 8b (<=120 lines) & Mandate 8d (Studio HIG).
 */

import React from "react";
import type { PaymentHeaderProps } from "./types.js";
import { PaymentHeaderMobile } from "./PaymentHeaderMobile.js";
import { PaymentHeaderDesktop } from "./PaymentHeaderDesktop.js";
import { PaymentHeroDominant } from "./PaymentHeroDominant.js";

export const PaymentHeader: React.FC<PaymentHeaderProps> = (props) => {
	const { mobileTab, setMobileTab, onClose, discountsHook, rawTotalDueRub, patientName, patientPhone } = props;

	return (
		<>
			<PaymentHeaderMobile mobileTab={mobileTab} setMobileTab={setMobileTab} onClose={onClose} />
			<PaymentHeaderDesktop {...props} />
			{mobileTab === "checkout" && (
				<PaymentHeroDominant
					discountsHook={discountsHook}
					rawTotalDueRub={rawTotalDueRub}
					patientName={patientName}
					patientPhone={patientPhone}
				/>
			)}
		</>
	);
};
