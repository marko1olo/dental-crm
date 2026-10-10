import {
	FileSpreadsheet,
	FileText,
	ImageIcon,
	Sparkles,
	UploadCloud,
	X,
} from "lucide-react";
import React from "react";
import type { PricesImportDropzoneProps } from "./types";

export const PricesImportDropzone: React.FC<PricesImportDropzoneProps> = ({
	activeSourceMode,
	setActiveSourceMode,
	setPricelistSourceKind,
	dragOver,
	setDragOver,
	selectedFile,
	isParsingFile,
	handleFileSelect,
	fileInputRef,
	pricelistText = "",
	setPricelistText,
	isPricelistAnalyzing = false,
	analyzePricelist,
	pricelistImageName = null,
	clearPricelistImage,
	attachPricelistImage,
}) => {
	return (
		<div className="pricelist-upload-area">
			{/* Mode Switcher — Canonical Dente Segmented Bar */}
			<div className="dente-segmented-bar mb-3 shrink-0" role="tablist">
				<button
					type="button"
					className={`dente-segmented-item ${activeSourceMode === "excel_csv" ? "active" : ""}`}
					data-active={activeSourceMode === "excel_csv"}
					onClick={() => setActiveSourceMode("excel_csv")}
				>
					<FileSpreadsheet size={15} />
					<span>Excel (.xlsx, .xls) и CSV (.csv)</span>
				</button>
				<button
					type="button"
					className={`dente-segmented-item ${activeSourceMode === "text" ? "active" : ""}`}
					data-active={activeSourceMode === "text"}
					onClick={() => {
						setActiveSourceMode("text");
						setPricelistSourceKind?.("text");
					}}
				>
					<FileText size={15} />
					<span>Вставка текста</span>
				</button>
				<button
					type="button"
					className={`dente-segmented-item ${activeSourceMode === "photo" ? "active" : ""}`}
					data-active={activeSourceMode === "photo"}
					onClick={() => {
						setActiveSourceMode("photo");
						setPricelistSourceKind?.("photo");
					}}
				>
					<ImageIcon size={15} />
					<span>Фото / Скан (ИИ-распознавание)</span>
				</button>
			</div>

			{/* 1. Excel / CSV Dropzone Mode */}
			{activeSourceMode === "excel_csv" && (
				<div>
					<div
						className={`pricelist-dropzone ${dragOver ? "pricelist-dropzone-active" : ""}`}
						onDragOver={(e) => {
							e.preventDefault();
							setDragOver(true);
						}}
						onDragLeave={(e) => {
							e.preventDefault();
							setDragOver(false);
						}}
						onDrop={(e) => {
							e.preventDefault();
							setDragOver(false);
							const file = e.dataTransfer.files[0];
							if (file) handleFileSelect(file);
						}}
						onClick={() => fileInputRef.current?.click()}
						onKeyDown={(e) => {
							if (e.key === "Enter" || e.key === " ") {
								fileInputRef.current?.click();
							}
						}}
						role="button"
						tabIndex={0}
					>
						<input
							type="file"
							ref={fileInputRef}
							accept=".xlsx,.xls,.ods,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
							style={{ display: "none" }}
							onChange={(e) => {
								const file = e.target.files?.[0];
								if (file) handleFileSelect(file);
							}}
						/>

						<div className="dropzone-placeholder">
							<UploadCloud size={40} className="text-teal mb-2" />
							<p style={{ fontWeight: 600, fontSize: "14px", margin: "4px 0" }}>
								Перетащите сюда файл прейскуранта или нажмите для выбора
							</p>
							<span style={{ fontSize: "12px", color: "var(--muted)" }}>
								Поддерживаются книги Excel (.xlsx, .xls), OpenDocument (.ods) и
								файлы CSV (.csv)
							</span>

							{selectedFile && (
								<div
									style={{
										marginTop: "12px",
										display: "inline-flex",
										alignItems: "center",
										gap: "8px",
										padding: "6px 14px",
										background: "var(--paper-soft)",
										border: "1px solid var(--line)",
										borderRadius: "6px",
									}}
								>
									<FileSpreadsheet size={18} className="text-teal" />
									<strong style={{ fontSize: "13px" }}>{selectedFile.name}</strong>
									<span style={{ fontSize: "12px", color: "var(--muted)" }}>
										({Math.round(selectedFile.size / 1024)} КБ)
									</span>
								</div>
							)}
						</div>
					</div>

					{isParsingFile && (
						<div style={{ marginTop: "12px", textAlign: "center" }}>
							<div className="pricelist-progress-bar-container">
								<div
									className="pricelist-progress-bar-fill"
									style={{ width: "70%" }}
								/>
							</div>
							<span style={{ fontSize: "13px", color: "var(--muted)" }}>
								Анализ книги, распознавание колонок и сопоставление услуг...
							</span>
						</div>
					)}
				</div>
			)}

			{/* 2. Text Area Mode */}
			{activeSourceMode === "text" && (
				<div className="pricelist-input-group">
					<textarea
						placeholder="Вставьте сюда строки прейскуранта (например, из буфера обмена или таблицы)..."
						rows={8}
						value={pricelistText}
						onChange={(e) => setPricelistText?.(e.target.value)}
					/>
					<div style={{ marginTop: "8px", display: "flex", justifyContent: "flex-end" }}>
						<button
							className="primary-button"
							type="button"
							disabled={isPricelistAnalyzing || !pricelistText.trim()}
							onClick={analyzePricelist}
						>
							<Sparkles size={16} className="mr-1 inline" />
							{isPricelistAnalyzing ? "Анализ..." : "Распознать текст"}
						</button>
					</div>
				</div>
			)}

			{/* 3. Photo / Scan Mode */}
			{(activeSourceMode === "photo" || activeSourceMode === "scan") && (
				<div className="pricelist-dropzone">
					<input
						type="file"
						id="pricelist-file"
						accept="image/*"
						onChange={(e) => {
							const file = e.target.files?.[0];
							if (file && attachPricelistImage) attachPricelistImage(file);
						}}
						style={{ display: "none" }}
					/>
					<label htmlFor="pricelist-file" className="dropzone-label">
						{pricelistImageName ? (
							<div className="file-attached">
								<ImageIcon size={32} />
								<span>{pricelistImageName}</span>
								<button
									type="button"
									className="icon-button danger"
									onClick={(e) => {
										e.preventDefault();
										clearPricelistImage?.();
									}}
								>
									<X size={16} />
								</button>
							</div>
						) : (
							<div className="dropzone-placeholder">
								<UploadCloud size={36} />
								<p>Нажмите для загрузки фото или скана</p>
								<span>PNG, JPG до 10MB</span>
							</div>
						)}
					</label>
				</div>
			)}
		</div>
	);
};
