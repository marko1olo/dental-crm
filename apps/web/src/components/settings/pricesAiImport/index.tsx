import { FileSpreadsheet, Sparkles, X } from "lucide-react";
import React from "react";
import { PriceListMappingDiffView } from "../../pricing/PriceListMappingDiffView";
import "../SettingsPricesTab.css";
import { PricesImportActionToolbar } from "./PricesImportActionToolbar";
import { PricesImportDropzone } from "./PricesImportDropzone";
import { PricesMatchingReviewTable } from "./PricesMatchingReviewTable";
import type { SettingsPricesAiImportSectionProps } from "./types";
import { usePricesAiImport } from "./usePricesAiImport";

export const SettingsPricesAiImportSection: React.FC<
	SettingsPricesAiImportSectionProps
> = (props) => {
	const {
		pricelistText,
		setPricelistText,
		pricelistImageName,
		clearPricelistImage,
		attachPricelistImage,
		analyzePricelist,
		isPricelistAnalyzing,
		setPricelistSourceKind,
	} = props;

	const {
		activeSourceMode,
		setActiveSourceMode,
		dragOver,
		setDragOver,
		selectedFile,
		isParsingFile,
		availableSheets,
		selectedSheetIndex,
		tabularAnalysis,
		customMapping,
		collisionStrategy,
		setCollisionStrategy,
		isImporting,
		importResult,
		isDiffModalOpen,
		setIsDiffModalOpen,
		fileInputRef,
		mappingDiffItems,
		handleFileSelect,
		handleColumnMappingChange,
		handleBatchImportSubmit,
		handleSheetChange,
	} = usePricesAiImport(props);

	return (
		<>
			{/* Main Upload Section Card */}
			<section className="pricelist-section-card">
				<div className="pricelist-section-header">
					<div className="pricelist-section-icon">
						<FileSpreadsheet size={24} />
					</div>
					<div className="pricelist-section-title">
						<h3>Пакетный импорт прейскуранта (Excel & CSV)</h3>
						<p>
							Автоматическое сопоставление с каталогом медицинских услуг, защита от дубликатов и
							поддержка форматов IDENT, DentalPRO, iStom, 1С:Медицина.
						</p>
					</div>
				</div>

				<PricesImportDropzone
					activeSourceMode={activeSourceMode}
					setActiveSourceMode={setActiveSourceMode}
					setPricelistSourceKind={setPricelistSourceKind}
					dragOver={dragOver}
					setDragOver={setDragOver}
					selectedFile={selectedFile}
					isParsingFile={isParsingFile}
					handleFileSelect={handleFileSelect}
					fileInputRef={fileInputRef}
					pricelistText={pricelistText}
					setPricelistText={setPricelistText}
					isPricelistAnalyzing={isPricelistAnalyzing}
					analyzePricelist={analyzePricelist}
					pricelistImageName={pricelistImageName}
					clearPricelistImage={clearPricelistImage}
					attachPricelistImage={attachPricelistImage}
				/>
			</section>

			{/* Tabular Analysis Results & Column Mapping Preview */}
			{tabularAnalysis && (
				<section className="pricelist-section-card">
					<PricesMatchingReviewTable
						tabularAnalysis={tabularAnalysis}
						availableSheets={availableSheets}
						selectedSheetIndex={selectedSheetIndex}
						selectedFile={selectedFile}
						customMapping={customMapping}
						collisionStrategy={collisionStrategy}
						setCollisionStrategy={setCollisionStrategy}
						onSheetChange={handleSheetChange}
						onColumnMappingChange={handleColumnMappingChange}
					/>

					{/* Action Bar */}
					<PricesImportActionToolbar
						importResult={importResult}
						isImporting={isImporting}
						validRowsCount={tabularAnalysis.validRowsCount}
						onOpenDiffModal={() => setIsDiffModalOpen(true)}
						onSubmitBatchImport={() => handleBatchImportSubmit()}
					/>
				</section>
			)}

			{/* Dual-Pane Mapping Diff Modal */}
			{isDiffModalOpen && (
				<div
					role="dialog"
					aria-modal="true"
					className="premium-modal-overlay"
					style={{
						position: "fixed",
						inset: 0,
						background: "rgba(0, 0, 0, 0.65)",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						zIndex: 9999,
						padding: "16px",
					}}
				>
					<div
						style={{
							background: "var(--paper)",
							borderRadius: "12px",
							width: "95vw",
							maxWidth: "1400px",
							height: "90vh",
							maxHeight: "900px",
							display: "flex",
							flexDirection: "column",
							overflow: "hidden",
							boxShadow: "0 20px 40px rgba(0,0,0,0.3)",
							border: "1px solid var(--line)",
						}}
					>
						<div
							style={{
								padding: "12px 20px",
								borderBottom: "1px solid var(--line)",
								display: "flex",
								justifyContent: "space-between",
								alignItems: "center",
							}}
						>
							<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
								<Sparkles size={18} className="text-teal" />
								<h3 style={{ margin: 0, fontSize: "16px", fontWeight: 600 }}>
									Интеллектуальное сопоставление с официальным каталогом услуг
								</h3>
							</div>
							<button
								type="button"
								className="icon-button"
								onClick={() => setIsDiffModalOpen(false)}
							>
								<X size={18} />
							</button>
						</div>

						<div style={{ flex: 1, overflow: "hidden" }}>
							<PriceListMappingDiffView
								items={mappingDiffItems}
								onApply={(approved) => handleBatchImportSubmit(approved)}
								onCancel={() => setIsDiffModalOpen(false)}
								isLoading={isImporting}
							/>
						</div>
					</div>
				</div>
			)}
		</>
	);
};

export * from "./types";
export * from "./usePricesAiImport";
export * from "./PricesImportDropzone";
export * from "./PricesMatchingReviewTable";
export * from "./PricesImportActionToolbar";
