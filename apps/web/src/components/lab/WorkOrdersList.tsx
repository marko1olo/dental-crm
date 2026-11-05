/**
 * apps/web/src/components/lab/WorkOrdersList.tsx
 *
 * DENTE Dental CRM — Канонический фасад списка нарядов зуботехнической лаборатории.
 * Ре-экспортирует DentalLabOrdersView (Мандаты 8b, 8aq).
 */

export * from "./DentalLabOrdersView";
export {
	DentalLabOrdersView as default,
	DentalLabOrdersView as WorkOrdersList,
} from "./DentalLabOrdersView";
