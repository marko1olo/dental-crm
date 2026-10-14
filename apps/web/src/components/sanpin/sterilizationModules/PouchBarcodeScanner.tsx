import React, { useState } from "react";
import { QrCode, Sparkles, Tag, UserCheck } from "lucide-react";
import type { PackagingShelfLifePreset } from "./sterilizationCycleTypes";
import { STATUTORY_PACKAGING_PRESETS } from "./sterilizationCycleTypes";

export interface PouchBarcodeScannerProps {
	readonly itemsDescription: string;
	readonly onItemsDescriptionChange: (val: string) => void;
	readonly packsCount: number;
	readonly onPacksCountChange: (val: number) => void;
	readonly packagingPresetId: string;
	readonly onPackagingPresetIdChange: (val: string) => void;
	readonly selectedPackaging: PackagingShelfLifePreset;
	readonly expiryDateStr: string;
	readonly scannedBarcode?: string;
	readonly onScannedBarcodeChange?: (val: string) => void;
	readonly operatorName: string;
	readonly onOperatorNameChange: (val: string) => void;
}

const COMMON_INSTRUMENT_PRESETS = [
	{ label: "Терапевтический", text: "Смотровые наборы (зеркала, зонды, пинцеты), терапевтические боры" },
	{ label: "Наконечники", text: "Стоматологические наконечники KaVo/NSK, микромоторы, насадки скейлера" },
	{ label: "Хирургический", text: "Хирургические щипцы, элеваторы, костные ложки, ножницы, скальпели" },
	{ label: "Эндодонтия", text: "Эндодонтические файлы Ni-Ti, спредеры, плаггеры, эндомоторные головки" },
];

