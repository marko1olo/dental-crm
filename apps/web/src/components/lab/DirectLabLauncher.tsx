/**
 * apps/web/src/components/lab/DirectLabLauncher.tsx
 *
 * DENTE Dental CRM — Канонический фасад автономного лаунчера зуботехнической студии.
 * Ре-экспортирует канонический SSOT из ./DirectDentalLabLauncher.tsx (Мандаты 8b: Sweet Spot, 8aq, 8am).
 */

export * from "./DirectDentalLabLauncher";
export {
	DirectDentalLabLauncher as default,
	DirectDentalLabLauncher as DirectLabLauncher,
} from "./DirectDentalLabLauncher";
