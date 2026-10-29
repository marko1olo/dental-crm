import type React from "react";
import { PriceListMappingDiffView } from "../mappingDiff";
import { PricelistImportDropzone } from "./PricelistImportDropzone";
import { PricelistImportModalFooter } from "./PricelistImportModalFooter";
import { PricelistImportModalHeader } from "./PricelistImportModalHeader";
import { downloadPricelistCsv } from "./pricelistCsvDownloader";
import type { ServicePricelistItem } from "./servicePricelistPresets";
import { usePricelistImportState } from "./usePricelistImportState";

export { downloadPricelistCsv };

export interface PricelistImportExportModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly items: readonly ServicePricelistItem[];
	readonly onApplyImported: (
		updatedItems: readonly ServicePricelistItem[],
		message: string,
	) => void;
	readonly adminSecret?: string | undefined;
}

export const PricelistImportExportModal: React.FC<
	PricelistImportExportModalProps
> = ({ isOpen, onClose, items, onApplyImported, adminSecret }) => {
	const imp = usePricelistImportState(items, onApplyImported, adminSecret);
	if (!isOpen) return null;

	const handleClose = () => {
		imp.setIngestedMappingItems([]);
		onClose();
	};

	const hasDiff = imp.ingestedMappingItems.length > 0;
	const catalogRefs = items.map((it) => ({
		id: it.id,
		code: it.statutoryCode || it.code804n,
		title: it.commercialTitle,
		basePriceRub: it.basePriceRub,
	}));

	return (
		<div
			className="pricelist-modal-overlay"
			style={{ zIndex: 10004 }}
			role="dialog"
			aria-modal="true"
		>
			<div
				className="pricelist-modal-container"
				style={{
					maxWidth: hasDiff ? "1180px" : "680px",
					width: "100%",
					maxHeight: "92vh",
					display: "flex",
					flexDirection: "column",
				}}
			>
				<PricelistImportModalHeader
					hasIngestedItems={hasDiff}
					importMode={imp.importMode}
					onSetImportMode={imp.setImportMode}
					onBack={() => imp.setIngestedMappingItems([])}
					onClose={handleClose}
				/>

				{hasDiff ? (
					<div
						style={{
							flex: 1,
							minHeight: 0,
							display: "flex",
							flexDirection: "column",
						}}
					>
						<PriceListMappingDiffView
							items={imp.ingestedMappingItems}
							onItemsChange={imp.setIngestedMappingItems}
							onAcceptAll={() =>
								imp.setIngestedMappingItems((prev) =>
									prev.map((i) => ({ ...i, isApproved: true })),
								)
							}
							onApply={imp.handleApplyIngestedMapping}
							onCancel={() => imp.setIngestedMappingItems([])}
							existingCatalog={catalogRefs}
							isLoading={imp.isIngestingApi}
						/>
					</div>
				) : (
					<>
						<PricelistImportDropzone
							importMode={imp.importMode}
							smartTextInput={imp.smartTextInput}
							importErrors={imp.importErrors}
							onSmartTextChange={(val) => {
								imp.setSmartTextInput(val);
								imp.handleIngestPriceList(val, "text");
							}}
							onFileUpload={imp.handleFileUpload}
						/>
						<PricelistImportModalFooter
							importMode={imp.importMode}
							smartTextInput={imp.smartTextInput}
							isIngestingApi={imp.isIngestingApi}
							onClose={handleClose}
							onIngest={() =>
								imp.handleIngestPriceList(imp.smartTextInput, "text")
							}
						/>
					</>
				)}
			</div>
		</div>
	);
};