export function PouchBarcodeScanner({
	itemsDescription,
	onItemsDescriptionChange,
	packsCount,
	onPacksCountChange,
	packagingPresetId,
	onPackagingPresetIdChange,
	selectedPackaging,
	expiryDateStr,
	scannedBarcode = "",
	onScannedBarcodeChange,
	operatorName,
	onOperatorNameChange,
}: PouchBarcodeScannerProps) {
	const [localBarcode, setLocalBarcode] = useState(scannedBarcode);

	const handleBarcodeChange = (val: string) => {
		setLocalBarcode(val);
		if (onScannedBarcodeChange) onScannedBarcodeChange(val);
	};

	const handleGenerateQuickBarcode = () => {
		const prefix = "KRAFT";
		const randomSuffix = Math.floor(100000 + Math.random() * 900000);
		const genBarcode = `${prefix}-${new Date().toISOString().slice(2, 10).replace(/-/g, "")}-${randomSuffix}`;
		handleBarcodeChange(genBarcode);
	};

	return (
		<div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
			{/* Items & Quick Clinical Presets */}
			<div className="sanpin-form-group">
				<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.3rem" }}>
					<label className="sanpin-form-label" style={{ margin: 0 }}>Стерилизуемые изделия</label>
					<div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap" }}>
						{COMMON_INSTRUMENT_PRESETS.map((preset) => (
							<button
								key={preset.label}
								type="button"
								onClick={() => onItemsDescriptionChange(preset.text)}
								className="sanpin-btn sanpin-btn-secondary"
								style={{ fontSize: "0.7rem", padding: "0.15rem 0.4rem", borderRadius: "12px" }}
							>
								{preset.label}
							</button>
						))}
					</div>
				</div>

				<input
					type="text"
					required
					value={itemsDescription}
					onChange={(e) => onItemsDescriptionChange(e.target.value)}
					className="sanpin-input"
					style={{ minHeight: "36px", fontSize: "0.85rem" }}
					placeholder="Стоматологические наконечники, боры, зеркала, зонды, пинцеты"
				/>
			</div>

			{/* Packages count & Packaging type */}
			<div className="sanpin-form-row">
				<div className="sanpin-form-group" style={{ flex: 1 }}>
					<label className="sanpin-form-label">Кол-во упаковок</label>
					<input
						type="number"
						min={1}
						required
						value={packsCount}
						onChange={(e) => onPacksCountChange(parseInt(e.target.value, 10) || 1)}
						className="sanpin-input"
						style={{ minHeight: "36px", fontSize: "0.85rem", fontWeight: 700 }}
					/>
				</div>

				<div className="sanpin-form-group" style={{ flex: 2 }}>
					<label className="sanpin-form-label">Упаковка и срок стерильности</label>
					<select
						value={packagingPresetId}
						onChange={(e) => onPackagingPresetIdChange(e.target.value)}
						className="sanpin-select"
						style={{ minHeight: "36px", fontSize: "0.85rem" }}
					>
						{STATUTORY_PACKAGING_PRESETS.map((p) => (
							<option key={p.id} value={p.id}>
								{p.nameRu} — {p.shelfLifeDays > 0 ? `до ${p.shelfLifeDays} суток` : "без хранения"}
							</option>
						))}
					</select>
				</div>
			</div>

			{/* Shelf life detail note */}
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					padding: "0.4rem 0.6rem",
					borderRadius: "6px",
					background: "var(--paper-soft, #f8fafc)",
					fontSize: "0.75rem",
					color: "var(--muted, #64748b)",
					border: "1px solid var(--line, #e2e8f0)",
				}}
			>
				<span>{selectedPackaging.sealingMethodRu}</span>
				<strong style={{ color: "var(--brand-primary, #0284c7)" }}>
					{expiryDateStr}
				</strong>
			</div>

			{/* Barcode scanner input & Quick generator */}
			<div className="sanpin-form-group">
				<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
					<label className="sanpin-form-label" style={{ margin: 0, display: "flex", alignItems: "center", gap: "0.3rem" }}>
						<Tag size={13} color="var(--brand-primary, #0284c7)" />
						<span>Штрихкод партии или крафт-пакета</span>
					</label>
					<button
						type="button"
						onClick={handleGenerateQuickBarcode}
						className="sanpin-btn sanpin-btn-secondary"
						style={{ fontSize: "0.72rem", padding: "0.15rem 0.45rem", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}
						title="Сгенерировать канонический идентификатор упаковки"
					>
						<Sparkles size={11} color="var(--teal, #0d9488)" /> <span>Сгенерировать код</span>
					</button>
				</div>
				<div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
					<input
						type="text"
						value={localBarcode}
						onChange={(e) => handleBarcodeChange(e.target.value)}
						className="sanpin-input"
						style={{ minHeight: "36px", fontSize: "0.85rem", fontFamily: "monospace", flex: 1 }}
						placeholder="Пример: KRAFT-20261012-491028 (или сканируйте сканером)"
					/>
					{localBarcode && (
						<div
							style={{
								padding: "0.35rem 0.6rem",
								borderRadius: "6px",
								background: "rgba(37, 99, 235, 0.08)",
								color: "var(--brand-primary, #2563eb)",
								fontSize: "0.75rem",
								fontWeight: 700,
								whiteSpace: "nowrap",
								display: "flex",
								alignItems: "center",
								gap: "0.3rem",
							}}
						>
							<QrCode size={13} /> <span>EAN-13 Ready</span>
						</div>
					)}
				</div>
			</div>

			{/* Operator ЦСО / Медсестра */}
			<div className="sanpin-form-group">
				<label className="sanpin-form-label" style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
					<UserCheck size={13} color="var(--brand-primary, #0284c7)" />
					<span>Ответственный оператор ЦСО / Медсестра</span>
				</label>
				<input
					type="text"
					required
					value={operatorName}
					onChange={(e) => onOperatorNameChange(e.target.value)}
					className="sanpin-input"
					style={{ minHeight: "40px", fontSize: "0.85rem" }}
				/>
			</div>
		</div>
	);
}
