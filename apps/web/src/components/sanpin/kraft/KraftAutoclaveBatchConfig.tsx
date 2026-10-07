/**
 * DENTE CRM — Kraft Package Autoclave & Material Batch Config Subcomponent
 * Packaging Materials, Sterilization Autoclave Parameters & Quantity Stepper
 *
 * Authority: .agents/THE_HAMMER_MASTER_PROMPT.md & Mandate 8b (Subcomponents <= 500 lines)
 */

import React, { useMemo } from "react";
import {
	CLINIC_AUTOCLAVE_UNITS,
	KRAFT_PACKAGE_MATERIALS,
	KRAFT_PACKAGE_SIZES,
	getKraftMaterialDefinition,
	type KraftPackageMaterialId,
	type KraftPackageSizeId,
} from "./kraftPackagePresets";

export interface KraftAutoclaveBatchConfigProps {
	readonly selectedMaterialId: KraftPackageMaterialId;
	readonly onMaterialChange: (id: KraftPackageMaterialId) => void;
	readonly selectedSizeId: KraftPackageSizeId;
	readonly onSizeChange: (id: KraftPackageSizeId) => void;
	readonly selectedAutoclaveId: string;
	readonly onAutoclaveChange: (id: string) => void;
	readonly cycleNumber: number;
	readonly onCycleNumberChange: (cycle: number) => void;
	readonly packQuantity: number;
	readonly onPackQuantityChange: (qty: number) => void;
}

export const KraftAutoclaveBatchConfig: React.FC<
	KraftAutoclaveBatchConfigProps
> = ({
	selectedMaterialId,
	onMaterialChange,
	selectedSizeId,
	onSizeChange,
	selectedAutoclaveId,
	onAutoclaveChange,
	cycleNumber,
	onCycleNumberChange,
	packQuantity,
	onPackQuantityChange,
}) => {
	const selectedMaterial = useMemo(
		() => getKraftMaterialDefinition(selectedMaterialId),
		[selectedMaterialId],
	);

	return (
		<>
			{/* Шаг 2: Материал упаковки и срок стерильности */}
			<div className="kraft-panel-card">
				<div className="kraft-panel-title">
					<span>2. Материал упаковки и срок стерильности</span>
					<span
						style={{ fontSize: "0.75rem", color: "#059669", fontWeight: 700 }}
					>
						Срок: {selectedMaterial.statutoryShelfLifeDays} суток
					</span>
				</div>
				<div className="kraft-presets-grid">
					{KRAFT_PACKAGE_MATERIALS.map((mat) => (
						<div
							key={mat.id}
							onClick={() => onMaterialChange(mat.id)}
							className={`kraft-preset-item ${selectedMaterialId === mat.id ? "selected" : ""}`}
							style={{ cursor: "pointer" }}
						>
							<div className="kraft-preset-title">{mat.nameRu}</div>
							<div className="kraft-preset-desc">{mat.sealingMethodRu}</div>
							<span
								className="kraft-preset-badge"
								style={{
									background:
										mat.statutoryShelfLifeDays >= 60
											? "rgba(16, 185, 129, 0.12)"
											: "rgba(245, 158, 11, 0.12)",
									color:
										mat.statutoryShelfLifeDays >= 60 ? "#059669" : "#d97706",
								}}
							>
								{mat.statutoryShelfLifeDays} суток (
								{mat.sanpinClauseRu.split(" ")[0]})
							</span>
						</div>
					))}
				</div>

				{/* Package Sizes */}
				<div style={{ marginTop: "0.5rem" }}>
					<label
						style={{
							fontSize: "0.75rem",
							fontWeight: 600,
							color: "var(--muted)",
							display: "block",
							marginBottom: "0.35rem",
						}}
					>
						Типоразмер пакета:
					</label>
					<div
						style={{
							display: "grid",
							gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
							gap: "0.5rem",
						}}
					>
						{KRAFT_PACKAGE_SIZES.map((sz) => (
							<button
								key={sz.id}
								type="button"
								onClick={() => onSizeChange(sz.id)}
								className={`kraft-pill-btn ${selectedSizeId === sz.id ? "active" : ""}`}
								style={{
									fontSize: "0.8rem",
									textAlign: "center",
									minHeight: "44px",
								}}
							>
								{sz.dimensionsMmRu}
							</button>
						))}
					</div>
				</div>
			</div>

			{/* Шаг 3: Параметры автоклава и объем партии */}
			<div className="kraft-panel-card">
				<div className="kraft-panel-title">
					<span>3. Параметры стерилизатора и объем партии</span>
				</div>
				<div
					style={{
						display: "grid",
						gridTemplateColumns: "1fr 1fr",
						gap: "0.75rem",
					}}
				>
					<div>
						<label
							style={{
								fontSize: "0.75rem",
								fontWeight: 600,
								color: "var(--muted)",
								display: "block",
								marginBottom: "0.25rem",
							}}
						>
							Аппарат автоклава:
						</label>
						<select
							value={selectedAutoclaveId}
							onChange={(e) => onAutoclaveChange(e.target.value)}
							style={{
								width: "100%",
								minHeight: "44px",
								padding: "0.5rem",
								borderRadius: "8px",
								border: "1px solid var(--line, #e2e8f0)",
								background: "var(--paper, #fff)",
								color: "var(--ink, #0f172a)",
								fontSize: "0.85rem",
							}}
						>
							{CLINIC_AUTOCLAVE_UNITS.map((u) => (
								<option key={u.id} value={u.id}>
									{u.id} — {u.brandModelRu} ({u.chamberVolumeLiters} л)
								</option>
							))}
						</select>
					</div>

					<div>
						<label
							style={{
								fontSize: "0.75rem",
								fontWeight: 600,
								color: "var(--muted)",
								display: "block",
								marginBottom: "0.25rem",
							}}
						>
							Номер цикла автоклава:
						</label>
						<input
							type="number"
							min={1}
							max={99}
							value={cycleNumber}
							onChange={(e) =>
								onCycleNumberChange(
									Math.max(1, Number.parseInt(e.target.value) || 1),
								)
							}
							style={{
								width: "100%",
								minHeight: "44px",
								padding: "0.5rem",
								borderRadius: "8px",
								border: "1px solid var(--line, #e2e8f0)",
								background: "var(--paper, #fff)",
								color: "var(--ink, #0f172a)",
								fontSize: "0.95rem",
								fontWeight: 700,
							}}
						/>
					</div>
				</div>

				{/* Batch Quantity Stepper */}
				<div style={{ marginTop: "0.5rem" }}>
					<label
						style={{
							fontSize: "0.75rem",
							fontWeight: 600,
							color: "var(--muted)",
							display: "block",
							marginBottom: "0.35rem",
						}}
					>
						Количество упаковываемых пакетов (шт.):
					</label>
					<div className="kraft-stepper-container">
						{[1, 5, 10, 25, 50].map((q) => (
							<button
								key={q}
								type="button"
								onClick={() => onPackQuantityChange(q)}
								className={`kraft-pill-btn ${packQuantity === q ? "active" : ""}`}
							>
								{q} шт.
							</button>
						))}
						<input
							type="number"
							min={1}
							max={100}
							value={packQuantity}
							onChange={(e) =>
								onPackQuantityChange(
									Math.max(1, Math.min(100, Number.parseInt(e.target.value) || 1)),
								)
							}
							className="kraft-number-input"
						/>
					</div>
				</div>
			</div>
		</>
	);
};

export default KraftAutoclaveBatchConfig;
