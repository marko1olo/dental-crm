import type { PricelistCollisionStrategy } from "@dental/shared";
import {
	AlertTriangle,
	FileSpreadsheet,
	RefreshCw,
	Sparkles,
	UploadCloud,
	X,
} from "lucide-react";
import type React from "react";
import { PriceListMappingDiffView } from "../../pricing/PriceListMappingDiffView";
import type { PriceImportModalProps } from "./types";

export function PriceImportModal({
	isDropzoneOpen,
	onCloseDropzone,
	scannerMode,
	setScannerMode,
	scannerDragOver,
	setScannerDragOver,
	scannerFile,
	scannerText,
	setScannerText,
	scannerCollisionStrategy,
	setScannerCollisionStrategy,
	isScanningPricelist,
	scannerError,
	nativeFileInputRef,
	onProcessScannerFile,
	onRunScannerRequest,
	isMappingDiffOpen,
	onCloseMappingDiff,
	mappingDiffItems,
	setMappingDiffItems,
	handleCommitPricelistDiff,
	isCommittingImport,
	existingCatalogReferences,
}: PriceImportModalProps) {
	return (
		<>
			{/* Native 804n Pricelist Scanner Dropzone Banner */}
			{isDropzoneOpen && (
				<div
					className="p-3 sm:p-4 mb-4 rounded-xl border border-[var(--line)] bg-[var(--paper)] shadow-xs flex flex-col gap-3 animate-in fade-in duration-200 max-w-full overflow-hidden"
					data-testid="native-pricelist-dropzone-banner"
				>
					<div className="flex items-center justify-between border-b border-[var(--line)] pb-2.5">
						<div className="flex items-center gap-2">
							<div className="w-7 h-7 rounded-lg bg-[var(--teal-soft)] text-[var(--teal)] flex items-center justify-center shrink-0">
								<Sparkles size={16} />
							</div>
							<div>
								<h4 className="text-xs sm:text-sm font-bold text-[var(--ink)] leading-snug">
									Импорт прейскуранта и сопоставление с номенклатурой услуг
								</h4>
								<p className="text-xs text-[var(--muted)] leading-tight">
									Загрузите файл Excel (.xlsx, .xls), CSV или вставьте текст прейскуранта из буфера обмена.
								</p>
							</div>
						</div>
						<button
							type="button"
							onClick={onCloseDropzone}
							className="p-1 rounded-md text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--line)] cursor-pointer"
							title="Скрыть зону импорта"
						>
							<X size={15} />
						</button>
					</div>

					{/* Mode selector (File vs Text) & Collision Strategy */}
					<div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-between w-full">
						<div className="dente-segmented-bar shrink-0" role="tablist">
							<button
								type="button"
								onClick={() => setScannerMode("file")}
								className={`dente-segmented-item ${scannerMode === "file" ? "active" : ""}`}
								data-active={scannerMode === "file"}
							>
								Файл Excel / CSV
							</button>
							<button
								type="button"
								onClick={() => setScannerMode("text")}
								className={`dente-segmented-item ${scannerMode === "text" ? "active" : ""}`}
								data-active={scannerMode === "text"}
							>
								Вставка текста
							</button>
						</div>

						<div className="flex items-center gap-1.5 w-full sm:w-auto min-w-0">
							<span className="text-xs text-[var(--muted)] hidden sm:inline shrink-0">
								Стратегия:
							</span>
							<select
								value={scannerCollisionStrategy}
								onChange={(e) =>
									setScannerCollisionStrategy(
										e.target.value as PricelistCollisionStrategy,
									)
								}
								className="h-8 px-2 text-xs rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] font-medium focus:outline-none focus:border-[var(--teal)] w-full sm:w-auto max-w-full sm:max-w-xs truncate cursor-pointer"
								title="Стратегия сопоставления с существующим прейскурантом"
							>
								<option value="update_existing">
									Обновить существующие и добавить новые
								</option>
								<option value="skip_duplicates">Пропускать дубликаты</option>
								<option value="create_new">Создавать как новые позиции</option>
							</select>
						</div>
					</div>

					{/* Dropzone area or Textarea */}
					{scannerMode === "file" ? (
						<div
							className={`pricelist-dropzone ${scannerDragOver ? "pricelist-dropzone-active" : ""}`}
							onDragOver={(e) => {
								e.preventDefault();
								setScannerDragOver(true);
							}}
							onDragLeave={(e) => {
								e.preventDefault();
								setScannerDragOver(false);
							}}
							onDrop={(e) => {
								e.preventDefault();
								setScannerDragOver(false);
								const file = e.dataTransfer.files[0];
								if (file) onProcessScannerFile(file);
							}}
							onClick={() => nativeFileInputRef.current?.click()}
							role="button"
							tabIndex={0}
							onKeyDown={(e) => {
								if (e.key === "Enter" || e.key === " ")
									nativeFileInputRef.current?.click();
							}}
							style={{ minHeight: "120px", padding: "16px" }}
						>
							<input
								type="file"
								ref={nativeFileInputRef}
								accept=".xlsx,.xls,.ods,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
								className="hidden"
								onChange={(e) => {
									const file = e.target.files?.[0];
									if (file) onProcessScannerFile(file);
								}}
							/>
							<div className="dropzone-placeholder">
								<UploadCloud size={30} className="text-[var(--teal)] mb-1" />
								<p style={{ fontWeight: 600, fontSize: "13px", margin: "2px 0" }}>
									Перетащите сюда файл прейскуранта или нажмите для выбора
								</p>
								<span style={{ fontSize: "12px", color: "var(--muted)" }}>
									Поддерживаются книги Excel (.xlsx, .xls) и файлы CSV (.csv)
								</span>
								{scannerFile && (
									<div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-[var(--paper-soft)] border border-[var(--line)] text-xs font-semibold text-[var(--ink)]">
										<FileSpreadsheet
											size={14}
											className="text-[var(--teal)] shrink-0"
										/>
										<span className="truncate max-w-xs">{scannerFile.name}</span>
										<span className="text-xs text-[var(--muted)]">
											({Math.round(scannerFile.size / 1024)} КБ)
										</span>
									</div>
								)}
							</div>
						</div>
					) : (
						<div className="flex flex-col gap-2">
							<textarea
								data-testid="native-pricelist-text-input"
								rows={4}
								value={scannerText}
								onChange={(e) => setScannerText(e.target.value)}
								placeholder="Вставьте сюда скопированный текст прейскуранта клиники (наименование, цена, код)..."
								className="w-full p-2.5 text-xs rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] font-mono placeholder:font-sans focus:outline-none focus:border-[var(--teal)]"
							/>
							<div className="flex justify-end">
								<button
									type="button"
									disabled={isScanningPricelist || !scannerText.trim()}
									onClick={() =>
										onRunScannerRequest({ rawContent: scannerText })
									}
									className="primary-button h-8 px-4 text-[13px] font-semibold bg-[var(--teal)] hover:bg-[var(--teal-dark)] text-white rounded-lg shadow-xs inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
								>
									<Sparkles size={14} />
									<span>
										{isScanningPricelist
											? "Сканирование..."
											: "Распознать и сопоставить с номенклатурой"}
									</span>
								</button>
							</div>
						</div>
					)}

					{isScanningPricelist && (
						<div className="text-center py-2 flex items-center justify-center gap-2 text-xs text-[var(--teal)] font-semibold">
							<RefreshCw size={14} className="animate-spin" />
							<span>Идёт семантический анализ строк и подбор кодов номенклатуры...</span>
						</div>
					)}

					{scannerError && (
						<div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2 font-medium">
							<AlertTriangle size={14} className="shrink-0" />
							<span>{scannerError}</span>
						</div>
					)}
				</div>
			)}

			{/* Dual-Pane Mapping Diff Modal (Mandates 8c, 8d, 8e & 8p) */}
			{isMappingDiffOpen && (
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
							width: "96vw",
							maxWidth: "1440px",
							height: "92vh",
							maxHeight: "920px",
							display: "flex",
							flexDirection: "column",
							overflow: "hidden",
							boxShadow: "0 24px 48px rgba(0,0,0,0.35)",
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
								background: "var(--paper-strong)",
							}}
						>
							<div
								style={{ display: "flex", alignItems: "center", gap: "10px" }}
							>
								<Sparkles size={18} className="text-[var(--teal)]" />
								<h3
									style={{
										margin: 0,
										fontSize: "15px",
										fontWeight: 700,
										color: "var(--ink)",
									}}
								>
									Сопоставление строк прейскуранта с номенклатурой услуг
								</h3>
							</div>
							<button
								type="button"
								className="icon-button"
								onClick={onCloseMappingDiff}
								title="Закрыть окно сопоставления"
							>
								<X size={18} />
							</button>
						</div>

						<div style={{ flex: 1, overflow: "hidden" }}>
							<PriceListMappingDiffView
								items={mappingDiffItems}
								onItemsChange={(updated) =>
									setMappingDiffItems([...updated])
								}
								onApply={handleCommitPricelistDiff}
								onCancel={onCloseMappingDiff}
								existingCatalog={existingCatalogReferences}
								isLoading={isCommittingImport}
							/>
						</div>
					</div>
				</div>
			)}
		</>
	);
}
