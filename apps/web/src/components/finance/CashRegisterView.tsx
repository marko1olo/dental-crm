/**
 * apps/web/src/components/finance/CashRegisterView.tsx
 *
 * DENTE Dental CRM — Canonical 54-FZ Cash Register & Shift Workspace View.
 *
 * Provides a canonical export point for the Cash Register Cockpit in the finance module,
 * bridging CashboxView and CashRegisterDrawer for seamless end-to-end receipting.
 */

import React from "react";
import { CashboxView, type CashboxViewProps } from "../cashbox/CashboxView.js";

export type CashRegisterViewProps = CashboxViewProps;

export const CashRegisterView: React.FC<CashRegisterViewProps> = (props) => {
	return <CashboxView {...props} />;
};

export default CashRegisterView;
export { CashboxView };
export type { CashboxViewProps };
