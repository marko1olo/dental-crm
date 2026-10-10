import type {
	PricelistColumnTargetKey,
} from "@dental/shared";
import { AlertTriangle, Layers } from "lucide-react";
import React from "react";
import type { PricesMatchingReviewTableProps } from "./types";

export const PricesMatchingReviewTable: React.FC<
	PricesMatchingReviewTableProps
> = ({
	tabularAnalysis,
	availableSheets,
	selectedSheetIndex,
	customMapping,
	collisionStrategy,
	setCollisionStrategy,
	onSheetChange,
	onColumnMappingChange,
}) => {
	return (
		<>
			{/* Header with Vendor Badge */}
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					borderBottom: "1px solid var(--line)",
					paddingBottom: "12px",
					marginBottom: "16px",
				}}
			>
				<div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
					<span className="pricelist-vendor-badge">
						<Layers size={14} />
						Формат: {tabularAnalysis.vendorLabel}
					</span>
					{availableSheets.length > 1 && (
						<div className="dente-segmented-bar shrink-0" role="tablist">
							{availableSheets.map((sheet, idx) => (
								<button
									key={sheet}
									type="button"
									className={`dente-segmented-item ${selectedSheetIndex === idx ? "active" : ""}`}
									data-active={selectedSheetIndex === idx}
									onClick={() => onSheetChange(idx)}
								>
									{sheet}
								</button>
							))}
						</div>
					)}
				</div>

				<div style={{ display: "flex", gap: "16px", fontSize: "13px" }}>
					<span>
						Всего строк: <strong>{tabularAnalysis.totalRows}</strong>
					</span>
					<span style={{ color: "var(--teal)" }}>
						Корректных: <strong>{tabularAnalysis.validRowsCount}</strong>
					</span>
					{tabularAnalysis.errorRowsCount > 0 && (
						<span style={{ color: "var(--danger-color, #ef4444)" }}>
							С ошибками: <strong>{tabularAnalysis.errorRowsCount}</strong>
						</span>
					)}
				</div>
			</div>

			{/* Collision Strategy Selector */}
			<div style={{ marginBottom: "16px" }}>
				<label
					htmlFor="collision-strategy-selector"
					style={{
						fontSize: "13px",
						fontWeight: 600,
						color: "var(--ink)",
						display: "block",
						marginBottom: "6px",
					}}
				>
					Стратегия при совпадении с существующим прейскурантом:
				</label>
				<div id="collision-strategy-selector" className="pricelist-collision-group">
					<label className="pricelist-collision-option">
						<input
							type="radio"
							name="collisionStrat"
							value="update_existing"
							checked={collisionStrategy === "update_existing"}
							onChange={() => setCollisionStrategy("update_existing")}
						/>
						<span>
							<strong>Обновить цены существующих</strong> (новые услуги добавляются,
							найденные по коду/названию обновляют цену)
						</span>
					</label>

					<label className="pricelist-collision-option">
						<input
							type="radio"
							name="collisionStrat"
							value="skip_duplicates"
							checked={collisionStrategy === "skip_duplicates"}
							onChange={() => setCollisionStrategy("skip_duplicates")}
						/>
						<span>
							<strong>Пропустить дубликаты</strong> (добавить только новые услуги, не
							трогая текущие)
						</span>
					</label>

					<label className="pricelist-collision-option">
						<input
							type="radio"
							name="collisionStrat"
							value="create_new"
							checked={collisionStrategy === "create_new"}
							onChange={() => setCollisionStrategy("create_new")}
						/>
						<span>
							<strong>Создать новые копии</strong> (создать новую позицию для каждой
							строки файла)
						</span>
					</label>
				</div>
			</div>

			{/* 10-Row Live Preview Table with Column Mapping Selectors */}
			<div>
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
						marginBottom: "8px",
					}}
				>
					<h4 style={{ margin: 0, fontSize: "14px", fontWeight: 600 }}>
						Предпросмотр структуры колонок (первые 10 строк)
					</h4>
					<span style={{ fontSize: "12px", color: "var(--muted)" }}>
						Выберите назначение колонок в выпадающих списках для точной настройки
					</span>
				</div>

				<div className="pricelist-preview-container">
					<div className="pricelist-preview-table-wrapper">
						<table className="pricelist-preview-table">
							<thead>
								<tr>
									<th style={{ width: "40px" }}>№</th>
									{tabularAnalysis.headers.map((hdr, colIdx) => (
										<th key={`hdr-${hdr || `col-${colIdx}`}`}>
											<div style={{ fontSize: "12px", color: "var(--muted)" }}>
												{hdr || `Колонка ${colIdx + 1}`}
											</div>
											<select
												className="pricelist-mapping-select"
												value={(() => {
													if (customMapping.titleCol === colIdx) return "title";
													if (customMapping.priceCol === colIdx) return "priceRub";
													if (customMapping.codeCol === colIdx) return "code";
													if (customMapping.order804nCol === colIdx)
														return "order804nCode";
													if (customMapping.categoryCol === colIdx)
														return "category";
													if (customMapping.specialtyCol === colIdx)
														return "specialty";
													if (customMapping.costCol === colIdx) return "costRub";
													if (customMapping.durationCol === colIdx)
														return "durationMinutes";
													if (customMapping.warrantyCol === colIdx)
														return "warrantyMonths";
													return "ignore";
												})()}
												onChange={(e) =>
													onColumnMappingChange(
														e.target.value as PricelistColumnTargetKey,
														colIdx,
													)
												}
											>
												<option value="ignore">— Не импортировать —</option>
												<option value="title">Наименование услуги (Обязательно)</option>
												<option value="priceRub">Цена услуги в рублях (Обязательно)</option>
												<option value="code">Артикул / Код клиники</option>
												<option value="order804nCode">Официальный код услуги (Номенклатура)</option>
												<option value="category">Раздел / Группа</option>
												<option value="specialty">Специальность врача</option>
												<option value="costRub">Себестоимость / Расход</option>
												<option value="durationMinutes">Длительность (мин)</option>
												<option value="warrantyMonths">Гарантия (мес)</option>
											</select>
										</th>
									))}
								</tr>
							</thead>
							<tbody>
								{tabularAnalysis.previewRows.map((row) => (
									<tr
										key={row.rowNumber}
										style={{
											background:
												row.validationStatus === "error"
													? "rgba(239, 68, 68, 0.05)"
													: undefined,
										}}
									>
										<td style={{ color: "var(--muted)", fontWeight: 600 }}>
											{row.rowNumber}
										</td>
										{tabularAnalysis.headers.map((_, colIdx) => (
											<td
												key={`cell-${row.rowNumber}-${colIdx}`}
												title={row.rawCells[colIdx] || ""}
											>
												{row.rawCells[colIdx] || (
													<span style={{ color: "var(--muted)", fontStyle: "italic" }}>
														—
													</span>
												)}
											</td>
										))}
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			</div>

			{/* Actionable Error Box (if any) */}
			{tabularAnalysis.errors.length > 0 && (
				<div className="pricelist-error-box">
					<h4>
						<AlertTriangle size={16} />
						Предупреждения валидации строк ({tabularAnalysis.errors.length})
					</h4>
					<ul className="pricelist-error-list">
						{tabularAnalysis.errors.slice(0, 8).map((err) => (
							<li key={`err-${err.rowNumber}-${err.field}`}>
								<strong>Строка {err.rowNumber}:</strong> {err.message}
								{err.rawCell ? ` ("${err.rawCell}")` : ""}
							</li>
						))}
						{tabularAnalysis.errors.length > 8 && (
							<li>
								...и ещё {tabularAnalysis.errors.length - 8} строк с аналогичными
								замечаниями.
							</li>
						)}
					</ul>
				</div>
			)}
		</>
	);
};
