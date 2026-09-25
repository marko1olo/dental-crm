import { Plus } from "lucide-react";
import type React from "react";
import type { WarehouseStockItem } from "./inventoryMath.js";

export interface ProcedureMaterialAddCustomBarProps {
	readonly warehouseItems: readonly WarehouseStockItem[];
	readonly selectedCustomId: string;
	readonly onSelectCustomId: (id: string) => void;
	readonly highlightSelect: boolean;
	readonly onAddCustomMaterial: () => void;
	readonly isDeducting: boolean;
	readonly customMaterialName: string;
	readonly onChangeCustomMaterialName: (name: string) => void;
	readonly highlightCustomInput: boolean;
	readonly onAddQuickCustomMaterial: () => void;
}

export const ProcedureMaterialAddCustomBar: React.FC<
	ProcedureMaterialAddCustomBarProps
> = ({
	warehouseItems,
	selectedCustomId,
	onSelectCustomId,
	highlightSelect,
	onAddCustomMaterial,
	isDeducting,
	customMaterialName,
	onChangeCustomMaterialName,
	highlightCustomInput,
	onAddQuickCustomMaterial,
}) => {
	return (
		<div
			className="inventory-add-custom-bar"
			data-testid="inventory-add-custom-bar"
		>
			<div className="inventory-add-custom-inputs">
				<span
					style={{
						fontSize: 13,
						fontWeight: 700,
						color: "var(--muted)",
						whiteSpace: "nowrap",
					}}
				>
					Добавить расходник:
				</span>

				{warehouseItems.length > 0 && (
					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: "8px",
							flex: "1 1 300px",
							minWidth: "220px",
						}}
					>
						<select
							className="inventory-add-select"
							value={selectedCustomId}
							onChange={(e) => {
								onSelectCustomId(e.target.value);
							}}
							aria-label="Выбрать материал из каталога склада"
							data-testid="warehouse-select-custom"
							style={{
								minHeight: "34px",
								borderColor: highlightSelect
									? "var(--warn-fg, #b45309)"
									: undefined,
								boxShadow: highlightSelect
									? "0 0 0 2px rgba(217, 119, 6, 0.25)"
									: undefined,
							}}
						>
							<option value="">-- Выберите из каталога склада --</option>
							{warehouseItems.map((item) => (
								<option key={item.id} value={item.id}>
									{item.name} (остаток: {item.stockQuantity} шт.)
								</option>
							))}
						</select>
						<button
							type="button"
							className="inventory-add-btn"
							onClick={onAddCustomMaterial}
							disabled={isDeducting}
							data-testid="warehouse-add-custom-btn"
							title="Добавить выбранный из каталога материал"
							style={{ minHeight: "34px" }}
						>
							<Plus size={16} />
							Добавить со склада
						</button>
						<span
							style={{
								fontSize: 12,
								color: "var(--muted)",
								padding: "0 4px",
								whiteSpace: "nowrap",
							}}
						>
							или
						</span>
					</div>
				)}

				{/* Quick text input for Solo Doctor & Empty Catalog Resilience */}
				<div
					style={{
						display: "flex",
						alignItems: "center",
						gap: "6px",
						flex: "1 1 260px",
						minWidth: "220px",
					}}
				>
					<input
						type="text"
						className="inventory-quick-custom-input"
						placeholder="Или введите название расходника..."
						aria-label="Или введите название расходника"
						data-testid="quick-custom-material-input"
						value={customMaterialName}
						onChange={(e) => {
							onChangeCustomMaterialName(e.target.value);
						}}
						onKeyDown={(e) => {
							if (e.key === "Enter") {
								e.preventDefault();
								onAddQuickCustomMaterial();
							}
						}}
						style={{
							flex: 1,
							minHeight: "34px",
							borderColor: highlightCustomInput
								? "var(--warn-fg, #b45309)"
								: undefined,
							boxShadow: highlightCustomInput
								? "0 0 0 2px rgba(217, 119, 6, 0.25)"
								: undefined,
						}}
					/>
					<button
						type="button"
						className="inventory-add-btn"
						onClick={onAddQuickCustomMaterial}
						disabled={isDeducting}
						data-testid="quick-custom-material-add-btn"
						title="Добавить расходник без каталога склада"
						style={{ minHeight: "34px" }}
					>
						<Plus size={16} />
						Добавить
					</button>
				</div>
			</div>
		</div>
	);
};
