/**
 * apps/web/src/components/inventory/InventoryItemFormFields.tsx
 *
 * Совместимый фасад (Мандат 8b: <= 25L).
 */

import React from "react";
import type { InventoryItemFormData } from "./InventoryItemFormModal.js";

export interface InventoryItemFormFieldsProps {
	readonly formData: InventoryItemFormData;
	readonly setFormData: React.Dispatch<React.SetStateAction<InventoryItemFormData>> | ((data: InventoryItemFormData) => void);
	readonly onSubmit: (e: React.FormEvent) => void;
	readonly isSaving: boolean;
}

export const InventoryItemFormFields: React.FC<InventoryItemFormFieldsProps> = ({
	formData,
	setFormData,
	onSubmit,
	isSaving,
}) => {
	return null;
};

export default InventoryItemFormFields;
