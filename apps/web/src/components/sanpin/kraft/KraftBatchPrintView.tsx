import { Check, FileText, Printer } from "lucide-react";
import React from "react";
import { generateThermalStickerHtml, type KraftPackageRecord } from "./kraftPackageEngine";
import { printA4Sheet, printThermalStickers } from "./thermalPrintActions";

interface KraftBatchPrintViewProps {
	packages: KraftPackageRecord[];
	selectedForPrint: Set<string>;
	onSelectAllForPrint: () => void;
	onTogglePrintItem: (id: string) => void;
	previewLabelSize: "58x40" | "43x25";
}

export function KraftBatchPrintView({
	packages,
	selectedForPrint,
	onSelectAllForPrint,
	onTogglePrintItem,
	previewLabelSize,
}: KraftBatchPrintViewProps) {
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
			<div className="kraft-panel-card">
				<div className="kraft-panel-title">
					<span>Параметры печати этикеток</span>
					<span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
						Выбрано для печати: {selectedForPrint.size === 0 ? packages.length : selectedForPrint.size} из {packages.length}
					</span>
				</div>

				<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
					<div style={{ display: "flex", gap: "0.5rem" }}>
						<button
							type="button"
							onClick={onSelectAllForPrint}
							className="kraft-btn kraft-btn-secondary"
						>
							{selectedForPrint.size === packages.length ? "Снять выбор" : "Выбрать все пакеты"}
						</button>
					</div>

					<div style={{ display: "flex", gap: "0.75rem" }}>
						<button
							type="button"
							onClick={() => printThermalStickers(packages, selectedForPrint, previewLabelSize)}
							className="kraft-btn kraft-btn-primary"
						>
							<Printer size={16} /> Печать на термопринтере ({previewLabelSize})
						</button>

						<button
							type="button"
							onClick={() => printA4Sheet(packages, selectedForPrint)}
							className="kraft-btn kraft-btn-secondary"
						>
							<FileText size={16} /> Печать листа А4 (сетка)
						</button>
					</div>
				</div>
			</div>

			<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
				{packages.map((pack) => {
					const isSelected = selectedForPrint.size === 0 || selectedForPrint.has(pack.id);
					return (
						<div
							key={pack.id}
							onClick={() => onTogglePrintItem(pack.id)}
							style={{
								cursor: "pointer",
								border: isSelected ? "2px solid var(--teal, #0d9488)" : "1px dashed var(--line, #cbd5e1)",
								borderRadius: "8px",
								padding: "8px",
								background: isSelected ? "rgba(13, 148, 136, 0.03)" : "var(--paper, #fff)",
								transition: "all 0.15s ease",
							}}
						>
							<div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px", fontSize: "0.75rem", fontWeight: 700 }}>
								<span>{pack.toolSetNameRu}</span>
								<span style={{ color: isSelected ? "var(--teal, #0d9488)" : "var(--muted)", display: "inline-flex", alignItems: "center", gap: "0.2rem" }}>
									{isSelected ? <><Check size={12} /> Выбрано</> : "Пропустить"}
								</span>
							</div>
							<div
								dangerouslySetInnerHTML={{
									__html: generateThermalStickerHtml(pack, { size: "58x40" }),
								}}
							/>
						</div>
					);
				})}
			</div>
		</div>
	);
}
