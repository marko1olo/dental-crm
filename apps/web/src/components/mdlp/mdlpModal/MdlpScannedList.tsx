import type React from "react";
import { Check, Copy, Download, FileCode2 } from "lucide-react";
import type { ChestnyZnakScannedItem } from "@dental/shared";
import { MdlpScannedItemsTable } from "../MdlpScannedItemsTable.js";

export interface MdlpScannedListProps {
	readonly scannedItems: readonly ChestnyZnakScannedItem[];
	readonly generatedXml: string | null;
	readonly isCopied: boolean;
	readonly onRemoveItem: (id: string) => void;
	readonly onCopyXml: () => void;
	readonly onDownloadXml: () => void;
}

export const MdlpScannedList: React.FC<MdlpScannedListProps> = ({
	scannedItems,
	generatedXml,
	isCopied,
	onRemoveItem,
	onCopyXml,
	onDownloadXml,
}) => {
	return (
		<>
			{/* Scanned Items Table */}
			<MdlpScannedItemsTable
				scannedItems={scannedItems}
				onRemoveItem={onRemoveItem}
			/>

			{/* Generated XML Preview Drawer */}
			{generatedXml && (
				<div className="mdlp-xml-preview" data-testid="mdlp-xml-preview-box">
					<div className="mdlp-xml-header">
						<div className="flex items-center gap-2 text-[var(--teal)]">
							<FileCode2 className="w-4 h-4" />
							<span>
								Электронный документ (XML) · {scannedItems.length} позиций
							</span>
						</div>
						<div className="flex items-center gap-2">
							<button
								type="button"
								onClick={onCopyXml}
								className="mdlp-action-btn secondary text-xs"
								style={{ height: 32 }}
								data-testid="copy-mdlp-xml-btn"
							>
								{isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
								<span>{isCopied ? "Скопировано" : "Копировать XML"}</span>
							</button>
							<button
								type="button"
								onClick={onDownloadXml}
								className="mdlp-action-btn text-xs"
								style={{ height: 32 }}
								data-testid="download-mdlp-xml-btn"
							>
								<Download className="w-3.5 h-3.5" />
								<span>Скачать .xml</span>
							</button>
						</div>
					</div>
					<pre className="mdlp-xml-code">{generatedXml}</pre>
				</div>
			)}
		</>
	);
};
