import { X } from "lucide-react";
import React from "react";
import type { InventoryItem } from "./useInventoryLogic.js";
import { InventoryItemFormFields } from "./InventoryItemFormFields.js";

export interface InventoryItemFormData {
	name: string;
	threshold: string;
	unitCostRub: string;
	lotNumber: string;
	expirationDate: string;
	sku: string;
	barcode: string;
}

export interface InventoryItemFormModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly editingItem: InventoryItem | null;
	readonly formData: InventoryItemFormData;
	readonly setFormData: React.Dispatch<React.SetStateAction<InventoryItemFormData>> | ((data: InventoryItemFormData) => void);
	readonly onSubmit: (e: React.FormEvent) => void;
	readonly isSaving: boolean;
}

/**
 * Модальное окно добавления и редактирования складского материала (Мандаты 8b, 8d, 8e).
 */
export const InventoryItemFormModal: React.FC<InventoryItemFormModalProps> = ({
	isOpen,
	onClose,
	editingItem,
	formData,
	setFormData,
	onSubmit,
	isSaving,
}) => {
	if (!isOpen) return null;

	return (
		<div
			className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
			role="dialog"
			aria-modal="true"
			onClick={(e) => e.target === e.currentTarget && onClose()}
		>
			<div
				className="bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] rounded-2xl w-full max-w-md p-6 shadow-2xl"
				onClick={(e) => e.stopPropagation()}
			>
				<div className="flex justify-between items-center mb-4">
					<h2 className="text-base font-bold text-[var(--ink)]">
						{editingItem ? "Редактировать материал" : "Добавить материал"}
					</h2>
					<button
						type="button"
						onClick={onClose}
						className="text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer"
						aria-label="Закрыть"
					>
						<X size={18} />
					</button>
				</div>

				<InventoryItemFormFields
					formData={formData}
					setFormData={setFormData}
					onSubmit={onSubmit}
					isSaving={isSaving}
				/>
			</div>
		</div>
	);
};

export default InventoryItemFormModal;
