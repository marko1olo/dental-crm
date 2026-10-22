import React from "react";
import { KraftBatchPrintView } from "./KraftBatchPrintView";
import { KraftLivePreviewView } from "./KraftLivePreviewView";
import type { KraftPackageRecord } from "./kraftPackageEngine";
import { KraftTsplZplView } from "./KraftTsplZplView";

export interface KraftBarcodeLabelGeneratorProps {
	readonly viewMode: "live_preview" | "batch_print" | "tspl_zpl";
	readonly previewPackage?: KraftPackageRecord | undefined;
	readonly previewLabelSize: "58x40" | "43x25";
	readonly onPreviewLabelSizeChange: (size: "58x40" | "43x25") => void;
	readonly packages: KraftPackageRecord[];
	readonly selectedForPrint: Set<string>;
	readonly onTogglePrintItem: (id: string) => void;
	readonly onSelectAllForPrint: () => void;
	readonly onQuickBatchAndPrint?: ((count: number) => void) | undefined;
}

export const KraftBarcodeLabelGenerator: React.FC<KraftBarcodeLabelGeneratorProps> = ({
	viewMode,
	previewPackage,
	previewLabelSize,
	onPreviewLabelSizeChange,
	packages,
	selectedForPrint,
	onTogglePrintItem,
	onSelectAllForPrint,
}) => {
	if (viewMode === "live_preview") {
		return (
			<KraftLivePreviewView
				previewPackage={previewPackage}
				previewLabelSize={previewLabelSize}
				onPreviewLabelSizeChange={onPreviewLabelSizeChange}
			/>
		);
	}

	if (viewMode === "batch_print") {
		return (
			<KraftBatchPrintView
				packages={packages}
				selectedForPrint={selectedForPrint}
				onSelectAllForPrint={onSelectAllForPrint}
				onTogglePrintItem={onTogglePrintItem}
				previewLabelSize={previewLabelSize}
			/>
		);
	}

	return <KraftTsplZplView packages={packages} previewPackage={previewPackage} />;
};

export default KraftBarcodeLabelGenerator;
