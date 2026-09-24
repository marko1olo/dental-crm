/**
 * apps/web/src/components/finance/CashRegisterModal.tsx
 *
 * DENTE Dental CRM — 54-FZ Cash Register Modal Facade for Solo Doctor & Small Clinic.
 * Canonical implementation lives in FastCheckoutModal.tsx per Wave 199 / Wave 310.
 *
 * Governed by:
 * - Mandate 8e: Doctor & Cashier Autonomy (No obstacles, zero INN required for physical persons, 1-click split).
 * - Mandate 8b: Integer kopecks precision without float drift.
 * - Mandate 8n: Solo Doctor & Small Clinic Sovereignty (Zero dead-ends).
 */

import React from "react";
import { FastCheckoutModal, type FastCheckoutModalProps } from "./FastCheckoutModal";

export type CashRegisterModalProps = FastCheckoutModalProps;

export const CashRegisterModal: React.FC<CashRegisterModalProps> = (props) => {
	return <FastCheckoutModal {...props} />;
};

export default CashRegisterModal;
export { FastCheckoutModal };
export type { FastCheckoutModalProps };
