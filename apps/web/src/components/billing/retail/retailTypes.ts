/**
 * apps/web/src/components/billing/retail/retailTypes.ts
 *
 * Types for RetailProductsModal components.
 * Strictly <= 120 lines per Mandate 8b.
 */

import React from "react";
import type { RetailProductCategory, RetailProductItem } from "@dental/shared";

export interface RetailProductsModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly onAddProduct: (item: RetailProductItem, quantity: number) => void;
	readonly onAddMultipleProducts?: (
		items: ReadonlyArray<{ item: RetailProductItem; quantity: number }>,
	) => void;
	readonly patientName?: string | undefined;
	readonly initialCategory?: RetailProductCategory | "all" | undefined;
}

export interface CategoryFilterOption {
	readonly id: RetailProductCategory | "all";
	readonly label: string;
	readonly icon?: React.ReactNode;
}

export const CATEGORY_OPTIONS: readonly CategoryFilterOption[] = [
	{ id: "all", label: "Весь ассортимент" },
	{ id: "brushes", label: "Щетки Curaprox" },
	{ id: "pastes", label: "Пасты Marvis / Biorepair" },
	{ id: "irrigators", label: "Ирригаторы Waterpik" },
	{ id: "floss_and_rinses", label: "Нити и ополаскиватели" },
	{ id: "certificates", label: "Подарочные сертификаты" },
];
