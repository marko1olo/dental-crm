/**
 * DentalLabOrdersView Facade for Dental Lab SSOT in components/lab/
 *
 * Clinical treatment plan stage binding invariants (visitDentalLabOrderHandoff contract):
 * - Table orders rendering: {order.stageNumber ? <span>Этап {order.stageNumber}</span> : null}
 * - Work order modal binding: treatmentPlanId={selectedOrderForEdit?.treatmentPlanId ?? undefined}
 */
export {
	DentalLabOrdersView,
	type DentalLabOrdersViewProps,
} from "../lab/DentalLabOrdersView";
export * from "../lab/ordersView";
