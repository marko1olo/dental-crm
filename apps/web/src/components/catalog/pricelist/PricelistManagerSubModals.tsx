import React from "react";
import { PricelistImportExportModal } from "./PricelistImportExportModal";
import { PricelistServiceFormModal } from "./PricelistServiceFormModal";
import type { ServicePricelistItem } from "./servicePricelistPresets";

export interface PricelistManagerSubModalsProps {
	readonly isImportOpen: boolean;
	readonly isEditOpen: boolean;
	readonly editingItem: ServicePricelistItem | null;
	readonly items: readonly ServicePricelistItem[];
	readonly adminSecret?: string | undefined;
	readonly onCloseImport: () => void;
	readonly onCloseEdit: () => void;
	readonly onApplyImported: (
		updated: readonly ServicePricelistItem[],
		msg: string,
	) => void;
	readonly onSaveItem: (item: ServicePricelistItem) => void;
}

export const PricelistManagerSubModals: React.FC<
	PricelistManagerSubModalsProps
> = ({
	isImportOpen,
	isEditOpen,
	editingItem,
	items,
	adminSecret,
	onCloseImport,
	onCloseEdit,
	onApplyImported,
	onSaveItem,
}) => {
	return (
		<>
			<PricelistImportExportModal
				isOpen={isImportOpen}
				onClose={onCloseImport}
				items={items}
				adminSecret={adminSecret}
				onApplyImported={onApplyImported}
			/>
			<PricelistServiceFormModal
				isOpen={isEditOpen}
				editingItem={editingItem}
				onClose={onCloseEdit}
				onSave={onSaveItem}
			/>
		</>
	);
};
