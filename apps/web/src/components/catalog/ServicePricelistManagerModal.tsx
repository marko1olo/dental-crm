/**
 * apps/web/src/components/catalog/ServicePricelistManagerModal.tsx
 *
 * Unified canonical SSOT facade re-exporting PricelistStudioModal (Mandate 8aq).
 * Eliminates duplicate parallel modal clutter and unifies all catalog access points into PricelistStudioModal.
 */

export {
	PricelistStudioModal,
	PricelistStudioModal as ServicePricelistManagerModal,
	type PricelistStudioModalProps,
	type ServicePricelistManagerModalProps,
} from "./PricelistStudioModal";

export { default } from "./PricelistStudioModal";
