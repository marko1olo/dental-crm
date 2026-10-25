/**
 * DENTE Dental CRM — 1-Click Fast Checkout Math & Fiscal Receipt Payload Engine
 * Facade Module (Mandate 8b: file size strictly <= 80 lines).
 */

export {
	CHECKOUT_PAYMENT_METHODS,
	type CheckoutPaymentMethodType,
	type CheckoutPaymentMethodInfo,
} from "./fastCheckoutPresets.js";

export * from "./modules/index.js";

export {
	calculateFastCheckoutDiscount,
	type FastCheckoutDiscountPreset,
	type FastCheckoutDiscountResult,
} from "../../finance/cashboxOperations.js";

export {
	createOfflineFiscalBufferItem,
	type OfflineFiscalBufferItem,
} from "./offlineFiscalBuffer.js";
