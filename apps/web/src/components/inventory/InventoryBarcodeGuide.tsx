import React, { useState } from "react";
import { motion } from "framer-motion";

export function InventoryBarcodeGuide({
	scannedBarcode,
	triggerBarcodeSimulation,
}: {
	scannedBarcode: string | null;
	triggerBarcodeSimulation: (barcodeStr: string) => void;
}) {
	const [isBarcodeGuideOpen, setIsBarcodeGuideOpen] = useState(false);
	const [simulatedBarcode, setSimulatedBarcode] = useState("");

	return (
		<div
			style={{
				background: "var(--paper-soft)",
				border: "1px solid var(--line-strong, var(--line))",
				borderRadius: 16,
				padding: "16px 20px",
				marginBottom: 20,
				display: "flex",
				flexDirection: "column",
				gap: 12,
				boxShadow: "0 2px 8px rgba(0,0,0,0.01)",
			}}
		>
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					cursor: "pointer",
					userSelect: "none",
				}}
				onClick={() => setIsBarcodeGuideOpen(!isBarcodeGuideOpen)}
			>
				<div style={{ display: "flex", alignItems: "center", gap: 10 }}>
					<span style={{ fontSize: 20 }}>🏷️</span>
					<div>
						<strong style={{ fontSize: 14, color: "var(--ink)" }}>
							Интеграция со сканером штрих-кодов
						</strong>
						<span
							style={{
								display: "block",
								fontSize: 12,
								color: "var(--muted)",
								marginTop: 2,
							}}
						>
							{scannedBarcode
								? `✅ Последний считанный код: ${scannedBarcode}`
								: "🔌 Система готова к сканированию. Просто считайте код товара физическим сканером."}
						</span>
					</div>
				</div>
				<span style={{ fontSize: 12, color: "var(--teal)", fontWeight: 600 }}>
					{isBarcodeGuideOpen
						? "Свернуть инструкцию ▲"
						: "Показать симулятор / инструкцию ▼"}
				</span>
			</div>

			{isBarcodeGuideOpen && (
				<motion.div
					initial={{ opacity: 0, height: 0 }}
					animate={{ opacity: 1, height: "auto" }}
					exit={{ opacity: 0, height: 0 }}
					style={{
						borderTop: "1px dashed var(--line)",
						paddingTop: 12,
						marginTop: 4,
						display: "flex",
						flexDirection: "column",
						gap: 12,
					}}
				>
					<p
						style={{
							margin: 0,
							fontSize: 13,
							color: "var(--ink)",
							lineHeight: 1.6,
						}}
					>
						Вы можете подключить любой стандартный USB-сканер штрих-кодов (в
						режиме эмуляции клавиатуры). При сканировании система автоматически
						найдёт товар по штрих-коду или SKU и откроет окно
						редактирования/добавления.
					</p>

					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: 12,
							flexWrap: "wrap",
							background: "var(--paper)",
							padding: 12,
							borderRadius: 10,
							border: "1px solid var(--line)",
						}}
					>
						<span
							style={{
								fontSize: 12,
								fontWeight: 700,
								color: "var(--muted)",
							}}
						>
							💻 СИМУЛЯТОР СКАНИРОВАНИЯ:
						</span>
						<input
							type="text"
							placeholder="Штрихкод (например 4607001)"
							value={simulatedBarcode}
							onChange={(e) => setSimulatedBarcode(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter") {
									triggerBarcodeSimulation(simulatedBarcode);
									setSimulatedBarcode("");
								}
							}}
							style={{
								background: "var(--paper-soft)",
								border: "1px solid var(--line-strong)",
								borderRadius: 6,
								padding: "6px 10px",
								color: "var(--ink)",
								fontSize: 13,
								outline: "none",
								width: 220,
							}}
						/>
						<button
							type="button"
							className="secondary-button"
							onClick={() => {
								triggerBarcodeSimulation(simulatedBarcode);
								setSimulatedBarcode("");
							}}
							disabled={!simulatedBarcode.trim()}
							style={{ padding: "6px 12px", fontSize: 12 }}
						>
							Считать код
						</button>
					</div>
				</motion.div>
			)}
		</div>
	);
}
