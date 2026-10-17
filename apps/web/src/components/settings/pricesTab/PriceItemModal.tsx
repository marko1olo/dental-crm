import type React from "react";
import { PriceItemEditModal } from "./PriceItemEditModal";
import type { PriceItemEditModalProps } from "./types";

/**
 * PriceItemModal — Single Source of Truth (SSOT) for Service Catalog Item Creation and Editing.
 * Canonical alias for PriceItemEditModal conforming to DENTE Settings Architecture.
 */
export const PriceItemModal: React.FC<PriceItemEditModalProps> = (props) => {
	return <PriceItemEditModal {...props} />;
};

export { PriceItemEditModal };
export type { PriceItemEditModalProps, PriceItemEditModalProps as PriceItemModalProps } from "./types";
