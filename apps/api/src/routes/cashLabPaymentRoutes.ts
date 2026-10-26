/**
 * @file cashLabPaymentRoutes.ts
 * @description Backward compatibility facade for Dental Lab Order Cashbox Payment & Installed Lock Routes.
 * Fully consolidated into SSOT ./labOrders.js and ./lab/paymentModules/.
 */

export {
	registerCashLabPaymentRoutes,
	registerLabPaymentRoutes,
	labOrderPayHandler,
	labOrderMarkInstalledHandler,
	executeLabOrderPayment,
	executeLabOrderMarkInstalled,
} from "./lab/index.js";
