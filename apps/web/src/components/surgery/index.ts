/**
 * SURGERY MODULE (DENTE CRM)
 * Surgical protocol engine, 1-click operation norms, WHO time-out safety checklist,
 * warehouse soft-overdraft non-blocking safety gate.
 *
 * Implements Mandate 8s (Law of Single Indivisible Authority):
 * Consolidates surgical protocol engine and VisitSurgeryProtocolTab into single entry point.
 */

export * from "./surgeryProtocols";
export {
	VisitSurgeryProtocolTab,
	type VisitSurgeryProtocolTabProps,
} from "../visit/surgery/VisitSurgeryProtocolTab";
