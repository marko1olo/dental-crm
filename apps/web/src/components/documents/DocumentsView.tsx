/**
 * Law of Single Indivisible Authority (Mandates 8s, 8j)
 * Canonical master component is apps/web/src/DocumentsView.tsx.
 * This file is a transparent facade-delegate preventing duplicate drift.
 */
export {
	DocumentsView,
	type DocumentsViewProps,
	type DocumentVoidAutonomyParams,
	DEFAULT_VOID_REASON_TEXT,
	DEFAULT_VOID_STAFF_ROLE,
	DEFAULT_VOID_STAFF_NAME,
	executeDocumentVoidAutonomy,
	DocumentsOutpatientArchive,
} from "../../DocumentsView";
export { default } from "../../DocumentsView";
