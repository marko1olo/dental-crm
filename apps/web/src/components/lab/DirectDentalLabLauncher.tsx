/**
 * apps/web/src/components/lab/DirectDentalLabLauncher.tsx
 *
 * DENTE Dental CRM — Канонический фасад лаунчера зуботехнической студии.
 * Ре-экспортирует канонический лаунчер из ./DirectLabLauncher.tsx (Мандаты 8b: Sweet Spot, 8aq, 8am).
 */

export * from "./DirectLabLauncher";
export {
	DirectLabLauncher as default,
	DirectLabLauncher as DirectDentalLabLauncher,
	DirectLabLauncher as DirectDentalLabOrderLauncher,
} from "./DirectLabLauncher";
