/**
 * apps/web/src/components/catalog/ServicePriceListStudioModal.tsx
 *
 * Facade re-exporting canonical SSOT PricelistStudioModal (Mandate 8aq).
 * Ensures zero broken imports across all legacy views and launchers.
 */

export {
	PricelistStudioModal,
	PricelistStudioModal as ServicePriceListStudioModal,
	type PricelistStudioModalProps,
	type ServicePriceListStudioModalProps,
} from "./PricelistStudioModal";

export { default } from "./PricelistStudioModal";
